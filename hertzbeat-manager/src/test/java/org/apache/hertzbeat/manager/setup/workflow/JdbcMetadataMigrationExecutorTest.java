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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

@Timeout(15)
class JdbcMetadataMigrationExecutorTest {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private final List<JdbcMetadataMigrationExecutor> executors = new ArrayList<>();

    @AfterEach
    void closeExecutors() {
        executors.forEach(JdbcMetadataMigrationExecutor::close);
    }

    @Test
    void timeoutAbortsAndCancelsButDoesNotReturnUntilWorkerReallyExits() throws Exception {
        Connection source = connection(0);
        Connection target = connection(0);
        CountDownLatch workStarted = new CountDownLatch(1);
        CountDownLatch releaseWork = new CountDownLatch(1);
        CountDownLatch abortCalled = new CountDownLatch(2);
        AtomicInteger forwardedProgress = new AtomicInteger();
        doAnswer(invocation -> {
            abortCalled.countDown();
            return null;
        }).when(source).abort(any());
        doAnswer(invocation -> {
            abortCalled.countDown();
            return null;
        }).when(target).abort(any());
        JdbcMetadataMigrationExecutor executor = executor(Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> {
                    workStarted.countDown();
                    awaitIgnoringInterrupt(releaseWork);
                    progress.report(MetadataMigrationStage.COPYING, 50);
                });
        try (ExecutorService caller = Executors.newSingleThreadExecutor()) {
            Future<MetadataMigrationErrorCode> result = caller.submit(() -> failureCode(() -> executor.execute(
                    source, target, MetadataDatabaseKind.MYSQL, Duration.ofMillis(20),
                    (stage, percent) -> forwardedProgress.incrementAndGet())));
            try {
                assertThat(workStarted.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(abortCalled.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(result.isDone()).isFalse();
            } finally {
                releaseWork.countDown();
            }
            assertThat(result.get(5, TimeUnit.SECONDS)).isEqualTo(MetadataMigrationErrorCode.TIMEOUT);
            assertThat(forwardedProgress).hasValue(0);
            verify(source).close();
            verify(target).close();
        }
    }

    @Test
    void interruptionWaitsForWorkerExitAndRestoresCallerInterruptFlag() throws Exception {
        Connection source = connection(0);
        Connection target = connection(0);
        CountDownLatch workStarted = new CountDownLatch(1);
        CountDownLatch releaseWork = new CountDownLatch(1);
        CountDownLatch abortCalled = new CountDownLatch(2);
        doAnswer(invocation -> {
            abortCalled.countDown();
            return null;
        }).when(source).abort(any());
        doAnswer(invocation -> {
            abortCalled.countDown();
            return null;
        }).when(target).abort(any());
        JdbcMetadataMigrationExecutor executor = executor(Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> {
                    workStarted.countDown();
                    awaitIgnoringInterrupt(releaseWork);
                });
        AtomicReference<MetadataMigrationErrorCode> code = new AtomicReference<>();
        AtomicBoolean interrupted = new AtomicBoolean();
        Thread caller = Thread.ofPlatform().start(() -> {
            code.set(failureCode(() -> executor.execute(source, target, MetadataDatabaseKind.MYSQL,
                    TIMEOUT, MetadataMigrationProgressSink.NO_OP)));
            interrupted.set(Thread.currentThread().isInterrupted());
        });

        try {
            assertThat(workStarted.await(5, TimeUnit.SECONDS)).isTrue();
            caller.interrupt();
            assertThat(abortCalled.await(5, TimeUnit.SECONDS)).isTrue();
            assertThat(caller.isAlive()).isTrue();
        } finally {
            releaseWork.countDown();
        }
        caller.join(5_000);

        assertThat(caller.isAlive()).isFalse();
        assertThat(code).hasValue(MetadataMigrationErrorCode.TIMEOUT);
        assertThat(interrupted).isTrue();
    }

    @Test
    void abortFailureNeverEscapesThroughTimeoutFailure() throws Exception {
        Connection source = connection(0);
        Connection target = connection(0);
        CountDownLatch workStarted = new CountDownLatch(1);
        CountDownLatch releaseWork = new CountDownLatch(1);
        doThrow(new SQLException("private abort provider")).when(source).abort(any());
        doAnswer(invocation -> {
            releaseWork.countDown();
            return null;
        }).when(target).abort(any());
        JdbcMetadataMigrationExecutor executor = executor(Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> {
                    workStarted.countDown();
                    awaitIgnoringInterrupt(releaseWork);
                });

        try (ExecutorService caller = Executors.newSingleThreadExecutor()) {
            Future<MetadataMigrationException> result = caller.submit(() -> migrationFailure(() -> executor.execute(
                    source, target, MetadataDatabaseKind.MYSQL, Duration.ofMillis(20),
                    MetadataMigrationProgressSink.NO_OP)));
            try {
                assertThat(workStarted.await(5, TimeUnit.SECONDS)).isTrue();
                MetadataMigrationException failure = result.get(5, TimeUnit.SECONDS);
                assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.TIMEOUT);
                assertThat(failure).hasNoCause();
                assertThat(failure.getSuppressed()).isEmpty();
                assertThat(failure.getMessage()).doesNotContain("private abort provider");
            } finally {
                releaseWork.countDown();
            }
        }
    }

    @Test
    void fatalWorkerErrorIsRethrownOnlyAfterConnectionStateIsRestored() throws Exception {
        Connection source = connection(111);
        Connection target = connection(222);
        AssertionError fatal = new AssertionError("fatal copy failure");
        JdbcMetadataMigrationExecutor executor = executor(Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> {
                    throw fatal;
                });

        assertThatThrownBy(() -> executor.execute(source, target, MetadataDatabaseKind.MYSQL,
                        TIMEOUT, MetadataMigrationProgressSink.NO_OP))
                .isSameAs(fatal);

        verify(source).setNetworkTimeout(any(), eq(111));
        verify(target).setNetworkTimeout(any(), eq(222));
    }

    @Test
    void commitOutcomeUnknownOutranksAnOuterTimeout() throws Exception {
        Connection source = connection(0);
        Connection target = connection(0);
        CountDownLatch workStarted = new CountDownLatch(1);
        CountDownLatch abortCalled = new CountDownLatch(2);
        doAnswer(invocation -> {
            abortCalled.countDown();
            return null;
        }).when(source).abort(any());
        doAnswer(invocation -> {
            abortCalled.countDown();
            return null;
        }).when(target).abort(any());
        JdbcMetadataMigrationExecutor executor = executor(Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> {
                    workStarted.countDown();
                    awaitIgnoringInterrupt(abortCalled);
                    throw new MetadataMigrationException(MetadataMigrationErrorCode.COMMIT_OUTCOME_UNKNOWN);
                });

        try (ExecutorService caller = Executors.newSingleThreadExecutor()) {
            Future<MetadataMigrationErrorCode> result = caller.submit(() -> failureCode(() -> executor.execute(
                    source, target, MetadataDatabaseKind.MYSQL, Duration.ofMillis(20),
                    MetadataMigrationProgressSink.NO_OP)));
            try {
                assertThat(workStarted.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(result.get(5, TimeUnit.SECONDS))
                        .isEqualTo(MetadataMigrationErrorCode.COMMIT_OUTCOME_UNKNOWN);
            } finally {
                abortCalled.countDown();
                abortCalled.countDown();
            }
        }
    }

    @Test
    void abortErrorOutranksLaterCommitOutcomeUnknown() throws Exception {
        Connection source = connection(0);
        Connection target = connection(0);
        AssertionError abortFatal = new AssertionError("fatal abort failure");
        doThrow(abortFatal).when(source).abort(any());
        ThreadPoolExecutor abortWorker = worker();
        JdbcMetadataMigrationDeadline deadline = JdbcMetadataMigrationDeadline.start(TIMEOUT, System::nanoTime);
        JdbcMigrationConnectionScope connections = new JdbcMigrationConnectionScope(
                source, target, deadline, Runnable::run, abortWorker);
        CountDownLatch workStarted = new CountDownLatch(1);
        CountDownLatch releaseWork = new CountDownLatch(1);
        JdbcMetadataMigrationAttempt attempt = new JdbcMetadataMigrationAttempt(
                source,
                target,
                MetadataDatabaseKind.MYSQL,
                deadline,
                connections,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> {
                    workStarted.countDown();
                    awaitIgnoringInterrupt(releaseWork);
                    throw new MetadataMigrationException(MetadataMigrationErrorCode.COMMIT_OUTCOME_UNKNOWN);
                },
                MetadataMigrationProgressSink.NO_OP);
        Thread copyWorker = Thread.ofPlatform().start(attempt::run);

        try {
            try {
                assertThat(workStarted.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(attempt.abandon().abandoned()).isTrue();
                attempt.abortConnections();
            } finally {
                releaseWork.countDown();
            }
            copyWorker.join(5_000);
            assertThat(copyWorker.isAlive()).isFalse();
            assertThatThrownBy(attempt::rethrowFatalOrOutcomeUnknown).isSameAs(abortFatal);
        } finally {
            releaseWork.countDown();
            copyWorker.join(5_000);
            abortWorker.shutdownNow();
        }
    }

    @Test
    void blockedProgressSinkCannotPreventDeadlineAbort() throws Exception {
        Connection source = connection(0);
        Connection target = connection(0);
        CountDownLatch progressEntered = new CountDownLatch(1);
        CountDownLatch releaseProgress = new CountDownLatch(1);
        CountDownLatch abortCalled = new CountDownLatch(2);
        doAnswer(invocation -> {
            abortCalled.countDown();
            return null;
        }).when(source).abort(any());
        doAnswer(invocation -> {
            abortCalled.countDown();
            return null;
        }).when(target).abort(any());
        JdbcMetadataMigrationExecutor executor = executor(Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) ->
                        progress.report(MetadataMigrationStage.COPYING, 50));
        try (ExecutorService caller = Executors.newSingleThreadExecutor()) {
            Future<MetadataMigrationErrorCode> result = caller.submit(() -> failureCode(() -> executor.execute(
                    source, target, MetadataDatabaseKind.MYSQL, Duration.ofMillis(20), (stage, percent) -> {
                        progressEntered.countDown();
                        awaitIgnoringInterrupt(releaseProgress);
                    })));
            try {
                assertThat(progressEntered.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(abortCalled.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(result.isDone()).isFalse();
            } finally {
                releaseProgress.countDown();
            }
            assertThat(result.get(5, TimeUnit.SECONDS)).isEqualTo(MetadataMigrationErrorCode.TIMEOUT);
        }
    }

    @Test
    void oneBlockingAbortCannotPreventTheOtherConnectionAbort() throws Exception {
        Connection source = connection(0);
        Connection target = connection(0);
        CountDownLatch workStarted = new CountDownLatch(1);
        CountDownLatch sourceAbortEntered = new CountDownLatch(1);
        CountDownLatch targetAbortCalled = new CountDownLatch(1);
        CountDownLatch releaseSourceAbort = new CountDownLatch(1);
        CountDownLatch releaseWork = new CountDownLatch(1);
        doAnswer(invocation -> {
            sourceAbortEntered.countDown();
            awaitIgnoringInterrupt(releaseSourceAbort);
            return null;
        }).when(source).abort(any());
        doAnswer(invocation -> {
            targetAbortCalled.countDown();
            releaseWork.countDown();
            return null;
        }).when(target).abort(any());
        JdbcMetadataMigrationExecutor executor = executor(Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> {
                    workStarted.countDown();
                    awaitIgnoringInterrupt(releaseWork);
                });
        try (ExecutorService caller = Executors.newSingleThreadExecutor()) {
            Future<MetadataMigrationErrorCode> result = caller.submit(() -> failureCode(() -> executor.execute(
                    source, target, MetadataDatabaseKind.MYSQL, Duration.ofMillis(20),
                    MetadataMigrationProgressSink.NO_OP)));
            try {
                assertThat(workStarted.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(sourceAbortEntered.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(targetAbortCalled.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(result.isDone()).isFalse();
            } finally {
                releaseSourceAbort.countDown();
                releaseWork.countDown();
            }
            assertThat(result.get(5, TimeUnit.SECONDS)).isEqualTo(MetadataMigrationErrorCode.TIMEOUT);
        }
    }

    @Test
    void closedExecutorRejectsWithoutTouchingCallerConnections() throws Exception {
        Connection source = connection(0);
        Connection target = connection(0);
        JdbcMetadataMigrationExecutor executor = executor(Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> { });
        executor.close();

        assertThatThrownBy(() -> executor.execute(source, target, MetadataDatabaseKind.MYSQL,
                        TIMEOUT, MetadataMigrationProgressSink.NO_OP))
                .isInstanceOfSatisfying(MetadataMigrationException.class,
                        failure -> assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.TIMEOUT));

        verify(source, never()).getNetworkTimeout();
        verify(target, never()).getNetworkTimeout();
    }

    private static Connection connection(int networkTimeout) throws Exception {
        Connection connection = mock(Connection.class);
        when(connection.getNetworkTimeout()).thenReturn(networkTimeout);
        return connection;
    }

    private JdbcMetadataMigrationExecutor executor(
            Executor networkExecutor, JdbcMetadataMigrationExecutor.MigrationWork work) {
        JdbcMetadataMigrationExecutor executor =
                new JdbcMetadataMigrationExecutor(worker(), networkExecutor, work);
        executors.add(executor);
        return executor;
    }

    private static ThreadPoolExecutor worker() {
        ThreadPoolExecutor worker = new ThreadPoolExecutor(
                0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>(),
                Thread.ofPlatform().daemon(true).name("metadata-copy-test", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy());
        worker.allowCoreThreadTimeOut(true);
        return worker;
    }

    private static MetadataMigrationErrorCode failureCode(ThrowingAction action) {
        try {
            action.run();
            throw new AssertionError("Expected migration failure");
        } catch (MetadataMigrationException failure) {
            assertThat(failure).hasNoCause();
            return failure.code();
        }
    }

    private static MetadataMigrationException migrationFailure(ThrowingAction action) {
        try {
            action.run();
            throw new AssertionError("Expected migration failure");
        } catch (MetadataMigrationException failure) {
            return failure;
        }
    }

    private static void awaitIgnoringInterrupt(CountDownLatch latch) {
        boolean interrupted = false;
        while (latch.getCount() > 0) {
            try {
                latch.await();
            } catch (InterruptedException ignored) {
                interrupted = true;
            }
        }
        if (interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    @FunctionalInterface
    private interface ThrowingAction {
        void run();
    }
}
