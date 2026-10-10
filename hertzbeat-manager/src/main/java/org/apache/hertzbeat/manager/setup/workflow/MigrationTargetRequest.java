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

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;

/** Secret-free command request values retained for same-operation admission checks. */
record MigrationTargetRequest(
        String operationId,
        MigrationTarget target,
        ApplyMode applyMode,
        MetadataDatabaseSettings settings) {

    MigrationTargetRequest {
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(target, "target");
        Objects.requireNonNull(applyMode, "applyMode");
        Objects.requireNonNull(settings, "settings");
    }
}
