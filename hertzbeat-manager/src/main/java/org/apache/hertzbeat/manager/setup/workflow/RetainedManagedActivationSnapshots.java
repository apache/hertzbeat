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

/** Recognizes and builds exact journal shapes for retained managed activation. */
final class RetainedManagedActivationSnapshots {

    private static final long ACTIVE_POLL_MILLIS = 1000;

    private final MigrationOperationSnapshot source;

    RetainedManagedActivationSnapshots(MigrationOperationSnapshot source) {
        this.source = source;
    }

    boolean ready() {
        return source.applyMode() == ApplyMode.MANAGED_WRITE
                && source.state() == MigrationOperationState.READY_TO_ACTIVATE
                && source.stage() == MigrationStage.READY_TO_ACTIVATE
                && exactCommon()
                && source.activationAvailable()
                && !source.restartRequired();
    }

    boolean activating() {
        return source.applyMode() == ApplyMode.MANAGED_WRITE
                && source.state() == MigrationOperationState.RUNNING
                && source.stage() == MigrationStage.ACTIVATING
                && exactCommon()
                && !source.activationAvailable()
                && !source.restartRequired();
    }

    boolean awaitingRestart() {
        return source.applyMode() == ApplyMode.MANAGED_WRITE
                && source.state() == MigrationOperationState.AWAITING_RESTART
                && source.stage() == MigrationStage.AWAITING_RESTART
                && exactCommon()
                && !source.activationAvailable()
                && source.restartRequired();
    }

    MigrationOperationSnapshot activatingSnapshot() {
        return snapshot(MigrationOperationState.RUNNING, MigrationStage.ACTIVATING, false);
    }

    MigrationOperationSnapshot awaitingRestartSnapshot() {
        return snapshot(MigrationOperationState.AWAITING_RESTART,
                MigrationStage.AWAITING_RESTART, true);
    }

    private boolean exactCommon() {
        return source.progressPercent() == 100
                && source.startedAt() != null
                && source.completedAt() == null
                && source.verificationState() == VerificationState.SUCCEEDED
                && source.errorCode() == null
                && source.rollbackOrigin() == null
                && !source.externalApplyRequired();
    }

    private MigrationOperationSnapshot snapshot(
            MigrationOperationState state, MigrationStage stage, boolean restartRequired) {
        return new MigrationOperationSnapshot(
                source.operationId(), state, source.target(), source.applyMode(), stage, 100,
                source.createdAt(), source.startedAt(), null, VerificationState.SUCCEEDED,
                null, null, ACTIVE_POLL_MILLIS, false, restartRequired, false,
                source.targetIdentityHash(), source.managedCandidateGeneration());
    }
}
