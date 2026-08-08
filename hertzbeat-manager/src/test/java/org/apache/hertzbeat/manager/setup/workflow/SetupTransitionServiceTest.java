/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.AdministratorRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.CompleteRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ManagementDatabaseSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionalConfigurationSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionsRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ServerInstrumentationConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupAccess;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidateRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationSection;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.apache.hertzbeat.manager.setup.identity.IdentityInitializationService;
import org.apache.hertzbeat.manager.setup.identity.BootstrapIdentityConflict;
import org.junit.jupiter.api.Test;

class SetupTransitionServiceTest {
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-08-08T00:00:00Z"), ZoneOffset.UTC);

    @Test
    void browserAndHeadlessConfigurationUseTheSamePhaseValidationAndStateTransition() {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupRuntimeState state = state(capability, SetupPhase.CONFIGURATION_REQUIRED, false, null);
        SetupRequestValidator validator = mock(SetupRequestValidator.class);
        when(validator.validate(any(org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidateRequest.class)))
                .thenReturn(new ValidationResponse(true, CLOCK.instant(), null, List.of()));
        SetupConfigurationCoordinator configuration = mock(SetupConfigurationCoordinator.class);
        when(configuration.configure(any(ConfigurationRequest.class), any()))
                .thenReturn(configurationResponse("browser"));
        when(configuration.configure(any(HeadlessSetupWorkflow.RequiredConfiguration.class), any()))
                .thenReturn(configurationResponse("headless"));
        SetupTransitionService transitions = transitions(state, validator, configuration, capability,
                Optional.empty(), Optional.empty());

        transitions.configure(SetupTransitionService.ConfigurationCommand.browser(browserConfiguration()));
        assertThat(state.phase()).isEqualTo(SetupPhase.APPLICATION_STARTING);

        SetupRuntimeState headlessState = state(capability, SetupPhase.CONFIGURATION_REQUIRED, false, null);
        SetupTransitionService headlessTransitions = transitions(headlessState, validator, configuration, capability,
                Optional.empty(), Optional.empty());
        try (SecretValue metadataPassword = SecretValue.of("secret")) {
            headlessTransitions.configure(SetupTransitionService.ConfigurationCommand.headless(
                    headlessConfiguration(metadataPassword)));
        }
        assertThat(headlessState.phase()).isEqualTo(SetupPhase.APPLICATION_STARTING);
    }

    @Test
    void browserAndHeadlessAdministratorCommandsRejectTheSameWrongPhaseBeforeSideEffects() {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        IdentityInitializationService identities = mock(IdentityInitializationService.class);

        for (boolean browser : List.of(true, false)) {
            SetupRuntimeState state = state(capability, SetupPhase.CONFIGURATION_REQUIRED, false, null);
            SetupTransitionService transitions = transitions(state, mock(SetupRequestValidator.class),
                    mock(SetupConfigurationCoordinator.class), capability, Optional.of(identities), Optional.empty());
            assertThatThrownBy(() -> {
                if (browser) {
                    transitions.createAdministrator(SetupTransitionService.AdministratorCommand.browser(
                            new AdministratorRequest("operator", "secret")));
                } else {
                    try (SecretValue password = SecretValue.of("secret")) {
                        transitions.createAdministrator(
                                SetupTransitionService.AdministratorCommand.headless("operator", password));
                    }
                }
            }).isInstanceOf(SetupWorkflowConflict.class);
        }
        verifyNoInteractions(identities);
    }

    @Test
    void administratorUsesOneCanonicalUsernameForIdentityRuntimeAndResponse() {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        IdentityInitializationService identities = mock(IdentityInitializationService.class);
        SetupRuntimeState state = state(capability, SetupPhase.ADMINISTRATOR_REQUIRED, false, null);
        SetupTransitionService transitions = transitions(state, mock(SetupRequestValidator.class),
                mock(SetupConfigurationCoordinator.class), capability, Optional.of(identities), Optional.empty());

        String responseUsername = transitions.createAdministrator(
                SetupTransitionService.AdministratorCommand.browser(
                        new AdministratorRequest("  operator  ", "secret")));

        assertThat(responseUsername).isEqualTo("operator");
        assertThat(state.administratorUsername()).isEqualTo("operator");
        verify(identities).createFirstAdministrator(any());
    }

