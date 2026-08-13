/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doAnswer;
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
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

class FlywayTargetSchemaProvisioningSafetyTest {

    @Test
    void mysqlRequiresIdleWritableConnectionBeforeWork() throws Exception {
        Connection connection = idleConnection(MetadataDatabaseKind.MYSQL);
        when(connection.isReadOnly()).thenReturn(true);

        assertThatThrownBy(() -> core((actual, budget) -> {
            throw new AssertionError("read-only target must not run schema work");
        }).provision(connection, MetadataDatabaseKind.MYSQL, deadline(Duration.ofSeconds(5))))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure -> {
                    assertThat(failure.failure().phase())
                            .isEqualTo(TargetSchemaProvisioningFailure.Phase.TRANSACTION);
                    assertThat(failure.disposition()).isEqualTo(TargetSchemaConnectionDisposition.REUSABLE);
                });
        verify(connection).getAutoCommit();
        verify(connection).isReadOnly();
        verify(connection, never()).commit();
        verify(connection, never()).rollback();
    }

    @Test
    void timeoutReportedByActiveWorkRemainsDiscardRequired() throws Exception {
        Connection connection = idleConnection(MetadataDatabaseKind.MYSQL);

        assertThatThrownBy(() -> core((actual, budget) -> {
            throw failure(TargetSchemaProvisioningFailure.Phase.DEADLINE,
                    TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        }).provision(connection, MetadataDatabaseKind.MYSQL, deadline(Duration.ofSeconds(5))))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure ->
                        assertThat(failure.disposition())
                                .isEqualTo(TargetSchemaConnectionDisposition.DISCARD_REQUIRED));
    }

    @Test
    void mysqlTimeoutRaisedAfterWorkStartsRequiresDiscard() throws Exception {
        Connection connection = idleConnection(MetadataDatabaseKind.MYSQL);

        assertThatThrownBy(() -> core((actual, budget) -> {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
        }).provision(connection, MetadataDatabaseKind.MYSQL, deadline(Duration.ofSeconds(5))))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure -> {
                    assertThat(failure.failure().phase())
                            .isEqualTo(TargetSchemaProvisioningFailure.Phase.DEADLINE);
                    assertThat(failure.disposition())
                            .isEqualTo(TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
                });
    }

    @Test
    void productMismatchIsRejectedBeforeSchemaWork() throws Exception {
        Connection connection = idleConnection(MetadataDatabaseKind.POSTGRESQL);

        assertThatThrownBy(() -> core((actual, budget) -> {
            throw new AssertionError("mismatched target must not run schema work");
        }).provision(connection, MetadataDatabaseKind.MYSQL, deadline(Duration.ofSeconds(5))))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure -> {
                    assertThat(failure.failure().phase())
                            .isEqualTo(TargetSchemaProvisioningFailure.Phase.PRECONDITION);
                    assertThat(failure.disposition())
                            .isEqualTo(TargetSchemaConnectionDisposition.REUSABLE);
                });
        verify(connection, never()).commit();
        verify(connection, never()).rollback();
    }

    @Test
    void rollbackAndRestoreNeverDowngradeDiscardRequiredFailure() throws Exception {
        Connection connection = idleConnection(MetadataDatabaseKind.POSTGRESQL);

        assertThatThrownBy(() -> core((actual, budget) -> {
            throw failure(TargetSchemaProvisioningFailure.Phase.BASELINE_EXECUTION,
                    TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        }).provision(connection, MetadataDatabaseKind.POSTGRESQL, deadline(Duration.ofSeconds(5))))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure ->
                        assertThat(failure.disposition())
                                .isEqualTo(TargetSchemaConnectionDisposition.DISCARD_REQUIRED));
        verify(connection).rollback();
        verify(connection).setAutoCommit(true);
    }

    @Test
    void unexpectedWorkRuntimeIsSanitizedAndRolledBack() throws Exception {
        Connection connection = idleConnection(MetadataDatabaseKind.POSTGRESQL);

        assertThatThrownBy(() -> core((actual, budget) -> {
            throw new IllegalStateException("private runtime diagnostic");
        }).provision(connection, MetadataDatabaseKind.POSTGRESQL, deadline(Duration.ofSeconds(5))))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure -> {
                    assertThat(failure.failure().phase())
                            .isEqualTo(TargetSchemaProvisioningFailure.Phase.BASELINE_EXECUTION);
                    assertThat(failure.disposition())
                            .isEqualTo(TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
                    assertThat(failure).hasNoCause();
                    assertThat(failure.getMessage()).doesNotContain("private runtime diagnostic");
                });
        verify(connection).rollback();
    }

    @Test
    void commitRuntimeIsSanitizedAsOutcomeUnknown() throws Exception {
        Connection connection = idleConnection(MetadataDatabaseKind.POSTGRESQL);
        doThrow(new IllegalStateException("private commit runtime")).when(connection).commit();

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
    }

    @Test
    void rollbackRuntimeIsSanitizedAsOutcomeUnknown() throws Exception {
        Connection connection = idleConnection(MetadataDatabaseKind.POSTGRESQL);
        doThrow(new IllegalStateException("private rollback runtime")).when(connection).rollback();

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
    }

    @Test
    void interruptIsClearedForRollbackAndRestoredForCaller() throws Exception {
        Connection connection = idleConnection(MetadataDatabaseKind.POSTGRESQL);
        doAnswer(invocation -> {
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
            return null;
        }).when(connection).rollback();
        try {
            assertThatThrownBy(() -> core((actual, budget) -> {
                Thread.currentThread().interrupt();
                budget.check();
            }).provision(connection, MetadataDatabaseKind.POSTGRESQL, deadline(Duration.ofSeconds(5))))
                    .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure ->
                            assertThat(failure.failure().phase())
                                    .isEqualTo(TargetSchemaProvisioningFailure.Phase.DEADLINE));
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void deadlineIsCheckedAfterWorkBeforePostgresqlCommit() throws Exception {
        Connection connection = idleConnection(MetadataDatabaseKind.POSTGRESQL);
        long[] ticks = {0, 0, 0, 0, 0, 0, 0, 0, 0, 2};
        int[] index = {0};
        JdbcMetadataMigrationDeadline deadline = JdbcMetadataMigrationDeadline.start(
                Duration.ofNanos(1), () -> ticks[Math.min(index[0]++, ticks.length - 1)]);

        assertThatThrownBy(() -> core((actual, budget) -> { })
                        .provision(connection, MetadataDatabaseKind.POSTGRESQL, deadline))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure ->
                        assertThat(failure.failure().phase())
                                .isEqualTo(TargetSchemaProvisioningFailure.Phase.DEADLINE));
        verify(connection).rollback();
        verify(connection, never()).commit();
    }

    @Test
    @Timeout(5)
    void defaultCoreInstancesShareOneAdmissionLock() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        FlywayTargetSchemaProvisioningCore first =
                new FlywayTargetSchemaProvisioningCore((actual, budget) -> {
                    entered.countDown();
                    await(release);
                });
        FlywayTargetSchemaProvisioningCore second =
                new FlywayTargetSchemaProvisioningCore((actual, budget) -> {
                    throw new AssertionError("second core must not pass the shared lock");
                });
        try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
            Future<?> active = worker.submit(() -> first.provision(
                    idleConnection(MetadataDatabaseKind.MYSQL), MetadataDatabaseKind.MYSQL,
                    deadline(Duration.ofSeconds(5))));
            assertThat(entered.await(2, TimeUnit.SECONDS)).isTrue();
            try {
                assertThatThrownBy(() -> second.provision(
                                idleConnection(MetadataDatabaseKind.MYSQL), MetadataDatabaseKind.MYSQL,
                                deadline(Duration.ofMillis(20))))
                        .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure ->
                                assertThat(failure.failure().phase())
                                        .isEqualTo(TargetSchemaProvisioningFailure.Phase.DEADLINE));
            } finally {
                release.countDown();
            }
            active.get(2, TimeUnit.SECONDS);
        }
    }

    private static FlywayTargetSchemaProvisioningCore core(TargetSchemaProvisioningWork work) {
        return new FlywayTargetSchemaProvisioningCore(work);
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
        } catch (SQLException failure) {
            throw new AssertionError(failure);
        }
    }

    private static JdbcMetadataMigrationDeadline deadline(Duration timeout) {
        return JdbcMetadataMigrationDeadline.start(timeout, System::nanoTime);
    }

    private static TargetSchemaProvisioningException failure(
            TargetSchemaProvisioningFailure.Phase phase,
            TargetSchemaConnectionDisposition disposition) {
        return new TargetSchemaProvisioningException(
                MetadataDatabaseKind.POSTGRESQL,
                new TargetSchemaProvisioningFailure(phase, TargetSchemaBaseline.VERSION, null, 0),
                disposition);
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new AssertionError(interrupted);
        }
    }
}
