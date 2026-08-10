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
import static org.mockito.Mockito.same;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.time.Duration;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.maintenance.MigrationSourceAction;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

@Timeout(15)
class RetainedCutoverFailureTest {

    private static final String OPERATION_ID = "operation-a";
    private static final String IDENTITY = "a".repeat(64);
    private static final Duration TIMEOUT = Duration.ofSeconds(1);
    private static final MetadataDatabaseSettings TARGET = new MetadataDatabaseSettings(
            MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat", "migration");

    @Test
    void stableProvisionFailureClosesOnlyProvisionLeaseAndReplaysTheSameFailure() {
        Fixture fixture = new Fixture();
        TargetSchemaProvisioningException failure = provisioningFailure();
        doThrow(failure).when(fixture.provisioner).provision(any(), any(), anyDeadline());

        assertThatThrownBy(fixture::execute).isSameAs(failure);

        verify(fixture.provisionLease).close();
        verify(fixture.factory).acquire(any(), any(), anyDeadline());
        verifyNoInteractions(fixture.maintenance, fixture.executor);
    }

    @Test
    void fatalProvisionAndFailedCloseRetainFatalAndRetryNeverReprovisions() {
        Fixture fixture = new Fixture();
        AssertionError fatal = new AssertionError("fatal provision");
        doThrow(fatal).when(fixture.provisioner).provision(any(), any(), anyDeadline());
        doThrow(new IllegalStateException("private close"))
                .doNothing().when(fixture.provisionLease).close();

        assertThatThrownBy(fixture::execute).isSameAs(fatal);
        assertThat(fatal.getSuppressed()).singleElement()
                .isInstanceOf(RetainedCutoverReleaseRequiredException.class);

        assertThatThrownBy(() -> fixture.coordinator.retryRelease(OPERATION_ID, TIMEOUT))
                .isSameAs(fatal);
        verify(fixture.provisioner).provision(any(), any(), anyDeadline());
        verify(fixture.factory).acquire(any(), any(), anyDeadline());
        verify(fixture.provisionLease, times(2)).close();
    }

    @Test
    void interruptedProvisionFailureClearsInterruptForCloseThenRestoresIt() {
        Fixture fixture = new Fixture();
        TargetSchemaProvisioningException failure = provisioningFailure();
        doAnswer(invocation -> {
            Thread.currentThread().interrupt();
            throw failure;
        }).when(fixture.provisioner).provision(any(), any(), anyDeadline());
        doAnswer(invocation -> {
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
            return null;
        }).when(fixture.provisionLease).close();

        try {
            assertThatThrownBy(fixture::execute).isSameAs(failure);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void secondAcquireFailureOccursAfterProvisionCloseAndNeverAcquiresMaintenance() {
        Fixture fixture = new Fixture();
        TargetJdbcConnectionException unavailable =
                new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.UNAVAILABLE);
        when(fixture.factory.acquire(same(TARGET), same(fixture.password), anyDeadline()))
                .thenReturn(fixture.provisionLease)
                .thenThrow(unavailable);

        assertThatThrownBy(fixture::execute).isSameAs(unavailable);

        verify(fixture.provisionLease).close();
        verifyNoInteractions(fixture.maintenance, fixture.executor);
    }

    @Test
    void maintenanceAcquireFailureClosesCopyTargetBeforeReplayingFailure() {
        Fixture fixture = new Fixture();
        MigrationMaintenanceException failure = MigrationMaintenanceException.sourceUnavailable();
        when(fixture.maintenance.acquire(eq(OPERATION_ID), any())).thenThrow(failure);

        assertThatThrownBy(fixture::execute).isSameAs(failure);

        verify(fixture.copyLease).close();
        verifyNoInteractions(fixture.executor);
    }

    @Test
    void provisionalFactoryCleanupIsBoundToOperationAndSettlesAsTerminal() {
        Fixture fixture = new Fixture();
        when(fixture.factory.acquire(any(), any(), anyDeadline()))
                .thenThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED));
        when(fixture.factory.settleFailedAcquire(anyDeadline()))
                .thenReturn(TargetJdbcFailedAcquireSettlement.TERMINAL_CLOSED);

        assertThatThrownBy(fixture::execute)
                .isInstanceOf(RetainedCutoverReleaseRequiredException.class);
        assertConflict(() -> fixture.coordinator.retryRelease("operation-b", TIMEOUT));

        assertThatThrownBy(() -> fixture.coordinator.retryRelease(OPERATION_ID, TIMEOUT))
                .isInstanceOfSatisfying(TargetJdbcConnectionException.class, failure ->
                        assertThat(failure.code())
                                .isEqualTo(TargetJdbcConnectionErrorCode.FACTORY_CLOSED));
        verify(fixture.factory).acquire(any(), any(), anyDeadline());
        verify(fixture.factory).settleFailedAcquire(anyDeadline());
        verifyNoInteractions(fixture.provisioner, fixture.maintenance, fixture.executor);
    }

