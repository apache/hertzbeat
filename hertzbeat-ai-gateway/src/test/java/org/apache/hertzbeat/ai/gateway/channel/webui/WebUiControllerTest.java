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

import static org.apache.hertzbeat.common.constants.CommonConstants.SUCCESS_CODE;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommandRouter;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.CancelRunCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.channel.webui.dto.WebUiChatStreamRequest;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.GatewayEventType;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewayStreamResponse;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.RunCompletedPayload;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;

/**
 * Test case for {@link WebUiController} chat endpoints.
 */
@ExtendWith(MockitoExtension.class)
class WebUiControllerTest {

    @Mock
    private GatewayCommandRouter commandRouter;

    @Mock
    private AgentInteractionInputService interactionInputService;

    @Mock
    private SubjectSum subject;

    @Captor
    private ArgumentCaptor<GatewayCommand> commandCaptor;

    @AfterEach
    void tearDown() {
        SurenessContextHolder.clear();
    }

    @Test
    void chatShouldRouteInvokeCommandAndReturnSingleResponse() {
        bindSubject();
        WebUiController controller = controller();
        WebUiChatStreamRequest request = chatRequest();
        GatewaySingleResponse expected = new GatewaySingleResponse(
                new Meta("msg-1", "conv-1", "ags-1", "run-1", true, "done"),
                java.util.Map.of("message", "ok"),
                List.of());
        when(commandRouter.handle(commandCaptor.capture())).thenReturn(expected);

        ResponseEntity<Message<GatewaySingleResponse>> response = controller.chat(request, "zh-CN");

        assertEquals(SUCCESS_CODE, response.getBody().getCode());
        assertSame(expected, response.getBody().getData());
        InvokeCommand command = assertInstanceOf(InvokeCommand.class, commandCaptor.getValue());
        assertEquals(ReplyMode.FINAL_ONLY, command.replyMode());
        assertEquals("msg-1", command.commandId());
        assertEquals("conv-1", command.userInput().getConversationId());
        assertEquals("diagnose cpu", command.userInput().getMessage().getText());
        assertEquals(ChannelId.WEB_UI.id(), command.envelope().getChannelId());
        assertEquals("trusted-user", command.envelope().getActor().getId());
        assertEquals(List.of("user"), command.envelope().getActor().getRoles());
        assertEquals("zh-CN", command.envelope().getPreferredLanguage());
    }

    @Test
    void streamChatShouldRenderGatewayEventsAsSse() {
        bindSubject();
        WebUiController controller = controller();
        GatewayEvent event = new GatewayEvent(GatewayEventType.RUN_COMPLETED, "event-1", "conv-1",
                "ags-1", "run-1", null, new RunCompletedPayload(null), 100L);
        when(commandRouter.handle(commandCaptor.capture())).thenReturn(new GatewayStreamResponse(
                new Meta("msg-1", "conv-1", "ags-1", "run-1", false, "streaming"),
                Flux.just(event)));

        List<ServerSentEvent<GatewayEvent>> events = controller.streamChat(chatRequest(), "ja-JP")
                .collectList().block();

        assertEquals(1, events.size());
        assertEquals("run_completed", events.get(0).event());
        assertEquals("event-1", events.get(0).id());
        assertSame(event, events.get(0).data());
        InvokeCommand command = assertInstanceOf(InvokeCommand.class, commandCaptor.getValue());
        assertEquals(ReplyMode.STREAM, command.replyMode());
        assertEquals(ChannelId.WEB_UI.id(), command.envelope().getChannelId());
        assertEquals("ja-JP", command.envelope().getPreferredLanguage());
    }

    @Test
    void stopRunShouldRouteAuthenticatedCancellationCommand() {
        bindSubject();
        GatewaySingleResponse expected = new GatewaySingleResponse(
                new Meta("stop-run:run-1", null, null, "run-1", true, "cancel"), null, List.of());
        ArgumentCaptor<GatewayCommand> commandCaptor = ArgumentCaptor.forClass(GatewayCommand.class);
        when(commandRouter.handle(commandCaptor.capture())).thenReturn(expected);

        ResponseEntity<Message<GatewaySingleResponse>> response = controller().stopRun("run-1");

        assertSame(expected, response.getBody().getData());
        CancelRunCommand command = assertInstanceOf(CancelRunCommand.class, commandCaptor.getValue());
        assertEquals("run-1", command.runUid());
        assertEquals("trusted-user", command.envelope().getActor().getId());
    }

    @Test
    void submitInteractionShouldUseAuthenticatedActor() {
        bindSubject();

        ResponseEntity<Message<String>> response = controller().submitInteraction("aui-1",
                new WebUiController.InteractionSubmission(Map.of("password", "secret")));

        assertEquals(SUCCESS_CODE, response.getBody().getCode());
        verify(interactionInputService).submit(eq("aui-1"),
                argThat(actor -> "trusted-user".equals(actor.getId())), eq(Map.of("password", "secret")));
    }

    private WebUiChatStreamRequest chatRequest() {
        return WebUiChatStreamRequest.builder()
                .conversationId("conv-1")
                .messageId("msg-1")
                .message("diagnose cpu")
                .build();
    }

    private WebUiController controller() {
        return new WebUiController(commandRouter, interactionInputService);
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