    @Test
    void invalidAdministratorUsernameHasStableCodeWhileUniqueConflictKeepsConflictCode() {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        IdentityInitializationService identities = mock(IdentityInitializationService.class);
        SetupRuntimeState state = state(capability, SetupPhase.ADMINISTRATOR_REQUIRED, false, null);
        SetupTransitionService transitions = transitions(state, mock(SetupRequestValidator.class),
                mock(SetupConfigurationCoordinator.class), capability, Optional.of(identities), Optional.empty());

        for (String username : List.of("   ", "x".repeat(65))) {
            SetupTransitionService.AdministratorCommand command =
                    SetupTransitionService.AdministratorCommand.browser(
                            new AdministratorRequest(username, "secret"));
            assertThatThrownBy(() -> transitions.createAdministrator(command))
                    .isInstanceOfSatisfying(SetupApiException.class,
                            failure -> assertThat(failure.errorCode())
                                    .isEqualTo(SetupErrorCode.ADMINISTRATOR_USERNAME_INVALID));
            assertThat(command.password().copy()).containsOnly('\0');
        }
        verifyNoInteractions(identities);

        IdentityInitializationService conflicting = mock(IdentityInitializationService.class);
        doThrow(new BootstrapIdentityConflict()).when(conflicting).createFirstAdministrator(any());
        SetupRuntimeState conflictState = state(capability, SetupPhase.ADMINISTRATOR_REQUIRED, false, null);
        SetupTransitionService conflictTransitions = transitions(
                conflictState, mock(SetupRequestValidator.class), mock(SetupConfigurationCoordinator.class),
                capability, Optional.of(conflicting), Optional.empty());
        assertThatThrownBy(() -> conflictTransitions.createAdministrator(
                SetupTransitionService.AdministratorCommand.browser(
                        new AdministratorRequest("operator", "secret"))))
                .isInstanceOfSatisfying(SetupApiException.class,
                        failure -> assertThat(failure.errorCode())
                                .isEqualTo(SetupErrorCode.ADMINISTRATOR_ALREADY_CONFIGURED));
    }

    @Test
    void externalApplyReentryIsExplicitAndStillRunsValidationForBothTransports() {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupRequestValidator validator = mock(SetupRequestValidator.class);
        when(validator.validate(any(org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidateRequest.class)))
                .thenReturn(new ValidationResponse(true, CLOCK.instant(), null, List.of()));
        SetupConfigurationCoordinator configuration = mock(SetupConfigurationCoordinator.class);
        ConfigurationResponse response = new ConfigurationResponse("replacement",
                SetupOperationState.AWAITING_EXTERNAL_APPLY, SetupPhase.EXTERNAL_APPLY_REQUIRED, 0, true);
        when(configuration.configure(any(ConfigurationRequest.class), any())).thenReturn(response);
        when(configuration.configure(any(HeadlessSetupWorkflow.RequiredConfiguration.class), any()))
                .thenReturn(response);

        SetupRuntimeState browserState = state(capability, SetupPhase.EXTERNAL_APPLY_REQUIRED, false, null);
        SetupTransitionService browser = transitions(browserState, validator, configuration, capability,
                Optional.empty(), Optional.empty());
        browser.configure(SetupTransitionService.ConfigurationCommand.browser(
                browserConfiguration(SetupPhase.EXTERNAL_APPLY_REQUIRED, ApplyMode.EXTERNAL_APPLY)));

        SetupRuntimeState headlessState = state(capability, SetupPhase.EXTERNAL_APPLY_REQUIRED, false, null);
        SetupTransitionService headless = transitions(headlessState, validator, configuration, capability,
                Optional.empty(), Optional.empty());
        try (SecretValue password = SecretValue.of("secret")) {
            headless.configure(SetupTransitionService.ConfigurationCommand.headless(
                    headlessConfiguration(SetupPhase.EXTERNAL_APPLY_REQUIRED, ApplyMode.EXTERNAL_APPLY, password)));
        }

        assertThat(browserState.phase()).isEqualTo(SetupPhase.EXTERNAL_APPLY_REQUIRED);
        assertThat(headlessState.phase()).isEqualTo(SetupPhase.EXTERNAL_APPLY_REQUIRED);
        verify(configuration).configure(any(ConfigurationRequest.class), any());
        verify(configuration).configure(any(HeadlessSetupWorkflow.RequiredConfiguration.class), any());
    }

