/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Frozen cause of a rollback, independent of mutable stage and terminal projection fields. */
public enum MigrationRollbackOrigin {
    VERIFICATION_FAILURE(VerificationState.FAILED, SetupErrorCode.MIGRATION_VERIFICATION_FAILED),
    ACTIVATION_FAILURE(VerificationState.SUCCEEDED, SetupErrorCode.MIGRATION_ACTIVATION_FAILED),
    RESTART_FAILURE(VerificationState.SUCCEEDED, SetupErrorCode.RESTART_FAILED);

    private final VerificationState verificationState;
    private final SetupErrorCode errorCode;

    MigrationRollbackOrigin(VerificationState verificationState, SetupErrorCode errorCode) {
        this.verificationState = verificationState;
        this.errorCode = errorCode;
    }

    VerificationState verificationState() {
        return verificationState;
    }

    SetupErrorCode errorCode() {
        return errorCode;
    }
}
