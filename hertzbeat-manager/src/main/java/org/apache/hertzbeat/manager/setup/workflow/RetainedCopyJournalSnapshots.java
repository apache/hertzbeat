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

/** Builds and recognizes the exact secret-free journal shapes after a successful copy. */
final class RetainedCopyJournalSnapshots {

    private static final long ACTIVE_POLL_MILLIS = 1000;

    private final MigrationOperationSnapshot source;

    RetainedCopyJournalSnapshots(MigrationOperationSnapshot source) {
        this.source = source;
    }

    boolean copying() {
        return source.state() == MigrationOperationState.RUNNING
                && source.stage() == MigrationStage.COPYING
                && source.progressPercent() < 100
                && source.startedAt() != null
                && source.completedAt() == null
                && source.verificationState() == VerificationState.PENDING
                && source.errorCode() == null
                && source.rollbackOrigin() == null
                && !source.activationAvailable()
                && !source.restartRequired()
                && !source.externalApplyRequired();
    }

    boolean verifying() {
        return source.state() == MigrationOperationState.RUNNING
                && source.stage() == MigrationStage.VERIFYING
                && source.progressPercent() == 100
                && source.startedAt() != null
                && source.completedAt() == null
                && source.verificationState() == VerificationState.RUNNING
                && source.errorCode() == null
                && source.rollbackOrigin() == null
                && !source.activationAvailable()
                && !source.restartRequired()
                && !source.externalApplyRequired();
    }

    boolean finalState() {
        return source.applyMode() == ApplyMode.MANAGED_WRITE
                ? source.state() == MigrationOperationState.READY_TO_ACTIVATE
                    && source.stage() == MigrationStage.READY_TO_ACTIVATE
                    && source.activationAvailable() && !source.externalApplyRequired()
                : source.state() == MigrationOperationState.AWAITING_EXTERNAL_APPLY
                    && source.stage() == MigrationStage.AWAITING_EXTERNAL_APPLY
                    && !source.activationAvailable() && source.externalApplyRequired();
    }

    MigrationOperationSnapshot verifyingSnapshot() {
        return snapshot(MigrationOperationState.RUNNING, MigrationStage.VERIFYING,
                VerificationState.RUNNING, ACTIVE_POLL_MILLIS, false, false);
    }

    MigrationOperationSnapshot finalSnapshot() {
        boolean managed = source.applyMode() == ApplyMode.MANAGED_WRITE;
        return snapshot(
                managed ? MigrationOperationState.READY_TO_ACTIVATE
                        : MigrationOperationState.AWAITING_EXTERNAL_APPLY,
                managed ? MigrationStage.READY_TO_ACTIVATE
                        : MigrationStage.AWAITING_EXTERNAL_APPLY,
                VerificationState.SUCCEEDED, 0, managed, !managed);
    }

    private MigrationOperationSnapshot snapshot(
            MigrationOperationState state,
            MigrationStage stage,
            VerificationState verification,
            long pollMillis,
            boolean activationAvailable,
            boolean externalApplyRequired) {
        return new MigrationOperationSnapshot(
                source.operationId(), state, source.target(), source.applyMode(), stage, 100,
                source.createdAt(), source.startedAt(), null, verification, null, null,
                pollMillis, activationAvailable, false, externalApplyRequired,
                source.targetIdentityHash(), source.managedCandidateGeneration());
    }
}
