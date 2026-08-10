/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

@Timeout(15)
class TargetJdbcCleanupLaneTest {

    @Test
    void initiallyExpiredRetryNeverSubmitsCleanupWork() throws Exception {
        AtomicInteger submissions = new AtomicInteger();
        AtomicInteger ticker = new AtomicInteger();
        ThreadPoolExecutor worker = countingInlineWorker(submissions);
        Connection connection = mock(Connection.class);
        TargetJdbcCleanupLane lane = new TargetJdbcCleanupLane(worker, Runnable::run);
        lane.poison(connection);
        JdbcMetadataMigrationDeadline deadline = JdbcMetadataMigrationDeadline.start(
                Duration.ofNanos(1), ticker::get);
        ticker.set(2);
        try {
            assertCleanupRequired(() -> lane.retry(deadline));

            assertThat(submissions).hasValue(0);
            verify(connection, times(0)).close();
            assertThat(lane.acquisitionFailure()).isEqualTo(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
        } finally {
            lane.close();
        }
    }

    @Test
    void retryDoesNotSubmitAgainWhenTheBudgetExpiresAfterTransientRejection() throws Exception {
        AtomicInteger submissions = new AtomicInteger();
        AtomicInteger tickerReads = new AtomicInteger();
        ThreadPoolExecutor worker = rejectFirstInlineWorker(submissions);
        Connection connection = mock(Connection.class);
        TargetJdbcCleanupLane lane = new TargetJdbcCleanupLane(worker, Runnable::run);
        lane.poison(connection);
        JdbcMetadataMigrationDeadline deadline = JdbcMetadataMigrationDeadline.start(
                Duration.ofNanos(1),
                () -> tickerReads.getAndIncrement() < 2 ? 0 : 2);
        try {
            assertCleanupRequired(() -> lane.retry(deadline));

            assertThat(submissions).hasValue(1);
            verify(connection, times(0)).close();
            assertThat(lane.acquisitionFailure()).isEqualTo(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
        } finally {
            lane.close();
        }
    }

    @Test
    void retryWaitsUntilTheZeroQueueWorkerHasFinishedAfterExecute() throws Exception {
        CountDownLatch afterExecuteEntered = new CountDownLatch(1);
        CountDownLatch releaseAfterExecute = new CountDownLatch(1);
        CountDownLatch retryEntered = new CountDownLatch(1);
        AtomicBoolean firstTask = new AtomicBoolean(true);
        ThreadPoolExecutor worker = new ThreadPoolExecutor(
                0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>(),
                Thread.ofPlatform().daemon(true).name("target-jdbc-cleanup-handoff", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy()) {
            @Override
            protected void afterExecute(Runnable task, Throwable failure) {
                if (firstTask.getAndSet(false)) {
                    afterExecuteEntered.countDown();
                    awaitUninterruptibly(releaseAfterExecute);
                }
            }
        };
        worker.allowCoreThreadTimeOut(true);
        Connection connection = mock(Connection.class);
        doThrow(new SQLException("private first cleanup"))
                .doNothing()
                .when(connection).close();
        TargetJdbcCleanupLane lane = new TargetJdbcCleanupLane(worker, Runnable::run);
        ExecutorService caller = Executors.newSingleThreadExecutor();
        Future<?> retry = null;
        try {
            lane.cleanupLate(connection);
            assertThat(afterExecuteEntered.await(5, TimeUnit.SECONDS)).isTrue();
            retry = caller.submit(() -> {
                retryEntered.countDown();
                lane.retry(deadline());
            });
            assertThat(retryEntered.await(5, TimeUnit.SECONDS)).isTrue();

            assertThat(retry).isNotDone();
            verify(connection).close();

            releaseAfterExecute.countDown();
            retry.get(5, TimeUnit.SECONDS);
            verify(connection, times(2)).close();
        } finally {
            releaseAfterExecute.countDown();
            if (retry != null) {
                retry.cancel(true);
            }
            caller.shutdownNow();
            lane.close();
            worker.shutdownNow();
        }
    }

    @Test
    void closeHandsOffRetainedCleanupAfterZeroQueueWorkerLeavesAfterExecute() throws Exception {
        CountDownLatch afterExecuteEntered = new CountDownLatch(1);
        CountDownLatch releaseAfterExecute = new CountDownLatch(1);
        CountDownLatch cleanupCompleted = new CountDownLatch(1);
        AtomicBoolean firstTask = new AtomicBoolean(true);
        ThreadPoolExecutor worker = new ThreadPoolExecutor(
                0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>(),
                Thread.ofPlatform().daemon(true).name("target-jdbc-cleanup-close-handoff", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy()) {
            @Override
            protected void afterExecute(Runnable task, Throwable failure) {
                if (firstTask.getAndSet(false)) {
                    afterExecuteEntered.countDown();
                    awaitUninterruptibly(releaseAfterExecute);
                }
            }
        };
        worker.allowCoreThreadTimeOut(true);
        Connection connection = mock(Connection.class);
        doThrow(new SQLException("private first cleanup"))
                .doAnswer(ignored -> {
                    cleanupCompleted.countDown();
                    return null;
                })
                .when(connection).close();
        TargetJdbcCleanupLane lane = new TargetJdbcCleanupLane(worker, Runnable::run);
        try {
            lane.cleanupLate(connection);
            assertThat(afterExecuteEntered.await(5, TimeUnit.SECONDS)).isTrue();

            lane.close();
            releaseAfterExecute.countDown();

            assertThat(cleanupCompleted.await(5, TimeUnit.SECONDS)).isTrue();
            assertThat(lane.acquisitionFailure()).isEqualTo(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
            verify(connection, times(2)).close();
        } finally {
            releaseAfterExecute.countDown();
            lane.close();
            worker.shutdownNow();
        }
    }

    @Test
    void abortInterruptIsClearedBeforeCloseAndCombinedWithEntryAndCloseInterrupts() throws Exception {
        Thread.interrupted();
        Connection connection = mock(Connection.class);
        AtomicBoolean closeSawInterrupt = new AtomicBoolean();
        doAnswer(ignored -> {
            Thread.currentThread().interrupt();
            return null;
        }).when(connection).abort(any());
        doAnswer(ignored -> {
            closeSawInterrupt.set(Thread.currentThread().isInterrupted());
            Thread.currentThread().interrupt();
            return null;
        }).when(connection).close();
        try (TargetJdbcCleanupLane lane = new TargetJdbcCleanupLane(inlineWorker(), Runnable::run)) {
            Thread.currentThread().interrupt();

            lane.cleanupLate(connection);

            assertThat(closeSawInterrupt).isFalse();
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void abortFailureInterruptIsClearedBeforeCloseWhileCloseFatalRemainsPrimary() throws Exception {
        Thread.interrupted();
        Connection connection = mock(Connection.class);
        AtomicBoolean closeSawInterrupt = new AtomicBoolean();
        AssertionError fatal = new AssertionError("private close fatal");
        doAnswer(ignored -> {
            Thread.currentThread().interrupt();
            throw new SQLException("private abort failure");
        }).when(connection).abort(any());
        doAnswer(ignored -> {
            closeSawInterrupt.set(Thread.currentThread().isInterrupted());
            Thread.currentThread().interrupt();
            throw fatal;
        }).when(connection).close();
        try (TargetJdbcCleanupLane lane = new TargetJdbcCleanupLane(inlineWorker(), Runnable::run)) {
            lane.cleanupLate(connection);

            assertThatThrownBy(() -> lane.retry(deadline())).isSameAs(fatal);
            assertThat(closeSawInterrupt).isFalse();
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void closeDrainsManyDistinctHandlesWithoutRecursiveTaskExecution() {
        AtomicInteger nextExpected = new AtomicInteger();
        AtomicBoolean ordered = new AtomicBoolean(true);
        try (TargetJdbcCleanupLane lane = new TargetJdbcCleanupLane(inlineWorker(), Runnable::run)) {
            for (int index = 0; index < 20_000; index++) {
                Connection connection = orderedConnection(index, nextExpected, ordered);
                lane.poison(connection);
                lane.poison(connection);
            }

            lane.close();

            assertThat(nextExpected).hasValue(20_000);
            assertThat(ordered).isTrue();
        }
    }

    @Test
    void completedFatalIsReplayedBeforeAnyLaterRetryMutation() throws Exception {
        Connection connection = mock(Connection.class);
        AssertionError fatal = new AssertionError("private completed fatal");
        doThrow(fatal).doNothing().when(connection).close();
        try (TargetJdbcCleanupLane lane = new TargetJdbcCleanupLane(inlineWorker(), Runnable::run)) {
            lane.cleanupLate(connection);

            assertThatThrownBy(() -> lane.retry(deadline())).isSameAs(fatal);
            verify(connection).close();

            lane.retry(deadline());
            verify(connection, times(2)).close();
        }
    }

    @Test
    void runtimeSubmissionFailureFinalizesStateAndKeepsExactHandleRetryable() throws Exception {
        Connection connection = mock(Connection.class);
        try (TargetJdbcCleanupLane lane = new TargetJdbcCleanupLane(
                oneShotFailureWorker(new IllegalStateException("private submit runtime")), Runnable::run)) {
            lane.cleanupLate(connection);

            assertThat(lane.acquisitionFailure()).isEqualTo(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
            lane.retry(deadline());
            verify(connection).close();
        }
    }

    @Test
    void fatalSubmissionFailureIsReplayedAndKeepsExactHandleRetryable() throws Exception {
        Connection connection = mock(Connection.class);
        AssertionError fatal = new AssertionError("private submit fatal");
        try (TargetJdbcCleanupLane lane = new TargetJdbcCleanupLane(
                oneShotFailureWorker(fatal), Runnable::run)) {
            lane.cleanupLate(connection);

            assertThatThrownBy(() -> lane.retry(deadline())).isSameAs(fatal);
            lane.retry(deadline());
            verify(connection).close();
        }
    }

    @Test
    void closeStartsExactRetainedCleanupAndKeepsItRetryableUntilSuccess() throws Exception {
        Connection connection = mock(Connection.class);
        CountDownLatch closed = new CountDownLatch(1);
        doThrow(new SQLException("private retained cleanup"))
                .doAnswer(ignored -> {
                    closed.countDown();
                    return null;
                })
                .when(connection).close();
        TargetJdbcCleanupLane lane = lane();
        lane.poison(connection);

        lane.close();

        assertCleanupRequired(() -> lane.retry(deadline()));
        lane.retry(deadline());
        assertThat(closed.await(5, TimeUnit.SECONDS)).isTrue();
        verify(connection, times(2)).close();
    }

    @Test
    void twoDistinctPoisonedHandlesAreBothOwnedAndClosed() throws Exception {
        Connection first = mock(Connection.class);
        Connection second = mock(Connection.class);
        CountDownLatch closed = new CountDownLatch(2);
        doAnswer(ignored -> {
            closed.countDown();
            return null;
        }).when(first).close();
        doAnswer(ignored -> {
            closed.countDown();
            return null;
        }).when(second).close();
        TargetJdbcCleanupLane lane = lane();

        lane.poison(first);
        lane.poison(second);
        lane.close();

        assertThat(closed.await(5, TimeUnit.SECONDS)).isTrue();
        verify(first).close();
        verify(second).close();
    }

    @Test
    void repeatedStableFailuresRetainTheExactHandleUntilCleanupConverges() throws Exception {
        Connection connection = mock(Connection.class);
        doThrow(new SQLException("private SQL cleanup"))
                .doThrow(new IllegalStateException("private runtime cleanup"))
                .doNothing()
                .when(connection).close();
        try (TargetJdbcCleanupLane lane = lane()) {
            lane.cleanupLate(connection);

            assertCleanupRequired(() -> lane.retry(deadline()));
            lane.retry(deadline());

            verify(connection).abort(any());
            verify(connection, times(3)).close();
            assertThat(lane.acquisitionFailure()).isEqualTo(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
        }
    }

    @Test
    void fatalCleanupRemainsPrimaryWhileTheExactHandleCanStillBeRetried() throws Exception {
        Connection connection = mock(Connection.class);
        AssertionError fatal = new AssertionError("private cleanup fatal");
        doThrow(fatal).doNothing().when(connection).close();
        try (TargetJdbcCleanupLane lane = lane()) {
            lane.cleanupLate(connection);

            assertThatThrownBy(() -> lane.retry(deadline())).isSameAs(fatal);
            lane.retry(deadline());

            verify(connection).abort(any());
            verify(connection, times(2)).close();
        }
    }

    @Test
    void retryWithoutAnOwnedHandleReturnsStableFactoryClosed() {
        try (TargetJdbcCleanupLane lane = lane()) {
            assertThatThrownBy(() -> lane.retry(deadline()))
                    .isInstanceOfSatisfying(TargetJdbcConnectionException.class, failure -> {
                        assertThat(failure.code()).isEqualTo(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
                        assertThat(failure).hasNoCause();
                    });
        }
    }

    @Test
    void shutdownRejectsNewCleanupWorkWithoutLosingCleanupRequiredState() throws SQLException {
        Connection connection = mock(Connection.class);
        TargetJdbcCleanupLane lane = lane();
        lane.close();

        lane.cleanupLate(connection);

        assertThat(lane.acquisitionFailure()).isEqualTo(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
        assertCleanupRequired(() -> lane.retry(deadline()));
        verify(connection, times(0)).close();
    }

    private static void assertCleanupRequired(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(TargetJdbcConnectionException.class, failure -> {
                    assertThat(failure.code()).isEqualTo(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
                    assertThat(failure).hasNoCause();
                });
    }

    private static TargetJdbcCleanupLane lane() {
        ThreadPoolExecutor worker = new ThreadPoolExecutor(
                0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>(),
                Thread.ofPlatform().daemon(true).name("target-jdbc-cleanup-unit", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy());
        worker.allowCoreThreadTimeOut(true);
        return new TargetJdbcCleanupLane(worker, Runnable::run);
    }

    private static ThreadPoolExecutor inlineWorker() {
        return new ThreadPoolExecutor(0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>()) {
            @Override
            public void execute(Runnable task) {
                task.run();
            }
        };
    }

    private static ThreadPoolExecutor countingInlineWorker(AtomicInteger submissions) {
        return new ThreadPoolExecutor(0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>()) {
            @Override
            public void execute(Runnable task) {
                submissions.incrementAndGet();
                task.run();
            }
        };
    }

    private static ThreadPoolExecutor rejectFirstInlineWorker(AtomicInteger submissions) {
        return new ThreadPoolExecutor(0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>()) {
            @Override
            public void execute(Runnable task) {
                if (submissions.incrementAndGet() == 1) {
                    throw new RejectedExecutionException("transient test rejection");
                }
                task.run();
            }
        };
    }

    private static ThreadPoolExecutor oneShotFailureWorker(Throwable failure) {
        AtomicBoolean first = new AtomicBoolean(true);
        return new ThreadPoolExecutor(0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>()) {
            @Override
            public void execute(Runnable task) {
                if (first.getAndSet(false)) {
                    if (failure instanceof Error fatal) {
                        throw fatal;
                    }
                    throw (RuntimeException) failure;
                }
                task.run();
            }
        };
    }

    private static Connection orderedConnection(
            int index,
            AtomicInteger nextExpected,
            AtomicBoolean ordered) {
        return (Connection) Proxy.newProxyInstance(
                TargetJdbcCleanupLaneTest.class.getClassLoader(),
                new Class<?>[] {Connection.class},
                (proxy, method, arguments) -> {
                    if (method.getName().equals("close")) {
                        if (nextExpected.getAndIncrement() != index) {
                            ordered.set(false);
                        }
                        return null;
                    }
                    if (method.getName().equals("isClosed")) {
                        return false;
                    }
                    if (method.getName().equals("toString")) {
                        return "counting-connection";
                    }
                    Class<?> returnType = method.getReturnType();
                    if (!returnType.isPrimitive()) {
                        return null;
                    }
                    if (returnType == boolean.class) {
                        return false;
                    }
                    if (returnType == char.class) {
                        return '\0';
                    }
                    return 0;
                });
    }

    private static void awaitUninterruptibly(CountDownLatch latch) {
        boolean interrupted = false;
        while (true) {
            try {
                latch.await();
                break;
            } catch (InterruptedException ignored) {
                interrupted = true;
            }
        }
        if (interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    private static JdbcMetadataMigrationDeadline deadline() {
        return JdbcMetadataMigrationDeadline.start(Duration.ofSeconds(5), System::nanoTime);
    }
}
