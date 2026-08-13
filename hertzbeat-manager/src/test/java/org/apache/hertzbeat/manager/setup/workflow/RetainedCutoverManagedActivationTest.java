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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceException;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.maintenance.MigrationSourceAction;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

@Timeout(10)
class RetainedCutoverManagedActivationTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "a".repeat(64);
    private static final MetadataDatabaseSettings TARGET = new MetadataDatabaseSettings(
            MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db.example/hertzbeat", "migration");
    private static final Duration TIMEOUT = Duration.ofSeconds(1);

    @Test
    void claimsTheFenceBeforeActivationAndKeepsItForRestartHandoff() {
        Fixture fixture = new Fixture();
        fixture.execute();
        RetainedManagedActivation activation = context -> {
            assertThat(context).isEqualTo(new RetainedManagedActivationContext(OPERATION, IDENTITY));
            assertConflict(() -> fixture.coordinator.releaseRetained(OPERATION));
            assertConflict(() -> fixture.coordinator.activateRetained(OPERATION, ignored ->
                    RetainedManagedActivationDisposition.ACTIVATED));
            assertConflict(() -> fixture.coordinator.retryActivation(OPERATION));
            return RetainedManagedActivationDisposition.ACTIVATED;
        };

        RetainedManagedActivationResult result = fixture.coordinator.activateRetained(OPERATION, activation);

        assertThat(result.status()).isEqualTo(RetainedManagedActivationResult.Status.ACTIVATED);
        assertThat(result.operationId()).isEqualTo(OPERATION);
        assertThat(result.targetIdentityHash()).isEqualTo(IDENTITY);
        assertConflict(() -> fixture.coordinator.releaseRetained(OPERATION));
        assertConflict(() -> fixture.coordinator.retained(OPERATION));
        verify(fixture.maintenanceLease, never()).close();
    }

    @Test
    void sameOperationRetryUsesTheBoundActivationWithoutRecopying() {
        Fixture fixture = new Fixture();
        fixture.execute();
        RetainedManagedActivation activation = mock(RetainedManagedActivation.class);
        when(activation.activate(any()))
                .thenThrow(new RetainedManagedActivationException(
                        org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode
                                .CONFIG_RECOVERY_REQUIRED))
                .thenReturn(RetainedManagedActivationDisposition.ALREADY_AWAITING_RESTART);

        assertThatThrownBy(() -> fixture.coordinator.activateRetained(OPERATION, activation))
                .isInstanceOf(RetainedManagedActivationException.class)
                .hasNoCause();
        assertConflict(() -> fixture.coordinator.releaseRetained(OPERATION));

        RetainedManagedActivationResult result = fixture.coordinator.retryActivation(OPERATION);

        assertThat(result.status()).isEqualTo(
                RetainedManagedActivationResult.Status.ALREADY_AWAITING_RESTART);
        verify(activation, times(2)).activate(new RetainedManagedActivationContext(OPERATION, IDENTITY));
        verify(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
        verify(fixture.maintenanceLease, never()).close();
    }

    @Test
    void lostSuccessResponseReplaysAwaitingRestartWithoutCallingAnyActivationAgain() {
        Fixture fixture = new Fixture();
        fixture.execute();
        RetainedManagedActivation original = mock(RetainedManagedActivation.class);
        RetainedManagedActivation replacement = mock(RetainedManagedActivation.class);
        when(original.activate(any())).thenReturn(RetainedManagedActivationDisposition.ACTIVATED);

        assertThat(fixture.coordinator.activateRetained(OPERATION, original).status())
                .isEqualTo(RetainedManagedActivationResult.Status.ACTIVATED);
        assertThat(fixture.coordinator.activateRetained(OPERATION, replacement).status())
                .isEqualTo(RetainedManagedActivationResult.Status.ALREADY_AWAITING_RESTART);
        assertThat(fixture.coordinator.retryActivation(OPERATION).status())
                .isEqualTo(RetainedManagedActivationResult.Status.ALREADY_AWAITING_RESTART);

        verify(original, times(1)).activate(any());
        verify(replacement, never()).activate(any());
        verify(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
        verify(fixture.maintenanceLease, never()).close();
    }

    @Test
    void privateRuntimeIsRedactedAndRetainsTheExactFenceForRetry() {
        Fixture fixture = new Fixture();
        fixture.execute();
        RetainedManagedActivation activation = mock(RetainedManagedActivation.class);
        when(activation.activate(any()))
                .thenThrow(new IllegalStateException("private-path"))
                .thenReturn(RetainedManagedActivationDisposition.ACTIVATED);

        assertThatThrownBy(() -> fixture.coordinator.activateRetained(OPERATION, activation))
                .isInstanceOfSatisfying(RetainedManagedActivationException.class, failure ->
                        assertThat(failure.errorCode()).isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED))
                .hasNoCause()
                .hasMessageNotContaining("private-path");
        assertConflict(() -> fixture.coordinator.retryActivation("operation-b"));

        assertThat(fixture.coordinator.retryActivation(OPERATION).status())
                .isEqualTo(RetainedManagedActivationResult.Status.ACTIVATED);
        verify(fixture.executor).execute(any(), any(), any(), anyDeadline(), any());
        verify(fixture.maintenanceLease, never()).close();
    }

    @Test
    void fatalRemainsPrimaryAndRetainsTheExactFenceForRetry() {
        Fixture fixture = new Fixture();
        fixture.execute();
        AssertionError fatal = new AssertionError("activation fatal");
        RetainedManagedActivation activation = mock(RetainedManagedActivation.class);
        when(activation.activate(any()))
                .thenThrow(fatal)
                .thenReturn(RetainedManagedActivationDisposition.ACTIVATED);

        assertThatThrownBy(() -> fixture.coordinator.activateRetained(OPERATION, activation))
                .isSameAs(fatal);

        assertThat(fixture.coordinator.retryActivation(OPERATION).status())
                .isEqualTo(RetainedManagedActivationResult.Status.ACTIVATED);
        verify(fixture.maintenanceLease, never()).close();
    }

    @Test
    void interruptStopsBeforeCallbackAndIsPreservedForExplicitRetry() {
        Fixture fixture = new Fixture();
        fixture.execute();
        RetainedManagedActivation activation = mock(RetainedManagedActivation.class);
        when(activation.activate(any())).thenReturn(RetainedManagedActivationDisposition.ACTIVATED);

        Thread.currentThread().interrupt();
        try {
            assertThatThrownBy(() -> fixture.coordinator.activateRetained(OPERATION, activation))
                    .isInstanceOfSatisfying(RetainedManagedActivationException.class, failure ->
                            assertThat(failure.errorCode())
                                    .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED))
                    .hasNoCause();
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
            verify(activation, never()).activate(any());
        } finally {
            Thread.interrupted();
        }

        assertThat(fixture.coordinator.retryActivation(OPERATION).status())
                .isEqualTo(RetainedManagedActivationResult.Status.ACTIVATED);
        verify(fixture.maintenanceLease, never()).close();
    }

    private static JdbcMetadataMigrationDeadline anyDeadline() {
        return any(JdbcMetadataMigrationDeadline.class);
    }

    private static void assertConflict(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOf(MigrationMaintenanceException.class);
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

        private void execute() {
            coordinator.execute(OPERATION, TARGET, password, TIMEOUT, MetadataMigrationProgressSink.NO_OP,
                    RetainedCutoverPreparation.NO_OP, context -> RetainedCopyJournalDisposition.TRANSITIONED);
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
