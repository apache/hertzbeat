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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.CancelRunCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunStatus;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeControlRegistry;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link RunCommandService}.
 */
@ExtendWith(MockitoExtension.class)
class RunCommandServiceTest {

    @Mock
    private AgentRunService runService;

    @Mock
    private AgentSessionService sessionService;

    @Mock
    private AgentRuntimeControlRegistry controlRegistry;

    @Test
    void shouldCancelRunningRunOwnedByActor() {
        AgentActor actor = actor("alice");
        stubRunningRun(actor);
        when(controlRegistry.cancel("run-1", "Stopped by user.")).thenReturn(true);

        GatewaySingleResponse response = (GatewaySingleResponse) service().cancel(command(actor));

        assertTrue(response.events().isEmpty());
        verify(controlRegistry).cancel("run-1", "Stopped by user.");
    }

    @Test
    void shouldHideRunFromDifferentActor() {
        stubRunningRun(actor("alice"));

        GatewaySingleResponse response = (GatewaySingleResponse) service().cancel(command(actor("bob")));

        assertEquals(1, response.events().size());
        assertEquals("Agent run not found.",
                ((GatewayEvent.ErrorPayload) response.events().get(0).payload()).errorMessage());
        verifyNoInteractions(controlRegistry);
    }

    private void stubRunningRun(AgentActor owner) {
        AgentRun run = AgentRun.builder()
                .id(2L)
                .runUid("run-1")
                .sessionId(1L)
                .status(AgentRunStatus.RUNNING.name())
                .build();
        AgentSession session = AgentSession.builder()
                .id(1L)
                .sessionUid("ags-1")
                .actorType(owner.getType())
                .actorId(owner.getId())
                .build();
        when(runService.findRun("run-1")).thenReturn(Optional.of(run));
        when(sessionService.findSession("1")).thenReturn(Optional.of(session));
    }

    private CancelRunCommand command(AgentActor actor) {
        return CancelRunCommand.builder()
                .envelope(GatewayEnvelope.builder()
                        .channelId("web-ui")
                        .receivedAt(1L)
                        .actor(actor)
                        .build())
                .replyMode(ReplyMode.FINAL_ONLY)
                .commandId("stop-run:run-1")
                .runUid("run-1")
                .reason("Stopped by user.")
                .build();
    }

    private AgentActor actor(String id) {
        return AgentActor.builder()
                .type("user")
                .id(id)
                .roles(List.of("user"))
                .build();
    }

    private RunCommandService service() {
        return new RunCommandService(runService, sessionService, controlRegistry);
    }
}
