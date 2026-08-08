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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.time.Clock;
import java.util.Arrays;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigDeploymentDetector;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.DeploymentConstraint;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SetupConfigurationCoordinatorTest {
    @TempDir
    private Path installationRoot;

    @Test
    void managedWritePublishesOneRecoverablePairAndRecordsRestartOperation() {
        SetupOperationRegistry operations = new SetupOperationRegistry(Clock.systemUTC());
        SetupConfigurationCoordinator coordinator = new SetupConfigurationCoordinator(
                new ManagedConfigurationTransaction(installationRoot), operations);

        var response = coordinator.configure(request(ApplyMode.MANAGED_WRITE),
                new ManagedConfigDeploymentDetector(installationRoot).detect());

        assertEquals(SetupOperationState.AWAITING_RESTART, response.state());
        assertEquals(SetupPhase.APPLICATION_STARTING, response.phase());
        assertFalse(response.exportAvailable());
        assertEquals(response.operationId(), operations.get(response.operationId()).operationId());
        assertEquals(ManagedActiveConfigurationInspector.State.LOADABLE,
                new ManagedActiveConfigurationInspector(installationRoot).inspect().state());
    }

    @Test
    void externalApplyDoesNotWriteAndMakesExportAvailable() {
        SetupOperationRegistry operations = new SetupOperationRegistry(Clock.systemUTC());
        SetupConfigurationCoordinator coordinator = new SetupConfigurationCoordinator(
                new ManagedConfigurationTransaction(installationRoot), operations);
        ManagedConfigCapability capability = new ManagedConfigDeploymentDetector(installationRoot).detect();

        var response = coordinator.configure(request(ApplyMode.EXTERNAL_APPLY),
                new ManagedConfigCapability(ApplyMode.EXTERNAL_APPLY, false,
                        DeploymentConstraint.READ_ONLY));

        assertEquals(SetupOperationState.AWAITING_EXTERNAL_APPLY, response.state());
        assertEquals(SetupPhase.EXTERNAL_APPLY_REQUIRED, response.phase());
        assertTrue(response.exportAvailable());
        assertEquals(ManagedActiveConfigurationInspector.State.ABSENT,
                new ManagedActiveConfigurationInspector(installationRoot).inspect().state());
        assertThrows(SetupWorkflowConflict.class,
                () -> coordinator.configure(request(ApplyMode.EXTERNAL_APPLY), capability));
    }

    @Test
    void externalApplyReentryReturnsFreshAcknowledgementWithoutPersistingSubmittedSecrets() {
        SetupOperationRegistry operations = new SetupOperationRegistry(Clock.systemUTC());
        SetupConfigurationCoordinator coordinator = new SetupConfigurationCoordinator(
                new ManagedConfigurationTransaction(installationRoot), operations);
        ManagedConfigCapability capability = new ManagedConfigCapability(
                ApplyMode.EXTERNAL_APPLY, false, DeploymentConstraint.READ_ONLY);

        var first = coordinator.configure(request(SetupPhase.CONFIGURATION_REQUIRED, ApplyMode.EXTERNAL_APPLY),
                capability);
        var replacement = coordinator.configure(
                request(SetupPhase.EXTERNAL_APPLY_REQUIRED, ApplyMode.EXTERNAL_APPLY), capability);

        assertNotEquals(first.operationId(), replacement.operationId());
        assertEquals(SetupOperationState.AWAITING_EXTERNAL_APPLY, replacement.state());
        assertEquals(SetupPhase.EXTERNAL_APPLY_REQUIRED, replacement.phase());
        assertTrue(replacement.exportAvailable());
        assertEquals(ManagedActiveConfigurationInspector.State.ABSENT,
                new ManagedActiveConfigurationInspector(installationRoot).inspect().state());
    }

    @Test
    void headlessExternalApplyClosesTheCoordinatorOwnedSecretBundle() {
        SetupConfigurationCoordinator coordinator = new SetupConfigurationCoordinator(
                new ManagedConfigurationTransaction(installationRoot),
                new SetupOperationRegistry(Clock.systemUTC()));
        try (SecretValue callerPassword = SecretValue.of("metadata-password")) {
            var request = new HeadlessSetupWorkflow.RequiredConfiguration(SetupPhase.CONFIGURATION_REQUIRED,
                    ApplyMode.EXTERNAL_APPLY,
                    new HeadlessSetupWorkflow.Metadata(MetadataDatabaseKind.H2,
                            "jdbc:h2:./data/setup", "sa", callerPassword),
                    new HeadlessSetupWorkflow.Telemetry("localhost:4001", "http://localhost:4000",
                            "public", Optional.empty(), Optional.empty()));
            var bundle = SetupConfigurationMapper.map(request);

            coordinator.configure(request, bundle,
                    new ManagedConfigCapability(ApplyMode.EXTERNAL_APPLY, false,
                            DeploymentConstraint.READ_ONLY));

            assertArrayEquals(new char["metadata-password".length()],
                    bundle.secrets().metadataDatabasePassword().copy());
            char[] retained = callerPassword.copy();
            try {
                assertArrayEquals("metadata-password".toCharArray(), retained);
            } finally {
                Arrays.fill(retained, '\0');
            }
        }
    }

    private static ConfigurationRequest request(ApplyMode applyMode) {
        return request(SetupPhase.CONFIGURATION_REQUIRED, applyMode);
    }

    private static ConfigurationRequest request(SetupPhase expectedPhase, ApplyMode applyMode) {
        return new ConfigurationRequest(expectedPhase, applyMode,
                new MetadataDatabaseConfiguration(MetadataDatabaseKind.H2,
                        "jdbc:h2:./data/setup", "sa", "metadata-password"),
                new TelemetryStoreConfiguration(TelemetryStoreKind.GREPTIME,
                        "localhost:4001", "http://localhost:4000", "public", null, null));
    }
}
