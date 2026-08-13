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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

@Timeout(15)
class JdbcMetadataMigrationExecutorLifecycleTest {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    @Test
    void concurrentExecutionCannotReplaceTheActiveAttempt() throws Exception {
        Connection source = connection();
        Connection target = connection();
        Connection secondSource = connection();
        Connection secondTarget = connection();
        CountDownLatch workStarted = new CountDownLatch(1);
        CountDownLatch releaseWork = new CountDownLatch(1);
        JdbcMetadataMigrationExecutor executor = executor(
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> {
                    workStarted.countDown();
                    awaitIgnoringInterrupt(releaseWork);
                });
        try (executor; ExecutorService caller = Executors.newSingleThreadExecutor()) {
            Future<?> first = caller.submit(() -> executor.execute(source, target,
                    MetadataDatabaseKind.MYSQL, TIMEOUT, MetadataMigrationProgressSink.NO_OP));
            try {
                assertThat(workStarted.await(5, TimeUnit.SECONDS)).isTrue();
                assertThatThrownBy(() -> executor.execute(secondSource, secondTarget,
                                MetadataDatabaseKind.POSTGRESQL, TIMEOUT,
                                MetadataMigrationProgressSink.NO_OP))
                        .isInstanceOfSatisfying(MetadataMigrationException.class,
                                failure -> assertThat(failure.code())
                                        .isEqualTo(MetadataMigrationErrorCode.TIMEOUT));
                verify(secondSource, never()).getNetworkTimeout();
                verify(secondTarget, never()).getNetworkTimeout();
            } finally {
                releaseWork.countDown();
            }
            first.get(5, TimeUnit.SECONDS);
        }
    }

