/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

@Timeout(10)
class TargetJdbcConnectionLeaseTest {

    private static final String IDENTITY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @Test
    void leaseExposesOnlyHashAndTheExactScopedConnection() {
        Connection connection = mock(Connection.class);
        TargetJdbcConnectionLease lease = new TargetJdbcConnectionLease(connection, IDENTITY);

        lease.withConnection(actual -> assertThat(actual).isSameAs(connection));

        assertThat(lease.targetIdentityHash()).isEqualTo(IDENTITY);
        assertThat(lease.toString()).contains(IDENTITY).doesNotContain("jdbc", "password", "user");
    }

    @Test
    void nestedCallbackAndCallbackLocalCloseFailFastBeforeClosing() throws Exception {
        Connection connection = mock(Connection.class);
        TargetJdbcConnectionLease lease = new TargetJdbcConnectionLease(connection, IDENTITY);

        lease.withConnection(ignored -> {
            assertConflict(() -> lease.withConnection(nested -> { }));
            assertConflict(lease::close);
        });

        verify(connection, times(0)).close();
        lease.close();
        verify(connection).close();
    }

    @Test
    void crossThreadCloseWaitsForCallbackAndClosesExactlyOnce() throws Exception {
        Connection connection = mock(Connection.class);
        TargetJdbcConnectionLease lease = new TargetJdbcConnectionLease(connection, IDENTITY);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch closeEntered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        AtomicReference<Thread> closerThread = new AtomicReference<>();
        try (ExecutorService callers = Executors.newFixedThreadPool(2)) {
            Future<?> callback = callers.submit(() -> lease.withConnection(ignored -> {
                entered.countDown();
                await(release);
            }));
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            Future<?> close = callers.submit(() -> {
                closerThread.set(Thread.currentThread());
                closeEntered.countDown();
                lease.close();
            });
            try {
                assertThat(closeEntered.await(5, TimeUnit.SECONDS)).isTrue();
                awaitState(closerThread.get(), Thread.State.WAITING);
                assertThat(close.isDone()).isFalse();
                verify(connection, times(0)).close();
            } finally {
                release.countDown();
            }
            callback.get(5, TimeUnit.SECONDS);
            close.get(5, TimeUnit.SECONDS);
        }

        lease.close();
        verify(connection).close();
    }

    @Test
    void closeFailureIsSafeAndRetryableWhileFatalErrorRetainsPriority() throws Exception {
        Connection connection = mock(Connection.class);
        AtomicInteger closes = new AtomicInteger();
        SQLException unavailable = new SQLException("jdbc:postgresql://private/password");
        org.mockito.Mockito.doAnswer(invocation -> {
            if (closes.getAndIncrement() == 0) {
                throw unavailable;
            }
            return null;
        }).when(connection).close();
        TargetJdbcConnectionLease lease = new TargetJdbcConnectionLease(connection, IDENTITY);

        assertThatThrownBy(lease::close)
                .isInstanceOfSatisfying(TargetJdbcConnectionException.class, failure -> {
                    assertThat(failure.code()).isEqualTo(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
                    assertThat(failure).hasNoCause();
                    assertThat(failure.getMessage()).doesNotContain("private", "password");
                });
        lease.close();
        verify(connection, times(2)).close();

        Connection fatalConnection = mock(Connection.class);
        AssertionError fatal = new AssertionError("private cleanup diagnostic");
        org.mockito.Mockito.doThrow(fatal).doNothing().when(fatalConnection).close();
        TargetJdbcConnectionLease fatalLease = new TargetJdbcConnectionLease(fatalConnection, IDENTITY);
        assertThatThrownBy(fatalLease::close).isSameAs(fatal);
        fatalLease.close();
        verify(fatalConnection, times(2)).close();
    }

    @Test
    void normalCloseClearsInterruptDuringDriverCleanupAndRestoresItAfterward() throws Exception {
        Connection connection = mock(Connection.class);
        org.mockito.Mockito.doAnswer(invocation -> {
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
            return null;
        }).when(connection).close();
        TargetJdbcConnectionLease lease = new TargetJdbcConnectionLease(connection, IDENTITY);

        Thread.currentThread().interrupt();
        try {
            lease.close();
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void retryableCloseRestoresInterruptAfterEveryAttempt() throws Exception {
        Connection connection = mock(Connection.class);
        AtomicInteger closes = new AtomicInteger();
        org.mockito.Mockito.doAnswer(invocation -> {
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
            if (closes.getAndIncrement() == 0) {
                throw new SQLException("private cleanup diagnostic");
            }
            return null;
        }).when(connection).close();
        TargetJdbcConnectionLease lease = new TargetJdbcConnectionLease(connection, IDENTITY);

        Thread.currentThread().interrupt();
        try {
            assertThatThrownBy(lease::close).isInstanceOf(TargetJdbcConnectionException.class);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
            Thread.interrupted();
            Thread.currentThread().interrupt();
            lease.close();
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    private static void assertConflict(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(TargetJdbcConnectionException.class, failure ->
                        assertThat(failure.code()).isEqualTo(TargetJdbcConnectionErrorCode.OPERATION_CONFLICT));
    }

    private static void await(CountDownLatch release) {
        boolean interrupted = false;
        while (true) {
            try {
                release.await();
                break;
            } catch (InterruptedException ignored) {
                interrupted = true;
            }
        }
        if (interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    private static void awaitState(Thread thread, Thread.State expected) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (thread.getState() != expected && System.nanoTime() - deadline < 0) {
            Thread.onSpinWait();
        }
        assertThat(thread.getState()).isEqualTo(expected);
    }
}