    @Test
    void configurationReentryNeverExtendsToApplicationStarting() {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupRequestValidator validator = mock(SetupRequestValidator.class);
        SetupConfigurationCoordinator configuration = mock(SetupConfigurationCoordinator.class);
        SetupTransitionService transitions = transitions(
                state(capability, SetupPhase.APPLICATION_STARTING, false, null), validator, configuration,
                capability, Optional.empty(), Optional.empty());

        assertThatThrownBy(() -> transitions.configure(SetupTransitionService.ConfigurationCommand.browser(
                browserConfiguration(SetupPhase.APPLICATION_STARTING, ApplyMode.EXTERNAL_APPLY))))
                .isInstanceOf(SetupWorkflowConflict.class);
        verifyNoInteractions(validator, configuration);
    }

    @Test
    void optionsRejectWrongPhaseBeforeValidationOrPersistence() {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupRequestValidator validator = mock(SetupRequestValidator.class);
        SetupOptionsCoordinator options = mock(SetupOptionsCoordinator.class);
        SetupTransitionService transitions = transitions(
                state(capability, SetupPhase.ADMINISTRATOR_REQUIRED, false, null), validator,
                mock(SetupConfigurationCoordinator.class), capability, options,
                Optional.empty(), Optional.empty());

        assertThatThrownBy(() -> transitions.configureOptions(optionsRequest()))
                .isInstanceOf(SetupWorkflowConflict.class);

        verifyNoInteractions(validator, options);
    }

    @Test
    void serverInstrumentationValidationFailureDoesNotPersistOrPublishState() {
        assertOptionsValidationFailure(new OptionsRequest(
                new ServerInstrumentationConfiguration("not-an-endpoint", null), null, null),
                ValidationSection.SERVER_INSTRUMENTATION, SetupErrorCode.SERVER_INSTRUMENTATION_INVALID);
    }

    @Test
    void mailValidationFailureDoesNotPersistOrPublishState() {
        assertOptionsValidationFailure(new OptionsRequest(null, null,
                new MailConfiguration("mail.example.test", 25, MailSecurity.STARTTLS,
                        null, null, "alerts@example.test")),
                ValidationSection.MAIL, SetupErrorCode.MAIL_CONNECTION_FAILED);
    }

    @Test
    void optionsPersistenceFailureDoesNotPublishSummaryOrWarnings() {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupRuntimeState state = state(capability, SetupPhase.OPTIONAL_CONFIGURATION, true, "operator");
        SetupRequestValidator validator = mock(SetupRequestValidator.class);
        when(validator.validate(any(ValidateRequest.class)))
                .thenReturn(new ValidationResponse(true, CLOCK.instant(), null, List.of()));
        SetupOptionsCoordinator options = mock(SetupOptionsCoordinator.class);
        doThrow(new SetupApiException(SetupErrorCode.CONFIG_WRITE_FAILED,
                org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)).when(options).persist(any());
        SetupTransitionService transitions = transitions(state, validator,
                mock(SetupConfigurationCoordinator.class), capability, options,
                Optional.empty(), Optional.empty());
        var before = state.status();

        assertThatThrownBy(() -> transitions.configureOptions(optionsRequest()))
                .isInstanceOf(SetupApiException.class);

        assertThat(state.status().optional()).isEqualTo(before.optional());
        assertThat(state.pendingWarnings()).isEqualTo(before.pendingWarnings());
    }

