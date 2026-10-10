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

import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Maps durable internal state to the frozen secret-free API projection. */
final class MigrationOperationProjection {

    private MigrationOperationProjection() {
    }

    static MigrationView view(MigrationOperationSnapshot snapshot) {
        return new MigrationView(
                snapshot.operationId(), snapshot.state(), MetadataDatabaseKind.H2, snapshot.target(),
                snapshot.stage(), snapshot.progressPercent(), snapshot.createdAt(), snapshot.startedAt(),
                snapshot.completedAt(), snapshot.verificationState(), snapshot.errorCode(),
                snapshot.nextPollAfterMillis(), snapshot.activationAvailable(), snapshot.restartRequired(),
                snapshot.externalApplyRequired());
    }
}
