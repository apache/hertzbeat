/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.time.Instant;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Secret-free durable state for one H2 metadata migration operation. */
public record MigrationOperationSnapshot(
        String operationId,
        MigrationOperationState state,
        MigrationTarget target,
        ApplyMode applyMode,
        MigrationStage stage,
        int progressPercent,
        Instant createdAt,
        Instant startedAt,
        Instant completedAt,
        VerificationState verificationState,
        SetupErrorCode errorCode,
        MigrationRollbackOrigin rollbackOrigin,
        long nextPollAfterMillis,
        boolean activationAvailable,
        boolean restartRequired,
        boolean externalApplyRequired) {

    public MigrationOperationSnapshot {
        Objects.requireNonNull(applyMode, "applyMode");
        new MigrationView(operationId, state, MetadataDatabaseKind.H2, target, stage, progressPercent,
                createdAt, startedAt, completedAt, verificationState, errorCode, nextPollAfterMillis,
                activationAvailable, restartRequired, externalApplyRequired);
        validateRollback(state, stage, verificationState, errorCode, rollbackOrigin);
    }

    public boolean terminal() {
        return state == MigrationOperationState.SUCCEEDED
                || state == MigrationOperationState.FAILED
                || state == MigrationOperationState.ROLLED_BACK;
    }

    private static void validateRollback(
            MigrationOperationState state, MigrationStage stage, VerificationState verification,
            SetupErrorCode errorCode, MigrationRollbackOrigin origin) {
        boolean rollingBack = state == MigrationOperationState.RUNNING && stage == MigrationStage.ROLLING_BACK;
        boolean rolledBack = state == MigrationOperationState.ROLLED_BACK;
        if ((origin != null) != (rollingBack || rolledBack)) {
            throw new IllegalArgumentException("Migration rollback origin is inconsistent");
        }
        if (origin != null && (verification != origin.verificationState()
                || rolledBack && errorCode != origin.errorCode())) {
            throw new IllegalArgumentException("Migration rollback origin is inconsistent");
        }
    }
}
