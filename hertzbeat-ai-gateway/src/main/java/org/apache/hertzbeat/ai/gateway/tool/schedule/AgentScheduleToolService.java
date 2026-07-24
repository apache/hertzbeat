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

package org.apache.hertzbeat.ai.gateway.tool.schedule;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.schedule.AgentScheduledCommand;
import org.apache.hertzbeat.ai.gateway.schedule.AgentScheduledCommandService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/**
 * Gateway scheduled command tools.
 */
@Service
public class AgentScheduleToolService {

    private final AgentScheduledCommandService commandService;
    private final AgentSessionService sessionService;

    public AgentScheduleToolService(AgentScheduledCommandService commandService,
                                    AgentSessionService sessionService) {
        this.commandService = commandService;
        this.sessionService = sessionService;
    }

    @Tool(name = "schedule.create", description = "Schedule a recurring user request in the current Agent session.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentScheduledCommand createSchedule(
            @ToolParam(description = "User request to run at each scheduled time.") String message,
            @ToolParam(description = "Six-field Spring cron expression.") String cronExpression,
            @ToolParam(required = false, description = "Whether the schedule starts enabled.") Boolean enabled) {
        var request = AgentToolContextSupport.invocation().getRequest();
        AgentSession session = sessionService.findSession(request.getSessionUid())
                .orElseThrow(() -> new IllegalStateException("Current Agent session was not found"));
        return commandService.create(AgentScheduledCommand.builder()
                .sessionId(session.getId())
                .channel(session.getChannel())
                .conversationId(session.getConversationId())
                .actorType(request.getActor().getType())
                .actorId(request.getActor().getId())
                .actorRoles(ActorSupport.rolesJson(request.getActor()))
                .message(message)
                .cronExpression(cronExpression)
                .enabled(enabled == null || enabled)
                .build());
    }

    @Tool(name = "schedule.list", description = "List recurring Gateway commands for the current session.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public List<AgentScheduledCommand> listSchedules() {
        return commandService.findSessionCommands(AgentToolContextSupport.invocation().getRequest().getRunSessionId());
    }

    @Tool(name = "schedule.delete", description = "Delete a recurring diagnostic schedule.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public String deleteSchedule(
            @ToolParam(description = "Schedule id.") Long scheduleId,
            @ToolParam(description = "Operator-provided deletion reason recorded with the tool invocation.")
            String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("reason is required for schedule.delete");
        }
        commandService.delete(scheduleId, AgentToolContextSupport.invocation().getRequest().getRunSessionId());
        return "Schedule deleted: " + scheduleId;
    }

    @Tool(name = "schedule.toggle", description = "Enable or disable a recurring diagnostic schedule.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentScheduledCommand toggleSchedule(
            @ToolParam(description = "Schedule id.") Long scheduleId,
            @ToolParam(description = "Whether the schedule should be enabled.") boolean enabled) {
        return commandService.toggle(scheduleId,
                AgentToolContextSupport.invocation().getRequest().getRunSessionId(), enabled);
    }
}
