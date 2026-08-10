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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.mockito.Mockito;

@Timeout(15)
class TargetJdbcConnectionFactoryTest {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    @Test
    void successfulAcquirePublishesExactLeaseAndClearsTheWorkerPasswordCopy() throws Exception {
        Connection connection = mysqlConnection();
        AtomicReference<char[]> workerPassword = new AtomicReference<>();
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            assertThat(target.connectionUrl()).isEqualTo(
                    "jdbc:mysql://DB.Example/hertzbeat?sslMode=REQUIRED");
            assertThat(username).isEqualTo("operator");
            workerPassword.set(password);
            return connection;
        };
        try (TargetJdbcConnectionFactory factory = factory(connector);
                SecretValue password = SecretValue.of("secret")) {
            TargetJdbcConnectionLease lease = factory.acquire(settings(), password, deadline(TIMEOUT));

            lease.withConnection(actual -> assertThat(actual).isSameAs(connection));
            assertThat(lease.targetIdentityHash()).matches("[0-9a-f]{64}");
            assertThat(workerPassword.get()).containsOnly('\0');
            TargetJdbcConnectionLease second = factory.acquire(settings(), password, deadline(TIMEOUT));
            second.close();
            lease.close();
        }
    }

    @Test
    void connectorAndVerifierShareOneDeadlineAndExpiredConnectorBudgetGatesAllVerifierCalls()
            throws Exception {
        Connection connection = mysqlConnection();
        CountDownLatch cleaned = new CountDownLatch(1);
        Mockito.doAnswer(ignored -> {
            cleaned.countDown();
            return null;
        }).when(connection).close();
        AtomicLong ticker = new AtomicLong();
        JdbcMetadataMigrationDeadline root = JdbcMetadataMigrationDeadline.start(
                Duration.ofNanos(20), ticker::get);
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            assertThat(deadline).isSameAs(root);
            ticker.set(21L);
            return connection;
        };
        try (TargetJdbcConnectionFactory factory = factory(connector);
                SecretValue password = SecretValue.of("secret")) {
            assertThatThrownBy(() -> factory.acquire(settings(), password, root))
                    .isInstanceOfSatisfying(TargetJdbcConnectionException.class,
                            failure -> assertThat(failure.code()).isEqualTo(TargetJdbcConnectionErrorCode.TIMEOUT));
            assertThat(cleaned.await(5, TimeUnit.SECONDS)).isTrue();
        }

        verify(connection, times(0)).getAutoCommit();
        verify(connection).close();
    }

    @Test
    void timedOutConnectCannotPublishAndLateConnectionIsAbortedAndClosedBeforeReturn() throws Exception {
        Connection connection = mock(Connection.class);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch cleaned = new CountDownLatch(1);
        AtomicLong ticker = new AtomicLong();
        Mockito.doAnswer(ignored -> {
            cleaned.countDown();
            return null;
        }).when(connection).close();
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            ticker.set(21L);
            entered.countDown();
            awaitIgnoringInterrupt(release);
            return connection;
        };
        try (TargetJdbcConnectionFactory factory = factory(connector);
                ExecutorService caller = Executors.newSingleThreadExecutor();
                SecretValue password = SecretValue.of("secret")) {
            Future<TargetJdbcConnectionErrorCode> result = caller.submit(() -> failureCode(
                    () -> factory.acquire(settings(), password,
                            JdbcMetadataMigrationDeadline.start(Duration.ofNanos(20), ticker::get))));
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            assertThat(result.get(5, TimeUnit.SECONDS)).isEqualTo(TargetJdbcConnectionErrorCode.TIMEOUT);
            verify(connection, times(0)).close();
            release.countDown();
            assertThat(cleaned.await(5, TimeUnit.SECONDS)).isTrue();
        }

        verify(connection).abort(any());
        verify(connection).close();
    }

    @Test
    void resultPublishedBeforeAbandonmentWinsIsReplayedInsteadOfLeakedAsTimeout() throws Exception {
        Connection connection = mysqlConnection();
        TargetJdbcResultWaiter lateTimeout = (ready, ignored) -> {
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            return false;
        };
        try (TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(
                worker(), cleanupWorker(), Runnable::run,
                (target, username, password, deadline) -> connection,
                new TargetJdbcConnectionVerifier(Runnable::run), lateTimeout);
                SecretValue password = SecretValue.of("secret")) {
            TargetJdbcConnectionLease lease = factory.acquire(settings(), password, deadline(TIMEOUT));

            lease.withConnection(actual -> assertThat(actual).isSameAs(connection));
            lease.close();
        }
    }

    @Test
    void lateCleanupFailureIsVisibleAndRetainedForExactRetry() throws Exception {
        Connection connection = mock(Connection.class);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch cleanupAttempted = new CountDownLatch(1);
        AtomicLong ticker = new AtomicLong();
        AtomicInteger closes = new AtomicInteger();
        Mockito.doAnswer(ignored -> {
            if (closes.incrementAndGet() == 1) {
                cleanupAttempted.countDown();
                throw new SQLException("private late cleanup");
            }
            return null;
        }).when(connection).close();
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            ticker.set(21L);
            entered.countDown();
            awaitIgnoringInterrupt(release);
            return connection;
        };
        try (TargetJdbcConnectionFactory factory = factory(connector);
                SecretValue password = SecretValue.of("secret")) {
            assertThatThrownBy(() -> factory.acquire(settings(), password,
                    JdbcMetadataMigrationDeadline.start(Duration.ofNanos(20), ticker::get)))
                    .isInstanceOfSatisfying(TargetJdbcConnectionException.class,
                            failure -> assertThat(failure.code()).isEqualTo(TargetJdbcConnectionErrorCode.TIMEOUT));
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            release.countDown();
            assertThat(cleanupAttempted.await(5, TimeUnit.SECONDS)).isTrue();

            awaitFailure(factory, TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
            factory.retryCleanup(deadline(TIMEOUT));
            verify(connection, times(2)).close();
            assertFailure(factory, TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
        }
    }

    @Test
    void verifierCleanupFailurePoisonsFactoryAndRetainsExactCleanupForRetry() throws Exception {
        Connection connection = connectionWith(
                "MySQL", "jdbc:mysql://other.example/hertzbeat", "hertzbeat", null);
        doThrow(new SQLException("private cleanup path")).doNothing().when(connection).close();
        AtomicInteger connects = new AtomicInteger();
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            connects.incrementAndGet();
            return connection;
        };
        try (TargetJdbcConnectionFactory factory = factory(connector)) {
            assertFailure(factory, TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
            assertFailure(factory, TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
            assertThat(connects).hasValue(1);

            factory.retryCleanup(deadline(TIMEOUT));
            verify(connection, times(2)).close();
            assertFailure(factory, TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
        }
    }

    @Test
    void cleanupErrorPoisonsFactoryWithoutLosingTheExactConnection() throws Exception {
        Connection connection = connectionWith(
                "MySQL", "jdbc:mysql://other.example/hertzbeat", "hertzbeat", null);
        AssertionError fatal = new AssertionError("private cleanup fatal");
        doThrow(fatal).doNothing().when(connection).close();
        try (TargetJdbcConnectionFactory factory = factory(
                (target, username, password, deadline) -> connection);
                SecretValue password = SecretValue.of("secret")) {
            assertThatThrownBy(() -> factory.acquire(settings(), password, deadline(TIMEOUT))).isSameAs(fatal);
            assertFailure(factory, TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
            factory.retryCleanup(deadline(TIMEOUT));
            verify(connection, times(2)).close();
        }
    }

    @Test
    void blockedCleanupRetryReturnsAtDeadlineAndRetainsExactHandleUntilItConverges() throws Exception {
        Connection connection = connectionWith(
                "MySQL", "jdbc:mysql://other.example/hertzbeat", "hertzbeat", null);
        CountDownLatch cleanupEntered = new CountDownLatch(1);
        CountDownLatch releaseCleanup = new CountDownLatch(1);
        CountDownLatch cleanupFinished = new CountDownLatch(1);
        AtomicInteger closes = new AtomicInteger();
        AtomicLong ticker = new AtomicLong();
        Mockito.doAnswer(ignored -> {
            int current = closes.incrementAndGet();
            if (current == 1) {
                throw new SQLException("private verification cleanup");
            }
            cleanupEntered.countDown();
            ticker.set(21L);
            awaitIgnoringInterrupt(releaseCleanup);
            cleanupFinished.countDown();
            return null;
        }).when(connection).close();
        try (TargetJdbcConnectionFactory factory = factory(
                (target, username, password, deadline) -> connection)) {
            assertFailure(factory, TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);

            assertThatThrownBy(() -> factory.retryCleanup(
                    JdbcMetadataMigrationDeadline.start(Duration.ofNanos(20), ticker::get)))
                    .isInstanceOfSatisfying(TargetJdbcConnectionException.class,
                            failure -> assertThat(failure.code())
                                    .isEqualTo(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED));
            assertThat(cleanupEntered.await(5, TimeUnit.SECONDS)).isTrue();
            assertFailure(factory, TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
            releaseCleanup.countDown();
            assertThat(cleanupFinished.await(5, TimeUnit.SECONDS)).isTrue();
            awaitFailure(factory, TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
            verify(connection, times(2)).close();
        } finally {
            releaseCleanup.countDown();
        }
    }

    @Test
    void fatalBeforeConnectionPoisonsFactory() {
        AssertionError fatal = new AssertionError("private provider fatal");
        try (TargetJdbcConnectionFactory factory = factory(
                (target, username, password, deadline) -> { throw fatal; });
                SecretValue password = SecretValue.of("secret")) {
            assertThatThrownBy(() -> factory.acquire(settings(), password, deadline(TIMEOUT))).isSameAs(fatal);
            assertFailure(factory, TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
        }
    }

    @Test
    void fatalAfterTimeoutIsRetainedInTheOwnedWorkerFailureChannel() throws Exception {
        AssertionError fatal = new AssertionError("private late provider fatal");
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch exited = new CountDownLatch(1);
        AtomicLong ticker = new AtomicLong();
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            ticker.set(21L);
            entered.countDown();
            try {
                awaitIgnoringInterrupt(release);
                throw fatal;
            } finally {
                exited.countDown();
            }
        };
        try (TargetJdbcConnectionFactory factory = factory(connector);
                SecretValue password = SecretValue.of("secret")) {
            assertThatThrownBy(() -> factory.acquire(settings(), password,
                    JdbcMetadataMigrationDeadline.start(Duration.ofNanos(20), ticker::get)))
                    .isInstanceOfSatisfying(TargetJdbcConnectionException.class,
                            failure -> assertThat(failure.code()).isEqualTo(TargetJdbcConnectionErrorCode.TIMEOUT));
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            release.countDown();
            assertThat(exited.await(5, TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> factory.acquire(settings(), password, deadline(TIMEOUT))).isSameAs(fatal);
        } finally {
            release.countDown();
        }
    }

    @Test
    void factoryRejectsConcurrentAcquireAndPermanentlyRejectsAfterClose() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            entered.countDown();
            awaitIgnoringInterrupt(release);
            return mysqlConnection();
        };
        TargetJdbcConnectionFactory factory = factory(connector);
        try (ExecutorService caller = Executors.newSingleThreadExecutor()) {
            Future<?> active = caller.submit(() -> {
                try (SecretValue password = SecretValue.of("secret")) {
                    return factory.acquire(settings(), password, deadline(TIMEOUT));
                }
            });
            try {
                assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
                assertFailure(factory, TargetJdbcConnectionErrorCode.OPERATION_CONFLICT);
            } finally {
                release.countDown();
            }
            TargetJdbcConnectionLease lease = (TargetJdbcConnectionLease) active.get(5, TimeUnit.SECONDS);
            lease.close();
        }
        factory.close();
        assertFailure(factory, TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
    }

    @Test
    void closeWakesActiveCallerWithoutWaitingForStuckConnectAndCleansLateConnection() throws Exception {
        Connection connection = mock(Connection.class);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch closed = new CountDownLatch(1);
        Mockito.doAnswer(ignored -> {
            closed.countDown();
            return null;
        }).when(connection).close();
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            entered.countDown();
            awaitIgnoringInterrupt(release);
            return connection;
        };
        TargetJdbcConnectionFactory factory = factory(connector);
        try (ExecutorService caller = Executors.newSingleThreadExecutor();
                SecretValue password = SecretValue.of("secret")) {
            Future<TargetJdbcConnectionErrorCode> result = caller.submit(() -> failureCode(
                    () -> factory.acquire(settings(), password, deadline(TIMEOUT))));
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();

            factory.close();
            assertThat(result.get(5, TimeUnit.SECONDS)).isEqualTo(TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
            verify(connection, times(0)).close();
            release.countDown();
            assertThat(closed.await(5, TimeUnit.SECONDS)).isTrue();
        } finally {
            release.countDown();
            factory.close();
        }
        verify(connection).abort(any());
        verify(connection).close();
    }

    @Test
    void lateCleanupClearsWorkerInterruptDuringDriverCallsAndRestoresItAfterward() throws Exception {
        Connection connection = mock(Connection.class);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch cleanupExited = new CountDownLatch(1);
        AtomicBoolean restored = new AtomicBoolean();
        AtomicLong ticker = new AtomicLong();
        ThreadPoolExecutor interruptedCleanupWorker = new ThreadPoolExecutor(
                0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>(),
                Thread.ofPlatform().daemon(true).name("target-jdbc-interrupt-cleanup", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy()) {
            @Override
            protected void beforeExecute(Thread thread, Runnable task) {
                thread.interrupt();
            }

            @Override
            protected void afterExecute(Runnable task, Throwable failure) {
                restored.set(Thread.currentThread().isInterrupted());
                cleanupExited.countDown();
            }
        };
        interruptedCleanupWorker.allowCoreThreadTimeOut(true);
        Mockito.doAnswer(ignored -> {
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
            return null;
        }).when(connection).abort(any());
        Mockito.doAnswer(ignored -> {
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
            Thread.currentThread().interrupt();
            return null;
        }).when(connection).close();
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            ticker.set(21L);
            entered.countDown();
            awaitIgnoringInterrupt(release);
            return connection;
        };
        try (TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(
                worker(), interruptedCleanupWorker, Runnable::run, connector,
                new TargetJdbcConnectionVerifier(Runnable::run));
                SecretValue password = SecretValue.of("secret")) {
            assertThatThrownBy(() -> factory.acquire(settings(), password,
                    JdbcMetadataMigrationDeadline.start(Duration.ofNanos(20), ticker::get)))
                    .isInstanceOf(TargetJdbcConnectionException.class);
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            release.countDown();
            assertThat(cleanupExited.await(5, TimeUnit.SECONDS)).isTrue();
            assertThat(restored).isTrue();
        } finally {
            release.countDown();
            interruptedCleanupWorker.shutdownNow();
        }
    }

    private static TargetJdbcConnectionFactory factory(TargetJdbcConnector connector) {
        return new TargetJdbcConnectionFactory(
                worker(), cleanupWorker(), Runnable::run, connector,
                new TargetJdbcConnectionVerifier(Runnable::run));
    }

    private static ThreadPoolExecutor worker() {
        ThreadPoolExecutor worker = new ThreadPoolExecutor(
                0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>(),
                Thread.ofPlatform().daemon(true).name("target-jdbc-test", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy());
        worker.allowCoreThreadTimeOut(true);
        return worker;
    }

    private static ThreadPoolExecutor cleanupWorker() {
        ThreadPoolExecutor worker = new ThreadPoolExecutor(
                0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>(),
                Thread.ofPlatform().daemon(true).name("target-jdbc-cleanup-test", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy());
        worker.allowCoreThreadTimeOut(true);
        return worker;
    }

    private static MetadataDatabaseSettings settings() {
        return new MetadataDatabaseSettings(
                MetadataDatabaseKind.MYSQL,
                "jdbc:mysql://DB.Example/hertzbeat?sslMode=REQUIRED", "operator");
    }

    private static JdbcMetadataMigrationDeadline deadline(Duration timeout) {
        return JdbcMetadataMigrationDeadline.start(timeout, System::nanoTime);
    }

    private static void assertFailure(
            TargetJdbcConnectionFactory factory, TargetJdbcConnectionErrorCode expected) {
        assertThatThrownBy(() -> {
            try (SecretValue password = SecretValue.of("secret")) {
                factory.acquire(settings(), password, deadline(TIMEOUT));
            }
        })
                .isInstanceOfSatisfying(TargetJdbcConnectionException.class, failure -> {
                    assertThat(failure.code()).isEqualTo(expected);
                    assertThat(failure).hasNoCause();
                });
    }

    private static void awaitFailure(
            TargetJdbcConnectionFactory factory, TargetJdbcConnectionErrorCode expected) {
        long limit = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (true) {
            try {
                assertFailure(factory, expected);
                return;
            } catch (AssertionError notReady) {
                if (System.nanoTime() >= limit) {
                    throw notReady;
                }
                Thread.onSpinWait();
            }
        }
    }

    private static TargetJdbcConnectionErrorCode failureCode(Runnable action) {
        try {
            action.run();
            throw new AssertionError("Expected target JDBC connection failure");
        } catch (TargetJdbcConnectionException failure) {
            return failure.code();
        }
    }

    private static Connection mysqlConnection() throws SQLException {
        return connectionWith(
                "MySQL", "jdbc:mysql://db.example/hertzbeat?sslmode=required", "hertzbeat", null);
    }

    private static Connection connectionWith(
            String product, String actualUrl, String catalog, String schema) throws SQLException {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getAutoCommit()).thenReturn(true);
        when(connection.isReadOnly()).thenReturn(false);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn(product);
        when(metadata.getURL()).thenReturn(actualUrl);
        when(connection.getCatalog()).thenReturn(catalog);
        when(connection.getSchema()).thenReturn(schema);
        return connection;
    }

    private static void awaitIgnoringInterrupt(CountDownLatch latch) {
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
}
