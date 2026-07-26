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

package org.apache.hertzbeat.ai.gateway.channel.webui;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.CreateModelProviderConfigurationCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.DeleteModelProviderConfigurationCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListModelProviderConfigurationsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListModelProviderOptionsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.SwitchModelProviderCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.UpdateModelProviderConfigurationCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommandRouter;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.application.ModelProviderConfigurationView;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelProviderOption;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Agent model provider discovery and configuration API.
 */
@Tag(name = "Agent Model Provider API")
@RestController
@RequestMapping(path = "/api/agent/model-providers", produces = {APPLICATION_JSON_VALUE})
public class ModelProviderConfigController {

    private final GatewayCommandRouter commandRouter;

    public ModelProviderConfigController(GatewayCommandRouter commandRouter) {
        this.commandRouter = commandRouter;
    }

    @GetMapping("/options")
    @Operation(summary = "List registered Agent model provider configuration options")
    public ResponseEntity<Message<List<AgentModelProviderOption>>> getOptions() {
        GatewaySingleResponse response = (GatewaySingleResponse) commandRouter.handle(
                ListModelProviderOptionsCommand.builder()
                        .envelope(webUiEnvelope())
                        .replyMode(ReplyMode.FINAL_ONLY)
                        .commandId("list-model-provider-options")
                        .build());
        @SuppressWarnings("unchecked")
        List<AgentModelProviderOption> options = (List<AgentModelProviderOption>) response.body();
        return ResponseEntity.ok(Message.success(options));
    }

    @GetMapping("/configurations")
    @Operation(summary = "List saved Agent model provider configurations")
    public ResponseEntity<Message<ModelProviderConfigurationView>> getConfigurations() {
        GatewaySingleResponse response = (GatewaySingleResponse) commandRouter.handle(
                ListModelProviderConfigurationsCommand.builder()
                        .envelope(webUiEnvelope())
                        .replyMode(ReplyMode.FINAL_ONLY)
                        .commandId("list-model-provider-configurations")
                        .build());
        return stateResponse(response);
    }

    @PostMapping("/configurations")
    @Operation(summary = "Validate and create an Agent model provider configuration")
    public ResponseEntity<Message<ModelProviderConfigurationView>> createConfiguration(
            @RequestBody ModelProviderConfig config) {
        GatewaySingleResponse response = (GatewaySingleResponse) commandRouter.handle(
                CreateModelProviderConfigurationCommand.builder()
                        .envelope(webUiEnvelope())
                        .replyMode(ReplyMode.FINAL_ONLY)
                        .commandId("create-model-provider-configuration")
                        .config(config)
                        .build());
        return stateResponse(response);
    }

    @PutMapping("/configurations/{providerUid}")
    @Operation(summary = "Validate and update an Agent model provider configuration")
    public ResponseEntity<Message<ModelProviderConfigurationView>> updateConfiguration(
            @PathVariable String providerUid,
            @RequestBody ModelProviderConfig config) {
        GatewaySingleResponse response = (GatewaySingleResponse) commandRouter.handle(
                UpdateModelProviderConfigurationCommand.builder()
                        .envelope(webUiEnvelope())
                        .replyMode(ReplyMode.FINAL_ONLY)
                        .commandId("update-model-provider-configuration")
                        .providerUid(providerUid)
                        .config(config)
                        .build());
        return stateResponse(response);
    }

    @DeleteMapping("/configurations/{providerUid}")
    @Operation(summary = "Delete an Agent model provider configuration")
    public ResponseEntity<Message<ModelProviderConfigurationView>> deleteConfiguration(
            @PathVariable String providerUid) {
        GatewaySingleResponse response = (GatewaySingleResponse) commandRouter.handle(
                DeleteModelProviderConfigurationCommand.builder()
                        .envelope(webUiEnvelope())
                        .replyMode(ReplyMode.FINAL_ONLY)
                        .commandId("delete-model-provider-configuration")
                        .providerUid(providerUid)
                        .build());
        return stateResponse(response);
    }

    @PutMapping("/active/{providerUid}")
    @Operation(summary = "Switch the active Agent model provider configuration")
    public ResponseEntity<Message<ModelProviderConfigurationView>> switchConfiguration(
            @PathVariable String providerUid) {
        return switchConfiguration(providerUid, "switch-model-provider-configuration");
    }

    @DeleteMapping("/active")
    @Operation(summary = "Switch the active Agent model provider to the YAML default")
    public ResponseEntity<Message<ModelProviderConfigurationView>> switchToDefault() {
        return switchConfiguration(null, "switch-model-provider-to-default");
    }

    private ResponseEntity<Message<ModelProviderConfigurationView>> switchConfiguration(
            String providerUid, String commandId) {
        GatewaySingleResponse response = (GatewaySingleResponse) commandRouter.handle(
                SwitchModelProviderCommand.builder()
                        .envelope(webUiEnvelope())
                        .replyMode(ReplyMode.FINAL_ONLY)
                        .commandId(commandId)
                        .providerUid(providerUid)
                        .build());
        return stateResponse(response);
    }

    private ResponseEntity<Message<ModelProviderConfigurationView>> stateResponse(
            GatewaySingleResponse response) {
        return ResponseEntity.ok(Message.success((ModelProviderConfigurationView) response.body()));
    }

    private GatewayEnvelope webUiEnvelope() {
        return GatewayEnvelope.builder()
                .channelId(ChannelId.WEB_UI.id())
                .receivedAt(System.currentTimeMillis())
                .actor(ActorSupport.requireCurrentSurenessActor())
                .build();
    }
}
