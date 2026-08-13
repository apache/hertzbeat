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
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.mockito.ArgumentCaptor;

@Timeout(15)
class JdbcMetadataMigrationConnectionLifecycleTest {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private final List<JdbcMetadataMigrationExecutor> executors = new ArrayList<>();

    @AfterEach
    void closeExecutors() {
        executors.forEach(JdbcMetadataMigrationExecutor::close);
    }

    @Test
    void configuresAndRestoresBothNetworkTimeoutsAroundSuccessfulCopy() throws Exception {
        Connection source = connection(111);
        Connection target = connection(222);
        Executor networkExecutor = Runnable::run;
        AtomicInteger calls = new AtomicInteger();
        JdbcMetadataMigrationExecutor executor = executor(networkExecutor,
                (actualSource, actualTarget, kind, timeout, progress) -> {
                    assertThat(actualSource).isSameAs(source);
                    assertThat(actualTarget).isSameAs(target);
                    assertThat(kind).isEqualTo(MetadataDatabaseKind.POSTGRESQL);
                    assertThat(timeout).isPositive().isLessThanOrEqualTo(TIMEOUT);
                    calls.incrementAndGet();
                });

        executor.execute(source, target, MetadataDatabaseKind.POSTGRESQL, TIMEOUT,
                MetadataMigrationProgressSink.NO_OP);

        assertThat(calls).hasValue(1);
        verify(source).getNetworkTimeout();
        verify(target).getNetworkTimeout();
        ArgumentCaptor<Integer> sourceTimeouts = ArgumentCaptor.forClass(Integer.class);
        verify(source, times(2)).setNetworkTimeout(eq(networkExecutor), sourceTimeouts.capture());
        assertThat(sourceTimeouts.getAllValues().getFirst()).isBetween(1, 5_000);
        assertThat(sourceTimeouts.getAllValues().getLast()).isEqualTo(111);
        ArgumentCaptor<Integer> targetTimeouts = ArgumentCaptor.forClass(Integer.class);
        verify(target, times(2)).setNetworkTimeout(eq(networkExecutor), targetTimeouts.capture());
        assertThat(targetTimeouts.getAllValues().getFirst()).isBetween(1, 5_000);
        assertThat(targetTimeouts.getAllValues().getLast()).isEqualTo(222);
        verify(source, never()).abort(any());
        verify(target, never()).abort(any());
    }

    @Test
    void networkTimeoutConfigurationFailureAbortsAndClosesWithoutStartingCopy() throws Exception {
        Connection source = connection(0);
        Connection target = connection(0);
        doThrow(new SQLException("private target path")).when(target).setNetworkTimeout(any(), anyInt());
        AtomicInteger calls = new AtomicInteger();
        JdbcMetadataMigrationExecutor executor = executor(Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> calls.incrementAndGet());

        assertThatThrownBy(() -> executor.execute(source, target, MetadataDatabaseKind.MYSQL,
                        TIMEOUT, MetadataMigrationProgressSink.NO_OP))
                .isInstanceOfSatisfying(MetadataMigrationException.class, failure -> {
                    assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.TIMEOUT);
                    assertThat(failure).hasNoCause();
                    assertThat(failure.getSuppressed()).isEmpty();
                    assertThat(failure.getMessage()).doesNotContain("private target path");
                });

