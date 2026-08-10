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
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Builds and compares the exact secret-free journal shapes used during preparation. */
final class DurableCutoverSnapshots {

    private static final long ACTIVE_POLL_MILLIS = 1000;

    private final DurableCutoverDraft draft;
    private final String targetIdentityHash;

    DurableCutoverSnapshots(DurableCutoverDraft draft, String targetIdentityHash) {
        this.draft = Objects.requireNonNull(draft, "draft");
        this.targetIdentityHash = Objects.requireNonNull(targetIdentityHash, "targetIdentityHash");
    }

    MigrationOperationSnapshot cleanPending() {
        return snapshot(MigrationOperationState.PENDING, MigrationStage.QUEUED, 0,
                null, null, null, ACTIVE_POLL_MILLIS);
    }

    MigrationOperationSnapshot blockedPending() {
        return snapshot(MigrationOperationState.PENDING, MigrationStage.QUEUED, 0,
                null, null, SetupErrorCode.CONFIG_RECOVERY_REQUIRED, 0);
    }

    MigrationOperationSnapshot running() {
        return snapshot(MigrationOperationState.RUNNING, MigrationStage.COPYING, 0,
                draft.startedAt(), null, null, ACTIVE_POLL_MILLIS);
    }

    MigrationOperationSnapshot failed(SetupErrorCode errorCode) {
        return snapshot(MigrationOperationState.FAILED, MigrationStage.FAILED, 0,
                null, draft.startedAt(), errorCode, 0);
    }

    boolean compatibleRunning(MigrationOperationSnapshot current) {
        return current.state() == MigrationOperationState.RUNNING
                && current.stage() == MigrationStage.COPYING
                && sameIdentity(current)
                && current.startedAt().equals(draft.startedAt())
                && current.completedAt() == null
                && current.verificationState() == VerificationState.PENDING
                && current.errorCode() == null
                && current.rollbackOrigin() == null
                && !current.activationAvailable()
                && !current.restartRequired()
                && !current.externalApplyRequired();
    }

    boolean sameIdentity(MigrationOperationSnapshot current) {
        return current.target() == draft.target()
                && current.applyMode() == draft.applyMode()
                && current.createdAt().equals(draft.createdAt())
                && current.targetIdentityHash().equals(targetIdentityHash)
                && Objects.equals(current.managedCandidateGeneration(), draft.candidateGeneration());
    }

    private MigrationOperationSnapshot snapshot(
            MigrationOperationState state,
            MigrationStage stage,
            int progress,
            Instant startedAt,
            Instant completedAt,
            SetupErrorCode errorCode,
            long pollMillis) {
        return new MigrationOperationSnapshot(
                draft.operationId(), state, draft.target(), draft.applyMode(), stage, progress,
                draft.createdAt(), startedAt, completedAt, VerificationState.PENDING, errorCode,
                null, pollMillis, false, false, false, targetIdentityHash,
                draft.candidateGeneration());
    }
}
