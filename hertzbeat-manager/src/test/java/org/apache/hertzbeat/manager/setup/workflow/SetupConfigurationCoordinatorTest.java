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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Clock;
import java.util.Arrays;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OperationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigDeploymentDetector;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationBundle;
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
        ManagedConfigCapability capability = new ManagedConfigCapability(
                ApplyMode.EXTERNAL_APPLY, false, DeploymentConstraint.READ_ONLY);

        for (Transport transport : Transport.values()) {
            ManagedConfigurationTransaction transaction = mock(ManagedConfigurationTransaction.class);
            SetupOperationRegistry operations = new SetupOperationRegistry(Clock.systemUTC());
            SetupConfigurationCoordinator coordinator = new SetupConfigurationCoordinator(transaction, operations);

            var first = configure(transport, coordinator, SetupPhase.CONFIGURATION_REQUIRED,
                    ApplyMode.EXTERNAL_APPLY, capability);
            var replacement = configure(transport, coordinator, SetupPhase.EXTERNAL_APPLY_REQUIRED,
                    ApplyMode.EXTERNAL_APPLY, capability);

            assertNotEquals(first.operationId(), replacement.operationId(), transport.name());
            assertEquals(SetupOperationState.AWAITING_EXTERNAL_APPLY, replacement.state(), transport.name());
            assertEquals(SetupPhase.EXTERNAL_APPLY_REQUIRED, replacement.phase(), transport.name());
            assertTrue(replacement.exportAvailable(), transport.name());
            assertEquals(SetupOperationState.AWAITING_EXTERNAL_APPLY,
                    operations.get(first.operationId()).state(), transport.name());
            verifyNoInteractions(transaction);
        }
    }

    @Test
    void bothTransportsRejectPhaseAndApplyModeMismatchBeforeOperationOrTransaction() {
        for (Transport transport : Transport.values()) {
            assertRejectedBeforeOperation(transport, SetupPhase.ADMINISTRATOR_REQUIRED,
                    ApplyMode.MANAGED_WRITE, managedCapability());
            assertRejectedBeforeOperation(transport, SetupPhase.CONFIGURATION_REQUIRED,
                    ApplyMode.MANAGED_WRITE, externalCapability());
        }
    }

    @Test
    void bothTransportsPublishManagedAppliedAsAwaitingRestart() throws IOException {
        for (Transport transport : Transport.values()) {
            ManagedConfigurationTransaction transaction = mock(ManagedConfigurationTransaction.class);
            when(transaction.apply(any())).thenReturn(ManagedConfigurationTransaction.Outcome.APPLIED);
            SetupConfigurationCoordinator coordinator = new SetupConfigurationCoordinator(
                    transaction, new SetupOperationRegistry(Clock.systemUTC()));

            var response = configure(transport, coordinator, SetupPhase.CONFIGURATION_REQUIRED,
                    ApplyMode.MANAGED_WRITE, managedCapability());

            assertEquals(SetupOperationState.AWAITING_RESTART, response.state(), transport.name());
            assertEquals(SetupPhase.APPLICATION_STARTING, response.phase(), transport.name());
            assertFalse(response.exportAvailable(), transport.name());
            verify(transaction).apply(any());
        }
    }

    @Test
    void bothTransportsMapTransactionOutcomesToStableOperationFailures() throws IOException {
        for (Transport transport : Transport.values()) {
            assertTransactionFailure(transport, ManagedConfigurationTransaction.Outcome.ROLLED_BACK,
                    SetupOperationState.ROLLED_BACK, SetupPhase.CONFIGURATION_REQUIRED,
                    SetupErrorCode.CONFIG_WRITE_FAILED);
            assertTransactionFailure(transport, ManagedConfigurationTransaction.Outcome.RECOVERY_REQUIRED,
                    SetupOperationState.FAILED, SetupPhase.RECOVERY_REQUIRED,
                    SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
    }

    @Test
    void bothTransportsMapIoFailureToStableFailedOperation() throws IOException {
        for (Transport transport : Transport.values()) {
            ManagedConfigurationTransaction transaction = mock(ManagedConfigurationTransaction.class);
            doThrow(new IOException("controlled failure")).when(transaction).apply(any());
            SetupOperationRegistry operations = spy(new SetupOperationRegistry(Clock.systemUTC()));
            SetupConfigurationCoordinator coordinator = new SetupConfigurationCoordinator(transaction, operations);

            SetupApiException failure = assertThrows(SetupApiException.class,
                    () -> configure(transport, coordinator, SetupPhase.CONFIGURATION_REQUIRED,
                            ApplyMode.MANAGED_WRITE, managedCapability()));

            assertEquals(SetupErrorCode.CONFIG_WRITE_FAILED, failure.errorCode(), transport.name());
            assertFinishedOperation(operations, SetupOperationState.FAILED,
                    SetupPhase.CONFIGURATION_REQUIRED, SetupErrorCode.CONFIG_WRITE_FAILED);
        }
    }

    @Test
    void headlessConfigureClosesItsCopiedBundleWithoutClosingCallerSecret() throws IOException {
        ManagedConfigurationTransaction transaction = mock(ManagedConfigurationTransaction.class);
        AtomicReference<ManagedConfigurationBundle> applied = new AtomicReference<>();
        when(transaction.apply(any())).thenAnswer(invocation -> {
            applied.set(invocation.getArgument(0));
            return ManagedConfigurationTransaction.Outcome.APPLIED;
        });
        SetupConfigurationCoordinator coordinator = new SetupConfigurationCoordinator(
                transaction, new SetupOperationRegistry(Clock.systemUTC()));
        try (SecretValue callerPassword = SecretValue.of("metadata-password")) {
            var request = headlessRequest(SetupPhase.CONFIGURATION_REQUIRED, ApplyMode.MANAGED_WRITE,
                    callerPassword);

            coordinator.configure(request, managedCapability());

            assertArrayEquals(new char["metadata-password".length()],
                    applied.get().secrets().metadataDatabasePassword().copy());
            char[] retained = callerPassword.copy();
            try {
                assertArrayEquals("metadata-password".toCharArray(), retained);
            } finally {
                Arrays.fill(retained, '\0');
            }
        }
    }

    private static void assertRejectedBeforeOperation(
            Transport transport, SetupPhase phase, ApplyMode applyMode, ManagedConfigCapability capability) {
        ManagedConfigurationTransaction transaction = mock(ManagedConfigurationTransaction.class);
        SetupOperationRegistry operations = spy(new SetupOperationRegistry(Clock.systemUTC()));
        SetupConfigurationCoordinator coordinator = new SetupConfigurationCoordinator(transaction, operations);

        assertThrows(SetupWorkflowConflict.class,
                () -> configure(transport, coordinator, phase, applyMode, capability), transport.name());

        verify(operations, never()).begin(any());
        verify(operations, never()).replaceExternalApply(any());
        verifyNoInteractions(transaction);
    }

    private static void assertTransactionFailure(
            Transport transport, ManagedConfigurationTransaction.Outcome outcome,
            SetupOperationState operationState, SetupPhase phase, SetupErrorCode errorCode) throws IOException {
        ManagedConfigurationTransaction transaction = mock(ManagedConfigurationTransaction.class);
        when(transaction.apply(any())).thenReturn(outcome);
        SetupOperationRegistry operations = spy(new SetupOperationRegistry(Clock.systemUTC()));
        SetupConfigurationCoordinator coordinator = new SetupConfigurationCoordinator(transaction, operations);

        SetupApiException failure = assertThrows(SetupApiException.class,
                () -> configure(transport, coordinator, SetupPhase.CONFIGURATION_REQUIRED,
                        ApplyMode.MANAGED_WRITE, managedCapability()));

        assertEquals(errorCode, failure.errorCode(), transport.name());
        assertFinishedOperation(operations, operationState, phase, errorCode);
    }

    private static void assertFinishedOperation(
            SetupOperationRegistry operations, SetupOperationState state,
            SetupPhase phase, SetupErrorCode errorCode) {
        var operation = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(operations).finish(operation.capture(), eq(state), eq(phase), eq(errorCode), eq(false));
        OperationResponse recorded = operations.get(operation.getValue());
        assertEquals(state, recorded.state());
        assertEquals(phase, recorded.phase());
        assertEquals(errorCode, recorded.errorCode());
    }

    private static org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationResponse configure(
            Transport transport, SetupConfigurationCoordinator coordinator, SetupPhase phase,
            ApplyMode applyMode, ManagedConfigCapability capability) {
        if (transport == Transport.BROWSER) {
            return coordinator.configure(request(phase, applyMode), capability);
        }
        try (SecretValue password = SecretValue.of("metadata-password")) {
            return coordinator.configure(headlessRequest(phase, applyMode, password), capability);
        }
    }

    private static HeadlessSetupWorkflow.RequiredConfiguration headlessRequest(
            SetupPhase phase, ApplyMode applyMode, SecretValue password) {
        return new HeadlessSetupWorkflow.RequiredConfiguration(phase, applyMode,
                new HeadlessSetupWorkflow.Metadata(MetadataDatabaseKind.H2,
                        "jdbc:h2:./data/setup", "sa", password),
                new HeadlessSetupWorkflow.Telemetry("localhost:4001", "http://localhost:4000",
                        "public", Optional.empty(), Optional.empty()));
    }

    private static ManagedConfigCapability managedCapability() {
        return new ManagedConfigCapability(ApplyMode.MANAGED_WRITE, true, DeploymentConstraint.NONE);
    }

    private static ManagedConfigCapability externalCapability() {
        return new ManagedConfigCapability(
                ApplyMode.EXTERNAL_APPLY, false, DeploymentConstraint.READ_ONLY);
    }

    private enum Transport {
        BROWSER,
        HEADLESS
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
