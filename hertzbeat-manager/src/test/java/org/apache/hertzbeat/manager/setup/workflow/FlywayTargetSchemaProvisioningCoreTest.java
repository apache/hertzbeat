/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
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
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

class FlywayTargetSchemaProvisioningCoreTest {

    @Test
    void mysqlUsesExactCallerConnectionWithoutOwningItsLifecycle() throws Exception {
        Connection connection = idleConnection(MetadataDatabaseKind.MYSQL);
        FlywayTargetSchemaProvisioningCore core = core((actual, budget) -> {
            assertThat(actual).isSameAs(connection);
            budget.check();
        });

        TargetSchemaProvisioningOutcome outcome = core.provision(
                connection, MetadataDatabaseKind.MYSQL, deadline(Duration.ofSeconds(5)));

        assertThat(outcome.disposition()).isEqualTo(TargetSchemaConnectionDisposition.REUSABLE);
        verify(connection, never()).setAutoCommit(false);
        verify(connection, never()).commit();
        verify(connection, never()).rollback();
        verify(connection, never()).close();
    }

    @Test
    void postgresqlRestoresCallerStateAfterKnownCommit() throws Exception {
        Connection connection = postgresConnection();

        TargetSchemaProvisioningOutcome outcome = core((actual, budget) -> budget.check())
                .provision(connection, MetadataDatabaseKind.POSTGRESQL, deadline(Duration.ofSeconds(5)));

        assertThat(outcome.disposition()).isEqualTo(TargetSchemaConnectionDisposition.REUSABLE);
        verify(connection).setAutoCommit(false);
        verify(connection).commit();
        verify(connection).setAutoCommit(true);
        verify(connection, never()).rollback();
        verify(connection, never()).close();
    }

    @Test
    void postgresqlCommitFailureIsOutcomeUnknownAndNeverRollsBack() throws Exception {
        Connection connection = postgresConnection();
        doThrow(new SQLException("private commit diagnostic", "08006", 91)).when(connection).commit();

        assertThatThrownBy(() -> core((actual, budget) -> { })
                        .provision(connection, MetadataDatabaseKind.POSTGRESQL, deadline(Duration.ofSeconds(5))))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure -> {
                    assertThat(failure.failure().phase())
                            .isEqualTo(TargetSchemaProvisioningFailure.Phase.COMMIT_OUTCOME_UNKNOWN);
                    assertThat(failure.disposition())
                            .isEqualTo(TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
                    assertThat(failure).hasNoCause();
                });
        verify(connection, never()).rollback();
        verify(connection, never()).setAutoCommit(true);
        verify(connection, never()).close();
    }

