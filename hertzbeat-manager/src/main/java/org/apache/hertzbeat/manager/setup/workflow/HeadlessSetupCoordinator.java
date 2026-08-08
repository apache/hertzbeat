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
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.StatusResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.apache.hertzbeat.manager.setup.identity.AdministratorCredentials;
import org.apache.hertzbeat.manager.setup.identity.BootstrapIdentityConflict;
import org.apache.hertzbeat.manager.setup.identity.IdentityInitializationService;
import org.springframework.http.HttpStatus;

/** Executes non-HTTP setup commands while retaining clearable secret ownership. */
public final class HeadlessSetupCoordinator implements HeadlessSetupWorkflow {
    private final SetupRuntimeState state;
    private final SetupRequestValidator validator;
    private final SetupConfigurationCoordinator configuration;
    private final ManagedConfigCapability capability;
    private final Optional<IdentityInitializationService> identities;
    private final Optional<SetupCompletionCoordinator> completion;
    private final SetupMutationSerializer mutations;

    public HeadlessSetupCoordinator(SetupRuntimeState state, SetupRequestValidator validator,
                                    SetupConfigurationCoordinator configuration,
                                    ManagedConfigCapability capability,
                                    Optional<IdentityInitializationService> identities,
                                    Optional<SetupCompletionCoordinator> completion,
                                    SetupMutationSerializer mutations) {
        this.state = state;
        this.validator = validator;
        this.configuration = configuration;
        this.capability = capability;
        this.identities = identities;
        this.completion = completion;
        this.mutations = mutations;
    }

    @Override
    public StatusResponse status() {
        return state.status();
    }

    @Override
    public ConfigurationResponse configure(RequiredConfiguration request) {
        return mutations.execute(() -> configureMutation(request));
    }

    private ConfigurationResponse configureMutation(RequiredConfiguration request) {
        requireWritable();
        state.ensurePhase(SetupPhase.CONFIGURATION_REQUIRED);
        validator.validate(request.metadata());
        validator.validate(request.telemetry());
        ConfigurationResponse response = configuration.configure(
                request, SetupConfigurationMapper.map(request), capability);
        state.configurationApplied(response.operationId(), response.phase());
        return response;
    }

    @Override
    public void createAdministrator(String username, SecretValue password) {
        mutations.execute(() -> createAdministratorMutation(username, password));
    }

    private void createAdministratorMutation(String username, SecretValue password) {
        requireWritable();
        state.ensurePhase(SetupPhase.ADMINISTRATOR_REQUIRED);
        char[] clear = password.copy();
        try (AdministratorCredentials credentials = new AdministratorCredentials(username, clear)) {
            identities.orElseThrow(SetupWorkflowConflict::new).createFirstAdministrator(credentials);
        } catch (BootstrapIdentityConflict conflict) {
            throw new SetupApiException(SetupErrorCode.ADMINISTRATOR_ALREADY_CONFIGURED, HttpStatus.CONFLICT);
        } finally {
            Arrays.fill(clear, '\0');
        }
        state.administratorCreated(username);
    }

    @Override
    public void complete(List<SetupWarningCode> acknowledgedWarnings) {
        mutations.execute(() -> completeMutation(acknowledgedWarnings));
    }

    private void completeMutation(List<SetupWarningCode> acknowledgedWarnings) {
        requireWritable();
        state.ensurePhase(SetupPhase.OPTIONAL_CONFIGURATION);
        if (!acknowledgedWarnings.containsAll(state.pendingWarnings())) {
            throw new SetupApiException(SetupErrorCode.OPERATION_CONFLICT, HttpStatus.CONFLICT);
        }
        if (state.administratorUsername() == null) {
            throw new SetupWorkflowConflict();
        }
        completion.orElseThrow(SetupWorkflowConflict::new).completeInstallation();
        state.complete();
    }

    private void requireWritable() {
        if (state.phase() == SetupPhase.COMPLETE) {
            throw new SetupApiException(SetupErrorCode.SETUP_COMPLETE, HttpStatus.GONE);
        }
    }
}
