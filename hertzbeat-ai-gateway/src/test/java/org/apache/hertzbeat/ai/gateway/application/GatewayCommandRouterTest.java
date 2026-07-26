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

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.CreateModelProviderConfigurationCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionTranscriptCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListModelProviderConfigurationsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListModelProviderOptionsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ListSessionsCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.contract.UserInput.Message;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Gateway command router tests.
 */
@ExtendWith(MockitoExtension.class)
class GatewayCommandRouterTest {

    @Mock
    private AgentCommandService agentCommandService;

    @Mock
    private ApprovalCommandService approvalCommandService;

    @Mock
    private RunCommandService runCommandService;

    @Mock
    private GatewayQueryService queryService;

    @Mock
    private ModelProviderCommandService modelProviderCommandService;

    @Test
    void agentMessageShouldRouteOnlyToAgentCommandService() {
        GatewaySingleResponse expected = response("agent");
        InvokeCommand command = new InvokeCommand(envelope(), ReplyMode.FINAL_ONLY, "cmd-1",
                userInput("msg-1", "conv-1", "hello"));
        when(agentCommandService.handle(command)).thenReturn(expected);

        assertSame(expected, router().handle(command));

        verify(agentCommandService).handle(command);
        verifyNoInteractions(approvalCommandService, runCommandService, queryService, modelProviderCommandService);
    }

    @Test
    void queryCommandShouldRouteOnlyToQueryService() {
        GatewaySingleResponse expected = response("session");
        GetSessionCommand command = new GetSessionCommand(
                envelope(), ReplyMode.FINAL_ONLY, "get-session", "ags-1");
        when(queryService.getSession(command)).thenReturn(expected);

        assertSame(expected, router().handle(command));

        verify(queryService).getSession(command);
        verifyNoInteractions(agentCommandService, approvalCommandService, runCommandService,
                modelProviderCommandService);
    }

    @Test
    void sessionListCommandShouldRouteOnlyToQueryService() {
        GatewaySingleResponse expected = response("sessions");
        ListSessionsCommand command = new ListSessionsCommand(
                envelope(), ReplyMode.FINAL_ONLY, "list-sessions", null, 0, 50);
        when(queryService.listSessions(command)).thenReturn(expected);

        assertSame(expected, router().handle(command));

        verify(queryService).listSessions(command);
        verifyNoInteractions(agentCommandService, approvalCommandService, runCommandService,
                modelProviderCommandService);
    }

    @Test
    void transcriptCommandShouldRouteOnlyToQueryService() {
        GatewaySingleResponse expected = response("session-transcript");
        GetSessionTranscriptCommand command = new GetSessionTranscriptCommand(
                envelope(), ReplyMode.FINAL_ONLY, "get-transcript", "ags-1", 0, 50);
        when(queryService.getSessionTranscript(command)).thenReturn(expected);

        assertSame(expected, router().handle(command));

        verify(queryService).getSessionTranscript(command);
        verifyNoInteractions(agentCommandService, approvalCommandService, runCommandService,
                modelProviderCommandService);
    }

    @Test
    void modelProviderOptionsShouldRouteOnlyToModelProviderCommandService() {
        GatewaySingleResponse expected = response("provider-options");
        ListModelProviderOptionsCommand command = new ListModelProviderOptionsCommand(
                envelope(), ReplyMode.FINAL_ONLY, "list-provider-options");
        when(modelProviderCommandService.listOptions(command)).thenReturn(expected);

        assertSame(expected, router().handle(command));

        verify(modelProviderCommandService).listOptions(command);
        verifyNoInteractions(agentCommandService, approvalCommandService, runCommandService, queryService);
    }

    @Test
    void modelProviderConfigurationShouldRouteOnlyToModelProviderCommandService() {
        GatewaySingleResponse expected = response("provider-configuration");
        ListModelProviderConfigurationsCommand command = new ListModelProviderConfigurationsCommand(
                envelope(), ReplyMode.FINAL_ONLY, "get-provider-config");
        when(modelProviderCommandService.listConfigurations(command)).thenReturn(expected);

        assertSame(expected, router().handle(command));

        verify(modelProviderCommandService).listConfigurations(command);
        verifyNoInteractions(agentCommandService, approvalCommandService, runCommandService, queryService);
    }

    @Test
    void modelProviderSaveShouldRouteOnlyToModelProviderCommandService() {
        GatewaySingleResponse expected = response("provider-configuration-saved");
        CreateModelProviderConfigurationCommand command = new CreateModelProviderConfigurationCommand(
                envelope(), ReplyMode.FINAL_ONLY, "save-provider-config", new ModelProviderConfig());
        when(modelProviderCommandService.createConfiguration(command)).thenReturn(expected);

        assertSame(expected, router().handle(command));

        verify(modelProviderCommandService).createConfiguration(command);
        verifyNoInteractions(agentCommandService, approvalCommandService, runCommandService, queryService);
    }

    private GatewayCommandRouter router() {
        return new GatewayCommandRouter(agentCommandService, approvalCommandService,
                runCommandService, queryService, modelProviderCommandService);
    }

    private GatewayEnvelope envelope() {
        return GatewayEnvelope.builder()
                .channelId("web-ui")
                .receivedAt(100L)
                .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                .build();
    }

    private UserInput userInput(String messageId, String conversationId, String text) {
        return UserInput.builder()
                .messageId(messageId)
                .conversationId(conversationId)
                .message(Message.builder().text(text).attachments(List.of()).build())
                .build();
    }

    private GatewaySingleResponse response(String message) {
        return new GatewaySingleResponse(new Meta("cmd-1", null, null, null, true, message),
                null, List.of());
    }
}
