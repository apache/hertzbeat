/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.junit.jupiter.api.Test;

class MigrationOperationTransitionPolicyTest {

    private static final Instant CREATED = Instant.parse("2026-08-09T01:00:00Z");
    private static final Instant STARTED = CREATED.plusSeconds(1);
    private static final Instant COMPLETED = STARTED.plusSeconds(1);
    private final MigrationOperationTransitionPolicy policy = new MigrationOperationTransitionPolicy();

    @Test
    void acceptsExplicitManagedLifecycleEdges() {
        MigrationOperationSnapshot pending = snapshot(MigrationOperationState.PENDING, MigrationStage.QUEUED,
                0, null, null, VerificationState.PENDING, null, 1000, false, false, false);
        MigrationOperationSnapshot copying = snapshot(MigrationOperationState.RUNNING, MigrationStage.COPYING,
                25, STARTED, null, VerificationState.PENDING, null, 1000, false, false, false);
        MigrationOperationSnapshot verifying = snapshot(MigrationOperationState.RUNNING, MigrationStage.VERIFYING,
                100, STARTED, null, VerificationState.RUNNING, null, 1000, false, false, false);
        MigrationOperationSnapshot ready = snapshot(MigrationOperationState.READY_TO_ACTIVATE,
                MigrationStage.READY_TO_ACTIVATE, 100, STARTED, null, VerificationState.SUCCEEDED,
                null, 0, true, false, false);
        MigrationOperationSnapshot activating = snapshot(MigrationOperationState.RUNNING, MigrationStage.ACTIVATING,
                100, STARTED, null, VerificationState.SUCCEEDED, null, 1000, false, false, false);
        MigrationOperationSnapshot restart = snapshot(MigrationOperationState.AWAITING_RESTART,
                MigrationStage.AWAITING_RESTART, 100, STARTED, null, VerificationState.SUCCEEDED,
                null, 1000, false, true, false);
        MigrationOperationSnapshot succeeded = snapshot(MigrationOperationState.SUCCEEDED, MigrationStage.COMPLETED,
                100, STARTED, COMPLETED, VerificationState.SUCCEEDED, null, 0, false, false, false);

        assertAllowed(pending, copying);
        assertAllowed(copying, verifying);
        assertAllowed(verifying, ready);
        assertAllowed(ready, activating);
        assertAllowed(activating, restart);
        assertAllowed(restart, succeeded);
    }

    @Test
    void acceptsExternalFailedAndRolledBackExitsButTerminalStatesStayClosed() {
        MigrationOperationSnapshot verifying = external(MigrationOperationState.RUNNING, MigrationStage.VERIFYING,
                VerificationState.RUNNING, null, false, null);
        MigrationOperationSnapshot external = external(MigrationOperationState.AWAITING_EXTERNAL_APPLY,
                MigrationStage.AWAITING_EXTERNAL_APPLY, VerificationState.SUCCEEDED, null, true, null);
        MigrationOperationSnapshot failed = snapshot(MigrationOperationState.FAILED, MigrationStage.FAILED,
                25, STARTED, COMPLETED, VerificationState.PENDING, SetupErrorCode.MIGRATION_COPY_FAILED,
                0, false, false, false);
        MigrationOperationSnapshot rollingBack = rollingBack(MigrationRollbackOrigin.ACTIVATION_FAILURE);
        MigrationOperationSnapshot rolledBack = rolledBack(MigrationRollbackOrigin.ACTIVATION_FAILURE,
                SetupErrorCode.MIGRATION_ACTIVATION_FAILED);

        assertAllowed(verifying, external);
        assertAllowed(snapshot(MigrationOperationState.RUNNING, MigrationStage.COPYING, 25, STARTED, null,
                VerificationState.PENDING, null, 1000, false, false, false), failed);
        assertAllowed(snapshot(MigrationOperationState.READY_TO_ACTIVATE, MigrationStage.READY_TO_ACTIVATE,
                100, STARTED, null, VerificationState.SUCCEEDED, null, 0, true, false, false), rollingBack);
        assertAllowed(rollingBack, rolledBack);
        assertRejected(external, verifying);
        assertRejected(failed, failed);
        assertRejected(rolledBack, rolledBack);
    }

