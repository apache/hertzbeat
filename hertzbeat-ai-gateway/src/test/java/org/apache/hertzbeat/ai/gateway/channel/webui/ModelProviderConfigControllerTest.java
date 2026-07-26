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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.List;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.CreateModelProviderConfigurationCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListModelProviderConfigurationsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListModelProviderOptionsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.SwitchModelProviderCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommandRouter;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.application.ModelProviderConfigurationView;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelProviderOption;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link ModelProviderConfigController}.
 */
@ExtendWith(MockitoExtension.class)
class ModelProviderConfigControllerTest {

    @Mock
    private GatewayCommandRouter commandRouter;

    @Mock
    private SubjectSum subject;

    @Captor
    private ArgumentCaptor<GatewayCommand> commandCaptor;

    @AfterEach
    void tearDown() {
        SurenessContextHolder.clear();
    }

    @Test
    void optionsShouldRouteCurrentWebUiActorThroughGatewayCommandRouter() {
        bindSubject();
        AgentModelProviderOption option = new AgentModelProviderOption(
                "openai-compatible", "openai", "OpenAI",
                "https://api.openai.com/v1", "gpt-5", List.of("apiKey", "baseUrl", "model"));
        when(commandRouter.handle(commandCaptor.capture()))
                .thenReturn(response("list-model-provider-options", List.of(option)));

        assertSame(option, controller().getOptions().getBody().getData().get(0));

        assertInstanceOf(ListModelProviderOptionsCommand.class, commandCaptor.getValue());
        assertWebUiActor(commandCaptor.getValue());
    }

    @Test
    void configurationsShouldRouteThroughGatewayCommandRouter() {
        bindSubject();
        ModelProviderConfigurationView state = new ModelProviderConfigurationView(null, List.of());
        when(commandRouter.handle(commandCaptor.capture()))
                .thenReturn(response("list-model-provider-configurations", state));

        assertSame(state, controller().getConfigurations().getBody().getData());

        assertInstanceOf(ListModelProviderConfigurationsCommand.class, commandCaptor.getValue());
        assertWebUiActor(commandCaptor.getValue());
    }

    @Test
    void createShouldRouteConfigurationAndCurrentActorThroughGatewayCommandRouter() {
        bindSubject();
        ModelProviderConfig config = new ModelProviderConfig();
        ModelProviderConfigurationView state = new ModelProviderConfigurationView(null, List.of());
        when(commandRouter.handle(commandCaptor.capture()))
                .thenReturn(response("create-model-provider-configuration", state));

        assertSame(state, controller().createConfiguration(config).getBody().getData());

        assertInstanceOf(CreateModelProviderConfigurationCommand.class, commandCaptor.getValue());
        CreateModelProviderConfigurationCommand command =
                (CreateModelProviderConfigurationCommand) commandCaptor.getValue();
        assertSame(config, command.config());
        assertWebUiActor(command);
    }

    @Test
    void defaultSelectionShouldUseSwitchCommandWithNoProviderUid() {
        bindSubject();
        ModelProviderConfigurationView state = new ModelProviderConfigurationView(null, List.of());
        when(commandRouter.handle(commandCaptor.capture()))
                .thenReturn(response("switch-model-provider-to-default", state));

        assertSame(state, controller().switchToDefault().getBody().getData());

        assertInstanceOf(SwitchModelProviderCommand.class, commandCaptor.getValue());
        SwitchModelProviderCommand command = (SwitchModelProviderCommand) commandCaptor.getValue();
        assertNull(command.providerUid());
        assertWebUiActor(command);
    }

    private ModelProviderConfigController controller() {
        return new ModelProviderConfigController(commandRouter);
    }

    private GatewaySingleResponse response(String commandId, Object body) {
        return new GatewaySingleResponse(
                new Meta(commandId, null, null, null, true, commandId),
                body,
                List.of());
    }

    private void assertWebUiActor(GatewayCommand command) {
        assertEquals(ChannelId.WEB_UI.id(), command.envelope().getChannelId());
        assertEquals("trusted-user", command.envelope().getActor().getId());
    }

    private void bindSubject() {
        when(subject.getPrincipal()).thenReturn("trusted-user");
        when(subject.getRoles()).thenReturn(List.of("user"));
        when(subject.hasRole("admin")).thenReturn(false);
        when(subject.hasRole("user")).thenReturn(true);
        when(subject.hasRole("guest")).thenReturn(false);
        SurenessContextHolder.bindSubject(subject);
    }
}
