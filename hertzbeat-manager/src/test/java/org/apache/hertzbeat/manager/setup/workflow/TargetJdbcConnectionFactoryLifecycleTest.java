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
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

@Timeout(15)
class TargetJdbcConnectionFactoryLifecycleTest {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    @Test
    void defaultFactoryRejectsConcurrentAcquireWithoutQueuing() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            entered.countDown();
            awaitIgnoringInterrupt(release);
            return mysqlConnection();
        };
        try (TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(connector, Runnable::run);
                ExecutorService caller = Executors.newSingleThreadExecutor()) {
            Future<TargetJdbcConnectionLease> first = caller.submit(() -> {
                try (SecretValue password = SecretValue.of("secret")) {
                    return factory.acquire(settings(), password, deadline());
                }
            });
            try {
                assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
                assertFailure(factory, TargetJdbcConnectionErrorCode.OPERATION_CONFLICT);
            } finally {
                release.countDown();
            }
            first.get(5, TimeUnit.SECONDS).close();
        } finally {
            release.countDown();
        }
    }

    @Test
    void rejectedSubmissionClearsActiveSlotAndReturnsStableFailure() {
        ThreadPoolExecutor rejectingWorker = worker();
        rejectingWorker.shutdown();
        try (TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(
                rejectingWorker, worker(), Runnable::run,
                (target, username, password, deadline) -> mysqlConnection(),
                new TargetJdbcConnectionVerifier(Runnable::run))) {
            assertFailure(factory, TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
            assertFailure(factory, TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
        }
    }

    @Test
    void unexpectedSubmissionFatalClearsTheActiveSlotAndRemainsPrimary() {
        AssertionError fatal = new AssertionError("private submit fatal");
        AtomicBoolean first = new AtomicBoolean(true);
        ThreadPoolExecutor rejectingWorker = new ThreadPoolExecutor(
                0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>()) {
            @Override
            public void execute(Runnable task) {
                if (first.getAndSet(false)) {
                    throw fatal;
                }
                task.run();
            }
        };
        try (TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(
                rejectingWorker, worker(), Runnable::run,
                (target, username, password, deadline) -> mysqlConnection(),
                new TargetJdbcConnectionVerifier(Runnable::run))) {
            assertThatThrownBy(() -> acquire(factory)).isSameAs(fatal);
            assertThatThrownBy(() -> acquire(factory)).isSameAs(fatal);
        }
    }

    @Test
    void unexpectedSubmissionRuntimeIsRedactedAndPermanentlyClosesFactory() {
        AtomicBoolean first = new AtomicBoolean(true);
        ThreadPoolExecutor rejectingWorker = new ThreadPoolExecutor(
                0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>()) {
            @Override
            public void execute(Runnable task) {
                if (first.getAndSet(false)) {
                    throw new IllegalStateException("private submit runtime");
                }
                task.run();
            }
        };
        try (TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(
                rejectingWorker, worker(), Runnable::run,
                (target, username, password, deadline) -> mysqlConnection(),
                new TargetJdbcConnectionVerifier(Runnable::run))) {
            assertFailure(factory, TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
            assertFailure(factory, TargetJdbcConnectionErrorCode.FACTORY_CLOSED);
        }
    }

    @Test
    void finishedFatalIsPublishedAsPrimaryAndPoisonsTheExactConnection() throws Exception {
        Connection connection = mysqlConnection();
        AssertionError fatal = new AssertionError("private owner fatal");
        FailingAttemptOwner owner = new FailingAttemptOwner(fatal);
        char[] password = "secret".toCharArray();
        TargetJdbcConnectionAttempt attempt = attempt(owner, connection, password);

        attempt.run();

        assertThatThrownBy(attempt::await).isSameAs(fatal);
        assertThat(owner.poisoned()).isSameAs(connection);
        assertThat(password).containsOnly('\0');
    }

    @Test
    void finishedRuntimeIsPublishedAsCauseFreeUnavailableAndPoisonsTheExactConnection() throws Exception {
        Connection connection = mysqlConnection();
        FailingAttemptOwner owner = new FailingAttemptOwner(
                new IllegalStateException("private owner runtime"));
        TargetJdbcConnectionAttempt attempt = attempt(owner, connection, "secret".toCharArray());

        attempt.run();

        assertThatThrownBy(attempt::await)
                .isInstanceOfSatisfying(TargetJdbcConnectionException.class, failure -> {
                    assertThat(failure.code()).isEqualTo(TargetJdbcConnectionErrorCode.UNAVAILABLE);
                    assertThat(failure).hasNoCause();
                });
        assertThat(owner.poisoned()).isSameAs(connection);
    }

    @Test
    void connectorSqlAndRuntimeFailuresAreCauseFreeAndDoNotPoisonTheFactory() {
        AtomicBoolean sql = new AtomicBoolean(true);
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            if (sql.getAndSet(false)) {
                throw new SQLException("private SQL diagnostic");
            }
            throw new IllegalStateException("private runtime diagnostic");
        };
        try (TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(connector, Runnable::run)) {
            assertFailure(factory, TargetJdbcConnectionErrorCode.UNAVAILABLE);
            assertFailure(factory, TargetJdbcConnectionErrorCode.UNAVAILABLE);
        }
    }

    @Test
    void interruptedCallerReturnsStableTimeoutWithItsInterruptRestored() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        TargetJdbcConnector connector = (target, username, password, deadline) -> {
            entered.countDown();
            awaitIgnoringInterrupt(release);
            return mock(Connection.class);
        };
        try (TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(connector, Runnable::run);
                ExecutorService caller = Executors.newSingleThreadExecutor()) {
            AtomicReference<Thread> callerThread = new AtomicReference<>();
            Future<InterruptedResult> result = caller.submit(() -> {
                callerThread.set(Thread.currentThread());
                TargetJdbcConnectionErrorCode code = failureCode(() -> acquire(factory));
                return new InterruptedResult(code, Thread.currentThread().isInterrupted());
            });
            try {
                assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
                callerThread.get().interrupt();
                assertThat(result.get(5, TimeUnit.SECONDS)).isEqualTo(
                        new InterruptedResult(TargetJdbcConnectionErrorCode.TIMEOUT, true));
            } finally {
                release.countDown();
            }
        } finally {
            release.countDown();
        }
    }

    @Test
    void closeAfterResultPublicationDoesNotTakeOwnershipOfTheReturnedLease() throws Exception {
        Connection connection = mysqlConnection();
        AtomicReference<TargetJdbcConnectionFactory> factoryRef = new AtomicReference<>();
        TargetJdbcResultWaiter closeAfterPublication = (ready, remaining) -> {
            assertThat(ready.await(remaining, TimeUnit.NANOSECONDS)).isTrue();
            factoryRef.get().close();
            return true;
        };
        TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(
                worker(), worker(), Runnable::run,
                (target, username, password, deadline) -> connection,
                new TargetJdbcConnectionVerifier(Runnable::run), closeAfterPublication);
        factoryRef.set(factory);
        try (factory; SecretValue password = SecretValue.of("secret")) {
            TargetJdbcConnectionLease lease = factory.acquire(settings(), password, deadline());
            verify(connection, times(0)).close();
            lease.close();
            verify(connection).close();
        }
    }

    private static TargetJdbcConnectionLease acquire(TargetJdbcConnectionFactory factory) {
        try (SecretValue password = SecretValue.of("secret")) {
            return factory.acquire(settings(), password, deadline());
        }
    }

    private static TargetJdbcConnectionAttempt attempt(
            TargetJdbcConnectionAttemptOwner owner, Connection connection, char[] password) {
        TargetJdbcResultWaiter published = (ready, remaining) -> {
            assertThat(ready.getCount()).isZero();
            return true;
        };
        return new TargetJdbcConnectionAttempt(
                owner, (target, username, ignored, deadline) -> connection,
                new TargetJdbcConnectionVerifier(Runnable::run),
                TargetJdbcUrl.parse(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db.example/hertzbeat"),
                "operator", password, deadline(), published);
    }

    private static void assertFailure(
            TargetJdbcConnectionFactory factory, TargetJdbcConnectionErrorCode expected) {
        assertThatThrownBy(() -> acquire(factory))
                .isInstanceOfSatisfying(TargetJdbcConnectionException.class, failure -> {
                    assertThat(failure.code()).isEqualTo(expected);
                    assertThat(failure).hasNoCause();
                });
    }

    private static TargetJdbcConnectionErrorCode failureCode(Runnable action) {
        try {
            action.run();
            throw new AssertionError("Expected target JDBC connection failure");
        } catch (TargetJdbcConnectionException failure) {
            return failure.code();
        }
    }

    private static MetadataDatabaseSettings settings() {
        return new MetadataDatabaseSettings(
                MetadataDatabaseKind.MYSQL,
                "jdbc:mysql://db.example/hertzbeat?sslMode=REQUIRED", "operator");
    }

    private static JdbcMetadataMigrationDeadline deadline() {
        return JdbcMetadataMigrationDeadline.start(TIMEOUT, System::nanoTime);
    }

    private static ThreadPoolExecutor worker() {
        ThreadPoolExecutor worker = new ThreadPoolExecutor(
                0, 1, 30, TimeUnit.SECONDS, new SynchronousQueue<>(),
                Thread.ofPlatform().daemon(true).name("target-jdbc-lifecycle-test", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy());
        worker.allowCoreThreadTimeOut(true);
        return worker;
    }

    private static Connection mysqlConnection() throws SQLException {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getAutoCommit()).thenReturn(true);
        when(connection.isReadOnly()).thenReturn(false);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn("MySQL");
        when(metadata.getURL()).thenReturn("jdbc:mysql://db.example/hertzbeat");
        when(connection.getCatalog()).thenReturn("hertzbeat");
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

    private record InterruptedResult(TargetJdbcConnectionErrorCode code, boolean interrupted) {
    }

    private static final class FailingAttemptOwner implements TargetJdbcConnectionAttemptOwner {

        private final Throwable failure;
        private Connection poisoned;

        private FailingAttemptOwner(Throwable failure) {
            this.failure = failure;
        }

        @Override
        public void poison(Connection connection) {
            poisoned = connection;
        }

        @Override
        public void cleanupLate(Connection connection) {
            throw new AssertionError("Unexpected late cleanup");
        }

        @Override
        public void lateFatal(Error fatal, Connection connection) {
            throw new AssertionError("Unexpected late fatal");
        }

        @Override
        public void finished(TargetJdbcConnectionAttempt attempt) {
            if (failure instanceof Error fatal) {
                throw fatal;
            }
            throw (RuntimeException) failure;
        }

        private Connection poisoned() {
            return poisoned;
        }
    }
}
