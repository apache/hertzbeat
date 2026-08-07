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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
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
        assertComponents(DeploymentApiContract.DeploymentView.class, "observedAt", "managementDatabase",
                "telemetryStore", "applyMode", "maintenanceMode", "migrationAllowed");
        assertComponents(DeploymentApiContract.MetadataMigrationRequest.class, "target", "targetDatabase", "applyMode");
        assertComponents(DeploymentApiContract.MigrationView.class, "operationId", "state", "source", "target",
                "phase", "createdAt", "startedAt", "completedAt", "tablesTotal", "tablesCopied",
                "verificationState", "errorCode", "activationAvailable", "externalApplyRequired");
        assertComponents(DeploymentApiContract.ActivateMigrationRequest.class, "expectedState");
        assertWireValues(MigrationTarget.values(), "mysql", "postgresql");
        assertWireValues(VerificationState.values(), "pending", "running", "succeeded", "failed");
        assertEquals(DeploymentApiContract.MigrationView.class,
                DeploymentWorkflow.class.getMethod(
                        "activate", String.class, DeploymentApiContract.ActivateMigrationRequest.class)
                        .getReturnType());
    }

    @Test
    void migrationSourceIsFixedToH2AndTargetKindMustMatch() {
        MetadataDatabaseConfiguration mysql = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.MYSQL, "jdbc:mysql://db/hertzbeat", "user", "secret");
        assertEquals(mysql, new DeploymentApiContract.MetadataMigrationRequest(
                MigrationTarget.MYSQL, mysql, ApplyMode.MANAGED_WRITE).targetDatabase());
        MetadataDatabaseConfiguration postgres = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db/hertzbeat", "user", "secret");
        assertThrows(IllegalArgumentException.class, () -> new DeploymentApiContract.MetadataMigrationRequest(
                MigrationTarget.MYSQL, postgres, ApplyMode.MANAGED_WRITE));
        MetadataDatabaseConfiguration h2 = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.H2, "jdbc:h2:file:./data/hertzbeat", "sa", "secret");
        assertThrows(IllegalArgumentException.class, () -> new DeploymentApiContract.MetadataMigrationRequest(
                MigrationTarget.POSTGRESQL, h2, ApplyMode.EXTERNAL_APPLY));
    }

    @Test
    void migrationRequestDoesNotSerializeOrRenderTargetPassword() throws Exception {
        String secret = "migration-contract-secret";
        MetadataDatabaseConfiguration mysql = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.MYSQL, "jdbc:mysql://db/hertzbeat", "user", secret);
        DeploymentApiContract.MetadataMigrationRequest request = new DeploymentApiContract.MetadataMigrationRequest(
                MigrationTarget.MYSQL, mysql, ApplyMode.MANAGED_WRITE);
        assertFalse(objectMapper.writeValueAsString(request).contains(secret));
        assertFalse(request.toString().contains(secret));
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