    @Test
    void postgresqlKnownRollbackPreservesOriginalFailureAndRestoresState() throws Exception {
        Connection connection = postgresConnection();
        TargetSchemaProvisioningException original = failure(
                TargetSchemaProvisioningFailure.Phase.BASELINE_EXECUTION,
                TargetSchemaConnectionDisposition.REUSABLE);

        assertThatThrownBy(() -> core((actual, budget) -> {
            throw original;
        }).provision(connection, MetadataDatabaseKind.POSTGRESQL, deadline(Duration.ofSeconds(5))))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure -> {
                    assertThat(failure.failure()).isEqualTo(original.failure());
                    assertThat(failure.disposition()).isEqualTo(TargetSchemaConnectionDisposition.REUSABLE);
                });
        verify(connection).rollback();
        verify(connection).setAutoCommit(true);
        verify(connection, never()).close();
    }

    @Test
    void postgresqlRollbackFailureOutranksOperationFailure() throws Exception {
        Connection connection = postgresConnection();
        doThrow(new SQLException("private rollback diagnostic", "08006", 92)).when(connection).rollback();

        assertThatThrownBy(() -> core((actual, budget) -> {
            throw failure(TargetSchemaProvisioningFailure.Phase.HISTORY_WRITE,
                    TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        }).provision(connection, MetadataDatabaseKind.POSTGRESQL, deadline(Duration.ofSeconds(5))))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure -> {
                    assertThat(failure.failure().phase())
                            .isEqualTo(TargetSchemaProvisioningFailure.Phase.ROLLBACK_OUTCOME_UNKNOWN);
                    assertThat(failure.disposition())
                            .isEqualTo(TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
                    assertThat(failure).hasNoCause();
                });
        verify(connection, never()).setAutoCommit(true);
        verify(connection, never()).close();
    }

    @Test
    void postCommitStateRestoreFailureDoesNotTurnKnownSchemaSuccessIntoFailure() throws Exception {
        Connection connection = postgresConnection();
        doThrow(new SQLException("private restore diagnostic", "08006", 93))
                .when(connection).setAutoCommit(true);

        TargetSchemaProvisioningOutcome outcome = core((actual, budget) -> { })
                .provision(connection, MetadataDatabaseKind.POSTGRESQL, deadline(Duration.ofSeconds(5)));

        assertThat(outcome.disposition())
                .isEqualTo(TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        verify(connection).commit();
        verify(connection, never()).close();
    }

    @Test
    void mysqlMutationFailureIsFailClosedWithoutTransactionCompensation() throws Exception {
        Connection connection = idleConnection(MetadataDatabaseKind.MYSQL);

        assertThatThrownBy(() -> core((actual, budget) -> {
            throw failure(TargetSchemaProvisioningFailure.Phase.BASELINE_EXECUTION,
                    TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        }).provision(connection, MetadataDatabaseKind.MYSQL, deadline(Duration.ofSeconds(5))))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure ->
                        assertThat(failure.disposition())
                                .isEqualTo(TargetSchemaConnectionDisposition.DISCARD_REQUIRED));
        verify(connection, never()).commit();
        verify(connection, never()).rollback();
        verify(connection, never()).setAutoCommit(false);
        verify(connection, never()).close();
    }

    @Test
    void exactDeadlineFailureHasStablePhaseAndLeavesUntouchedConnectionReusable() {
        Connection connection = idleConnection(MetadataDatabaseKind.MYSQL);

        assertThatThrownBy(() -> core((actual, budget) -> budget.check())
                        .provision(connection, MetadataDatabaseKind.MYSQL, expiredDeadline()))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure -> {
                    assertThat(failure.failure().phase())
                            .isEqualTo(TargetSchemaProvisioningFailure.Phase.DEADLINE);
                    assertThat(failure.disposition()).isEqualTo(TargetSchemaConnectionDisposition.REUSABLE);
                });
    }

    @Test
    @Timeout(5)
    void lockWaitConsumesTheExactDeadlineAndNeverRunsSchemaWork() throws Exception {
        ReentrantLock lock = new ReentrantLock();
        CountDownLatch locked = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
            Future<?> owner = worker.submit(() -> {
                lock.lock();
                try {
                    locked.countDown();
                    release.await();
                } finally {
                    lock.unlock();
                }
                return null;
            });
            assertThat(locked.await(2, TimeUnit.SECONDS)).isTrue();
            Connection connection = mock(Connection.class);
            FlywayTargetSchemaProvisioningCore core = new FlywayTargetSchemaProvisioningCore(
                    lock, (actual, budget) -> {
                        throw new AssertionError("schema work must not run after lock timeout");
                    });
            try {
                assertThatThrownBy(() -> core.provision(
                                connection, MetadataDatabaseKind.MYSQL, deadline(Duration.ofMillis(20))))
                        .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure -> {
                            assertThat(failure.failure().phase())
                                    .isEqualTo(TargetSchemaProvisioningFailure.Phase.DEADLINE);
                            assertThat(failure.disposition())
                                    .isEqualTo(TargetSchemaConnectionDisposition.REUSABLE);
                        });
            } finally {
                release.countDown();
            }
            owner.get(2, TimeUnit.SECONDS);
        }
    }

    @Test
    void interruptedLockWaitRestoresCallerInterruptStatus() {
        ReentrantLock lock = new ReentrantLock();
        try {
            Thread.currentThread().interrupt();
            assertThatThrownBy(() -> new FlywayTargetSchemaProvisioningCore(lock, (actual, budget) -> { })
                            .provision(mock(Connection.class), MetadataDatabaseKind.MYSQL,
                                    deadline(Duration.ofSeconds(5))))
                    .isInstanceOf(TargetSchemaProvisioningException.class);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    private static FlywayTargetSchemaProvisioningCore core(TargetSchemaProvisioningWork work) {
        return new FlywayTargetSchemaProvisioningCore(new ReentrantLock(), work);
    }

    private static Connection postgresConnection() {
        return idleConnection(MetadataDatabaseKind.POSTGRESQL);
    }

    private static Connection idleConnection(MetadataDatabaseKind kind) {
        try {
            Connection connection = mock(Connection.class);
            DatabaseMetaData metadata = mock(DatabaseMetaData.class);
            when(connection.getAutoCommit()).thenReturn(true);
            when(connection.isReadOnly()).thenReturn(false);
            when(connection.getMetaData()).thenReturn(metadata);
            when(metadata.getDatabaseProductName()).thenReturn(switch (kind) {
                case MYSQL -> "MySQL";
                case POSTGRESQL -> "PostgreSQL";
                case H2 -> "H2";
            });
            return connection;
        } catch (Exception failure) {
            throw new AssertionError(failure);
        }
    }

    private static JdbcMetadataMigrationDeadline deadline(Duration duration) {
        return JdbcMetadataMigrationDeadline.start(duration, System::nanoTime);
    }

    private static JdbcMetadataMigrationDeadline expiredDeadline() {
        long[] ticks = {0, 2};
        int[] index = {0};
        return JdbcMetadataMigrationDeadline.start(
                Duration.ofNanos(1), () -> ticks[Math.min(index[0]++, ticks.length - 1)]);
    }

    private static TargetSchemaProvisioningException failure(
            TargetSchemaProvisioningFailure.Phase phase,
            TargetSchemaConnectionDisposition disposition) {
        return new TargetSchemaProvisioningException(
                MetadataDatabaseKind.MYSQL,
                new TargetSchemaProvisioningFailure(phase, TargetSchemaBaseline.VERSION, null, 0),
                disposition);
    }
}
