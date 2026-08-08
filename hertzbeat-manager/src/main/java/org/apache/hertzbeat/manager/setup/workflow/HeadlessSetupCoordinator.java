/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.List;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.StatusResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/** Executes non-HTTP setup commands while retaining clearable secret ownership. */
public final class HeadlessSetupCoordinator implements HeadlessSetupWorkflow {
    private final SetupRuntimeState state;
    private final SetupMutationSerializer mutations;
    private final SetupTransitionService transitions;

    public HeadlessSetupCoordinator(SetupRuntimeState state, SetupMutationSerializer mutations,
                                    SetupTransitionService transitions) {
        this.state = state;
        this.mutations = mutations;
        this.transitions = transitions;
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
        return transitions.configure(SetupTransitionService.ConfigurationCommand.headless(request));
    }

    @Override
    public void createAdministrator(String username, SecretValue password) {
        mutations.execute(() -> createAdministratorMutation(username, password));
    }

    private void createAdministratorMutation(String username, SecretValue password) {
        transitions.createAdministrator(SetupTransitionService.AdministratorCommand.headless(username, password));
    }

    @Override
    public void complete(List<SetupWarningCode> acknowledgedWarnings) {
        mutations.execute(() -> completeMutation(acknowledgedWarnings));
    }

    private void completeMutation(List<SetupWarningCode> acknowledgedWarnings) {
        transitions.complete(SetupTransitionService.CompletionCommand.headless(acknowledgedWarnings));
    }
}
