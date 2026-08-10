/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.time.Instant;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Builds exact restart success and rollback journal snapshots. */
final class MigrationStartupSnapshots {

    private static final long ACTIVE_POLL_MILLIS = 1000;

    private final MigrationOperationSnapshot source;

    MigrationStartupSnapshots(MigrationOperationSnapshot source) {
        this.source = source;
    }

    MigrationOperationSnapshot succeeded(Instant completedAt) {
        return snapshot(MigrationOperationState.SUCCEEDED, MigrationStage.COMPLETED,
                completedAt, null, null, 0);
    }

    MigrationOperationSnapshot rollingBack() {
        return snapshot(MigrationOperationState.RUNNING, MigrationStage.ROLLING_BACK,
                null, null, MigrationRollbackOrigin.RESTART_FAILURE, ACTIVE_POLL_MILLIS);
    }

    MigrationOperationSnapshot rolledBack(Instant completedAt) {
        return snapshot(MigrationOperationState.ROLLED_BACK, MigrationStage.ROLLED_BACK,
                completedAt, SetupErrorCode.RESTART_FAILED,
                MigrationRollbackOrigin.RESTART_FAILURE, 0);
    }

    private MigrationOperationSnapshot snapshot(
            MigrationOperationState state,
            MigrationStage stage,
            Instant completedAt,
            SetupErrorCode errorCode,
            MigrationRollbackOrigin rollbackOrigin,
            long nextPollAfterMillis) {
        return new MigrationOperationSnapshot(
                source.operationId(), state, source.target(), source.applyMode(), stage, 100,
                source.createdAt(), source.startedAt(), completedAt,
                source.verificationState(), errorCode, rollbackOrigin, nextPollAfterMillis,
                false, false, false, source.targetIdentityHash(),
                source.managedCandidateGeneration());
    }
}
