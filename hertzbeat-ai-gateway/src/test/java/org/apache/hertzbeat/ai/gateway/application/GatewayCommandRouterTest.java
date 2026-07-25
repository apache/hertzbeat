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
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.contract.UserInput.Message;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
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

    @Test
    void agentMessageShouldRouteOnlyToAgentCommandService() {
        GatewaySingleResponse expected = response("agent");
        InvokeCommand command = new InvokeCommand(envelope(), ReplyMode.FINAL_ONLY, "cmd-1",
                userInput("msg-1", "conv-1", "hello"));
        when(agentCommandService.handle(command)).thenReturn(expected);

        assertSame(expected, router().handle(command));

        verify(agentCommandService).handle(command);
        verifyNoInteractions(approvalCommandService, runCommandService, queryService);
    }

    @Test
    void queryCommandShouldRouteOnlyToQueryService() {
        GatewaySingleResponse expected = response("session");
        GetSessionCommand command = new GetSessionCommand(
                envelope(), ReplyMode.FINAL_ONLY, "get-session", "ags-1");
        when(queryService.getSession(command)).thenReturn(expected);

        assertSame(expected, router().handle(command));

        verify(queryService).getSession(command);
        verifyNoInteractions(agentCommandService, approvalCommandService, runCommandService);
    }

    private GatewayCommandRouter router() {
        return new GatewayCommandRouter(agentCommandService, approvalCommandService,
                runCommandService, queryService);
    }

    private GatewayEnvelope envelope() {
        return GatewayEnvelope.builder().channelId("web-ui").receivedAt(100L).build();
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