    @Test
    void retainedSuccessCanBeExplicitlyReleasedAndReleaseFailureUsesExactSameOpRetry() {
        Fixture fixture = new Fixture();
        fixture.execute();
        doThrow(MigrationMaintenanceException.maintenanceFailure())
                .doNothing().when(fixture.maintenanceLease).close();

        assertThatThrownBy(() -> fixture.coordinator.releaseRetained(OPERATION_ID))
                .isInstanceOf(RetainedCutoverReleaseRequiredException.class);
        assertConflict(() -> fixture.coordinator.releaseRetained("operation-b"));

        fixture.coordinator.retryRelease(OPERATION_ID, TIMEOUT);
        verify(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
        verify(fixture.maintenanceLease, times(2)).close();
        assertConflict(() -> fixture.coordinator.retained(OPERATION_ID));
    }

    @Test
    void invalidDeadlineDoesNotRetainTheOperationSlot() {
        Fixture fixture = new Fixture();

        assertThatThrownBy(() -> fixture.coordinator.execute(
                OPERATION_ID,
                TARGET,
                fixture.password,
                Duration.ZERO,
                MetadataMigrationProgressSink.NO_OP))
                .isInstanceOf(MetadataMigrationException.class);

        assertThat(fixture.execute().status()).isEqualTo(RetainedCutoverResult.Status.RETAINED_SUCCESS);
    }

    @Test
    void provisionIdentityFatalClosesExactLeaseBeforeReplayingFatal() {
        Fixture fixture = new Fixture();
        AssertionError fatal = new AssertionError("identity fatal");
        when(fixture.provisionLease.targetIdentityHash()).thenThrow(fatal);

        assertThatThrownBy(fixture::execute).isSameAs(fatal);

        verify(fixture.provisionLease).close();
        verifyNoInteractions(fixture.provisioner, fixture.maintenance, fixture.executor);
    }

    @Test
    void provisionIdentityRuntimeClosesExactLeaseAndUsesStableFailure() {
        Fixture fixture = new Fixture();
        when(fixture.provisionLease.targetIdentityHash()).thenThrow(new IllegalStateException("private"));

        assertThatThrownBy(fixture::execute)
                .isInstanceOfSatisfying(RetainedCutoverException.class, failure ->
                        assertThat(failure.code()).isEqualTo(RetainedCutoverErrorCode.EXECUTION_FAILED))
                .hasNoCause();

        verify(fixture.provisionLease).close();
        verifyNoInteractions(fixture.provisioner, fixture.maintenance, fixture.executor);
    }

    @Test
    void factoryFatalRemainsBoundToExactOperationAndCannotAdmitAnotherOperation() {
        Fixture fixture = new Fixture();
        AssertionError fatal = new AssertionError("factory fatal");
        when(fixture.factory.acquire(any(), any(), anyDeadline())).thenThrow(fatal);

        assertThatThrownBy(fixture::execute).isSameAs(fatal);
        assertThat(fatal.getSuppressed()).singleElement()
                .isInstanceOf(RetainedCutoverReleaseRequiredException.class);
        assertConflict(() -> fixture.coordinator.execute(
                "operation-b", TARGET, fixture.password, TIMEOUT, MetadataMigrationProgressSink.NO_OP));

        verify(fixture.factory).acquire(any(), any(), anyDeadline());
        verifyNoInteractions(fixture.provisioner, fixture.maintenance, fixture.executor);
    }

    private static JdbcMetadataMigrationDeadline anyDeadline() {
        return any(JdbcMetadataMigrationDeadline.class);
    }

    private static TargetSchemaProvisioningException provisioningFailure() {
        return new TargetSchemaProvisioningException(
                MetadataDatabaseKind.MYSQL,
                new TargetSchemaProvisioningFailure(
                        TargetSchemaProvisioningFailure.Phase.PRECONDITION,
                        "baseline", null, 0),
                TargetSchemaConnectionDisposition.REUSABLE);
    }

    private static void assertConflict(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOf(MigrationMaintenanceException.class);
    }

    private static final class Fixture {

        private final Connection provisionConnection = mock(Connection.class);
        private final Connection copyConnection = mock(Connection.class);
        private final Connection sourceConnection = mock(Connection.class);
        private final TargetJdbcConnectionFactory factory = mock(TargetJdbcConnectionFactory.class);
        private final TargetJdbcConnectionLease provisionLease = mock(TargetJdbcConnectionLease.class);
        private final TargetJdbcConnectionLease copyLease = mock(TargetJdbcConnectionLease.class);
        private final FlywayTargetSchemaProvisioner provisioner = mock(FlywayTargetSchemaProvisioner.class);
        private final MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        private final MigrationMaintenanceLease maintenanceLease = mock(MigrationMaintenanceLease.class);
        private final JdbcMetadataMigrationExecutor executor = mock(JdbcMetadataMigrationExecutor.class);
        private final SecretValue password = mock(SecretValue.class);
        private final RetainedCutoverCoordinator coordinator;

        private Fixture() {
            when(provisionLease.targetIdentityHash()).thenReturn(IDENTITY);
            when(copyLease.targetIdentityHash()).thenReturn(IDENTITY);
            when(factory.acquire(same(TARGET), same(password), anyDeadline()))
                    .thenReturn(provisionLease, copyLease);
            scopedTarget(provisionLease, provisionConnection);
            scopedTarget(copyLease, copyConnection);
            scopedSource(maintenanceLease, sourceConnection);
            when(provisioner.provision(any(), any(), anyDeadline()))
                    .thenReturn(new TargetSchemaProvisioningOutcome(
                            TargetSchemaConnectionDisposition.REUSABLE));
            when(maintenance.acquire(eq(OPERATION_ID), any())).thenReturn(maintenanceLease);
            coordinator = new RetainedCutoverCoordinator(
                    factory, provisioner, maintenance, executor, System::nanoTime);
        }

        private RetainedCutoverResult execute() {
            return coordinator.execute(
                    OPERATION_ID, TARGET, password, TIMEOUT, MetadataMigrationProgressSink.NO_OP);
        }

        private static void scopedTarget(TargetJdbcConnectionLease lease, Connection connection) {
            doAnswer(invocation -> {
                TargetJdbcConnectionAction action = invocation.getArgument(0);
                action.execute(connection);
                return null;
            }).when(lease).withConnection(any());
        }

        private static void scopedSource(MigrationMaintenanceLease lease, Connection connection) {
            doAnswer(invocation -> {
                MigrationSourceAction action = invocation.getArgument(0);
                action.execute(connection);
                return null;
            }).when(lease).withSourceConnection(any());
        }
    }
}