    @Test
    void verificationSuccessExitMatchesApplyMode() {
        MigrationOperationSnapshot managedVerifying = snapshot(MigrationOperationState.RUNNING,
                MigrationStage.VERIFYING, 100, STARTED, null, VerificationState.RUNNING,
                null, 1000, false, false, false);
        MigrationOperationSnapshot managedExternal = snapshot(MigrationOperationState.AWAITING_EXTERNAL_APPLY,
                MigrationStage.AWAITING_EXTERNAL_APPLY, 100, STARTED, null, VerificationState.SUCCEEDED,
                null, 0, false, false, true);
        MigrationOperationSnapshot externalVerifying = external(MigrationOperationState.RUNNING,
                MigrationStage.VERIFYING, VerificationState.RUNNING, null, false, null);
        MigrationOperationSnapshot externalReady = external(MigrationOperationState.READY_TO_ACTIVATE,
                MigrationStage.READY_TO_ACTIVATE, VerificationState.SUCCEEDED, null, false, null);

        assertRejected(managedVerifying, managedExternal);
        assertRejected(externalVerifying, externalReady);
    }

    @Test
    void failureCodesAndRollbackEntryMatchTheirSourceStage() {
        MigrationOperationSnapshot pending = snapshot(MigrationOperationState.PENDING, MigrationStage.QUEUED,
                0, null, null, VerificationState.PENDING, null, 1000, false, false, false);
        MigrationOperationSnapshot copying = snapshot(MigrationOperationState.RUNNING, MigrationStage.COPYING,
                25, STARTED, null, VerificationState.PENDING, null, 1000, false, false, false);
        MigrationOperationSnapshot verifying = snapshot(MigrationOperationState.RUNNING, MigrationStage.VERIFYING,
                100, STARTED, null, VerificationState.RUNNING, null, 1000, false, false, false);
        MigrationOperationSnapshot activating = snapshot(MigrationOperationState.RUNNING, MigrationStage.ACTIVATING,
                100, STARTED, null, VerificationState.SUCCEEDED, null, 1000, false, false, false);
        MigrationOperationSnapshot restart = snapshot(MigrationOperationState.AWAITING_RESTART,
                MigrationStage.AWAITING_RESTART, 100, STARTED, null, VerificationState.SUCCEEDED,
                null, 1000, false, true, false);
        MigrationOperationSnapshot rollingBack = rollingBack(MigrationRollbackOrigin.RESTART_FAILURE);
        MigrationOperationSnapshot rolledBack = rolledBack(MigrationRollbackOrigin.RESTART_FAILURE,
                SetupErrorCode.RESTART_FAILED);

        assertAllowed(pending, failed(SetupErrorCode.MIGRATION_COPY_FAILED));
        assertAllowed(copying, failed(SetupErrorCode.MIGRATION_COPY_FAILED));
        assertAllowed(verifying, failed(SetupErrorCode.MIGRATION_VERIFICATION_FAILED));
        assertAllowed(activating, failed(SetupErrorCode.MIGRATION_ACTIVATION_FAILED));
        assertAllowed(restart, failed(SetupErrorCode.RESTART_FAILED));
        assertRejected(copying, failed(SetupErrorCode.MIGRATION_ACTIVATION_FAILED));
        assertRejected(verifying, failed(SetupErrorCode.MIGRATION_ACTIVATION_FAILED));
        assertRejected(activating, failed(SetupErrorCode.MIGRATION_VERIFICATION_FAILED));
        assertRejected(restart, failed(SetupErrorCode.MIGRATION_ACTIVATION_FAILED));
        assertRejected(restart, rolledBack);
        assertAllowed(restart, rollingBack);
        assertAllowed(rollingBack, rolledBack);
    }

