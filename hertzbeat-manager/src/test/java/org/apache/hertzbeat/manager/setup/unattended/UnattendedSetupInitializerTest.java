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

package org.apache.hertzbeat.manager.setup.unattended;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Instant;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ManagementDatabaseSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionalConfigurationSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupAccess;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.StatusResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreSummary;
import org.apache.hertzbeat.manager.setup.workflow.HeadlessSetupWorkflow;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransitionScheduler;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;

class UnattendedSetupInitializerTest {
    @TempDir
    private Path temporaryDirectory;

    @Test
    void completedRestartIsIdempotentAndPerformsNoWrites() {
        HeadlessSetupWorkflow workflow = mock(HeadlessSetupWorkflow.class);
        when(workflow.status()).thenReturn(status(SetupPhase.COMPLETE));
        SetupRuntimeTransitionScheduler transitions = mock(SetupRuntimeTransitionScheduler.class);
        MockEnvironment environment = new MockEnvironment().withProperty(
                UnattendedSetupInitializer.ENABLED_PROPERTY, "true");

        new UnattendedSetupInitializer(workflow, environment, new SetupPasswordFileLoader(), transitions)
                .initialize();

        verify(workflow, never()).configure(any());
        verify(workflow, never()).createAdministrator(any(), any());
        verify(workflow, never()).complete(any());
        verifyNoInteractions(transitions);
    }

    @Test
    void disabledInitializationDoesNotEvenReadSetupStatus() {
        HeadlessSetupWorkflow workflow = mock(HeadlessSetupWorkflow.class);
        SetupRuntimeTransitionScheduler transitions = mock(SetupRuntimeTransitionScheduler.class);
        new UnattendedSetupInitializer(workflow, new MockEnvironment(),
                new SetupPasswordFileLoader(), transitions).initialize();
        verify(workflow, never()).status();
        verifyNoInteractions(transitions);
    }

    @Test
    void administratorPhaseConsumesPasswordFileAndCompletesSetup() throws Exception {
        Path passwordFile = temporaryDirectory.resolve("administrator-password");
        Files.writeString(passwordFile, "owner-secret\n");
        Files.setPosixFilePermissions(passwordFile, PosixFilePermissions.fromString("rw-------"));
        HeadlessSetupWorkflow workflow = mock(HeadlessSetupWorkflow.class);
        SetupRuntimeTransitionScheduler transitions = mock(SetupRuntimeTransitionScheduler.class);
        when(workflow.status()).thenReturn(status(SetupPhase.ADMINISTRATOR_REQUIRED));
        MockEnvironment environment = new MockEnvironment()
                .withProperty(UnattendedSetupInitializer.ENABLED_PROPERTY, "true")
                .withProperty("hertzbeat.setup.unattended.acknowledged-warnings", "h2_non_production")
                .withProperty("hertzbeat.setup.administrator.username", "operator")
                .withProperty("hertzbeat.setup.administrator.password-file", passwordFile.toString());

        new UnattendedSetupInitializer(workflow, environment, new SetupPasswordFileLoader(), transitions)
                .initialize();

        verify(workflow).createAdministrator(eq("operator"), any());
        verify(workflow).complete(java.util.List.of(SetupWarningCode.H2_NON_PRODUCTION));
        verify(transitions).installationCompleted();
    }

    @Test
    void explicitlyConfirmsTheSameH2AndPlainHttpWarningsAsBrowserSetup() {
        HeadlessSetupWorkflow workflow = mock(HeadlessSetupWorkflow.class);
        SetupRuntimeTransitionScheduler transitions = mock(SetupRuntimeTransitionScheduler.class);
        when(workflow.status()).thenReturn(status(SetupPhase.OPTIONAL_CONFIGURATION));
        MockEnvironment environment = new MockEnvironment()
                .withProperty(UnattendedSetupInitializer.ENABLED_PROPERTY, "true")
                .withProperty("hertzbeat.setup.unattended.acknowledged-warnings",
                        "h2_non_production, public_address_plaintext");

        new UnattendedSetupInitializer(workflow, environment, new SetupPasswordFileLoader(), transitions)
                .initialize();

        verify(workflow).complete(java.util.List.of(
                SetupWarningCode.H2_NON_PRODUCTION, SetupWarningCode.PUBLIC_ADDRESS_PLAINTEXT));
        verify(transitions).installationCompleted();
    }

