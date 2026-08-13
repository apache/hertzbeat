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
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Closed capability for failure outcomes whose migration resources are already known to be clean. */
enum DurableKnownFailure {
    COPY(SetupErrorCode.MIGRATION_COPY_FAILED, MigrationStage.COPYING, VerificationState.PENDING),
    VERIFICATION(
            SetupErrorCode.MIGRATION_VERIFICATION_FAILED,
            MigrationStage.VERIFYING,
            VerificationState.FAILED),
    CURRENT_PHASE(null, null, null);

    private final SetupErrorCode errorCode;
    private final MigrationStage requiredStage;
    private final VerificationState verificationState;

    DurableKnownFailure(
            SetupErrorCode errorCode,
            MigrationStage requiredStage,
            VerificationState verificationState) {
        this.errorCode = errorCode;
        this.requiredStage = requiredStage;
        this.verificationState = verificationState;
    }

    SetupErrorCode errorCode() {
        return errorCode;
    }

    MigrationStage requiredStage() {
        return requiredStage;
    }

    VerificationState verificationState() {
        return verificationState;
    }

    int progress(MigrationOperationSnapshot current) {
        return this == COPY ? current.progressPercent() : 100;
    }

    DurableKnownFailure resolve(MigrationOperationSnapshot current) {
        if (this != CURRENT_PHASE) {
            return this;
        }
        if (current.state() == MigrationOperationState.FAILED) {
            return switch (current.errorCode()) {
                case MIGRATION_COPY_FAILED -> COPY;
                case MIGRATION_VERIFICATION_FAILED -> VERIFICATION;
                default -> throw conflict();
            };
        }
        return switch (current.stage()) {
            case COPYING -> COPY;
            case VERIFYING -> VERIFICATION;
            default -> throw conflict();
        };
    }

    private static MigrationOperationStoreException conflict() {
        return new MigrationOperationStoreException(SetupErrorCode.OPERATION_CONFLICT);
    }
}