    @Test
    void rollbackOriginFreezesVerificationAndTerminalFailureSource() {
        MigrationOperationSnapshot ready = snapshot(MigrationOperationState.READY_TO_ACTIVATE,
                MigrationStage.READY_TO_ACTIVATE, 100, STARTED, null, VerificationState.SUCCEEDED,
                null, 0, true, false, false);
        MigrationOperationSnapshot restart = snapshot(MigrationOperationState.AWAITING_RESTART,
                MigrationStage.AWAITING_RESTART, 100, STARTED, null, VerificationState.SUCCEEDED,
                null, 1000, false, true, false);
        MigrationOperationSnapshot activationRollback = rollingBack(MigrationRollbackOrigin.ACTIVATION_FAILURE);
        MigrationOperationSnapshot restartRollback = rollingBack(MigrationRollbackOrigin.RESTART_FAILURE);
        MigrationOperationSnapshot verificationRollback = rollingBack(MigrationRollbackOrigin.VERIFICATION_FAILURE);

        assertAllowed(ready, activationRollback);
        assertRejected(ready, restartRollback);
        assertAllowed(restart, restartRollback);
        assertRejected(restart, activationRollback);
        assertRejected(verificationRollback, rolledBack(MigrationRollbackOrigin.ACTIVATION_FAILURE,
                SetupErrorCode.MIGRATION_ACTIVATION_FAILED));
        assertThatThrownBy(() -> rolledBack(MigrationRollbackOrigin.ACTIVATION_FAILURE,
                SetupErrorCode.RESTART_FAILED)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> rolledBack(MigrationRollbackOrigin.RESTART_FAILURE,
                SetupErrorCode.MIGRATION_VERIFICATION_FAILED)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> rolledBack(MigrationRollbackOrigin.VERIFICATION_FAILURE,
                SetupErrorCode.MIGRATION_ACTIVATION_FAILED)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsSkippingCopyVerificationAndActivationStages() {
        MigrationOperationSnapshot copying = snapshot(MigrationOperationState.RUNNING, MigrationStage.COPYING,
                25, STARTED, null, VerificationState.PENDING, null, 1000, false, false, false);
        MigrationOperationSnapshot ready = snapshot(MigrationOperationState.READY_TO_ACTIVATE,
                MigrationStage.READY_TO_ACTIVATE, 100, STARTED, null, VerificationState.SUCCEEDED,
                null, 0, true, false, false);
        MigrationOperationSnapshot restart = snapshot(MigrationOperationState.AWAITING_RESTART,
                MigrationStage.AWAITING_RESTART, 100, STARTED, null, VerificationState.SUCCEEDED,
                null, 1000, false, true, false);
        MigrationOperationSnapshot succeeded = snapshot(MigrationOperationState.SUCCEEDED, MigrationStage.COMPLETED,
                100, STARTED, COMPLETED, VerificationState.SUCCEEDED, null, 0, false, false, false);
        MigrationOperationSnapshot verifying = snapshot(MigrationOperationState.RUNNING, MigrationStage.VERIFYING,
                100, STARTED, null, VerificationState.RUNNING, null, 1000, false, false, false);

        assertRejected(copying, ready);
        assertRejected(copying, restart);
        assertRejected(copying, succeeded);
        assertRejected(ready, verifying);
    }

    private MigrationOperationSnapshot external(
            MigrationOperationState state, MigrationStage stage, VerificationState verification,
            SetupErrorCode error, boolean externalRequired, Instant completedAt) {
        return new MigrationOperationSnapshot("migration-1", state, MigrationTarget.POSTGRESQL,
                ApplyMode.EXTERNAL_APPLY, stage, 100, CREATED, STARTED, completedAt, verification,
                error, null, state == MigrationOperationState.RUNNING ? 1000 : 0,
                state == MigrationOperationState.READY_TO_ACTIVATE, false, externalRequired);
    }

    private MigrationOperationSnapshot snapshot(
            MigrationOperationState state, MigrationStage stage, int progress, Instant startedAt,
            Instant completedAt, VerificationState verification, SetupErrorCode error, long pollMillis,
            boolean activation, boolean restart, boolean external) {
        return new MigrationOperationSnapshot("migration-1", state, MigrationTarget.MYSQL,
                ApplyMode.MANAGED_WRITE, stage, progress, CREATED, startedAt, completedAt,
                verification, error, null, pollMillis, activation, restart, external);
    }

    private MigrationOperationSnapshot failed(SetupErrorCode errorCode) {
        int progress = errorCode == SetupErrorCode.MIGRATION_COPY_FAILED ? 25 : 100;
        VerificationState verification = switch (errorCode) {
            case MIGRATION_COPY_FAILED -> VerificationState.PENDING;
            case MIGRATION_VERIFICATION_FAILED -> VerificationState.FAILED;
            default -> VerificationState.SUCCEEDED;
        };
        return snapshot(MigrationOperationState.FAILED, MigrationStage.FAILED, progress, STARTED,
                COMPLETED, verification, errorCode, 0, false, false, false);
    }

    private MigrationOperationSnapshot rollingBack(MigrationRollbackOrigin origin) {
        return new MigrationOperationSnapshot("migration-1", MigrationOperationState.RUNNING,
                MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE, MigrationStage.ROLLING_BACK,
                100, CREATED, STARTED, null, origin.verificationState(), null, origin,
                1000, false, false, false);
    }

    private MigrationOperationSnapshot rolledBack(
            MigrationRollbackOrigin origin, SetupErrorCode errorCode) {
        return new MigrationOperationSnapshot("migration-1", MigrationOperationState.ROLLED_BACK,
                MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE, MigrationStage.ROLLED_BACK,
                100, CREATED, STARTED, COMPLETED, origin.verificationState(), errorCode, origin,
                0, false, false, false);
    }

    private void assertAllowed(MigrationOperationSnapshot current, MigrationOperationSnapshot next) {
        assertThatCode(() -> policy.requireAllowed(current, next)).doesNotThrowAnyException();
    }

    private void assertRejected(MigrationOperationSnapshot current, MigrationOperationSnapshot next) {
        assertThatThrownBy(() -> policy.requireAllowed(current, next))
                .isInstanceOf(MigrationOperationStoreException.class);
    }
}
