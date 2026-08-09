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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentTopology;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceMode;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceAdmission;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationCapability;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.TargetInspection;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ManagementDatabaseSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/** Stable admission and optimistic activation errors independent of a future copy engine. */
class MetadataMigrationPolicyTest {

    private final MetadataMigrationPolicy policy = new MetadataMigrationPolicy();

    @Test
    void permitsCurrentOrAtomicAutoEnterAdmissionForSingleNodeEmptyTargetMigrationFromH2() {
        assertDoesNotThrow(() -> policy.requireMigrationAllowed(
                deployment(MaintenanceMode.ACTIVE, DeploymentTopology.SINGLE_NODE),
                MigrationTarget.MYSQL, TargetInspection.EMPTY));
        assertDoesNotThrow(() -> policy.requireMigrationAllowed(
                deployment(MaintenanceMode.INACTIVE, DeploymentTopology.SINGLE_NODE),
                MigrationTarget.MYSQL, TargetInspection.EMPTY));
        assertFailure(SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED,
                () -> policy.requireMigrationAllowed(
                        deployment(MetadataDatabaseKind.MYSQL, MaintenanceMode.ACTIVE,
                                DeploymentTopology.SINGLE_NODE),
                        MigrationTarget.POSTGRESQL, TargetInspection.EMPTY));
        assertFailure(SetupErrorCode.MIGRATION_TOPOLOGY_UNAVAILABLE,
                () -> policy.requireMigrationAllowed(
                        deployment(MaintenanceMode.ACTIVE, DeploymentTopology.UNKNOWN),
                        MigrationTarget.MYSQL, TargetInspection.EMPTY));
        assertFailure(SetupErrorCode.MIGRATION_TARGET_NOT_EMPTY,
                () -> policy.requireMigrationAllowed(
                        deployment(MaintenanceMode.ACTIVE, DeploymentTopology.SINGLE_NODE),
                        MigrationTarget.MYSQL, TargetInspection.NON_EMPTY));
        assertFailure(SetupErrorCode.METADATA_CONNECTION_FAILED,
                () -> policy.requireMigrationAllowed(
                        deployment(MaintenanceMode.ACTIVE, DeploymentTopology.SINGLE_NODE),
                        MigrationTarget.MYSQL, TargetInspection.UNKNOWN));
        assertFailure(SetupErrorCode.MIGRATION_MULTI_NODE_UNSUPPORTED,
                () -> policy.requireMigrationAllowed(
                        deployment(MaintenanceMode.ACTIVE, DeploymentTopology.MULTI_NODE),
                        MigrationTarget.POSTGRESQL, TargetInspection.EMPTY));
        assertFailure(SetupErrorCode.OPERATION_CONFLICT,
                () -> policy.requireMigrationAllowed(deployment(MaintenanceMode.ACTIVE,
                                DeploymentTopology.SINGLE_NODE, MigrationCapability.blocked(
                                        SetupErrorCode.OPERATION_CONFLICT,
                                        MaintenanceAdmission.UNAVAILABLE, "migration-42")),
                        MigrationTarget.MYSQL, TargetInspection.EMPTY));
        assertFailure(SetupErrorCode.MIGRATION_UNAVAILABLE,
                () -> policy.requireMigrationAllowed(deployment(MaintenanceMode.INACTIVE,
                                DeploymentTopology.SINGLE_NODE, MigrationCapability.blocked(
                                        SetupErrorCode.MIGRATION_UNAVAILABLE,
                                        MaintenanceAdmission.UNAVAILABLE)),
                        MigrationTarget.MYSQL, TargetInspection.EMPTY));
        assertFailure(SetupErrorCode.MIGRATION_MAINTENANCE_REQUIRED,
                () -> policy.requireMigrationAllowed(deployment(MaintenanceMode.INACTIVE,
                                DeploymentTopology.SINGLE_NODE, MigrationCapability.blocked(
                                        SetupErrorCode.MIGRATION_MAINTENANCE_REQUIRED,
                                        MaintenanceAdmission.UNAVAILABLE)),
                        MigrationTarget.MYSQL, TargetInspection.EMPTY));
    }

