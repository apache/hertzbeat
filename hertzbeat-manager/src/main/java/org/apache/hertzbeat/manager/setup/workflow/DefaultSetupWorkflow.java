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

import java.time.Clock;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.AdministratorRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.AdministratorResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.CompleteRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.CompleteResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OperationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionalConfigurationSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionsRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionsResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.StatusResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.UnlockRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.UnlockResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidateRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationSection;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.api.SetupWorkflow;
import org.springframework.http.HttpStatus;

/** Cohesive setup state-machine facade; transport and persistence remain in dedicated collaborators. */
public final class DefaultSetupWorkflow implements SetupWorkflow {
    private final SetupRuntimeState state;
    private final SetupRequestValidator validator;
    private final SetupOperationRegistry operations;
    private final SetupOptionsCoordinator options;
    private final Clock clock;
    private final SetupMutationSerializer mutations;
    private final SetupTransitionService transitions;

    public DefaultSetupWorkflow(SetupRuntimeState state, SetupRequestValidator validator,
                                SetupOperationRegistry operations,
                                SetupOptionsCoordinator options, Clock clock, SetupMutationSerializer mutations,
                                SetupTransitionService transitions) {
        this.state = state;
        this.validator = validator;
        this.operations = operations;
        this.options = options;
        this.clock = clock;
        this.mutations = mutations;
        this.transitions = transitions;
    }

    @Override
    public StatusResponse status() {
        return state.status();
    }

    @Override
    public UnlockResponse unlock(UnlockRequest request) {
        requireWritable();
        throw new SetupApiException(SetupErrorCode.SETUP_CODE_INVALID, HttpStatus.FORBIDDEN);
    }

    @Override
    public ValidationResponse validate(ValidateRequest request) {
        requireWritable();
        return validator.validate(request);
    }

    @Override
    public ConfigurationResponse configure(ConfigurationRequest request) {
        return mutations.execute(() -> configureMutation(request));
    }

    private ConfigurationResponse configureMutation(ConfigurationRequest request) {
        return transitions.configure(SetupTransitionService.ConfigurationCommand.browser(request));
    }

    @Override
    public OperationResponse operation(String operationId) {
        return operations.get(operationId);
    }

    @Override
    public AdministratorResponse createAdministrator(AdministratorRequest request) {
        return mutations.execute(() -> createAdministratorMutation(request));
    }

    private AdministratorResponse createAdministratorMutation(AdministratorRequest request) {
        String username = transitions.createAdministrator(
                SetupTransitionService.AdministratorCommand.browser(request));
        return new AdministratorResponse(username, SetupPhase.OPTIONAL_CONFIGURATION);
    }

    @Override
    public OptionsResponse configureOptions(OptionsRequest request) {
        return mutations.execute(() -> configureOptionsMutation(request));
    }

    private OptionsResponse configureOptionsMutation(OptionsRequest request) {
        requireWritable();
        state.ensurePhase(SetupPhase.OPTIONAL_CONFIGURATION);
        if (request.publicAccess() != null) {
            requireValid(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                    null, null, request.publicAccess(), null));
        }
        if (request.mail() != null) {
            requireValid(new ValidateRequest(ValidationSection.MAIL,
                    null, null, null, request.mail()));
        }
        options.persist(request);
        OptionalConfigurationSummary summary = new OptionalConfigurationSummary(
                request.publicAccess() != null && hasText(request.publicAccess().publicBaseUrl()),
                request.publicAccess() != null && hasText(request.publicAccess().serverOtlpHttpEndpoint()),
                request.publicAccess() != null && hasText(request.publicAccess().serverOtlpGrpcEndpoint()),
                request.retention() != null, request.mail() != null);
        state.optionsConfigured(summary,
                SetupWarningPolicy.INSTANCE.evaluate(state.managementDatabaseKind(), request));
        return new OptionsResponse(summary.publicAccessConfigured(), summary.serverOtlpHttpConfigured(),
                summary.serverOtlpGrpcConfigured(), summary.retentionConfigured(), summary.mailConfigured(),
                SetupPhase.OPTIONAL_CONFIGURATION);
    }

    @Override
    public ExportResponse prepareExport(ExportRequest request) {
        requireWritable();
        return switch (request.format()) {
            case YAML -> new ExportResponse("hertzbeat-setup.yml", "application/yaml");
            case ENV -> new ExportResponse("hertzbeat-setup.env", "text/plain");
            case KUBERNETES_SECRET -> new ExportResponse("hertzbeat-setup-secret.yml", "application/yaml");
        };
    }

    @Override
    public CompleteResponse complete(CompleteRequest request) {
        return mutations.execute(() -> completeMutation(request));
    }

    private CompleteResponse completeMutation(CompleteRequest request) {
        String username = transitions.complete(SetupTransitionService.CompletionCommand.browser(request));
        return new CompleteResponse(SetupPhase.COMPLETE, clock.instant(), "/login", username);
    }

    private void requireWritable() {
        if (state.phase() == SetupPhase.COMPLETE) {
            throw new SetupApiException(SetupErrorCode.SETUP_COMPLETE, HttpStatus.GONE);
        }
    }

    private void requireValid(ValidateRequest request) {
        ValidationResponse response = validator.validate(request);
        if (!response.valid()) {
            throw new SetupApiException(response.errorCode(), HttpStatus.BAD_REQUEST);
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