    @Test
    void successfulOptionsNormalizeSummaryAndUseCurrentManagementDatabaseWarningPolicy() {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupConfigurationProjection projection = new SetupConfigurationProjection(
                new ManagementDatabaseSummary(MetadataDatabaseKind.POSTGRESQL, true,
                        ConfigSource.UI_MANAGED, false),
                new TelemetryStoreSummary(TelemetryStoreKind.GREPTIME, true,
                        ConfigSource.UI_MANAGED, false),
                new OptionalConfigurationSummary(false, false, false, false), List.of());
        SetupRuntimeState state = new SetupRuntimeState(CLOCK, capability,
                SetupPhase.OPTIONAL_CONFIGURATION, SetupAccess.LOCAL, true, "operator", projection);
        SetupRequestValidator validator = mock(SetupRequestValidator.class);
        when(validator.validate(any(ValidateRequest.class)))
                .thenReturn(new ValidationResponse(true, CLOCK.instant(), null, List.of()));
        SetupOptionsCoordinator options = mock(SetupOptionsCoordinator.class);
        SetupTransitionService transitions = transitions(state, validator,
                mock(SetupConfigurationCoordinator.class), capability, options,
                Optional.empty(), Optional.empty());
        OptionsRequest request = new OptionsRequest(
                new ServerInstrumentationConfiguration("  ", "https://server.example.test:4317"), null,
                new MailConfiguration("mail.example.test", 25, MailSecurity.NONE,
                        null, null, "alerts@example.test"));

        var response = transitions.configureOptions(request);

        assertThat(response.serverOtlpHttpConfigured()).isFalse();
        assertThat(response.serverOtlpGrpcConfigured()).isTrue();
        assertThat(state.status().optional()).isEqualTo(
                new OptionalConfigurationSummary(false, true, false, true));
        assertThat(state.pendingWarnings()).containsExactly(SetupWarningCode.MAIL_SECURITY_NONE);
        verify(options).persist(request);
    }

    @Test
    void browserAndHeadlessCompletionUseTheSameWarningGateAndCompletionSideEffect() {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupCompletionCoordinator completion = mock(SetupCompletionCoordinator.class);

        for (boolean browser : List.of(true, false)) {
            SetupRuntimeState state = state(capability, SetupPhase.OPTIONAL_CONFIGURATION, true, "operator");
            SetupTransitionService transitions = transitions(state, mock(SetupRequestValidator.class),
                    mock(SetupConfigurationCoordinator.class), capability, Optional.empty(), Optional.of(completion));
            SetupTransitionService.CompletionCommand command = browser
                    ? SetupTransitionService.CompletionCommand.browser(
                            new CompleteRequest(SetupPhase.OPTIONAL_CONFIGURATION, List.of()))
                    : SetupTransitionService.CompletionCommand.headless(List.of());

            assertThatThrownBy(() -> transitions.complete(command))
                    .isInstanceOfSatisfying(SetupApiException.class,
                            failure -> assertThat(failure.errorCode()).isEqualTo(SetupErrorCode.OPERATION_CONFLICT));
            assertThat(state.phase()).isEqualTo(SetupPhase.OPTIONAL_CONFIGURATION);
        }
        verify(completion, never()).completeInstallation();
    }

    private static SetupTransitionService transitions(
            SetupRuntimeState state, SetupRequestValidator validator,
            SetupConfigurationCoordinator configuration, ManagedConfigCapability capability,
            Optional<IdentityInitializationService> identities, Optional<SetupCompletionCoordinator> completion) {
        return transitions(state, validator, configuration, capability,
                mock(SetupOptionsCoordinator.class), identities, completion);
    }

