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
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.maintenance.MigrationSourceAction;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;

class RetainedCutoverShutdownTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "a".repeat(64);
    private static final MetadataDatabaseSettings TARGET = new MetadataDatabaseSettings(
            MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat", "migration");
    private static final Duration TIMEOUT = Duration.ofSeconds(1);

    @Test
    void retainedShutdownReleasesExactMaintenanceOnce() {
        Fixture fixture = new Fixture();
        fixture.retain(context -> RetainedCopyJournalDisposition.TRANSITIONED);

        fixture.coordinator.shutdownOperation(OPERATION);
        fixture.coordinator.shutdownOperation(OPERATION);

        verify(fixture.maintenanceLease, times(1)).close();
        assertThat(fixture.coordinator.status()).isEqualTo(RetainedCutoverStatus.empty());
    }

    @Test
    void pendingHandoffIsRetriedBeforeMaintenanceReleaseWithoutRecopy() {
        Fixture fixture = new Fixture();
        RetainedCopyJournalHandoff handoff = mock(RetainedCopyJournalHandoff.class);
        when(handoff.handoff(any()))
                .thenThrow(new RetainedCopyJournalHandoffException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED))
                .thenReturn(RetainedCopyJournalDisposition.ALREADY_CONFIRMED);
        assertThatThrownBy(() -> fixture.retain(handoff))
                .isInstanceOf(RetainedCopyJournalHandoffException.class);

        fixture.coordinator.shutdownOperation(OPERATION);

        verify(handoff, times(2)).handoff(any());
        verify(fixture.executor, times(1)).execute(any(), any(), any(), anyDeadline(), any());
        verify(fixture.maintenanceLease, times(1)).close();
    }

    @Test
    void pendingActivationRetriesBoundCallbackAndNeverReleasesAwaitingRestartFence() {
        Fixture fixture = new Fixture();
        fixture.retain(context -> RetainedCopyJournalDisposition.TRANSITIONED);
        RetainedManagedActivation activation = mock(RetainedManagedActivation.class);
        when(activation.activate(any()))
                .thenThrow(new RetainedManagedActivationException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED))
                .thenReturn(RetainedManagedActivationDisposition.ACTIVATED);
        assertThatThrownBy(() -> fixture.coordinator.activateRetained(OPERATION, activation))
                .isInstanceOf(RetainedManagedActivationException.class);

        fixture.coordinator.shutdownOperation(OPERATION);

        assertThat(fixture.coordinator.status().phase())
                .isEqualTo(RetainedCutoverStatus.Phase.AWAITING_RESTART_RETAINED);
        verify(activation, times(2)).activate(any());
        verify(fixture.maintenanceLease, never()).close();
    }

    @Test
    void awaitingRestartShutdownNeverReleasesFenceOrCallsActivationAgain() {
        Fixture fixture = new Fixture();
        fixture.retain(context -> RetainedCopyJournalDisposition.TRANSITIONED);
        RetainedManagedActivation activation = mock(RetainedManagedActivation.class);
        when(activation.activate(any())).thenReturn(RetainedManagedActivationDisposition.ACTIVATED);
        fixture.coordinator.activateRetained(OPERATION, activation);

        fixture.coordinator.shutdownOperation(OPERATION);

        verify(activation, times(1)).activate(any());
        verify(fixture.maintenanceLease, never()).close();
    }

    @Test
    void awaitingRestartFenceStillRejectsForeignShutdown() {
        Fixture fixture = new Fixture();
        fixture.retain(context -> RetainedCopyJournalDisposition.TRANSITIONED);
        RetainedManagedActivation activation = mock(RetainedManagedActivation.class);
        when(activation.activate(any())).thenReturn(RetainedManagedActivationDisposition.ACTIVATED);
        fixture.coordinator.activateRetained(OPERATION, activation);

        assertThatThrownBy(() -> fixture.coordinator.shutdownOperation("operation-b"))
                .isInstanceOf(MigrationMaintenanceException.class)
                .hasNoCause();

        verify(fixture.maintenanceLease, never()).close();
    }

    @Test
    void failedReleaseRemainsExactlyRetryable() {
        Fixture fixture = new Fixture();
        fixture.retain(context -> RetainedCopyJournalDisposition.TRANSITIONED);
        doThrow(new IllegalStateException("private-release"))
                .doNothing().when(fixture.maintenanceLease).close();

        assertThatThrownBy(() -> fixture.coordinator.shutdownOperation(OPERATION))
                .isInstanceOf(RetainedCutoverReleaseRequiredException.class)
                .hasNoCause();
        fixture.coordinator.shutdownOperation(OPERATION);

        verify(fixture.maintenanceLease, times(2)).close();
        assertThat(fixture.coordinator.status()).isEqualTo(RetainedCutoverStatus.empty());
    }

    private static JdbcMetadataMigrationDeadline anyDeadline() {
        return any(JdbcMetadataMigrationDeadline.class);
    }

    private static final class Fixture {

        private final Connection targetConnection = mock(Connection.class);
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
            scopedTarget(provisionLease);
            scopedTarget(copyLease);
            scopedSource(maintenanceLease);
            when(provisioner.provision(any(), any(), anyDeadline())).thenReturn(
                    new TargetSchemaProvisioningOutcome(TargetSchemaConnectionDisposition.REUSABLE));
            when(maintenance.acquire(eq(OPERATION), any())).thenReturn(maintenanceLease);
            coordinator = new RetainedCutoverCoordinator(
                    factory, provisioner, maintenance, executor, new AtomicLong()::get);
        }

        private void retain(RetainedCopyJournalHandoff handoff) {
            coordinator.execute(OPERATION, TARGET, password, TIMEOUT,
                    MetadataMigrationProgressSink.NO_OP, RetainedCutoverPreparation.NO_OP, handoff);
        }

        private void scopedTarget(TargetJdbcConnectionLease lease) {
            doAnswer(invocation -> {
                TargetJdbcConnectionAction action = invocation.getArgument(0);
                action.execute(targetConnection);
                return null;
            }).when(lease).withConnection(any());
        }

        private void scopedSource(MigrationMaintenanceLease lease) {
            doAnswer(invocation -> {
                MigrationSourceAction action = invocation.getArgument(0);
                action.execute(sourceConnection);
                return null;
            }).when(lease).withSourceConnection(any());
        }
    }
}
