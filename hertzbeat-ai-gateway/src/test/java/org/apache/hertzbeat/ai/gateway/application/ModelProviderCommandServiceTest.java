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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.CreateModelProviderConfigurationCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.DeleteModelProviderConfigurationCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListModelProviderConfigurationsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListModelProviderOptionsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.SwitchModelProviderCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.UpdateModelProviderConfigurationCommand;
import org.apache.hertzbeat.ai.gateway.application.ModelProviderConfigurationView.Provider;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.ReloadableAgentRuntimeModelClient;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelProviderOption;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelProviderRegistry;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfigState;
import org.apache.hertzbeat.manager.service.ModelProviderConfigurationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.util.StringUtils;

/**
 * Test case for {@link ModelProviderCommandService}.
 */
@ExtendWith(MockitoExtension.class)
class ModelProviderCommandServiceTest {

    @Mock
    private AgentModelProviderRegistry providerRegistry;

    @Mock
    private ModelProviderConfigurationService configurationService;

    @Mock
    private ReloadableAgentRuntimeModelClient runtimeModelClient;

    @Test
    void optionsShouldComeFromRuntimeProviderRegistry() {
        AgentModelProviderOption option = new AgentModelProviderOption(
                "openai-compatible", "openai", "OpenAI",
                "https://api.openai.com/v1", "gpt-5", List.of("apiKey", "baseUrl", "model"));
        when(providerRegistry.options()).thenReturn(List.of(option));

        assertSame(option, ((List<?>) service().listOptions(
                new ListModelProviderOptionsCommand(
                        envelope(), ReplyMode.FINAL_ONLY, "list-options"))
                .body()).get(0));

        verifyNoInteractions(configurationService);
    }

    @Test
    void configurationListShouldHidePersistedApiKeys() {
        ModelProviderConfig config = config("provider-1", "secret");
        when(configurationService.getState()).thenReturn(state("provider-1", config));

        ModelProviderConfigurationView view = (ModelProviderConfigurationView) service().listConfigurations(
                new ListModelProviderConfigurationsCommand(
                        envelope(), ReplyMode.FINAL_ONLY, "list-configurations")).body();

        assertEquals("provider-1", view.activeProviderUid());
        Provider configView = view.providers().get(0);
        assertEquals("provider-1", configView.uid());
        assertTrue(configView.apiKeyConfigured());
        assertFalse(configView.toString().contains("secret"));
        verifyNoInteractions(providerRegistry);
    }

    @Test
    void createShouldValidateBeforePersistence() {
        ModelProviderConfig request = config(null, "secret");
        ModelProviderConfigState saved = state(null, config("provider-1", "secret"));
        when(configurationService.createConfiguration(argThat(
                config -> "siliconflow".equals(config.getCode())))).thenReturn(saved);

        service().createConfiguration(new CreateModelProviderConfigurationCommand(
                envelope(), ReplyMode.FINAL_ONLY, "create-config", request));

        InOrder calls = inOrder(providerRegistry, configurationService);
        calls.verify(providerRegistry).createModel(argThat(config -> config != request
                && config.getUid() == null
                && "secret".equals(config.getApiKey())));
        calls.verify(configurationService).createConfiguration(argThat(
                config -> "secret".equals(config.getApiKey())));
        verifyNoInteractions(runtimeModelClient);
    }

    @Test
    void updateShouldPreserveExistingSecretBeforeValidation() {
        ModelProviderConfig existing = config("provider-1", "stored-secret");
        ModelProviderConfig request = config(null, "");
        when(configurationService.getConfiguration("provider-1")).thenReturn(existing);
        when(configurationService.updateConfiguration(
                argThat("provider-1"::equals),
                argThat(config -> "stored-secret".equals(config.getApiKey()))))
                .thenReturn(state("provider-1", existing));

        service().updateConfiguration(new UpdateModelProviderConfigurationCommand(
                envelope(), ReplyMode.FINAL_ONLY, "update-config", "provider-1", request));

        verify(providerRegistry).createModel(argThat(
                config -> "stored-secret".equals(config.getApiKey())));
        verify(runtimeModelClient).refreshConfiguration();
    }

