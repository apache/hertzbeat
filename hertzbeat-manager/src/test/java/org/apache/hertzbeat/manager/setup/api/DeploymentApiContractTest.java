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

package org.apache.hertzbeat.manager.setup.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.RecordComponent;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentTopology;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceMode;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceAdmission;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationCapability;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ManagementDatabaseSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreSummary;
import org.apache.hertzbeat.manager.setup.workflow.PreparedMigrationExport;
import org.junit.jupiter.api.Test;

/** Freezes authenticated deployment and H2 migration contracts. */
class DeploymentApiContractTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void freezesDeploymentRoutesAndShapes() throws Exception {
        assertEquals("/api/config/deployment", DeploymentApiContract.DEPLOYMENT_PATH);
        assertEquals("/api/config/deployment/validate", DeploymentApiContract.VALIDATE_PATH);
        assertEquals("/api/config/deployment/metadata-migrations", DeploymentApiContract.MIGRATION_PATH);
        assertEquals("/api/config/deployment/metadata-migrations/{operationId}",
                DeploymentApiContract.MIGRATION_OPERATION_PATH);
        assertEquals("/api/config/deployment/metadata-migrations/{operationId}/activate",
                DeploymentApiContract.ACTIVATE_PATH);
        assertEquals("/api/config/deployment/metadata-migrations/{operationId}/export",
                DeploymentApiContract.EXPORT_PATH);
        assertComponents(DeploymentApiContract.DeploymentView.class, "observedAt", "managementDatabase",
                "greptimeDatabase", "applyMode", "maintenanceMode", "topology", "migration");
        assertComponents(DeploymentApiContract.MigrationCapability.class, "allowed", "blockedBy",
                "maintenanceAdmission", "activeOperationId");
        assertComponents(DeploymentApiContract.MetadataMigrationValidationRequest.class,
                "target", "targetDatabase");
        assertComponents(DeploymentApiContract.MetadataMigrationRequest.class,
                "operationId", "target", "targetDatabase", "applyMode");
        assertComponents(DeploymentApiContract.MigrationView.class, "operationId", "state", "source", "target",
                "stage", "progressPercent", "createdAt", "startedAt", "completedAt", "verificationState",
                "errorCode", "nextPollAfterMillis", "activationAvailable", "restartRequired",
                "externalApplyRequired");
        assertComponents(DeploymentApiContract.ActivateMigrationRequest.class, "expectedState");
        assertComponents(DeploymentApiContract.MigrationExportRequest.class,
                "format", "expectedState", "targetDatabase");
        assertWireValues(MaintenanceMode.values(), "inactive", "active");
        assertWireValues(MaintenanceAdmission.values(),
                "use_current", "auto_enter", "unavailable", "not_applicable");
        assertWireValues(DeploymentTopology.values(), "single_node", "multi_node", "unknown");
        assertWireValues(MigrationTarget.values(), "mysql", "postgresql");
        assertWireValues(MigrationStage.values(), "queued", "copying", "verifying", "ready_to_activate",
                "awaiting_external_apply", "activating", "awaiting_restart", "completed", "rolling_back",
                "rolled_back", "failed");
        assertWireValues(VerificationState.values(), "pending", "running", "succeeded", "failed");
        assertWireValues(MigrationOperationState.values(), "pending", "running", "ready_to_activate",
                "awaiting_external_apply", "awaiting_restart", "succeeded", "failed", "rolled_back");
        assertEquals(DeploymentApiContract.MigrationView.class,
                DeploymentWorkflow.class.getMethod(
                        "activate", String.class, DeploymentApiContract.ActivateMigrationRequest.class)
                        .getReturnType());
        assertEquals(SetupApiContract.ValidationResponse.class,
                DeploymentWorkflow.class.getMethod(
                        "validate", DeploymentApiContract.MetadataMigrationValidationRequest.class)
                        .getReturnType());
        assertEquals(PreparedMigrationExport.class,
                DeploymentWorkflow.class.getMethod(
                        "prepareExport", String.class, DeploymentApiContract.MigrationExportRequest.class)
                        .getReturnType());
    }

    @Test
    void deploymentViewExplainsMigrationAvailabilityWithoutConnectionDetails() throws Exception {
        DeploymentApiContract.DeploymentView view = new DeploymentApiContract.DeploymentView(
                Instant.parse("2026-08-09T00:00:00Z"),
                new ManagementDatabaseSummary(MetadataDatabaseKind.H2, true, ConfigSource.UI_MANAGED, false),
                new TelemetryStoreSummary(TelemetryStoreKind.GREPTIME, true, ConfigSource.UI_MANAGED, false),
                ApplyMode.MANAGED_WRITE, MaintenanceMode.ACTIVE, DeploymentTopology.SINGLE_NODE,
                MigrationCapability.permitted(MaintenanceAdmission.USE_CURRENT));

        assertTrue(view.migration().allowed());
        assertNull(view.migration().blockedBy());
        assertEquals(MaintenanceAdmission.USE_CURRENT, view.migration().maintenanceAdmission());
        assertNull(view.migration().activeOperationId());
        String json = objectMapper.writeValueAsString(view);
        assertTrue(json.contains("\"maintenanceAdmission\":\"use_current\""));
        assertTrue(json.contains("\"activeOperationId\":null"));
        assertFalse(json.contains("jdbc:"));
        assertFalse(json.contains("password"));
        assertFalse(json.contains("table"));
        assertThrows(IllegalArgumentException.class,
                () -> new MigrationCapability(false, null, MaintenanceAdmission.UNAVAILABLE, null));
        assertThrows(IllegalArgumentException.class,
                () -> new MigrationCapability(true, SetupErrorCode.MIGRATION_MULTI_NODE_UNSUPPORTED,
                        MaintenanceAdmission.USE_CURRENT, null));
        assertDeploymentRejected(MetadataDatabaseKind.MYSQL, DeploymentTopology.SINGLE_NODE,
                MigrationCapability.permitted(MaintenanceAdmission.USE_CURRENT));
        assertDeploymentRejected(MetadataDatabaseKind.H2, DeploymentTopology.MULTI_NODE,
                MigrationCapability.blocked(SetupErrorCode.MIGRATION_TOPOLOGY_UNAVAILABLE,
                        MaintenanceAdmission.NOT_APPLICABLE));
        assertDeploymentRejected(MetadataDatabaseKind.H2, DeploymentTopology.UNKNOWN,
                MigrationCapability.blocked(SetupErrorCode.MIGRATION_MULTI_NODE_UNSUPPORTED,
                        MaintenanceAdmission.NOT_APPLICABLE));
        assertThrows(IllegalArgumentException.class,
                () -> MigrationCapability.blocked(SetupErrorCode.CONFIG_READ_ONLY,
                        MaintenanceAdmission.UNAVAILABLE));
        assertDeploymentRejected(MetadataDatabaseKind.H2, MaintenanceMode.INACTIVE,
                DeploymentTopology.SINGLE_NODE,
                MigrationCapability.permitted(MaintenanceAdmission.USE_CURRENT));
        assertDoesNotThrow(() -> deployment(MaintenanceMode.INACTIVE,
                MigrationCapability.blocked(SetupErrorCode.MIGRATION_MAINTENANCE_REQUIRED,
                        MaintenanceAdmission.UNAVAILABLE)));
    }

    @Test
    void migrationCapabilityMatchesTheFrozenMaintenanceAdmissionMatrix() {
        assertDoesNotThrow(() -> deployment(MetadataDatabaseKind.MYSQL, MaintenanceMode.ACTIVE,
                DeploymentTopology.SINGLE_NODE, MigrationCapability.blocked(
                        SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED, MaintenanceAdmission.NOT_APPLICABLE)));
        assertDoesNotThrow(() -> deployment(MetadataDatabaseKind.H2, MaintenanceMode.ACTIVE,
                DeploymentTopology.MULTI_NODE, MigrationCapability.blocked(
                        SetupErrorCode.MIGRATION_MULTI_NODE_UNSUPPORTED, MaintenanceAdmission.NOT_APPLICABLE)));
        assertDoesNotThrow(() -> deployment(MetadataDatabaseKind.H2, MaintenanceMode.INACTIVE,
                DeploymentTopology.UNKNOWN, MigrationCapability.blocked(
                        SetupErrorCode.MIGRATION_TOPOLOGY_UNAVAILABLE, MaintenanceAdmission.NOT_APPLICABLE)));
        assertDoesNotThrow(() -> deployment(MaintenanceMode.ACTIVE, MigrationCapability.blocked(
                SetupErrorCode.OPERATION_CONFLICT, MaintenanceAdmission.UNAVAILABLE, "migration-42")));
        assertDoesNotThrow(() -> deployment(MaintenanceMode.INACTIVE, MigrationCapability.blocked(
                SetupErrorCode.MIGRATION_UNAVAILABLE, MaintenanceAdmission.UNAVAILABLE)));
        assertDoesNotThrow(() -> deployment(MaintenanceMode.ACTIVE,
                MigrationCapability.permitted(MaintenanceAdmission.USE_CURRENT)));
        assertDoesNotThrow(() -> deployment(MaintenanceMode.INACTIVE,
                MigrationCapability.permitted(MaintenanceAdmission.AUTO_ENTER)));
        assertDoesNotThrow(() -> deployment(MaintenanceMode.INACTIVE, MigrationCapability.blocked(
                SetupErrorCode.MIGRATION_MAINTENANCE_REQUIRED, MaintenanceAdmission.UNAVAILABLE)));

        assertThrows(IllegalArgumentException.class, () -> deployment(MaintenanceMode.ACTIVE,
                MigrationCapability.permitted(MaintenanceAdmission.AUTO_ENTER)));
        assertThrows(IllegalArgumentException.class, () -> deployment(MaintenanceMode.ACTIVE,
                MigrationCapability.blocked(SetupErrorCode.MIGRATION_SOURCE_UNSUPPORTED,
                        MaintenanceAdmission.NOT_APPLICABLE)));
        assertThrows(IllegalArgumentException.class, () -> MigrationCapability.blocked(
                SetupErrorCode.OPERATION_CONFLICT, MaintenanceAdmission.UNAVAILABLE, null));
        assertThrows(IllegalArgumentException.class, () -> MigrationCapability.blocked(
                SetupErrorCode.MIGRATION_UNAVAILABLE, MaintenanceAdmission.UNAVAILABLE, "migration-42"));
        assertThrows(IllegalArgumentException.class, () -> MigrationCapability.blocked(
                SetupErrorCode.OPERATION_CONFLICT, MaintenanceAdmission.UNAVAILABLE, "../migration"));
        assertThrows(IllegalArgumentException.class, () -> MigrationCapability.blocked(
                SetupErrorCode.OPERATION_CONFLICT, MaintenanceAdmission.UNAVAILABLE, ".."));
    }

    @Test
    void migrationSourceIsFixedToH2AndTargetKindMustMatch() {
        MetadataDatabaseConfiguration mysql = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.MYSQL, "jdbc:mysql://db/hertzbeat", "user", "secret");
        assertEquals(mysql, new DeploymentApiContract.MetadataMigrationRequest(
                "migration-1", MigrationTarget.MYSQL, mysql, ApplyMode.MANAGED_WRITE).targetDatabase());
        MetadataDatabaseConfiguration postgres = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db/hertzbeat", "user", "secret");
        assertThrows(IllegalArgumentException.class, () -> new DeploymentApiContract.MetadataMigrationRequest(
                "migration-1", MigrationTarget.MYSQL, postgres, ApplyMode.MANAGED_WRITE));
        MetadataDatabaseConfiguration h2 = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.H2, "jdbc:h2:file:./data/hertzbeat", "sa", "secret");
        assertThrows(IllegalArgumentException.class, () -> new DeploymentApiContract.MetadataMigrationRequest(
                "migration-1", MigrationTarget.POSTGRESQL, h2, ApplyMode.EXTERNAL_APPLY));

        assertThrows(IllegalArgumentException.class, () -> new DeploymentApiContract.MetadataMigrationRequest(
                null, MigrationTarget.MYSQL, mysql, ApplyMode.MANAGED_WRITE));
        assertThrows(IllegalArgumentException.class, () -> new DeploymentApiContract.MetadataMigrationRequest(
                ".hidden", MigrationTarget.MYSQL, mysql, ApplyMode.MANAGED_WRITE));
        assertThrows(IllegalArgumentException.class, () -> new DeploymentApiContract.MetadataMigrationRequest(
                "a".repeat(129), MigrationTarget.MYSQL, mysql, ApplyMode.MANAGED_WRITE));
    }

    @Test
    void migrationRequestDoesNotSerializeOrRenderTargetPassword() throws Exception {
        String secret = "migration-contract-secret";
        MetadataDatabaseConfiguration mysql = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.MYSQL, "jdbc:mysql://db/hertzbeat", "user", secret);
        DeploymentApiContract.MetadataMigrationRequest request = new DeploymentApiContract.MetadataMigrationRequest(
                "migration-1", MigrationTarget.MYSQL, mysql, ApplyMode.MANAGED_WRITE);
        assertFalse(objectMapper.writeValueAsString(request).contains(secret));
        assertFalse(request.toString().contains(secret));
        DeploymentApiContract.MigrationExportRequest export = new DeploymentApiContract.MigrationExportRequest(
                SetupApiContract.ExportFormat.ENV, MigrationOperationState.AWAITING_EXTERNAL_APPLY, mysql);
        assertFalse(objectMapper.writeValueAsString(export).contains(secret));
        assertFalse(export.toString().contains(secret));
        assertThrows(IllegalArgumentException.class,
                () -> new SetupApiContract.ExportResponse("unsafe\".env", "text/plain"));
        assertThrows(IllegalArgumentException.class,
                () -> new SetupApiContract.ExportResponse("safe.env", "text/plain\r\nprivate-header"));
    }

    @Test
    void migrationViewMakesPollingAndActivationTransitionsExplicit() {
        DeploymentApiContract.MigrationView ready = migrationView(
                MigrationOperationState.READY_TO_ACTIVATE, MigrationStage.READY_TO_ACTIVATE, 100,
                VerificationState.SUCCEEDED, null, 0, true, false, false, null);
        assertTrue(ready.activationAvailable());
        DeploymentApiContract.MigrationView external = migrationView(
                MigrationOperationState.AWAITING_EXTERNAL_APPLY, MigrationStage.AWAITING_EXTERNAL_APPLY, 100,
                VerificationState.SUCCEEDED, null, 0, false, false, true, null);
        assertFalse(external.activationAvailable());
        assertTrue(external.externalApplyRequired());
        assertThrows(IllegalArgumentException.class, () -> migrationView(
                MigrationOperationState.READY_TO_ACTIVATE, MigrationStage.READY_TO_ACTIVATE, 50,
                VerificationState.PENDING, null, 0, true, false, false, null));
        assertThrows(IllegalArgumentException.class, () -> migrationView(
                MigrationOperationState.READY_TO_ACTIVATE, MigrationStage.COPYING, 100,
                VerificationState.SUCCEEDED, null, 0, true, false, false, null));
        assertThrows(IllegalArgumentException.class, () -> migrationView(
                MigrationOperationState.SUCCEEDED, MigrationStage.COMPLETED, 100,
                VerificationState.SUCCEEDED, Instant.parse("2026-08-08T23:59:59Z"), 0,
                false, false, false, null));
        assertThrows(IllegalArgumentException.class, () -> migrationView(
                MigrationOperationState.SUCCEEDED, MigrationStage.COMPLETED, 100,
                VerificationState.SUCCEEDED, Instant.parse("2026-08-09T00:02:00Z"), 500,
                false, false, false, null));
        assertThrows(IllegalArgumentException.class, () -> migrationView(
                MigrationOperationState.RUNNING, MigrationStage.COPYING, 45,
                VerificationState.PENDING, null, 500, false, false, false,
                SetupErrorCode.MIGRATION_COPY_FAILED));
        assertThrows(IllegalArgumentException.class, () -> migrationView(
                MigrationOperationState.FAILED, MigrationStage.FAILED, 45,
                VerificationState.FAILED, null, 0, false, false, false,
                SetupErrorCode.MIGRATION_COPY_FAILED));
        assertEquals(SetupErrorCode.MIGRATION_COPY_FAILED, migrationView(
                MigrationOperationState.FAILED, MigrationStage.FAILED, 45,
                VerificationState.PENDING, Instant.parse("2026-08-09T00:02:00Z"), 0,
                false, false, false, SetupErrorCode.MIGRATION_COPY_FAILED).errorCode());
        assertEquals(VerificationState.FAILED, failedView(
                SetupErrorCode.MIGRATION_VERIFICATION_FAILED, VerificationState.FAILED, 100).verificationState());
        assertEquals(VerificationState.SUCCEEDED, failedView(
                SetupErrorCode.MIGRATION_ACTIVATION_FAILED, VerificationState.SUCCEEDED, 100).verificationState());
        assertEquals(VerificationState.SUCCEEDED, failedView(
                SetupErrorCode.RESTART_FAILED, VerificationState.SUCCEEDED, 100).verificationState());
        assertThrows(IllegalArgumentException.class, () -> failedView(
                SetupErrorCode.MIGRATION_COPY_FAILED, VerificationState.FAILED, 45));
        assertThrows(IllegalArgumentException.class, () -> failedView(
                SetupErrorCode.MIGRATION_VERIFICATION_FAILED, VerificationState.SUCCEEDED, 100));
        assertThrows(IllegalArgumentException.class, () -> failedView(
                SetupErrorCode.MIGRATION_COPY_FAILED, VerificationState.PENDING, 100));
        assertThrows(IllegalArgumentException.class, () -> failedView(
                SetupErrorCode.MIGRATION_VERIFICATION_FAILED, VerificationState.FAILED, 99));
        assertEquals(VerificationState.PENDING, rolledBackView(
                SetupErrorCode.MIGRATION_COPY_FAILED, VerificationState.PENDING, 99).verificationState());
        assertEquals(VerificationState.SUCCEEDED, rolledBackView(
                SetupErrorCode.RESTART_FAILED, VerificationState.SUCCEEDED, 100).verificationState());
        assertThrows(IllegalArgumentException.class, () -> rolledBackView(
                SetupErrorCode.MIGRATION_COPY_FAILED, VerificationState.FAILED, 45));
        assertThrows(IllegalArgumentException.class, () -> rolledBackView(
                SetupErrorCode.MIGRATION_ACTIVATION_FAILED, VerificationState.SUCCEEDED, 99));
        assertThrows(IllegalArgumentException.class, () -> migrationViewWithIdentity(" ", MigrationTarget.MYSQL));
        assertThrows(IllegalArgumentException.class,
                () -> migrationViewWithIdentity("migration/../secret", MigrationTarget.MYSQL));
        assertThrows(IllegalArgumentException.class, () -> migrationViewWithIdentity("migration-1", null));
    }

    private DeploymentApiContract.MigrationView migrationView(
            MigrationOperationState state, MigrationStage stage, int progress,
            VerificationState verification, Instant completedAt, long nextPollAfterMillis,
            boolean activationAvailable,
            boolean restartRequired, boolean externalApplyRequired, SetupErrorCode errorCode) {
        return new DeploymentApiContract.MigrationView("migration-1", state, MetadataDatabaseKind.H2,
                MigrationTarget.MYSQL, stage, progress, Instant.parse("2026-08-09T00:00:00Z"),
                Instant.parse("2026-08-09T00:00:01Z"), completedAt, verification, errorCode, nextPollAfterMillis,
                activationAvailable, restartRequired, externalApplyRequired);
    }

    private DeploymentApiContract.MigrationView failedView(
            SetupErrorCode errorCode, VerificationState verification, int progress) {
        return migrationView(MigrationOperationState.FAILED, MigrationStage.FAILED, progress, verification,
                Instant.parse("2026-08-09T00:02:00Z"), 0, false, false, false, errorCode);
    }

    private DeploymentApiContract.MigrationView rolledBackView(
            SetupErrorCode errorCode, VerificationState verification, int progress) {
        return migrationView(MigrationOperationState.ROLLED_BACK, MigrationStage.ROLLED_BACK, progress, verification,
                Instant.parse("2026-08-09T00:02:00Z"), 0, false, false, false, errorCode);
    }

    private DeploymentApiContract.MigrationView migrationViewWithIdentity(
            String operationId, MigrationTarget target) {
        return new DeploymentApiContract.MigrationView(operationId, MigrationOperationState.READY_TO_ACTIVATE,
                MetadataDatabaseKind.H2, target, MigrationStage.READY_TO_ACTIVATE, 100,
                Instant.parse("2026-08-09T00:00:00Z"), Instant.parse("2026-08-09T00:00:01Z"), null,
                VerificationState.SUCCEEDED, null, 0, true, false, false);
    }

    private void assertDeploymentRejected(
            MetadataDatabaseKind kind, DeploymentTopology topology, MigrationCapability capability) {
        assertDeploymentRejected(kind, MaintenanceMode.INACTIVE, topology, capability);
    }

    private void assertDeploymentRejected(
            MetadataDatabaseKind kind, MaintenanceMode maintenance,
            DeploymentTopology topology, MigrationCapability capability) {
        assertThrows(IllegalArgumentException.class, () -> new DeploymentApiContract.DeploymentView(
                Instant.parse("2026-08-09T00:00:00Z"),
                new ManagementDatabaseSummary(kind, true, ConfigSource.UI_MANAGED, false),
                new TelemetryStoreSummary(TelemetryStoreKind.GREPTIME, true, ConfigSource.UI_MANAGED, false),
                ApplyMode.EXTERNAL_APPLY, maintenance, topology, capability));
    }

    private DeploymentApiContract.DeploymentView deployment(
            MaintenanceMode maintenance, MigrationCapability capability) {
        return deployment(MetadataDatabaseKind.H2, maintenance, DeploymentTopology.SINGLE_NODE, capability);
    }

    private DeploymentApiContract.DeploymentView deployment(
            MetadataDatabaseKind kind, MaintenanceMode maintenance,
            DeploymentTopology topology, MigrationCapability capability) {
        return new DeploymentApiContract.DeploymentView(Instant.parse("2026-08-09T00:00:00Z"),
                new ManagementDatabaseSummary(kind, true, ConfigSource.UI_MANAGED, false),
                new TelemetryStoreSummary(TelemetryStoreKind.GREPTIME, true, ConfigSource.UI_MANAGED, false),
                ApplyMode.MANAGED_WRITE, maintenance, topology, capability);
    }

    private void assertComponents(Class<? extends Record> type, String... names) {
        assertEquals(List.of(names), Arrays.stream(type.getRecordComponents()).map(RecordComponent::getName).toList());
    }

    private void assertWireValues(Enum<?>[] values, String... expected) throws Exception {
        assertEquals(List.of(expected), Arrays.stream(values).map(this::wireValue).toList());
    }

    private String wireValue(Enum<?> value) {
        try {
            return objectMapper.writeValueAsString(value).replace("\"", "");
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