    private static SetupTransitionService transitions(
            SetupRuntimeState state, SetupRequestValidator validator,
            SetupConfigurationCoordinator configuration, ManagedConfigCapability capability,
            SetupOptionsCoordinator options, Optional<IdentityInitializationService> identities,
            Optional<SetupCompletionCoordinator> completion) {
        return new SetupTransitionService(
                state, validator, configuration, capability, options, identities, completion);
    }

    private static void assertOptionsValidationFailure(
            OptionsRequest request, ValidationSection section, SetupErrorCode errorCode) {
        ManagedConfigCapability capability = mock(ManagedConfigCapability.class);
        SetupRuntimeState state = state(capability, SetupPhase.OPTIONAL_CONFIGURATION, true, "operator");
        SetupRequestValidator validator = mock(SetupRequestValidator.class);
        when(validator.validate(any(ValidateRequest.class)))
                .thenReturn(new ValidationResponse(false, CLOCK.instant(), errorCode, List.of()));
        SetupOptionsCoordinator options = mock(SetupOptionsCoordinator.class);
        SetupTransitionService transitions = transitions(state, validator,
                mock(SetupConfigurationCoordinator.class), capability, options,
                Optional.empty(), Optional.empty());
        var before = state.status();

        assertThatThrownBy(() -> transitions.configureOptions(request))
                .isInstanceOfSatisfying(SetupApiException.class,
                        failure -> assertThat(failure.errorCode()).isEqualTo(errorCode));

        verifyNoInteractions(options);
        verify(validator).validate(argThat(
                (ValidateRequest validation) -> validation.section() == section));
        assertThat(state.status().optional()).isEqualTo(before.optional());
        assertThat(state.pendingWarnings()).isEqualTo(before.pendingWarnings());
    }

    private static SetupRuntimeState state(ManagedConfigCapability capability, SetupPhase phase,
                                           boolean administratorConfigured, String username) {
        return new SetupRuntimeState(CLOCK, capability, phase, SetupAccess.LOCAL,
                administratorConfigured, username);
    }

    private static ConfigurationResponse configurationResponse(String id) {
        return new ConfigurationResponse(id, SetupOperationState.AWAITING_RESTART,
                SetupPhase.APPLICATION_STARTING, 0, false);
    }

    private static ConfigurationRequest browserConfiguration() {
        return browserConfiguration(SetupPhase.CONFIGURATION_REQUIRED, ApplyMode.MANAGED_WRITE);
    }

    private static ConfigurationRequest browserConfiguration(SetupPhase expectedPhase, ApplyMode applyMode) {
        return new ConfigurationRequest(expectedPhase, applyMode,
                new MetadataDatabaseConfiguration(MetadataDatabaseKind.H2, "jdbc:h2:mem:browser", "sa", "secret"),
                new TelemetryStoreConfiguration(TelemetryStoreKind.GREPTIME,
                        "localhost:4001", "http://localhost:4000", "public", null, null));
    }

    private static OptionsRequest optionsRequest() {
        return new OptionsRequest(
                new ServerInstrumentationConfiguration("https://server.example.test:4318", null), null, null);
    }

    private static HeadlessSetupWorkflow.RequiredConfiguration headlessConfiguration(SecretValue password) {
        return headlessConfiguration(SetupPhase.CONFIGURATION_REQUIRED, ApplyMode.MANAGED_WRITE, password);
    }

    private static HeadlessSetupWorkflow.RequiredConfiguration headlessConfiguration(
            SetupPhase expectedPhase, ApplyMode applyMode, SecretValue password) {
        return new HeadlessSetupWorkflow.RequiredConfiguration(expectedPhase, applyMode,
                new HeadlessSetupWorkflow.Metadata(MetadataDatabaseKind.H2, "jdbc:h2:mem:headless", "sa", password),
                new HeadlessSetupWorkflow.Telemetry("localhost:4001", "http://localhost:4000", "public",
                        Optional.empty(), Optional.empty()));
    }
}
