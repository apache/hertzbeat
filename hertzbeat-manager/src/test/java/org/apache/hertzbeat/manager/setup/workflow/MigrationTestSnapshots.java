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

import java.time.Instant;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

final class MigrationTestSnapshots {

    private static final Instant CREATED = Instant.parse("2026-08-10T01:00:00Z");

    private MigrationTestSnapshots() {
    }

    static MigrationView running(String operationId) {
        return new MigrationView(
                operationId, MigrationOperationState.RUNNING, MetadataDatabaseKind.H2,
                MigrationTarget.POSTGRESQL, MigrationStage.COPYING, 0,
                CREATED, CREATED.plusSeconds(1), null, VerificationState.PENDING,
                null, 1_000, false, false, false);
    }

    static MigrationView awaitingRestart(String operationId) {
        return new MigrationView(
                operationId, MigrationOperationState.AWAITING_RESTART, MetadataDatabaseKind.H2,
                MigrationTarget.POSTGRESQL, MigrationStage.AWAITING_RESTART, 100,
                CREATED, CREATED.plusSeconds(1), null,
                VerificationState.SUCCEEDED, null, 250, false, true, false);
    }

    static MigrationView blockedPending(String operationId) {
        return new MigrationView(
                operationId, MigrationOperationState.PENDING, MetadataDatabaseKind.H2,
                MigrationTarget.POSTGRESQL, MigrationStage.QUEUED, 0,
                CREATED, null, null, VerificationState.PENDING,
                org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode
                        .CONFIG_RECOVERY_REQUIRED,
                0, false, false, false);
    }
}