    @Test
    void managedConfigurationSchedulesRestartOnlyAfterApplicationStartingResponse() throws Exception {
        HeadlessSetupWorkflow workflow = mock(HeadlessSetupWorkflow.class);
        SetupRuntimeTransitionScheduler transitions = mock(SetupRuntimeTransitionScheduler.class);
        when(workflow.status()).thenReturn(status(SetupPhase.CONFIGURATION_REQUIRED));
        when(workflow.configure(any())).thenReturn(new ConfigurationResponse(
                "operation", SetupOperationState.AWAITING_RESTART,
                SetupPhase.APPLICATION_STARTING, 1_000, false));
        MockEnvironment environment = configurationEnvironment("managed-metadata-password");

        new UnattendedSetupInitializer(workflow, environment, new SetupPasswordFileLoader(), transitions)
                .initialize();

        verify(workflow).configure(any());
        verify(transitions).configurationApplied();
        verify(transitions, never()).installationCompleted();
    }

    @Test
    void externalApplyConfigurationDoesNotScheduleRuntimeTransition() throws Exception {
        HeadlessSetupWorkflow workflow = mock(HeadlessSetupWorkflow.class);
        SetupRuntimeTransitionScheduler transitions = mock(SetupRuntimeTransitionScheduler.class);
        when(workflow.status()).thenReturn(
                status(SetupPhase.CONFIGURATION_REQUIRED, ApplyMode.EXTERNAL_APPLY));
        when(workflow.configure(any())).thenReturn(new ConfigurationResponse(
                "operation", SetupOperationState.AWAITING_EXTERNAL_APPLY,
                SetupPhase.EXTERNAL_APPLY_REQUIRED, 1_000, true));

        new UnattendedSetupInitializer(workflow,
                configurationEnvironment("external-metadata-password"),
                new SetupPasswordFileLoader(), transitions).initialize();

        verify(workflow).configure(any());
        verifyNoInteractions(transitions);
    }

    private MockEnvironment configurationEnvironment(String fileName) throws Exception {
        Path passwordFile = temporaryDirectory.resolve(fileName);
        Files.writeString(passwordFile, "metadata-secret\n");
        Files.setPosixFilePermissions(passwordFile, PosixFilePermissions.fromString("rw-------"));
        return new MockEnvironment()
                .withProperty(UnattendedSetupInitializer.ENABLED_PROPERTY, "true")
                .withProperty("hertzbeat.setup.metadata.kind", "h2")
                .withProperty("hertzbeat.setup.metadata.jdbc-url", "jdbc:h2:./data/setup")
                .withProperty("hertzbeat.setup.metadata.username", "sa")
                .withProperty("hertzbeat.setup.metadata.password-file", passwordFile.toString())
                .withProperty("hertzbeat.setup.telemetry.grpc-endpoints", "localhost:4001")
                .withProperty("hertzbeat.setup.telemetry.http-endpoint", "http://localhost:4000")
                .withProperty("hertzbeat.setup.telemetry.database", "public");
    }

    private static StatusResponse status(SetupPhase phase) {
        return status(phase, ApplyMode.MANAGED_WRITE);
    }

    private static StatusResponse status(SetupPhase phase, ApplyMode applyMode) {
        return new StatusResponse(phase, Instant.parse("2026-08-08T00:00:00Z"), SetupAccess.LOCAL,
                applyMode, applyMode == ApplyMode.MANAGED_WRITE, null, null,
                new ManagementDatabaseSummary(MetadataDatabaseKind.H2, true, ConfigSource.UI_MANAGED, false),
                new TelemetryStoreSummary(TelemetryStoreKind.GREPTIME, true, ConfigSource.UI_MANAGED, false),
                phase != SetupPhase.ADMINISTRATOR_REQUIRED,
                new OptionalConfigurationSummary(false, false, false, false, false));
    }
}
