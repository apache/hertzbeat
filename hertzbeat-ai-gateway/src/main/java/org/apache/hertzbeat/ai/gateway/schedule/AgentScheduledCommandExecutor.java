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

import java.util.List;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.type.TypeReference;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommandRouter;
import org.apache.hertzbeat.ai.gateway.contract.AgentResponseLanguage;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Routes due scheduled commands through the standard Gateway command path.
 */
@Slf4j
@Component
public class AgentScheduledCommandExecutor {

    private final AgentScheduledCommandService commandService;
    private final GatewayCommandRouter commandRouter;

    public AgentScheduledCommandExecutor(AgentScheduledCommandService commandService,
                                         GatewayCommandRouter commandRouter) {
        this.commandService = commandService;
        this.commandRouter = commandRouter;
    }

    @Scheduled(fixedDelay = 60_000L)
    public void executeDueCommands() {
        for (AgentScheduledCommand scheduled : commandService.findDueCommands()) {
            try {
                commandRouter.handle(command(scheduled));
            } catch (RuntimeException exception) {
                log.error("Scheduled Gateway command {} failed", scheduled.getId(), exception);
            } finally {
                commandService.completeExecution(scheduled);
            }
        }
    }

    private InvokeCommand command(AgentScheduledCommand scheduled) {
        List<String> roles = JsonUtil.fromJson(scheduled.getActorRoles(), new TypeReference<List<String>>() { });
        long now = System.currentTimeMillis();
        String commandId = "scheduled_" + scheduled.getId() + "_" + now;
        return InvokeCommand.builder()
                .envelope(GatewayEnvelope.builder()
                        .channelId(scheduled.getChannel())
                        .receivedAt(now)
                        .preferredLanguage(AgentResponseLanguage.systemDefault())
                        .actor(AgentActor.builder()
                                .type(scheduled.getActorType())
                                .id(scheduled.getActorId())
                                .roles(roles)
                                .build())
                        .build())
                .replyMode(ReplyMode.FINAL_ONLY)
                .commandId(commandId)
                .entryType(AgentRuntimeEntryType.SCHEDULE_TRIGGER)
                .userInput(UserInput.builder()
                        .messageId(commandId)
                        .conversationId(scheduled.getConversationId())
                        .message(UserInput.Message.builder().text(scheduled.getMessage()).build())
                        .build())
                .build();
    }
}
