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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ApprovalDecisionCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommandRouter;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;

/**
 * Test case for {@link WebUiController} approval endpoints.
 */
@ExtendWith(MockitoExtension.class)
class WebUiApprovalTest {

    @Mock
    private GatewayCommandRouter commandRouter;

    @Mock
    private SubjectSum subject;

    @Mock
    private AgentInteractionInputService interactionInputService;

    @Captor
    private ArgumentCaptor<GatewayCommand> commandCaptor;

    @AfterEach
    void tearDown() {
        SurenessContextHolder.clear();
    }

    @Test
    void approveShouldRouteApprovalCommandByApprovalId() {
        bindSubject();
        GatewaySingleResponse expected = singleResponse("approved");
        when(commandRouter.handle(commandCaptor.capture())).thenReturn(expected);

        ResponseEntity<Message<GatewaySingleResponse>> response = controller().approve("agp-1");

        assertEquals(SUCCESS_CODE, response.getBody().getCode());
        assertSame(expected, response.getBody().getData());
        ApprovalDecisionCommand command =
                assertInstanceOf(ApprovalDecisionCommand.class, commandCaptor.getValue());
        assertEquals("agp-1", command.approvalId());
        assertEquals(ReplyMode.FINAL_ONLY, command.replyMode());
        assertEquals(AgentApprovalDecision.APPROVED, command.decision());
        assertEquals(ChannelId.WEB_UI.id(), command.envelope().getChannelId());
        assertEquals("trusted-user", command.envelope().getActor().getId());
    }

    @Test
    void rejectShouldRouteApprovalCommandByApprovalId() {
        bindSubject();
        GatewaySingleResponse expected = singleResponse("rejected");
        when(commandRouter.handle(commandCaptor.capture())).thenReturn(expected);

        ResponseEntity<Message<GatewaySingleResponse>> response = controller().reject("agp-1");

        assertEquals(SUCCESS_CODE, response.getBody().getCode());
        assertSame(expected, response.getBody().getData());
        ApprovalDecisionCommand command =
                assertInstanceOf(ApprovalDecisionCommand.class, commandCaptor.getValue());
        assertEquals("agp-1", command.approvalId());
        assertEquals(AgentApprovalDecision.REJECTED, command.decision());
    }

    @Test
    void approvalShouldRequireAuthenticatedSubject() {
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> controller().approve("agp-1"));

        assertEquals("Authenticated subject is required", exception.getMessage());
        verifyNoInteractions(commandRouter);
    }

    @Test
    void approvalDecisionPathsShouldExposeJsonEndpoints() {
        List<String> paths = Arrays.stream(WebUiController.class.getDeclaredMethods())
                .map(method -> method.getAnnotation(PostMapping.class))
                .filter(mapping -> mapping != null)
                .flatMap(mapping -> Arrays.stream(mapping.value()))
                .filter(path -> path.startsWith("/approvals/"))
                .sorted()
                .toList();

        assertEquals(List.of(
                "/approvals/{approvalId}/approve",
                "/approvals/{approvalId}/reject"), paths);
    }

    private GatewaySingleResponse singleResponse(String message) {
        return new GatewaySingleResponse(
                new Meta("agp-1", null, "ags-1", "run-1", true, message),
                Map.of("status", "completed"),
                List.of());
    }

    private void bindSubject() {
        when(subject.getPrincipal()).thenReturn("trusted-user");
        when(subject.getRoles()).thenReturn(List.of("admin"));
        when(subject.hasRole("admin")).thenReturn(true);
        when(subject.hasRole("user")).thenReturn(false);
        when(subject.hasRole("guest")).thenReturn(false);
        SurenessContextHolder.bindSubject(subject);
    }

    private WebUiController controller() {
        return new WebUiController(commandRouter, interactionInputService);
    }
}
