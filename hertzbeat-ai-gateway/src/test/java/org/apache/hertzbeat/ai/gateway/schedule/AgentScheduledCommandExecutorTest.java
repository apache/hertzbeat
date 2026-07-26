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

package org.apache.hertzbeat.ai.gateway.schedule;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommandRouter;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link AgentScheduledCommandExecutor}.
 */
@ExtendWith(MockitoExtension.class)
class AgentScheduledCommandExecutorTest {

    @Mock
    private AgentScheduledCommandService commandService;

    @Mock
    private GatewayCommandRouter commandRouter;

    @Test
    void shouldRouteDueCommandThroughGatewayRuntime() {
        AgentScheduledCommand command = AgentScheduledCommand.builder()
                .id(7L)
                .channel("webui")
                .conversationId("scheduled-conversation")
                .actorType("user")
                .actorId("admin")
                .actorRoles("[\"admin\"]")
                .message("Inspect all unhealthy monitors")
                .enabled(true)
                .build();
        when(commandService.findDueCommands()).thenReturn(List.of(command));

        new AgentScheduledCommandExecutor(commandService, commandRouter).executeDueCommands();

        ArgumentCaptor<InvokeCommand> captor = ArgumentCaptor.forClass(InvokeCommand.class);
        verify(commandRouter).handle(captor.capture());
        InvokeCommand invoke = captor.getValue();
        assertEquals(AgentRuntimeEntryType.SCHEDULE_TRIGGER, invoke.entryType());
        assertEquals("scheduled-conversation", invoke.userInput().getConversationId());
        assertEquals("Inspect all unhealthy monitors", invoke.userInput().getMessage().getText());
        assertEquals("admin", invoke.envelope().getActor().getId());
        assertEquals(org.apache.hertzbeat.ai.gateway.contract.AgentResponseLanguage.systemDefault(),
                invoke.envelope().getPreferredLanguage());
        verify(commandService).completeExecution(command);
    }
}
