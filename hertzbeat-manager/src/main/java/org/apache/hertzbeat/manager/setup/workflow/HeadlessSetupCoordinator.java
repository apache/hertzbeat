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
