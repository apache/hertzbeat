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
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.time.Instant;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.ActivateMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MetadataMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.ActivationOutcome;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InOrder;

class ManagedDeploymentMigrationCommandsTest {

    private static final String OPERATION = "operation-a";
    private static final Instant CREATED = Instant.parse("2026-08-10T01:00:00Z");
    private static final Instant STARTED = CREATED.plusSeconds(1);

    @TempDir
    private Path root;

    @Test
    void migrateDelegatesWithoutRetainingRequestAndExternalModeIsRejected() {
        Fixture fixture = fixture();
        MetadataMigrationRequest request = request(ApplyMode.MANAGED_WRITE);
        when(fixture.runner.start(request)).thenReturn(MigrationOperationProjection.view(running()));

        assertThat(fixture.commands.migrate(request).state()).isEqualTo(MigrationOperationState.RUNNING);
        assertThatThrownBy(() -> fixture.commands.migrate(request(ApplyMode.EXTERNAL_APPLY)))
                .isInstanceOf(MigrationOperationStoreException.class)
                .hasNoCause();
        verify(fixture.runner, never()).start(request(ApplyMode.EXTERNAL_APPLY));
    }

    @Test
    void statusReadsStoreBeforeRetainedPhaseAndFailsClosedWhileActivationIsPending() {
        Fixture fixture = fixture();
        MigrationView view = MigrationOperationProjection.view(activating());
        when(fixture.runner.find(OPERATION)).thenReturn(Optional.of(view));
        when(fixture.coordinator.status()).thenReturn(new RetainedCutoverStatus(
                OPERATION, RetainedCutoverStatus.Phase.ACTIVATION_PENDING));

        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> fixture.commands.migration(OPERATION));
        InOrder order = inOrder(fixture.runner, fixture.coordinator);
        order.verify(fixture.runner).find(OPERATION);
        order.verify(fixture.coordinator).status();
    }

    @Test
    void retainedStatusRequiresAnExactReadyJournalShape() {
        Fixture fixture = fixture();
        when(fixture.runner.find(OPERATION)).thenReturn(Optional.empty());
        when(fixture.coordinator.status()).thenReturn(new RetainedCutoverStatus(
                OPERATION, RetainedCutoverStatus.Phase.RETAINED));

        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> fixture.commands.migration(OPERATION));

        when(fixture.runner.find(OPERATION)).thenReturn(
                Optional.of(MigrationOperationProjection.view(awaitingRestart())));
        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> fixture.commands.migration(OPERATION));
    }

    @Test
    void awaitingRestartPhaseRejectsReadyJournalShape() {
        Fixture fixture = fixture();
        when(fixture.runner.find(OPERATION)).thenReturn(
                Optional.of(MigrationOperationProjection.view(ready())));
        when(fixture.coordinator.status()).thenReturn(new RetainedCutoverStatus(
                OPERATION, RetainedCutoverStatus.Phase.AWAITING_RESTART_RETAINED));

        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> fixture.commands.migration(OPERATION));
    }

    @Test
    void activationTreatsOwnedMissingJournalAsRecoveryRequired() {
        Fixture fixture = fixture();
        when(fixture.coordinator.status()).thenReturn(new RetainedCutoverStatus(
                OPERATION, RetainedCutoverStatus.Phase.RETAINED));

        assertStoreError(SetupErrorCode.CONFIG_RECOVERY_REQUIRED,
                () -> fixture.commands.activate(
                        OPERATION,
                        new ActivateMigrationRequest(MigrationOperationState.READY_TO_ACTIVATE)));
    }

    @Test
    void activationKeepsOperationNotFoundForAnUnownedMissingJournal() {
        Fixture fixture = fixture();
        when(fixture.coordinator.status()).thenReturn(RetainedCutoverStatus.empty());

        assertStoreError(SetupErrorCode.OPERATION_NOT_FOUND,
                () -> fixture.commands.activate(
                        OPERATION,
                        new ActivateMigrationRequest(MigrationOperationState.READY_TO_ACTIVATE)));
    }

    @Test
    void readyActivationBindsTheExactDurableCallbackAndReturnsConfirmedAwaitingRestart() throws Exception {
        Fixture fixture = fixture();
        advanceToReady(fixture.store);
        when(fixture.configuration.activateExact(any(), any())).thenReturn(ActivationOutcome.ACTIVATED);
        when(fixture.runner.find(OPERATION)).thenAnswer(ignored -> fixture.store.find(OPERATION)
                .map(MigrationOperationProjection::view));
        when(fixture.coordinator.status())
                .thenReturn(new RetainedCutoverStatus(OPERATION, RetainedCutoverStatus.Phase.RETAINED))
                .thenReturn(new RetainedCutoverStatus(
                        OPERATION, RetainedCutoverStatus.Phase.AWAITING_RESTART_RETAINED));
        when(fixture.coordinator.activateRetained(any(), any())).thenAnswer(invocation -> {
            RetainedManagedActivation activation = invocation.getArgument(1);
            activation.activate(new RetainedManagedActivationContext(OPERATION, "a".repeat(64)));
            return new RetainedManagedActivationResult(
                    OPERATION, "a".repeat(64), RetainedManagedActivationResult.Status.ACTIVATED);
        });

        MigrationView result = fixture.commands.activate(
                OPERATION, new ActivateMigrationRequest(MigrationOperationState.READY_TO_ACTIVATE));

        assertThat(result.state()).isEqualTo(MigrationOperationState.AWAITING_RESTART);
        assertThat(result.restartRequired()).isTrue();
        verify(fixture.configuration).activateExact(any(), any());
    }

    @Test
    void activationPendingRetriesOnlyTheAlreadyBoundCallback() {
        Fixture fixture = fixture();
        advanceToReady(fixture.store);
        fixture.store.compareAndTransition(
                OPERATION, MigrationOperationState.READY_TO_ACTIVATE, activating());
        when(fixture.coordinator.status())
                .thenReturn(new RetainedCutoverStatus(
                        OPERATION, RetainedCutoverStatus.Phase.ACTIVATION_PENDING))
                .thenReturn(new RetainedCutoverStatus(
                        OPERATION, RetainedCutoverStatus.Phase.AWAITING_RESTART_RETAINED));
        doAnswer(ignored -> {
            fixture.store.compareAndTransition(
                    OPERATION, MigrationOperationState.RUNNING, awaitingRestart());
            return new RetainedManagedActivationResult(
                    OPERATION, "a".repeat(64), RetainedManagedActivationResult.Status.ACTIVATED);
        }).when(fixture.coordinator).retryActivation(OPERATION);

        assertThat(fixture.commands.activate(
                OPERATION, new ActivateMigrationRequest(MigrationOperationState.READY_TO_ACTIVATE)).state())
                .isEqualTo(MigrationOperationState.AWAITING_RESTART);
        verify(fixture.coordinator, never()).activateRetained(any(), any());
    }

    @Test
    void awaitingRestartReplayUsesOnlyTheBoundActivationAndConfirmedJournal() throws Exception {
        Fixture fixture = fixture();
        advanceToReady(fixture.store);
        fixture.store.compareAndTransition(
                OPERATION, MigrationOperationState.READY_TO_ACTIVATE, activating());
        fixture.store.compareAndTransition(
                OPERATION, MigrationOperationState.RUNNING, awaitingRestart());
        when(fixture.coordinator.status())
                .thenReturn(new RetainedCutoverStatus(
                        OPERATION, RetainedCutoverStatus.Phase.AWAITING_RESTART_RETAINED));
        when(fixture.coordinator.retryActivation(OPERATION)).thenReturn(
                new RetainedManagedActivationResult(
                        OPERATION, "a".repeat(64),
                        RetainedManagedActivationResult.Status.ALREADY_AWAITING_RESTART));

        MigrationView view = fixture.commands.activate(
                OPERATION, new ActivateMigrationRequest(MigrationOperationState.READY_TO_ACTIVATE));

        assertThat(view.state()).isEqualTo(MigrationOperationState.AWAITING_RESTART);
        verify(fixture.coordinator).retryActivation(OPERATION);
        verify(fixture.coordinator, never()).activateRetained(any(), any());
        verify(fixture.configuration, never()).activateExact(any(), any());
    }

    @Test
    void activeOperationCombinesDurableRunnerViewWithRetainedOwnershipFailClosed() {
        Fixture fixture = fixture();
        when(fixture.runner.activeOperationId()).thenReturn(Optional.of(OPERATION));
        when(fixture.coordinator.status()).thenReturn(new RetainedCutoverStatus(
                OPERATION, RetainedCutoverStatus.Phase.HANDOFF_PENDING));

        assertThat(fixture.commands.activeOperationId()).contains(OPERATION);
        InOrder order = inOrder(fixture.runner, fixture.coordinator);
        order.verify(fixture.runner).activeOperationId();
        order.verify(fixture.coordinator).status();

        when(fixture.coordinator.status()).thenReturn(new RetainedCutoverStatus(
                "operation-b", RetainedCutoverStatus.Phase.RETAINED));
        assertStoreError(SetupErrorCode.OPERATION_CONFLICT,
                fixture.commands::activeOperationId);
    }

    @Test
    void closeOrdersRunnerBeforePhaseAwareShutdownAndNeverReleasesAwaitingRestartFence() {
        Fixture fixture = fixture();
        when(fixture.coordinator.status()).thenReturn(new RetainedCutoverStatus(
                OPERATION, RetainedCutoverStatus.Phase.AWAITING_RESTART_RETAINED));

        fixture.commands.close();

        InOrder order = inOrder(fixture.runner, fixture.coordinator);
        order.verify(fixture.runner).close();
        order.verify(fixture.coordinator).shutdownOperation(OPERATION);
        verify(fixture.coordinator, never()).releaseRetained(OPERATION);
    }

    @Test
    void closedFacadeRejectsCommandsWithoutReadingStoreOrRetainedState() {
        Fixture fixture = fixture();
        when(fixture.coordinator.status()).thenReturn(RetainedCutoverStatus.empty());
        fixture.commands.close();

        assertStoreError(SetupErrorCode.MIGRATION_UNAVAILABLE,
                () -> fixture.commands.migration(OPERATION));
        assertStoreError(SetupErrorCode.MIGRATION_UNAVAILABLE,
                fixture.commands::activeOperationId);

        verify(fixture.runner, never()).find(any());
    }

    private Fixture fixture() {
        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        DeploymentMigrationCommandRunner runner = mock(DeploymentMigrationCommandRunner.class);
        RetainedCutoverCoordinator coordinator = mock(RetainedCutoverCoordinator.class);
        ManagedMigrationConfigurationTransaction configuration =
                mock(ManagedMigrationConfigurationTransaction.class);
        return new Fixture(store, runner, coordinator, configuration,
                new ManagedDeploymentMigrationCommands(runner, store, configuration, coordinator));
    }

    private static MetadataMigrationRequest request(ApplyMode mode) {
        return new MetadataMigrationRequest(
                OPERATION, MigrationTarget.POSTGRESQL,
                new MetadataDatabaseConfiguration(
                        MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db.example/hertzbeat", "migration", "password"),
                mode);
    }

    private static MigrationOperationSnapshot running() {
        return snapshot(MigrationOperationState.RUNNING, MigrationStage.COPYING, 0,
                VerificationState.PENDING, false, false);
    }

    private static MigrationOperationSnapshot ready() {
        return snapshot(MigrationOperationState.READY_TO_ACTIVATE, MigrationStage.READY_TO_ACTIVATE, 100,
                VerificationState.SUCCEEDED, true, false);
    }

    private static MigrationOperationSnapshot activating() {
        return snapshot(MigrationOperationState.RUNNING, MigrationStage.ACTIVATING, 100,
                VerificationState.SUCCEEDED, false, false);
    }

    private static MigrationOperationSnapshot awaitingRestart() {
        return snapshot(MigrationOperationState.AWAITING_RESTART, MigrationStage.AWAITING_RESTART, 100,
                VerificationState.SUCCEEDED, false, true);
    }

    private static MigrationOperationSnapshot verifying() {
        return snapshot(MigrationOperationState.RUNNING, MigrationStage.VERIFYING, 100,
                VerificationState.RUNNING, false, false);
    }

    private static MigrationOperationSnapshot pending() {
        return new MigrationOperationSnapshot(
                OPERATION, MigrationOperationState.PENDING, MigrationTarget.POSTGRESQL,
                ApplyMode.MANAGED_WRITE, MigrationStage.QUEUED, 0, CREATED, null, null,
                VerificationState.PENDING, null, null, 250, false, false, false,
                "a".repeat(64), "generation-a");
    }

    private static void advanceToReady(FileMigrationOperationStore store) {
        store.create(pending());
        store.compareAndTransition(OPERATION, MigrationOperationState.PENDING, running());
        store.compareAndTransition(OPERATION, MigrationOperationState.RUNNING, verifying());
        store.compareAndTransition(OPERATION, MigrationOperationState.RUNNING, ready());
    }

    private static MigrationOperationSnapshot snapshot(
            MigrationOperationState state, MigrationStage stage, int progress,
            VerificationState verification, boolean activationAvailable, boolean restartRequired) {
        int pollAfterMillis = state == MigrationOperationState.RUNNING
                || state == MigrationOperationState.AWAITING_RESTART ? 250 : 0;
        return new MigrationOperationSnapshot(
                OPERATION, state, MigrationTarget.POSTGRESQL, ApplyMode.MANAGED_WRITE, stage, progress,
                CREATED, STARTED, null, verification, null, null, pollAfterMillis,
                activationAvailable, restartRequired, false, "a".repeat(64), "generation-a");
    }

    private static void assertStoreError(SetupErrorCode code, Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(MigrationOperationStoreException.class,
                        failure -> assertThat(failure.errorCode()).isEqualTo(code))
                .hasNoCause();
    }

    private record Fixture(
            FileMigrationOperationStore store,
            DeploymentMigrationCommandRunner runner,
            RetainedCutoverCoordinator coordinator,
            ManagedMigrationConfigurationTransaction configuration,
            ManagedDeploymentMigrationCommands commands) { }
}