        assertThat(calls).hasValue(0);
        verifyInvalidated(source, target);
    }

    @Test
    void stableCopyFailureIsPreservedAfterNetworkTimeoutRestoration() throws Exception {
        Connection source = connection(111);
        Connection target = connection(222);
        MetadataMigrationException original = new MetadataMigrationException(MetadataMigrationErrorCode.VERIFICATION);
        JdbcMetadataMigrationExecutor executor = executor(Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> {
                    throw original;
                });

        assertThatThrownBy(() -> executor.execute(source, target, MetadataDatabaseKind.POSTGRESQL,
                        TIMEOUT, MetadataMigrationProgressSink.NO_OP))
                .isSameAs(original);

        verify(source).setNetworkTimeout(any(), eq(111));
        verify(target).setNetworkTimeout(any(), eq(222));
        verify(source, never()).abort(any());
        verify(target, never()).abort(any());
    }

    @Test
    void restorationFailureInvalidatesConnectionsWithoutChangingCommittedSuccess() throws Exception {
        Connection source = connection(111);
        Connection target = connection(222);
        AtomicInteger sourceSets = new AtomicInteger();
        doAnswer(invocation -> {
            if (sourceSets.incrementAndGet() == 2) {
                throw new SQLException("private restore path");
            }
            return null;
        }).when(source).setNetworkTimeout(any(), anyInt());
        JdbcMetadataMigrationExecutor executor = executor(Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> { });

        executor.execute(source, target, MetadataDatabaseKind.MYSQL,
                TIMEOUT, MetadataMigrationProgressSink.NO_OP);

        verifyInvalidated(source, target);
    }

    @Test
    void deadlineAbandonsWorkerBlockedWhileRestoringConnectionState() throws Exception {
        Connection source = connection(111);
        Connection target = connection(222);
        AtomicInteger sourceSets = new AtomicInteger();
        CountDownLatch restoreEntered = new CountDownLatch(1);
        CountDownLatch releaseRestore = new CountDownLatch(1);
        CountDownLatch abortCalled = new CountDownLatch(2);
        doAnswer(invocation -> {
            if (sourceSets.incrementAndGet() == 2) {
                restoreEntered.countDown();
                awaitIgnoringInterrupt(releaseRestore);
            }
            return null;
        }).when(source).setNetworkTimeout(any(), anyInt());
        doAnswer(invocation -> {
            abortCalled.countDown();
            return null;
        }).when(source).abort(any());
        doAnswer(invocation -> {
            abortCalled.countDown();
            return null;
        }).when(target).abort(any());
        JdbcMetadataMigrationExecutor executor = executor(Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> { });
        try (ExecutorService caller = Executors.newSingleThreadExecutor()) {
            Future<MetadataMigrationErrorCode> result = caller.submit(() -> failureCode(() -> executor.execute(
                    source, target, MetadataDatabaseKind.MYSQL, Duration.ofMillis(20),
                    MetadataMigrationProgressSink.NO_OP)));
            try {
                assertThat(restoreEntered.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(abortCalled.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(result.isDone()).isFalse();
            } finally {
                releaseRestore.countDown();
            }
            assertThat(result.get(5, TimeUnit.SECONDS)).isEqualTo(MetadataMigrationErrorCode.TIMEOUT);
        }
    }

    @Test
    void fatalConfigurationErrorStillExitsAndFailsBothConnectionsClosed() throws Exception {
        Connection source = connection(0);
        Connection target = connection(0);
        AssertionError fatal = new AssertionError("fatal network timeout read");
        doThrow(fatal).when(source).getNetworkTimeout();
        AtomicInteger calls = new AtomicInteger();
        JdbcMetadataMigrationExecutor executor = executor(Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> calls.incrementAndGet());

        assertThatThrownBy(() -> executor.execute(source, target, MetadataDatabaseKind.MYSQL,
                        TIMEOUT, MetadataMigrationProgressSink.NO_OP))
                .isSameAs(fatal);

        assertThat(calls).hasValue(0);
        verifyInvalidated(source, target);
    }

    @Test
    void fatalRestorationErrorCannotBypassTheWorkerExitProof() throws Exception {
        Connection source = connection(111);
        Connection target = connection(222);
        AssertionError fatal = new AssertionError("fatal network timeout restore");
        AtomicInteger sourceSets = new AtomicInteger();
        doAnswer(invocation -> {
            if (sourceSets.incrementAndGet() == 2) {
                throw fatal;
            }
            return null;
        }).when(source).setNetworkTimeout(any(), anyInt());
        JdbcMetadataMigrationExecutor executor = executor(Runnable::run,
                (ignoredSource, ignoredTarget, kind, timeout, progress) -> { });

        assertThatThrownBy(() -> executor.execute(source, target, MetadataDatabaseKind.POSTGRESQL,
                        TIMEOUT, MetadataMigrationProgressSink.NO_OP))
                .isSameAs(fatal);

        verifyInvalidated(source, target);
    }

    private static void verifyInvalidated(Connection source, Connection target) throws Exception {
        verify(source).abort(any());
        verify(target).abort(any());
        verify(source).close();
        verify(target).close();
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
                Thread.ofPlatform().daemon(true).name("metadata-connection-test", 0).factory(),
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
