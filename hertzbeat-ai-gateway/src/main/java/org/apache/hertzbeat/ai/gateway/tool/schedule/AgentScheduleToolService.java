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
import org.apache.hertzbeat.ai.gateway.schedule.AgentSchedule;
import org.apache.hertzbeat.ai.gateway.schedule.AgentScheduleExecutor;
import org.apache.hertzbeat.ai.gateway.schedule.AgentScheduleService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.springframework.data.domain.PageRequest;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

/**
 * Gateway scheduled command tools.
 */
@Service
public class AgentScheduleToolService {

    private final AgentScheduleService scheduleService;
    private final AgentScheduleExecutor scheduleExecutor;

    public AgentScheduleToolService(AgentScheduleService scheduleService,
                                    @Lazy AgentScheduleExecutor scheduleExecutor) {
        this.scheduleService = scheduleService;
        this.scheduleExecutor = scheduleExecutor;
    }

    @Tool(name = "schedule.create", description = "Create a system-level recurring Agent inspection.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentSchedule createSchedule(
            @ToolParam(description = "Schedule name.") String name,
            @ToolParam(description = "Inspection instruction to run at each scheduled time.") String instruction,
            @ToolParam(description = "Six-field Spring cron expression with seconds set to 0.")
            String cronExpression,
            @ToolParam(description = "Existing HertzBeat notice receiver IDs.") List<Long> receiverIds,
            @ToolParam(required = false, description = "Existing notice template ID; omit to use channel defaults.")
            Long templateId,
            @ToolParam(required = false, description = "Whether the schedule starts enabled.") Boolean enabled) {
        var request = AgentToolContextSupport.invocation().getRequest();
        return scheduleService.create(AgentSchedule.builder()
                .name(name)
                .instruction(instruction)
                .cronExpression(cronExpression)
                .enabled(enabled == null || enabled)
                .receiverIds(receiverIds)
                .templateId(templateId)
                .createdFromSessionUid(request.getSessionUid())
                .build());
    }

    @Tool(name = "schedule.list", description = "List system-level Agent schedules.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public List<AgentSchedule> listSchedules() {
        return scheduleService.list(PageRequest.of(0, 100)).getContent();
    }

    @Tool(name = "schedule.update", description = "Update an existing system-level Agent inspection.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentSchedule updateSchedule(
            @ToolParam(description = "Schedule id.") Long scheduleId,
            @ToolParam(description = "Schedule name.") String name,
            @ToolParam(description = "Inspection instruction to run at each scheduled time.") String instruction,
            @ToolParam(description = "Six-field Spring cron expression with seconds set to 0.")
            String cronExpression,
            @ToolParam(description = "Existing HertzBeat notice receiver IDs.") List<Long> receiverIds,
            @ToolParam(required = false, description = "Existing notice template ID; omit to use channel defaults.")
            Long templateId) {
        return scheduleService.update(scheduleId, AgentSchedule.builder()
                .name(name)
                .instruction(instruction)
                .cronExpression(cronExpression)
                .receiverIds(receiverIds)
                .templateId(templateId)
                .build());
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
        scheduleService.delete(scheduleId);
        return "Schedule deleted: " + scheduleId;
    }

    @Tool(name = "schedule.toggle", description = "Enable or disable a recurring diagnostic schedule.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentSchedule toggleSchedule(
            @ToolParam(description = "Schedule id.") Long scheduleId,
            @ToolParam(description = "Whether the schedule should be enabled.") boolean enabled) {
        return scheduleService.toggle(scheduleId, enabled);
    }

    @Tool(name = "schedule.run_now", description = "Run a system-level Agent schedule immediately.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentRun runNow(@ToolParam(description = "Schedule id.") Long scheduleId) {
        return scheduleExecutor.executeNow(scheduleId);
    }

}