    @Test
    void inactiveUpdateShouldNotRefreshTheRuntime() {
        ModelProviderConfig existing = config("provider-1", "stored-secret");
        ModelProviderConfig request = config(null, "new-secret");
        when(configurationService.getConfiguration("provider-1")).thenReturn(existing);
        when(configurationService.updateConfiguration(
                argThat("provider-1"::equals),
                argThat(config -> "new-secret".equals(config.getApiKey()))))
                .thenReturn(state("provider-2", existing));

        service().updateConfiguration(new UpdateModelProviderConfigurationCommand(
                envelope(), ReplyMode.FINAL_ONLY, "update-config", "provider-1", request));

        verifyNoInteractions(runtimeModelClient);
    }

    @Test
    void changingProviderShouldNotReuseThePreviousProvidersSecret() {
        ModelProviderConfig existing = config("provider-1", "stored-secret");
        existing.setCode("openai");
        ModelProviderConfig request = config(null, "");
        when(configurationService.getConfiguration("provider-1")).thenReturn(existing);
        doThrow(new IllegalArgumentException("API key is required"))
                .when(providerRegistry).createModel(argThat(config -> !StringUtils.hasText(config.getApiKey())));

        assertThrows(IllegalArgumentException.class, () -> service().updateConfiguration(
                new UpdateModelProviderConfigurationCommand(
                        envelope(), ReplyMode.FINAL_ONLY, "update-config", "provider-1", request)));

        verify(configurationService, never()).updateConfiguration(
                argThat("provider-1"::equals), argThat(config -> true));
        verifyNoInteractions(runtimeModelClient);
    }

    @Test
    void deletingTheActiveConfigurationShouldRefreshTheYamlDefault() {
        ModelProviderConfig config = config("provider-1", "secret");
        when(configurationService.getState()).thenReturn(state("provider-1", config));
        when(configurationService.deleteConfiguration("provider-1")).thenReturn(state(null));

        service().deleteConfiguration(new DeleteModelProviderConfigurationCommand(
                envelope(), ReplyMode.FINAL_ONLY, "delete-config", "provider-1"));

        InOrder calls = inOrder(configurationService, runtimeModelClient);
        calls.verify(configurationService).getState();
        calls.verify(configurationService).deleteConfiguration("provider-1");
        calls.verify(runtimeModelClient).refreshConfiguration();
    }

    @Test
    void switchShouldValidateTheSelectedSavedConfiguration() {
        ModelProviderConfig config = config("provider-1", "secret");
        when(configurationService.getState()).thenReturn(state(null, config));
        when(configurationService.getConfiguration("provider-1")).thenReturn(config);
        when(configurationService.switchActiveConfiguration("provider-1"))
                .thenReturn(state("provider-1", config));

        service().switchConfiguration(new SwitchModelProviderCommand(
                envelope(), ReplyMode.FINAL_ONLY, "switch-config", "provider-1"));

        InOrder calls = inOrder(providerRegistry, configurationService, runtimeModelClient);
        calls.verify(configurationService).getState();
        calls.verify(configurationService).getConfiguration("provider-1");
        calls.verify(providerRegistry).createModel(config);
        calls.verify(configurationService).switchActiveConfiguration("provider-1");
        calls.verify(runtimeModelClient).refreshConfiguration();
    }

    private ModelProviderCommandService service() {
        return new ModelProviderCommandService(
                providerRegistry, configurationService, runtimeModelClient);
    }

    private GatewayEnvelope envelope() {
        return GatewayEnvelope.builder()
                .channelId("web-ui")
                .receivedAt(100L)
                .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                .build();
    }

    private ModelProviderConfig config(String uid, String apiKey) {
        ModelProviderConfig config = new ModelProviderConfig();
        config.setUid(uid);
        config.setType("openai-compatible");
        config.setCode("siliconflow");
        config.setBaseUrl("https://api.siliconflow.cn/v1");
        config.setModel("deepseek-ai/DeepSeek-V3.2");
        config.setApiKey(apiKey);
        return config;
    }

    private ModelProviderConfigState state(String activeProviderUid, ModelProviderConfig... configs) {
        return new ModelProviderConfigState(
                activeProviderUid,
                new ArrayList<>(List.of(configs)));
    }
}
