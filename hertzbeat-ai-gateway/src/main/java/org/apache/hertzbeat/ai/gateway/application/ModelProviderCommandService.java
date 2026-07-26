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

package org.apache.hertzbeat.ai.gateway.application;

import java.util.List;
import java.util.Objects;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.CreateModelProviderConfigurationCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.DeleteModelProviderConfigurationCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListModelProviderConfigurationsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListModelProviderOptionsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.SwitchModelProviderCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.UpdateModelProviderConfigurationCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.application.ModelProviderConfigurationView.Provider;
import org.apache.hertzbeat.ai.gateway.runtime.ReloadableAgentRuntimeModelClient;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelProviderRegistry;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfigState;
import org.apache.hertzbeat.manager.service.ModelProviderConfigurationService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Channel-neutral model provider configuration commands.
 */
@Service
public class ModelProviderCommandService {

    private final AgentModelProviderRegistry providerRegistry;
    private final ModelProviderConfigurationService configurationService;
    private final ReloadableAgentRuntimeModelClient runtimeModelClient;

    public ModelProviderCommandService(AgentModelProviderRegistry providerRegistry,
                                       ModelProviderConfigurationService configurationService,
                                       ReloadableAgentRuntimeModelClient runtimeModelClient) {
        this.providerRegistry = providerRegistry;
        this.configurationService = configurationService;
        this.runtimeModelClient = runtimeModelClient;
    }

    public GatewaySingleResponse listOptions(ListModelProviderOptionsCommand command) {
        return response(command.commandId(), "model-provider-options", providerRegistry.options());
    }

    public GatewaySingleResponse listConfigurations(ListModelProviderConfigurationsCommand command) {
        return stateResponse(command.commandId(), "model-provider-configurations",
                configurationService.getState());
    }

    public GatewaySingleResponse createConfiguration(CreateModelProviderConfigurationCommand command) {
        ModelProviderConfig config = copyConfiguration(command.config());
        config.setUid(null);
        providerRegistry.createModel(config);
        return stateResponse(command.commandId(), "model-provider-configuration-created",
                configurationService.createConfiguration(config));
    }

    public GatewaySingleResponse updateConfiguration(UpdateModelProviderConfigurationCommand command) {
        ModelProviderConfig existing = configurationService.getConfiguration(command.providerUid());
        ModelProviderConfig config = copyConfiguration(command.config());
        config.setUid(command.providerUid());
        boolean sameProvider = Objects.equals(existing.getCode(), config.getCode())
                && Objects.equals(existing.getType(), config.getType());
        if (!StringUtils.hasText(config.getApiKey())
                && sameProvider) {
            config.setApiKey(existing.getApiKey());
        }
        providerRegistry.createModel(config);
        ModelProviderConfigState state = configurationService.updateConfiguration(
                command.providerUid(), config);
        if (Objects.equals(command.providerUid(), state.getActiveProviderUid())) {
            runtimeModelClient.refreshConfiguration();
        }
        return stateResponse(command.commandId(), "model-provider-configuration-updated", state);
    }

    public GatewaySingleResponse deleteConfiguration(DeleteModelProviderConfigurationCommand command) {
        boolean deletingActiveConfiguration = Objects.equals(
                command.providerUid(), configurationService.getState().getActiveProviderUid());
        ModelProviderConfigState state = configurationService.deleteConfiguration(command.providerUid());
        if (deletingActiveConfiguration) {
            runtimeModelClient.refreshConfiguration();
        }
        return stateResponse(command.commandId(), "model-provider-configuration-deleted", state);
    }

    public GatewaySingleResponse switchConfiguration(SwitchModelProviderCommand command) {
        String previousProviderUid = configurationService.getState().getActiveProviderUid();
        if (StringUtils.hasText(command.providerUid())) {
            ModelProviderConfig config = configurationService.getConfiguration(command.providerUid());
            providerRegistry.createModel(config);
        }
        ModelProviderConfigState state = configurationService.switchActiveConfiguration(command.providerUid());
        if (!Objects.equals(previousProviderUid, state.getActiveProviderUid())) {
            runtimeModelClient.refreshConfiguration();
        }
        return stateResponse(command.commandId(), "model-provider-configuration-switched", state);
    }

    private GatewaySingleResponse stateResponse(String commandId, String message,
                                                ModelProviderConfigState state) {
        List<Provider> providers = state.getProviders().stream()
                .map(config -> new Provider(
                        config.getUid(),
                        config.getType(),
                        config.getCode(),
                        config.getBaseUrl(),
                        config.getModel(),
                        StringUtils.hasText(config.getApiKey())))
                .toList();
        return response(commandId, message,
                new ModelProviderConfigurationView(state.getActiveProviderUid(), providers));
    }

    private GatewaySingleResponse response(String commandId, String message, Object body) {
        return GatewaySingleResponse.builder()
                .meta(Meta.builder()
                        .commandId(commandId)
                        .terminal(true)
                        .message(message)
                        .build())
                .body(body)
                .events(List.of())
                .build();
    }

    private ModelProviderConfig copyConfiguration(ModelProviderConfig source) {
        ModelProviderConfig copy = new ModelProviderConfig();
        copy.setUid(source.getUid());
        copy.setType(source.getType());
        copy.setCode(source.getCode());
        copy.setBaseUrl(source.getBaseUrl());
        copy.setModel(source.getModel());
        copy.setApiKey(source.getApiKey());
        return copy;
    }
}
