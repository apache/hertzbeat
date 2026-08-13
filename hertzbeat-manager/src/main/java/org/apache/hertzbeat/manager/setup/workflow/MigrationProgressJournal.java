/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Persists only coarse, monotonic copy and verification progress. */
final class MigrationProgressJournal implements MetadataMigrationProgressSink {

    private final String operationId;
    private final FileMigrationOperationStore store;

    MigrationProgressJournal(String operationId, FileMigrationOperationStore store) {
        this.operationId = Objects.requireNonNull(operationId, "operationId");
        this.store = Objects.requireNonNull(store, "store");
    }

    @Override
    public void report(MetadataMigrationStage stage, int percent) {
        Objects.requireNonNull(stage, "stage");
        if (stage == MetadataMigrationStage.COPYING) {
            int safePercent = Math.max(0, Math.min(percent, 99));
            store.transformAndTransitionOrConfirmDisposition(
                    operationId, current -> copying(current, safePercent));
        } else if (stage == MetadataMigrationStage.VERIFYING) {
            store.transformAndTransitionOrConfirmDisposition(operationId, this::verifying);
        }
    }

    private MigrationOperationSnapshot copying(MigrationOperationSnapshot current, int percent) {
        requireRunning(current, MigrationStage.COPYING);
        if (percent <= current.progressPercent()) {
            return current;
        }
        return replace(current, MigrationStage.COPYING, percent, VerificationState.PENDING);
    }

    private MigrationOperationSnapshot verifying(MigrationOperationSnapshot current) {
        if (current.state() == MigrationOperationState.RUNNING
                && current.stage() == MigrationStage.VERIFYING) {
            return current;
        }
        requireRunning(current, MigrationStage.COPYING);
        return replace(current, MigrationStage.VERIFYING, 100, VerificationState.RUNNING);
    }

    private MigrationOperationSnapshot replace(
            MigrationOperationSnapshot current,
            MigrationStage stage,
            int progress,
            VerificationState verification) {
        return new MigrationOperationSnapshot(
                current.operationId(), current.state(), current.target(), current.applyMode(),
                stage, progress, current.createdAt(), current.startedAt(), null, verification,
                null, null, current.nextPollAfterMillis(), false, false, false,
                current.targetIdentityHash(), current.managedCandidateGeneration());
    }

    private static void requireRunning(
            MigrationOperationSnapshot current, MigrationStage expectedStage) {
        if (current.state() != MigrationOperationState.RUNNING || current.stage() != expectedStage) {
            throw new MigrationOperationStoreException(SetupErrorCode.OPERATION_CONFLICT);
        }
    }
}
