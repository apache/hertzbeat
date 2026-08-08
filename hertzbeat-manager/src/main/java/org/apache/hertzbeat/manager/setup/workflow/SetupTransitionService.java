/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.AdministratorRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.CompleteRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidateRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationSection;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.apache.hertzbeat.manager.setup.identity.AdministratorCredentials;
import org.apache.hertzbeat.manager.setup.identity.BootstrapIdentityConflict;
import org.apache.hertzbeat.manager.setup.identity.IdentityInitializationService;
import org.apache.hertzbeat.manager.setup.identity.InvalidAdministratorUsername;
import org.springframework.http.HttpStatus;

/** Single state transition boundary shared by browser and headless setup adapters. */
public final class SetupTransitionService {
    private final SetupRuntimeState state;
    private final SetupRequestValidator validator;
    private final SetupConfigurationCoordinator configuration;
    private final ManagedConfigCapability capability;
    private final Optional<IdentityInitializationService> identities;
    private final Optional<SetupCompletionCoordinator> completion;

    public SetupTransitionService(SetupRuntimeState state, SetupRequestValidator validator,
                                  SetupConfigurationCoordinator configuration, ManagedConfigCapability capability,
                                  Optional<IdentityInitializationService> identities,
                                  Optional<SetupCompletionCoordinator> completion) {
        this.state = state;
        this.validator = validator;
        this.configuration = configuration;
        this.capability = capability;
        this.identities = identities;
        this.completion = completion;
    }

    public ConfigurationResponse configure(ConfigurationCommand command) {
        requireWritable();
        SetupPhase expected = command.expectedPhase();
        if (expected != SetupPhase.CONFIGURATION_REQUIRED && expected != SetupPhase.EXTERNAL_APPLY_REQUIRED) {
            throw new SetupWorkflowConflict();
        }
        state.ensurePhase(expected);
        command.validate(validator);
        ConfigurationResponse response = command.configure(configuration, capability);
        state.configurationApplied(expected, response.operationId(), response.phase());
        return response;
    }

    public String createAdministrator(AdministratorCommand command) {
        try (command) {
            requireWritable();
            state.ensurePhase(SetupPhase.ADMINISTRATOR_REQUIRED);
            char[] clear = command.password().copy();
            String canonicalUsername;
            try (AdministratorCredentials credentials = new AdministratorCredentials(command.username(), clear)) {
                canonicalUsername = credentials.canonicalUsername();
                identities.orElseThrow(SetupWorkflowConflict::new).createFirstAdministrator(credentials);
            } catch (InvalidAdministratorUsername invalid) {
                throw new SetupApiException(SetupErrorCode.ADMINISTRATOR_USERNAME_INVALID, HttpStatus.BAD_REQUEST);
            } catch (BootstrapIdentityConflict conflict) {
                throw new SetupApiException(SetupErrorCode.ADMINISTRATOR_ALREADY_CONFIGURED, HttpStatus.CONFLICT);
            } finally {
                Arrays.fill(clear, '\0');
            }
            state.administratorCreated(canonicalUsername);
            return canonicalUsername;
        }
    }

    public String complete(CompletionCommand command) {
        requireWritable();
        state.ensurePhase(SetupPhase.OPTIONAL_CONFIGURATION);
        if (command.expectedPhase() != SetupPhase.OPTIONAL_CONFIGURATION) {
            throw new SetupWorkflowConflict();
        }
        if (!command.acknowledgedWarnings().containsAll(state.pendingWarnings())) {
            throw new SetupApiException(SetupErrorCode.OPERATION_CONFLICT, HttpStatus.CONFLICT);
        }
        String username = state.administratorUsername();
        if (username == null) {
            throw new SetupWorkflowConflict();
        }
        completion.orElseThrow(SetupWorkflowConflict::new).completeInstallation();
        state.complete();
        return username;
    }

    private void requireWritable() {
        if (state.phase() == SetupPhase.COMPLETE) {
            throw new SetupApiException(SetupErrorCode.SETUP_COMPLETE, HttpStatus.GONE);
        }
    }

    /** Transport adapter for required configuration while the transition stays transport-neutral. */
    public interface ConfigurationCommand {
        SetupPhase expectedPhase();

        void validate(SetupRequestValidator validator);

        ConfigurationResponse configure(SetupConfigurationCoordinator coordinator,
                                        ManagedConfigCapability capability);

        static ConfigurationCommand browser(ConfigurationRequest request) {
            return new BrowserConfigurationCommand(request);
        }

        static ConfigurationCommand headless(HeadlessSetupWorkflow.RequiredConfiguration request) {
            return new HeadlessConfigurationCommand(request);
        }
    }

    /** Transition-owned administrator secret. */
    public record AdministratorCommand(String username, SecretValue password) implements AutoCloseable {
        public static AdministratorCommand browser(AdministratorRequest request) {
            return new AdministratorCommand(request.username(), SecretValue.of(request.password()));
        }

        public static AdministratorCommand headless(String username, SecretValue password) {
            return new AdministratorCommand(username, SecretValue.copyOf(password));
        }

        @Override
        public void close() {
            password.close();
        }
    }

    /** Shared completion preconditions for every setup transport. */
    public record CompletionCommand(SetupPhase expectedPhase, List<SetupWarningCode> acknowledgedWarnings) {
        public static CompletionCommand browser(CompleteRequest request) {
            return new CompletionCommand(request.expectedPhase(), request.acknowledgedWarnings());
        }

        public static CompletionCommand headless(List<SetupWarningCode> acknowledgedWarnings) {
            return new CompletionCommand(SetupPhase.OPTIONAL_CONFIGURATION, acknowledgedWarnings);
        }
    }

    private record BrowserConfigurationCommand(ConfigurationRequest request) implements ConfigurationCommand {
        @Override
        public SetupPhase expectedPhase() {
            return request.expectedPhase();
        }

        @Override
        public void validate(SetupRequestValidator validator) {
            requireValid(validator, new ValidateRequest(ValidationSection.METADATA_DATABASE,
                    request.managementDatabase(), null, null, null));
            requireValid(validator, new ValidateRequest(ValidationSection.TELEMETRY_STORE,
                    null, request.telemetryStore(), null, null));
        }

        @Override
        public ConfigurationResponse configure(SetupConfigurationCoordinator coordinator,
                                               ManagedConfigCapability capability) {
            return coordinator.configure(request, capability);
        }
    }

    private record HeadlessConfigurationCommand(HeadlessSetupWorkflow.RequiredConfiguration request)
            implements ConfigurationCommand {
        @Override
        public SetupPhase expectedPhase() {
            return request.expectedPhase();
        }

        @Override
        public void validate(SetupRequestValidator validator) {
            validator.validate(request.metadata());
            validator.validate(request.telemetry());
        }

        @Override
        public ConfigurationResponse configure(SetupConfigurationCoordinator coordinator,
                                               ManagedConfigCapability capability) {
            return coordinator.configure(request, SetupConfigurationMapper.map(request), capability);
        }
    }

    private static void requireValid(SetupRequestValidator validator, ValidateRequest request) {
        var response = validator.validate(request);
        if (!response.valid()) {
            throw new SetupApiException(response.errorCode(), HttpStatus.BAD_REQUEST);
        }
    }
}
