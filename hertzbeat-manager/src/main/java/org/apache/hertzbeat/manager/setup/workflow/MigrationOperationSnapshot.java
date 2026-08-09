/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;
import java.util.Objects;
import java.util.regex.Pattern;
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
        boolean externalApplyRequired,
        @JsonIgnore String targetIdentityHash,
        @JsonIgnore String managedCandidateGeneration) {

    private static final Pattern TARGET_IDENTITY_HASH = Pattern.compile("[0-9a-f]{64}");
    private static final Pattern MANAGED_CANDIDATE_GENERATION = Pattern.compile("[A-Za-z0-9][A-Za-z0-9-]{0,63}");

    public MigrationOperationSnapshot {
        Objects.requireNonNull(applyMode, "applyMode");
        validateManifestIdentity(applyMode, targetIdentityHash, managedCandidateGeneration);
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

    @Override
    public String toString() {
        return "MigrationOperationSnapshot[operationId=" + operationId + ", state=" + state
                + ", target=" + target + ", applyMode=" + applyMode + ", stage=" + stage
                + ", progressPercent=" + progressPercent + "]";
    }

    private static void validateManifestIdentity(
            ApplyMode applyMode, String targetIdentityHash, String managedCandidateGeneration) {
        if (targetIdentityHash == null || !TARGET_IDENTITY_HASH.matcher(targetIdentityHash).matches()) {
            throw new IllegalArgumentException("Invalid migration target identity");
        }
        if (applyMode == ApplyMode.MANAGED_WRITE) {
            if (managedCandidateGeneration == null
                    || !MANAGED_CANDIDATE_GENERATION.matcher(managedCandidateGeneration).matches()) {
                throw new IllegalArgumentException("Invalid managed migration candidate");
            }
        } else if (managedCandidateGeneration != null) {
            throw new IllegalArgumentException("External migration cannot reference a managed candidate");
        }
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