    @Test
    void activationUsesExpectedStateAndStableLookupAndPhaseErrors() {
        assertFailure(HttpStatus.NOT_FOUND, SetupErrorCode.OPERATION_NOT_FOUND,
                () -> policy.requireActivationAllowed(null, MigrationOperationState.READY_TO_ACTIVATE));
        assertFailure(SetupErrorCode.OPERATION_CONFLICT,
                () -> policy.requireActivationAllowed(readyMigration(), MigrationOperationState.RUNNING));
        assertFailure(SetupErrorCode.MIGRATION_ACTIVATION_NOT_AVAILABLE,
                () -> policy.requireActivationAllowed(runningMigration(), MigrationOperationState.RUNNING));
        assertFailure(SetupErrorCode.MIGRATION_ACTIVATION_NOT_AVAILABLE,
                () -> policy.requireActivationAllowed(
                        externalMigration(), MigrationOperationState.AWAITING_EXTERNAL_APPLY));
        assertDoesNotThrow(() -> policy.requireActivationAllowed(
                readyMigration(), MigrationOperationState.READY_TO_ACTIVATE));
    }

    private DeploymentView deployment(MaintenanceMode maintenance, DeploymentTopology topology) {
        return deployment(MetadataDatabaseKind.H2, maintenance, topology);
    }

    private DeploymentView deployment(
            MetadataDatabaseKind kind, MaintenanceMode maintenance, DeploymentTopology topology) {
        SetupErrorCode blocker = switch (topology) {
            case MULTI_NODE -> SetupErrorCode.MIGRATION_MULTI_NODE_UNSUPPORTED;
            case UNKNOWN -> SetupErrorCode.MIGRATION_TOPOLOGY_UNAVAILABLE;
            case SINGLE_NODE -> kind == MetadataDatabaseKind.H2 ? null : SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED;
        };
        MigrationCapability capability = blocker == null
                ? MigrationCapability.permitted(maintenance == MaintenanceMode.ACTIVE
                        ? MaintenanceAdmission.USE_CURRENT : MaintenanceAdmission.AUTO_ENTER)
                : MigrationCapability.blocked(blocker, MaintenanceAdmission.NOT_APPLICABLE);
        return deployment(maintenance, topology, capability, kind);
    }

    private DeploymentView deployment(
            MaintenanceMode maintenance, DeploymentTopology topology, MigrationCapability capability) {
        return deployment(maintenance, topology, capability, MetadataDatabaseKind.H2);
    }

    private DeploymentView deployment(
            MaintenanceMode maintenance, DeploymentTopology topology,
            MigrationCapability capability, MetadataDatabaseKind kind) {
        return new DeploymentView(Instant.parse("2026-08-09T00:00:00Z"),
                new ManagementDatabaseSummary(kind, true, ConfigSource.UI_MANAGED, false),
                new TelemetryStoreSummary(TelemetryStoreKind.GREPTIME, true, ConfigSource.UI_MANAGED, false),
                ApplyMode.MANAGED_WRITE, maintenance, topology, capability);
    }

    private MigrationView readyMigration() {
        return migration(MigrationOperationState.READY_TO_ACTIVATE, MigrationStage.READY_TO_ACTIVATE,
                100, VerificationState.SUCCEEDED, 0, true);
    }

    private MigrationView runningMigration() {
        return migration(MigrationOperationState.RUNNING, MigrationStage.COPYING,
                25, VerificationState.PENDING, 500, false);
    }

    private MigrationView externalMigration() {
        return new MigrationView("migration-1", MigrationOperationState.AWAITING_EXTERNAL_APPLY,
                MetadataDatabaseKind.H2, MigrationTarget.MYSQL, MigrationStage.AWAITING_EXTERNAL_APPLY,
                100, Instant.parse("2026-08-09T00:00:00Z"), Instant.parse("2026-08-09T00:00:01Z"),
                null, VerificationState.SUCCEEDED, null, 0, false, false, true);
    }

    private MigrationView migration(MigrationOperationState state, MigrationStage stage,
                                    int progress, VerificationState verification, long poll, boolean activation) {
        return new MigrationView("migration-1", state, MetadataDatabaseKind.H2, MigrationTarget.MYSQL,
                stage, progress, Instant.parse("2026-08-09T00:00:00Z"),
                Instant.parse("2026-08-09T00:00:01Z"), null, verification, null, poll,
                activation, false, false);
    }

    private void assertFailure(SetupErrorCode expected, Runnable invocation) {
        assertFailure(HttpStatus.CONFLICT, expected, invocation);
    }

    private void assertFailure(HttpStatus status, SetupErrorCode expected, Runnable invocation) {
        SetupApiException failure = assertThrows(SetupApiException.class, invocation::run);
        assertEquals(status, failure.status());
        assertEquals(expected, failure.errorCode());
        assertEquals(expected.value(), failure.getMessage());
    }
}
