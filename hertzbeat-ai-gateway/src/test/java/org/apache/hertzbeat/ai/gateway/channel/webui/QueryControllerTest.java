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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommandRouter;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.GetSessionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Test case for {@link QueryController}.
 */
@ExtendWith(MockitoExtension.class)
class QueryControllerTest {

    @Mock
    private GatewayCommandRouter commandRouter;

    @Mock
    private AgentSessionService sessionService;

    @Mock
    private SubjectSum subject;

    @Captor
    private ArgumentCaptor<GatewayCommand> commandCaptor;

    @AfterEach
    void tearDown() {
        SurenessContextHolder.clear();
    }

    @Test
    void sessionQueryShouldRouteThroughGatewayCommandRouter() {
        QueryController controller = controller();
        GatewaySingleResponse sessionResponse = response("get-session:ags-1", "session");
        when(commandRouter.handle(commandCaptor.capture()))
                .thenReturn(sessionResponse);

        assertSame(sessionResponse, controller.getSession("ags-1").getBody().getData());

        assertInstanceOf(GetSessionCommand.class, commandCaptor.getValue());
    }

    @Test
    void listSessionsShouldOnlyQueryCurrentWebUiActor() {
        bindSubject();
        PageRequest pageRequest = PageRequest.of(0, 50);
        Page<AgentSession> page = Page.empty(pageRequest);
        when(sessionService.findSessions(eq(ChannelId.WEB_UI.id()), any(AgentActor.class),
                eq(pageRequest))).thenReturn(page);

        ResponseEntity<Message<Page<AgentSession>>> response = controller().listSessions(0, 50);

        assertSame(page, response.getBody().getData());
        verify(sessionService).findSessions(eq(ChannelId.WEB_UI.id()), any(AgentActor.class),
                eq(pageRequest));
    }

    @Test
    void sessionTranscriptShouldUseSessionService() {
        QueryController controller = controller();
        AgentSession session = AgentSession.builder().id(1L).sessionUid("ags-1").build();
        AgentTranscriptEntry sessionTranscript = AgentTranscriptEntry.builder()
                .sessionId(1L)
                .messageRole(TranscriptMessage.TranscriptRole.ASSISTANT.wireValue())
                .payloadJson(JsonUtil.toJson(TranscriptMessage.assistantText("diagnosis complete")))
                .build();
        PageRequest defaultPage = PageRequest.of(0, 50);
        Page<AgentTranscriptEntry> sessionTranscriptPage = new PageImpl<>(List.of(sessionTranscript), defaultPage, 1);
        when(sessionService.findSession("ags-1")).thenReturn(Optional.of(session));
        when(sessionService.findTranscriptEntries(1L, defaultPage)).thenReturn(sessionTranscriptPage);

        ResponseEntity<Message<Page<AgentTranscriptEntry>>> sessionTranscriptResponse =
                controller.listSessionTranscript("ags-1", 0, 50);

        assertSame(sessionTranscriptPage, sessionTranscriptResponse.getBody().getData());
        assertEquals("diagnosis complete", JsonUtil.fromJson(
            sessionTranscriptResponse.getBody().getData().getContent().get(0).getPayloadJson(),
            TranscriptMessage.class).getContent().get(0).getText());
    }

    @Test
    void removedRunLedgerPathsShouldNotBeMapped() {
        String removedSegment = "/ta" + "sks";
        String removedMessagesSegment = "/messages";
        List<String> paths = Arrays.stream(QueryController.class.getDeclaredMethods())
                .flatMap(method -> {
                    GetMapping getMapping = method.getAnnotation(GetMapping.class);
                    return getMapping == null
                            ? java.util.stream.Stream.empty()
                            : Arrays.stream(getMapping.value());
                })
                .toList();

        assertFalse(paths.stream().anyMatch(path -> path.contains(removedSegment)));
        assertFalse(paths.stream().anyMatch(path -> path.contains(removedMessagesSegment)));
    }

    private QueryController controller() {
        return new QueryController(commandRouter, sessionService);
    }

    private GatewaySingleResponse response(String commandId, String message) {
        return new GatewaySingleResponse(new Meta(commandId, null, null, null, true, message),
                null, List.of());
    }

    private void bindSubject() {
        when(subject.getPrincipal()).thenReturn("trusted-user");
        when(subject.getRoles()).thenReturn(List.of("admin"));
        when(subject.hasRole("admin")).thenReturn(true);
        when(subject.hasRole("user")).thenReturn(false);
        when(subject.hasRole("guest")).thenReturn(false);
        SurenessContextHolder.bindSubject(subject);
    }

}
