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

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.AdministratorRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.CompleteRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionsRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionsResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.PublicAccessConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupAccess;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidateRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.apache.hertzbeat.manager.setup.identity.IdentityInitializationService;
import org.apache.hertzbeat.manager.setup.runtime.SetupTransitionIntentStore;
import org.junit.jupiter.api.Test;

class DefaultSetupWorkflowTest {

    @Test
    void optionSummaryUsesMeaningfulEndpointSemantics() {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupRuntimeState state = new SetupRuntimeState(Clock.systemUTC(), capability,
                SetupPhase.OPTIONAL_CONFIGURATION, SetupAccess.LOCAL, true, "operator");
        SetupRequestValidator validator = mock(SetupRequestValidator.class);
        when(validator.validate(any(ValidateRequest.class)))
                .thenReturn(new ValidationResponse(true, Instant.now(), null, List.of()));
        DefaultSetupWorkflow workflow = workflow(state, validator,
                mock(SetupConfigurationCoordinator.class), mock(SetupOperationRegistry.class), capability,
                Optional.of(mock(IdentityInitializationService.class)),
                Optional.of(mock(SetupCompletionCoordinator.class)), mock(SetupOptionsCoordinator.class),
                Clock.systemUTC(), new SetupMutationSerializer());
        OptionsRequest request = new OptionsRequest(
                new PublicAccessConfiguration("https://hertzbeat.example.test",
                        "https://server.example.test:4318", "\u0000"),
                null, null);

        OptionsResponse response = workflow.configureOptions(request);

        assertTrue(response.publicBaseUrlConfigured());
        assertTrue(response.serverOtlpHttpConfigured());
        assertFalse(response.serverOtlpGrpcConfigured());
        assertTrue(state.status().optional().publicBaseUrlConfigured());
        assertTrue(state.status().optional().serverOtlpHttpConfigured());
        assertFalse(state.status().optional().serverOtlpGrpcConfigured());
    }

    @Test
    void wrongPhaseMustBeRejectedBeforeAdministratorOrCompletionWrites() {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupRuntimeState state = new SetupRuntimeState(Clock.systemUTC(), capability,
                SetupPhase.CONFIGURATION_REQUIRED, SetupAccess.LOCAL, false, null);
        IdentityInitializationService identities = mock(IdentityInitializationService.class);
        SetupCompletionCoordinator completion = mock(SetupCompletionCoordinator.class);
        SetupMutationSerializer mutations = new SetupMutationSerializer();
        DefaultSetupWorkflow workflow = workflow(state, mock(SetupRequestValidator.class),
                mock(SetupConfigurationCoordinator.class), mock(SetupOperationRegistry.class), capability,
                Optional.of(identities), Optional.of(completion),
                mock(SetupOptionsCoordinator.class), Clock.systemUTC(), mutations);

        assertThrows(SetupWorkflowConflict.class,
                () -> workflow.createAdministrator(new AdministratorRequest("operator", "secret")));
        assertThrows(SetupWorkflowConflict.class,
                () -> workflow.complete(new CompleteRequest(SetupPhase.OPTIONAL_CONFIGURATION, List.of())));

        verifyNoInteractions(identities, completion);
    }

    @Test
    void completionRequiresEveryPendingWarningAcknowledgement() {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupRuntimeState state = new SetupRuntimeState(Clock.systemUTC(), capability,
                SetupPhase.OPTIONAL_CONFIGURATION, SetupAccess.LOCAL, true, "operator");
        SetupCompletionCoordinator completion = mock(SetupCompletionCoordinator.class);
        SetupMutationSerializer mutations = new SetupMutationSerializer();
        DefaultSetupWorkflow workflow = workflow(state, mock(SetupRequestValidator.class),
                mock(SetupConfigurationCoordinator.class), mock(SetupOperationRegistry.class), capability,
                Optional.of(mock(IdentityInitializationService.class)), Optional.of(completion),
                mock(SetupOptionsCoordinator.class), Clock.systemUTC(), mutations);

        assertThrows(SetupApiException.class,
                () -> workflow.complete(new CompleteRequest(SetupPhase.OPTIONAL_CONFIGURATION, List.of())));
        verifyNoInteractions(completion);

        workflow.complete(new CompleteRequest(SetupPhase.OPTIONAL_CONFIGURATION,
                List.of(SetupWarningCode.H2_NON_PRODUCTION)));
        verify(completion).completeInstallation();
    }

