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

import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentTopology;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceMode;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.TargetInspection;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.springframework.http.HttpStatus;

/** Stable migration admission rules consumed by a later copy-engine implementation. */
public final class MetadataMigrationPolicy {

    public void requireMigrationAllowed(
            DeploymentView deployment, MigrationTarget target, TargetInspection targetInspection) {
        if (deployment == null || target == null || targetInspection == null) {
            throw new SetupApiException(SetupErrorCode.INVALID_REQUEST, HttpStatus.BAD_REQUEST);
        }
        if (deployment.managementDatabase().kind() != MetadataDatabaseKind.H2) {
            throw conflict(SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED);
        }
        if (deployment.topology() == DeploymentTopology.UNKNOWN) {
            throw conflict(SetupErrorCode.MIGRATION_TOPOLOGY_UNAVAILABLE);
        }
        if (deployment.topology() == DeploymentTopology.MULTI_NODE) {
            throw conflict(SetupErrorCode.MIGRATION_MULTI_NODE_UNSUPPORTED);
        }
        if (deployment.maintenanceMode() != MaintenanceMode.ACTIVE) {
            throw conflict(SetupErrorCode.MIGRATION_MAINTENANCE_REQUIRED);
        }
        if (targetInspection == TargetInspection.UNKNOWN) {
            throw conflict(SetupErrorCode.METADATA_CONNECTION_FAILED);
        }
        if (targetInspection == TargetInspection.NON_EMPTY) {
            throw conflict(SetupErrorCode.MIGRATION_TARGET_NOT_EMPTY);
        }
    }

    public void requireActivationAllowed(
            MigrationView operation, MigrationOperationState expectedState) {
        if (operation == null) {
            throw new SetupApiException(SetupErrorCode.OPERATION_NOT_FOUND, HttpStatus.NOT_FOUND);
        }
        if (operation.state() != expectedState) {
            throw conflict(SetupErrorCode.OPERATION_CONFLICT);
        }
        if (operation.state() != MigrationOperationState.READY_TO_ACTIVATE) {
            throw conflict(SetupErrorCode.MIGRATION_ACTIVATION_NOT_AVAILABLE);
        }
    }

    private SetupApiException conflict(SetupErrorCode code) {
        return new SetupApiException(code, HttpStatus.CONFLICT);
    }
}
