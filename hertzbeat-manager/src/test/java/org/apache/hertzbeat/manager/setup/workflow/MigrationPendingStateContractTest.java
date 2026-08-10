/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.CandidateEvidence;
import org.apache.hertzbeat.manager.setup.workflow.MigrationRestartClassifier.Plan;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class MigrationPendingStateContractTest {

    private static final Instant CREATED = Instant.parse("2026-08-10T01:00:00Z");
    private static final String IDENTITY = "a".repeat(64);
    private static final String GENERATION = "candidate-generation";

    @TempDir
    private Path root;

    private final MigrationOperationTransitionPolicy transitions = new MigrationOperationTransitionPolicy();
    private final MigrationRestartClassifier restart = new MigrationRestartClassifier();

    @Test
    void distinguishesCleanAndRecoveryBlockedPendingWithoutInventingWork() {
        MigrationOperationSnapshot clean = cleanPending("operation-clean", ApplyMode.MANAGED_WRITE);
        MigrationOperationSnapshot blocked = blockedPending("operation-blocked", ApplyMode.MANAGED_WRITE);

        assertThat(clean.errorCode()).isNull();
        assertThat(clean.nextPollAfterMillis()).isPositive();
        assertThat(blocked.errorCode()).isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        assertThat(blocked.nextPollAfterMillis()).isZero();
        assertThat(blocked.startedAt()).isNull();
        assertThat(blocked.completedAt()).isNull();
        assertThat(blocked.progressPercent()).isZero();
        assertThat(blocked.verificationState()).isEqualTo(VerificationState.PENDING);
        assertThatThrownBy(() -> snapshot("operation-a", ApplyMode.MANAGED_WRITE,
                MigrationOperationState.PENDING, MigrationStage.QUEUED, 0, null, null,
                VerificationState.PENDING, SetupErrorCode.CONFIG_RECOVERY_REQUIRED, 1000))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> snapshot("operation-a", ApplyMode.MANAGED_WRITE,
                MigrationOperationState.PENDING, MigrationStage.QUEUED, 0, CREATED, null,
                VerificationState.PENDING, SetupErrorCode.CONFIG_RECOVERY_REQUIRED, 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> snapshot("operation-a", ApplyMode.MANAGED_WRITE,
                MigrationOperationState.PENDING, MigrationStage.QUEUED, 0, null, CREATED.plusSeconds(1),
                VerificationState.PENDING, SetupErrorCode.CONFIG_RECOVERY_REQUIRED, 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> snapshot("operation-a", ApplyMode.MANAGED_WRITE,
                MigrationOperationState.PENDING, MigrationStage.QUEUED, 0, null, null,
                VerificationState.PENDING, SetupErrorCode.CONFIG_WRITE_FAILED, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void onlyProvenSourceAndStalePreparationOutcomesMayTerminateBeforeStart() {
        MigrationOperationSnapshot source = preparationFailed(
                "operation-source", SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED);
        MigrationOperationSnapshot stale = preparationFailed(
                "operation-stale", SetupErrorCode.OPERATION_CONFLICT);

        assertThat(source.startedAt()).isNull();
        assertThat(source.completedAt()).isEqualTo(CREATED.plusSeconds(1));
        assertThat(stale.startedAt()).isNull();
        assertThat(stale.completedAt()).isEqualTo(CREATED.plusSeconds(1));
        assertThatThrownBy(() -> failedBeforeStart(SetupErrorCode.CONFIG_RECOVERY_REQUIRED, 0,
                VerificationState.PENDING, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> failedBeforeStart(SetupErrorCode.MIGRATION_COPY_FAILED, 0,
                VerificationState.PENDING, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> failedBeforeStart(SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED, 1,
                VerificationState.PENDING, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> failedBeforeStart(SetupErrorCode.OPERATION_CONFLICT, 0,
                VerificationState.SUCCEEDED, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> failedBeforeStart(SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED, 0,
                VerificationState.PENDING, CREATED)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void pendingTransitionGraphKeepsRecoveryOwnershipAndRejectsFalseCopyFailure() {
        MigrationOperationSnapshot clean = cleanPending("operation-a", ApplyMode.MANAGED_WRITE);
        MigrationOperationSnapshot blocked = blockedPending("operation-a", ApplyMode.MANAGED_WRITE);
        MigrationOperationSnapshot running = running("operation-a", ApplyMode.MANAGED_WRITE);

        assertAllowed(clean, blocked);
        assertAllowed(blocked, blocked);
        assertAllowed(blocked, running);
        assertAllowed(clean, preparationFailed("operation-a", SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED));
        assertAllowed(blocked, preparationFailed("operation-a", SetupErrorCode.OPERATION_CONFLICT));
        assertRejected(clean, copyFailed("operation-a"));
        assertRejected(blocked, copyFailed("operation-a"));
        assertAllowed(running, copyFailed("operation-a"));
    }

    @Test
    void blockedPendingAlwaysRequiresRecoveryBeforeCredentialPlans() {
        for (ApplyMode mode : ApplyMode.values()) {
            MigrationOperationSnapshot blocked = blockedPending("operation-a", mode);
            for (CandidateEvidence evidence : CandidateEvidence.values()) {
                assertThat(restart.classify(blocked, evidence)).isEqualTo(Plan.RECOVERY_REQUIRED);
            }
        }
    }

    @Test
    void terminalPreparationFailuresKeepExistingRestartCleanupRules() {
        MigrationOperationSnapshot managed = preparationFailed(
                "operation-managed", SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED);
        MigrationOperationSnapshot external = failedBeforeStart(
                "operation-external", ApplyMode.EXTERNAL_APPLY, SetupErrorCode.OPERATION_CONFLICT,
                0, VerificationState.PENDING, null);

        assertThat(restart.classify(managed, CandidateEvidence.EXACT))
                .isEqualTo(Plan.CLEANUP_TERMINAL_CANDIDATE);
        assertThat(restart.classify(managed, CandidateEvidence.MISSING)).isEqualTo(Plan.NONE);
        assertThat(restart.classify(external, CandidateEvidence.NOT_APPLICABLE)).isEqualTo(Plan.NONE);
    }

    @Test
    void codecAndExactStoreRoundTripBlockedAndTerminalPreparationStates() {
        MigrationOperationSnapshot blocked = blockedPending("operation-a", ApplyMode.MANAGED_WRITE);
        MigrationOperationSnapshot terminal = preparationFailed(
                "operation-b", SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED);
        MigrationOperationFileCodec codec = new MigrationOperationFileCodec();

        assertThat(codec.decode(codec.encode(List.of(terminal, blocked))))
                .containsExactly(terminal, blocked);

        FileMigrationOperationStore store = new FileMigrationOperationStore(root);
        MigrationOperationSnapshot clean = cleanPending("operation-a", ApplyMode.MANAGED_WRITE);
        assertThat(store.createOrConfirm(clean)).isEqualTo(clean);
        assertThat(store.compareAndTransitionOrConfirm(
                clean.operationId(), MigrationOperationState.PENDING, blocked)).isEqualTo(blocked);
        assertThat(store.compareAndTransitionOrConfirm(
                blocked.operationId(), MigrationOperationState.PENDING, blocked)).isEqualTo(blocked);
        MigrationOperationSnapshot running = running("operation-a", ApplyMode.MANAGED_WRITE);
        assertThat(store.compareAndTransitionOrConfirm(
                blocked.operationId(), MigrationOperationState.PENDING, running)).isEqualTo(running);
        assertThat(store.find(blocked.operationId())).contains(running);
    }

    private static MigrationOperationSnapshot cleanPending(String operationId, ApplyMode mode) {
        return snapshot(operationId, mode, MigrationOperationState.PENDING, MigrationStage.QUEUED,
                0, null, null, VerificationState.PENDING, null, 1000);
    }

    private static MigrationOperationSnapshot blockedPending(String operationId, ApplyMode mode) {
        return snapshot(operationId, mode, MigrationOperationState.PENDING, MigrationStage.QUEUED,
                0, null, null, VerificationState.PENDING, SetupErrorCode.CONFIG_RECOVERY_REQUIRED, 0);
    }

    private static MigrationOperationSnapshot preparationFailed(String operationId, SetupErrorCode error) {
        return failedBeforeStart(operationId, ApplyMode.MANAGED_WRITE, error, 0,
                VerificationState.PENDING, null);
    }

    private static MigrationOperationSnapshot failedBeforeStart(
            SetupErrorCode error, int progress, VerificationState verification, Instant startedAt) {
        return failedBeforeStart("operation-a", ApplyMode.MANAGED_WRITE, error, progress, verification, startedAt);
    }

    private static MigrationOperationSnapshot failedBeforeStart(
            String operationId, ApplyMode mode, SetupErrorCode error,
            int progress, VerificationState verification, Instant startedAt) {
        return snapshot(operationId, mode, MigrationOperationState.FAILED, MigrationStage.FAILED,
                progress, startedAt, CREATED.plusSeconds(1), verification, error, 0);
    }

    private static MigrationOperationSnapshot running(String operationId, ApplyMode mode) {
        return snapshot(operationId, mode, MigrationOperationState.RUNNING, MigrationStage.COPYING,
                10, CREATED.plusSeconds(1), null, VerificationState.PENDING, null, 1000);
    }

    private static MigrationOperationSnapshot copyFailed(String operationId) {
        return snapshot(operationId, ApplyMode.MANAGED_WRITE, MigrationOperationState.FAILED,
                MigrationStage.FAILED, 10, CREATED.plusSeconds(1), CREATED.plusSeconds(2),
                VerificationState.PENDING, SetupErrorCode.MIGRATION_COPY_FAILED, 0);
    }

    private static MigrationOperationSnapshot snapshot(
            String operationId, ApplyMode mode, MigrationOperationState state, MigrationStage stage,
            int progress, Instant startedAt, Instant completedAt, VerificationState verification,
            SetupErrorCode error, long pollMillis) {
        return new MigrationOperationSnapshot(operationId, state, MigrationTarget.MYSQL, mode, stage,
                progress, CREATED, startedAt, completedAt, verification, error, null, pollMillis,
                false, false, false, IDENTITY, mode == ApplyMode.MANAGED_WRITE ? GENERATION : null);
    }

    private void assertAllowed(MigrationOperationSnapshot current, MigrationOperationSnapshot next) {
        assertThatCode(() -> transitions.requireAllowed(current, next)).doesNotThrowAnyException();
    }

    private void assertRejected(MigrationOperationSnapshot current, MigrationOperationSnapshot next) {
        assertThatThrownBy(() -> transitions.requireAllowed(current, next))
                .isInstanceOf(MigrationOperationStoreException.class);
    }
}