    @Test
    void completionCannotCommitAgainstWarningsThatOptionsPersistenceIsStillPublishing() throws Exception {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupRuntimeState state = new SetupRuntimeState(Clock.systemUTC(), capability,
                SetupPhase.OPTIONAL_CONFIGURATION, SetupAccess.LOCAL, true, "operator");
        SetupRequestValidator validator = mock(SetupRequestValidator.class);
        when(validator.validate(any(ValidateRequest.class)))
                .thenReturn(new ValidationResponse(true, Instant.now(), null, List.of()));
        SetupOptionsCoordinator options = mock(SetupOptionsCoordinator.class);
        CountDownLatch persistenceStarted = new CountDownLatch(1);
        CountDownLatch allowPersistence = new CountDownLatch(1);
        doAnswer(invocation -> {
            persistenceStarted.countDown();
            allowPersistence.await(5, TimeUnit.SECONDS);
            return null;
        }).when(options).persist(any());
        SetupCompletionCoordinator completion = mock(SetupCompletionCoordinator.class);
        SetupMutationSerializer mutations = new SetupMutationSerializer();
        DefaultSetupWorkflow workflow = workflow(state, validator,
                mock(SetupConfigurationCoordinator.class), mock(SetupOperationRegistry.class), capability,
                Optional.of(mock(IdentityInitializationService.class)), Optional.of(completion),
                options, Clock.systemUTC(), mutations);
        HeadlessSetupCoordinator headless = headless(state, validator,
                mock(SetupConfigurationCoordinator.class), capability,
                Optional.of(mock(IdentityInitializationService.class)), Optional.of(completion), mutations);
        OptionsRequest request = new OptionsRequest(
                new PublicAccessConfiguration(null, "http://collector.example.test:4318", null), null, null);

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<OptionsResponse> optionsResult = executor.submit(() -> workflow.configureOptions(request));
            persistenceStarted.await(5, TimeUnit.SECONDS);
            Future<?> completionResult = executor.submit(() -> headless.complete(
                    List.of(SetupWarningCode.H2_NON_PRODUCTION)));

            assertThrows(TimeoutException.class, () -> completionResult.get(200, TimeUnit.MILLISECONDS));
            allowPersistence.countDown();
            optionsResult.get(5, TimeUnit.SECONDS);
            ExecutionException rejected = assertThrows(ExecutionException.class,
                    () -> completionResult.get(5, TimeUnit.SECONDS));
            assertThat(rejected.getCause()).isInstanceOf(SetupApiException.class);
        }
        verifyNoInteractions(completion);
    }

    @Test
    void runningBrowserConfigurationPreventsHeadlessConfigurationFromCrossingThePhaseTransition()
            throws Exception {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupRuntimeState state = new SetupRuntimeState(Clock.systemUTC(), capability,
                SetupPhase.CONFIGURATION_REQUIRED, SetupAccess.LOCAL, false, null);
        SetupRequestValidator validator = mock(SetupRequestValidator.class);
        when(validator.validate(any(ValidateRequest.class)))
                .thenReturn(new ValidationResponse(true, Instant.now(), null, List.of()));
        SetupConfigurationCoordinator configuration = mock(SetupConfigurationCoordinator.class);
        CountDownLatch configurationStarted = new CountDownLatch(1);
        CountDownLatch allowConfiguration = new CountDownLatch(1);
        doAnswer(invocation -> {
            configurationStarted.countDown();
            allowConfiguration.await(5, TimeUnit.SECONDS);
            return new ConfigurationResponse("operation-1", SetupOperationState.AWAITING_RESTART,
                    SetupPhase.APPLICATION_STARTING, 0, false);
        }).when(configuration).configure(any(ConfigurationRequest.class), eq(capability));
        SetupMutationSerializer mutations = new SetupMutationSerializer();
        DefaultSetupWorkflow browser = workflow(state, validator, configuration,
                mock(SetupOperationRegistry.class), capability,
                Optional.of(mock(IdentityInitializationService.class)),
                Optional.of(mock(SetupCompletionCoordinator.class)), mock(SetupOptionsCoordinator.class),
                Clock.systemUTC(), mutations);
        HeadlessSetupCoordinator headless = headless(state, validator, configuration,
                capability, Optional.of(mock(IdentityInitializationService.class)),
                Optional.of(mock(SetupCompletionCoordinator.class)), mutations);
        ConfigurationRequest browserRequest = new ConfigurationRequest(
                SetupPhase.CONFIGURATION_REQUIRED, ApplyMode.MANAGED_WRITE,
                new MetadataDatabaseConfiguration(MetadataDatabaseKind.H2,
                        "jdbc:h2:mem:browser", "sa", "secret"),
                new TelemetryStoreConfiguration(TelemetryStoreKind.GREPTIME,
                        "localhost:4001", "http://localhost:4000", "public", null, null));

        try (SecretValue metadataPassword = SecretValue.of("secret");
             ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<ConfigurationResponse> browserResult = executor.submit(() -> browser.configure(browserRequest));
            configurationStarted.await(5, TimeUnit.SECONDS);
            Future<ConfigurationResponse> headlessResult = executor.submit(() -> headless.configure(
                    new HeadlessSetupWorkflow.RequiredConfiguration(SetupPhase.CONFIGURATION_REQUIRED,
                            ApplyMode.MANAGED_WRITE,
                            new HeadlessSetupWorkflow.Metadata(MetadataDatabaseKind.H2,
                                    "jdbc:h2:mem:headless", "sa", metadataPassword),
                            new HeadlessSetupWorkflow.Telemetry("localhost:4001",
                                    "http://localhost:4000", "public", Optional.empty(), Optional.empty()))));

            assertThrows(TimeoutException.class, () -> headlessResult.get(200, TimeUnit.MILLISECONDS));
            allowConfiguration.countDown();
            browserResult.get(5, TimeUnit.SECONDS);
            ExecutionException rejected = assertThrows(ExecutionException.class,
                    () -> headlessResult.get(5, TimeUnit.SECONDS));
            assertThat(rejected.getCause())
                    .isInstanceOf(SetupWorkflowConflict.class);
        }
        verify(configuration, never()).configure(any(HeadlessSetupWorkflow.RequiredConfiguration.class),
                eq(capability));
    }

    private static DefaultSetupWorkflow workflow(
            SetupRuntimeState state, SetupRequestValidator validator,
            SetupConfigurationCoordinator configuration, SetupOperationRegistry operations,
            ManagedConfigCapability capability, Optional<IdentityInitializationService> identities,
            Optional<SetupCompletionCoordinator> completion, SetupOptionsCoordinator options,
            Clock clock, SetupMutationSerializer mutations) {
        SetupTransitionService transitions = new SetupTransitionService(
                state, validator, configuration, capability, options, identities, completion,
                mock(SetupTransitionIntentStore.class));
        return new DefaultSetupWorkflow(state, validator, operations,
                clock, mutations, transitions);
    }

    private static HeadlessSetupCoordinator headless(
            SetupRuntimeState state, SetupRequestValidator validator,
            SetupConfigurationCoordinator configuration, ManagedConfigCapability capability,
            Optional<IdentityInitializationService> identities,
            Optional<SetupCompletionCoordinator> completion, SetupMutationSerializer mutations) {
        SetupTransitionService transitions = new SetupTransitionService(
                state, validator, configuration, capability,
                mock(SetupOptionsCoordinator.class), identities, completion,
                mock(SetupTransitionIntentStore.class));
        return new HeadlessSetupCoordinator(state, mutations, transitions);
    }
}
