/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