    @Test
    void closeWaitsUntilTheActiveWorkerHasActuallyExited() throws Exception {
        Connection source = connection();
        Connection target = connection();
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
        JdbcMetadataMigrationExecutor executor = executor(
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> {
                    workStarted.countDown();
                    awaitIgnoringInterrupt(releaseWork);
                });
        try (ExecutorService caller = Executors.newSingleThreadExecutor();
                ExecutorService closer = Executors.newSingleThreadExecutor()) {
            Future<MetadataMigrationErrorCode> result = caller.submit(() -> failureCode(() -> executor.execute(
                    source, target, MetadataDatabaseKind.MYSQL, TIMEOUT,
                    MetadataMigrationProgressSink.NO_OP)));
            Future<?> closeResult = null;
            try {
                assertThat(workStarted.await(5, TimeUnit.SECONDS)).isTrue();
                closeResult = closer.submit(executor::close);
                assertThat(abortCalled.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(closeResult.isDone()).isFalse();
            } finally {
                releaseWork.countDown();
            }
            if (closeResult != null) {
                closeResult.get(5, TimeUnit.SECONDS);
            }
            assertThat(result.get(5, TimeUnit.SECONDS)).isEqualTo(MetadataMigrationErrorCode.TIMEOUT);
        } finally {
            releaseWork.countDown();
            executor.close();
        }
    }

    @Test
    void concurrentCloseJoinsAnAlreadyStartedAbortAndInvalidation() throws Exception {
        Connection source = connection();
        Connection target = connection();
        CountDownLatch workStarted = new CountDownLatch(1);
        CountDownLatch workExited = new CountDownLatch(1);
        CountDownLatch releaseWork = new CountDownLatch(1);
        CountDownLatch abortEntered = new CountDownLatch(2);
        CountDownLatch releaseAbort = new CountDownLatch(1);
        CountDownLatch closeStarted = new CountDownLatch(1);
        CountDownLatch closeReturned = new CountDownLatch(1);
        doAnswer(invocation -> {
            abortEntered.countDown();
            awaitIgnoringInterrupt(releaseAbort);
            return null;
        }).when(source).abort(any());
        doAnswer(invocation -> {
            abortEntered.countDown();
            awaitIgnoringInterrupt(releaseAbort);
            return null;
        }).when(target).abort(any());
        JdbcMetadataMigrationExecutor executor = executor(
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> {
                    workStarted.countDown();
                    try {
                        releaseWork.await();
                    } catch (InterruptedException interrupted) {
                        Thread.currentThread().interrupt();
                    } finally {
                        workExited.countDown();
                    }
                });
        try (ExecutorService caller = Executors.newSingleThreadExecutor();
                ExecutorService closer = Executors.newSingleThreadExecutor()) {
            Future<MetadataMigrationErrorCode> result = caller.submit(() -> failureCode(() -> executor.execute(
                    source, target, MetadataDatabaseKind.MYSQL, Duration.ofMillis(20),
                    MetadataMigrationProgressSink.NO_OP)));
            Future<?> closeResult = null;
            try {
                assertThat(workStarted.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(abortEntered.await(5, TimeUnit.SECONDS)).isTrue();
                closeResult = closer.submit(() -> {
                    closeStarted.countDown();
                    try {
                        executor.close();
                    } finally {
                        closeReturned.countDown();
                    }
                });
                assertThat(closeStarted.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(workExited.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(closeReturned.await(1, TimeUnit.SECONDS)).isFalse();
            } finally {
                releaseWork.countDown();
                releaseAbort.countDown();
            }
            if (closeResult != null) {
                closeResult.get(5, TimeUnit.SECONDS);
            }
            assertThat(result.get(5, TimeUnit.SECONDS)).isEqualTo(MetadataMigrationErrorCode.TIMEOUT);
            verify(source, times(1)).close();
            verify(target, times(1)).close();
        } finally {
            releaseWork.countDown();
            releaseAbort.countDown();
            executor.close();
        }
    }

    @Test
    void copyWorkerCloseFailsFastInsteadOfWaitingForItself() throws Exception {
        Connection source = connection();
        Connection target = connection();
        AtomicReference<JdbcMetadataMigrationExecutor> executorRef = new AtomicReference<>();
        AtomicReference<RuntimeException> closeFailure = new AtomicReference<>();
        JdbcMetadataMigrationExecutor executor = executor(
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> {
                    try {
                        executorRef.get().close();
                    } catch (RuntimeException failure) {
                        closeFailure.set(failure);
                        throw failure;
                    }
                });
        executorRef.set(executor);

        try (executor) {
            assertThatThrownBy(() -> executor.execute(source, target, MetadataDatabaseKind.MYSQL,
                            TIMEOUT, MetadataMigrationProgressSink.NO_OP))
                    .isInstanceOfSatisfying(MetadataMigrationException.class,
                            failure -> assertThat(failure.code())
                                    .isEqualTo(MetadataMigrationErrorCode.COPY));
            assertThat(closeFailure.get()).isInstanceOf(IllegalStateException.class);
        }

        verify(source, never()).close();
        verify(target, never()).close();
    }

    @Test
    void progressCallbackCloseFailsFastInsteadOfWaitingForItsWorker() throws Exception {
        Connection source = connection();
        Connection target = connection();
        AtomicReference<JdbcMetadataMigrationExecutor> executorRef = new AtomicReference<>();
        AtomicReference<RuntimeException> closeFailure = new AtomicReference<>();
        JdbcMetadataMigrationExecutor executor = executor(
                (ignoredSource, ignoredTarget, kind, timeout, progress) ->
                        progress.report(MetadataMigrationStage.COPYING, 50));
        executorRef.set(executor);
        MetadataMigrationProgressSink progress = (stage, percent) -> {
            try {
                executorRef.get().close();
            } catch (RuntimeException failure) {
                closeFailure.set(failure);
                throw failure;
            }
        };

        try (executor) {
            assertThatThrownBy(() -> executor.execute(source, target, MetadataDatabaseKind.MYSQL,
                            TIMEOUT, progress))
                    .isInstanceOfSatisfying(MetadataMigrationException.class,
                            failure -> assertThat(failure.code())
                                    .isEqualTo(MetadataMigrationErrorCode.COPY));
            assertThat(closeFailure.get()).isInstanceOf(IllegalStateException.class);
        }

        verify(source, never()).close();
        verify(target, never()).close();
    }

    @Test
    void rejectedWorkerDoesNotTouchCallerConnections() throws Exception {
        Connection source = connection();
        Connection target = connection();
        ThreadPoolExecutor rejectedWorker = worker("metadata-copy-rejected");
        rejectedWorker.shutdownNow();
        JdbcMetadataMigrationExecutor executor = new JdbcMetadataMigrationExecutor(
                rejectedWorker, Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> { });
        try (executor) {
            assertThatThrownBy(() -> executor.execute(source, target, MetadataDatabaseKind.MYSQL,
                            TIMEOUT, MetadataMigrationProgressSink.NO_OP))
                    .isInstanceOfSatisfying(MetadataMigrationException.class,
                            failure -> assertThat(failure.code())
                                    .isEqualTo(MetadataMigrationErrorCode.TIMEOUT));
        }

        verify(source, never()).getNetworkTimeout();
        verify(target, never()).getNetworkTimeout();
    }

    @Test
    void fatalWorkerSubmissionClearsThePublishedAttemptWithoutTouchingConnections() throws Exception {
        Connection source = connection();
        Connection target = connection();
        AssertionError fatal = new AssertionError("fatal worker submission");
        ThreadPoolExecutor failedWorker = throwingWorker(fatal);
        JdbcMetadataMigrationExecutor executor = new JdbcMetadataMigrationExecutor(
                failedWorker, Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> { });

        try (executor) {
            assertThatThrownBy(() -> executor.execute(source, target, MetadataDatabaseKind.MYSQL,
                            TIMEOUT, MetadataMigrationProgressSink.NO_OP))
                    .isSameAs(fatal);
        }

        verify(source, never()).getNetworkTimeout();
        verify(source, never()).abort(any());
        verify(source, never()).close();
        verify(target, never()).getNetworkTimeout();
        verify(target, never()).abort(any());
        verify(target, never()).close();
    }

    @Test
    void runtimeWorkerSubmissionIsRedactedAndClearsThePublishedAttempt() throws Exception {
        Connection source = connection();
        Connection target = connection();
        ThreadPoolExecutor failedWorker = throwingWorker(new IllegalStateException("private worker detail"));
        JdbcMetadataMigrationExecutor executor = new JdbcMetadataMigrationExecutor(
                failedWorker, Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> { });

        try (executor) {
            assertThatThrownBy(() -> executor.execute(source, target, MetadataDatabaseKind.MYSQL,
                            TIMEOUT, MetadataMigrationProgressSink.NO_OP))
                    .isInstanceOfSatisfying(MetadataMigrationException.class, failure -> {
                        assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.TIMEOUT);
                        assertThat(failure).hasNoCause();
                        assertThat(failure.getMessage()).doesNotContain("private worker detail");
                    });
        }

        verify(source, never()).abort(any());
        verify(source, never()).close();
        verify(target, never()).abort(any());
        verify(target, never()).close();
    }

    private static JdbcMetadataMigrationExecutor executor(
            JdbcMetadataMigrationExecutor.MigrationWork work) {
        return new JdbcMetadataMigrationExecutor(worker("metadata-copy-lifecycle"), Runnable::run, work);
    }

    private static ThreadPoolExecutor worker(String name) {
        ThreadPoolExecutor worker = new ThreadPoolExecutor(
                0, 2, 30, TimeUnit.SECONDS, new SynchronousQueue<>(),
                Thread.ofPlatform().daemon(true).name(name, 0).factory(),
                new ThreadPoolExecutor.AbortPolicy());
        worker.allowCoreThreadTimeOut(true);
        return worker;
    }

    private static ThreadPoolExecutor throwingWorker(Throwable failure) {
        return new ThreadPoolExecutor(
                0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>(),
                Thread.ofPlatform().daemon(true).name("metadata-copy-submission-failure", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy()) {
            @Override
            public void execute(Runnable command) {
                if (failure instanceof Error error) {
                    throw error;
                }
                throw (RuntimeException) failure;
            }
        };
    }

    private static Connection connection() throws Exception {
        Connection connection = mock(Connection.class);
        when(connection.getNetworkTimeout()).thenReturn(0);
        return connection;
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
