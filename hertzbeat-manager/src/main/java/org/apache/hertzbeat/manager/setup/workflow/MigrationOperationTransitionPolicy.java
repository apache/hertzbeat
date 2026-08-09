/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Monotonic lifecycle boundary layered on the frozen migration projection validator. */
final class MigrationOperationTransitionPolicy {

    void requireAllowed(MigrationOperationSnapshot current, MigrationOperationSnapshot next) {
        if (!current.operationId().equals(next.operationId())
                || current.target() != next.target()
                || current.applyMode() != next.applyMode()
                || !current.createdAt().equals(next.createdAt())
                || current.startedAt() != null && !current.startedAt().equals(next.startedAt())
                || next.progressPercent() < current.progressPercent()
                || !allowedEdge(current, next)) {
            throw new MigrationOperationStoreException(SetupErrorCode.OPERATION_CONFLICT);
        }
    }

    private boolean allowedEdge(MigrationOperationSnapshot current, MigrationOperationSnapshot next) {
        return switch (current.state()) {
            case PENDING -> pendingExit(next);
            case RUNNING -> runningExit(current, next);
            case READY_TO_ACTIVATE -> readyExit(next);
            case AWAITING_EXTERNAL_APPLY -> externalExit(next);
            case AWAITING_RESTART -> restartExit(next);
            case SUCCEEDED, FAILED, ROLLED_BACK -> false;
        };
    }

    private boolean pendingExit(MigrationOperationSnapshot next) {
        return runningAt(next, MigrationStage.COPYING, VerificationState.PENDING)
                || failedWith(next, SetupErrorCode.MIGRATION_COPY_FAILED);
    }

    private boolean runningExit(MigrationOperationSnapshot current, MigrationOperationSnapshot next) {
        return switch (current.stage()) {
            case COPYING -> runningAt(next, MigrationStage.COPYING, VerificationState.PENDING)
                    || runningAt(next, MigrationStage.VERIFYING, VerificationState.RUNNING)
                    || failedWith(next, SetupErrorCode.MIGRATION_COPY_FAILED);
            case VERIFYING -> verifiedExit(current, next)
                    || failedWith(next, SetupErrorCode.MIGRATION_VERIFICATION_FAILED);
            case ACTIVATING -> runningAt(next, MigrationStage.ACTIVATING, VerificationState.SUCCEEDED)
                    || rollingBackAt(next, MigrationRollbackOrigin.ACTIVATION_FAILURE)
                    || next.state() == MigrationOperationState.AWAITING_RESTART
                    || next.state() == MigrationOperationState.SUCCEEDED
                    || failedWith(next, SetupErrorCode.MIGRATION_ACTIVATION_FAILED);
            case ROLLING_BACK -> rollbackContinues(current, next) || rollbackCompletes(current, next);
            default -> false;
        };
    }

    private boolean readyExit(MigrationOperationSnapshot next) {
        return runningAt(next, MigrationStage.ACTIVATING, VerificationState.SUCCEEDED)
                || rollingBackAt(next, MigrationRollbackOrigin.ACTIVATION_FAILURE);
    }

    private boolean externalExit(MigrationOperationSnapshot next) {
        return next.state() == MigrationOperationState.AWAITING_RESTART
                || next.state() == MigrationOperationState.SUCCEEDED
                || failedWith(next, SetupErrorCode.MIGRATION_ACTIVATION_FAILED);
    }

    private boolean restartExit(MigrationOperationSnapshot next) {
        return next.state() == MigrationOperationState.SUCCEEDED
                || failedWith(next, SetupErrorCode.RESTART_FAILED)
                || rollingBackAt(next, MigrationRollbackOrigin.RESTART_FAILURE);
    }

    private boolean verifiedExit(MigrationOperationSnapshot current, MigrationOperationSnapshot next) {
        return current.applyMode() == ApplyMode.MANAGED_WRITE
                ? next.state() == MigrationOperationState.READY_TO_ACTIVATE
                : next.state() == MigrationOperationState.AWAITING_EXTERNAL_APPLY;
    }

    private boolean rollingBackAt(MigrationOperationSnapshot next, MigrationRollbackOrigin origin) {
        return runningAt(next, MigrationStage.ROLLING_BACK, origin.verificationState())
                && next.rollbackOrigin() == origin;
    }

    private boolean rollbackContinues(MigrationOperationSnapshot current, MigrationOperationSnapshot next) {
        return rollingBackAt(next, current.rollbackOrigin())
                && next.verificationState() == current.verificationState();
    }

    private boolean rollbackCompletes(MigrationOperationSnapshot current, MigrationOperationSnapshot next) {
        return next.state() == MigrationOperationState.ROLLED_BACK
                && next.rollbackOrigin() == current.rollbackOrigin()
                && next.verificationState() == current.verificationState()
                && next.errorCode() == current.rollbackOrigin().errorCode();
    }

    private boolean runningAt(
            MigrationOperationSnapshot next, MigrationStage stage, VerificationState verification) {
        return next.state() == MigrationOperationState.RUNNING
                && next.stage() == stage && next.verificationState() == verification;
    }

    private boolean failedWith(MigrationOperationSnapshot next, SetupErrorCode errorCode) {
        return next.state() == MigrationOperationState.FAILED && next.errorCode() == errorCode;
    }
}
