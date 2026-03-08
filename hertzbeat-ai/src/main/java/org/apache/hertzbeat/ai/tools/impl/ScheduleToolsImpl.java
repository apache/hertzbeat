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

package org.apache.hertzbeat.ai.tools.impl;

import java.time.format.DateTimeFormatter;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.service.SopScheduleService;
import org.apache.hertzbeat.ai.sop.registry.SkillRegistry;
import org.apache.hertzbeat.ai.utils.SopMessageUtil;
import org.apache.hertzbeat.ai.tools.ScheduleTools;
import org.apache.hertzbeat.common.entity.ai.SopSchedule;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

/**
 * Implementation of ScheduleTools for AI-driven schedule management.
 * Allows AI to create and manage scheduled tasks through natural language.
 * 
 * The conversationId is injected into the System Prompt so AI can pass it
 * when calling these tools.
 */
@Slf4j
@Service
public class ScheduleToolsImpl implements ScheduleTools {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final SopScheduleService scheduleService;
    private final SkillRegistry skillRegistry;

    @Autowired
    public ScheduleToolsImpl(@Lazy SopScheduleService scheduleService, 
                             @Lazy SkillRegistry skillRegistry) {
        this.scheduleService = scheduleService;
        this.skillRegistry = skillRegistry;
    }

    @Override
    @Tool(name = "createScheduleForConversation",
          description = "Create a scheduled task to automatically execute a skill at specified times. "
                  + "IMPORTANT: You must pass the conversationId from the system context (shown as 'Current Conversation ID' in the prompt). "
                  + "The cron expression should be in 6-digit Spring format: 'seconds minutes hours dayOfMonth month dayOfWeek'. "
                  + "Common examples: '0 0 9 * * ?' (daily at 9:00), '0 30 8 * * MON-FRI' (weekdays at 8:30).")
    public String createSchedule(
            @ToolParam(description = "Name of the skill to schedule (e.g., 'daily_inspection', 'mysql_slow_query_diagnosis')", 
                       required = true) String skillName,
            @ToolParam(description = "Cron expression in 6-digit Spring format. Examples: '0 0 9 * * ?' for daily 9am", 
                       required = true) String cronExpression,
            @ToolParam(description = "Human-readable description of what this schedule does", 
                       required = false) String description) {
        // This method signature is kept for interface compatibility
        // AI should use createScheduleWithConversation instead
        return SopMessageUtil.getMessage("schedule.error.use.with.conversation");
    }

    /**
     * Create schedule with explicit conversationId - the primary method AI should call.
     */
    @Tool(name = "createScheduleWithConversation",
          description = "Create a scheduled task for a specific conversation. "
                  + "Use the conversationId from the system context. "
                  + "The cron expression should be in 6-digit Spring format.")
    public String createScheduleWithConversation(
            @ToolParam(description = "Conversation ID from the system context", required = true) Long conversationId,
            @ToolParam(description = "Name of the skill to schedule (e.g., 'daily_inspection')", required = true) String skillName,
            @ToolParam(description = "Cron expression in Spring format (e.g., '0 0 9 * * ?')", required = true) String cronExpression,
            @ToolParam(description = "Description of the schedule", required = false) String description) {

        log.info("AI creating schedule: conversationId={}, skill={}, cron={}, desc={}", 
                 conversationId, skillName, cronExpression, description);

        // Validate skill exists
        if (skillRegistry.getSkill(skillName) == null) {
            String available = String.join(", ", 
                    skillRegistry.getAllSkills().stream()
                            .map(s -> s.getName())
                            .toList());
            return SopMessageUtil.getMessage("schedule.error.skill.not.found", 
                    new Object[]{skillName, available}, null);
        }

        if (conversationId == null || conversationId <= 0) {
            return SopMessageUtil.getMessage("schedule.error.invalid.conversation");
        }

        try {
            // Check for duplicate schedule (same skill + cron expression)
            List<SopSchedule> existing = scheduleService.getSchedulesByConversation(conversationId);
            boolean duplicate = existing.stream()
                    .anyMatch(s -> s.getSopName().equals(skillName) 
                                && s.getCronExpression().equals(cronExpression));
            if (duplicate) {
                return SopMessageUtil.getMessage("schedule.create.duplicate", 
                        new Object[]{skillName, cronExpression}, null)
                        + "\n\n" + SopMessageUtil.getMessage("schedule.create.duplicate.hint");
            }

            SopSchedule schedule = new SopSchedule();
            schedule.setConversationId(conversationId);
            schedule.setSopName(skillName);
            schedule.setCronExpression(cronExpression);
            schedule.setEnabled(true);

            SopSchedule created = scheduleService.createSchedule(schedule);

            StringBuilder response = new StringBuilder();
            response.append(SopMessageUtil.getMessage("schedule.create.success")).append("\n\n");
            response.append("**").append(SopMessageUtil.getMessage("schedule.detail.title")).append("**:\n");
            response.append("- **").append(SopMessageUtil.getMessage("schedule.detail.skill")).append("**: ").append(skillName).append("\n");
            response.append("- **").append(SopMessageUtil.getMessage("schedule.detail.cron")).append("**: ").append(cronExpression).append("\n");
            response.append("- **").append(SopMessageUtil.getMessage("schedule.detail.id")).append("**: ").append(created.getId()).append("\n");
            response.append("- **").append(SopMessageUtil.getMessage("schedule.detail.status")).append("**: ").append(SopMessageUtil.getMessage("schedule.detail.enabled")).append("\n");
            
            if (created.getNextRunTime() != null) {
                response.append("- **").append(SopMessageUtil.getMessage("schedule.detail.next.run")).append("**: ").append(created.getNextRunTime().format(TIME_FORMATTER)).append("\n");
            }

            if (description != null && !description.isEmpty()) {
                response.append("- **").append(SopMessageUtil.getMessage("schedule.detail.description")).append("**: ").append(description).append("\n");
            }

            response.append("\n").append(SopMessageUtil.getMessage("schedule.create.effective"));

            return response.toString();

        } catch (IllegalArgumentException e) {
            return SopMessageUtil.getMessage("schedule.error.create.failed") + ": " + e.getMessage();
        } catch (Exception e) {
            log.error("Failed to create schedule", e);
            return SopMessageUtil.getMessage("schedule.error.create.failed") + ": " + e.getMessage();
        }
    }

    @Override
    @Tool(name = "listSchedulesForConversation",
          description = "List all scheduled tasks for a specific conversation. "
                  + "Use the conversationId from the system context.")
    public String listSchedules() {
        // This method signature is kept for interface compatibility
        return SopMessageUtil.getMessage("schedule.error.use.with.conversation");
    }

    @Tool(name = "listSchedulesWithConversation",
          description = "List all scheduled tasks for a specific conversation.")
    public String listSchedulesWithConversation(
            @ToolParam(description = "Conversation ID from the system context", required = true) Long conversationId) {
        
        log.info("AI listing schedules for conversation: {}", conversationId);

        if (conversationId == null || conversationId <= 0) {
            return SopMessageUtil.getMessage("schedule.error.invalid.conversation");
        }

        try {
            List<SopSchedule> schedules = scheduleService.getSchedulesByConversation(conversationId);

            if (schedules.isEmpty()) {
                return SopMessageUtil.getMessage("schedule.list.empty") + "\n\n" 
                        + SopMessageUtil.getMessage("schedule.list.hint");
            }

            StringBuilder sb = new StringBuilder();
            sb.append("**").append(SopMessageUtil.getMessage("schedule.list.title")).append("** (")
              .append(SopMessageUtil.getMessage("schedule.list.count", new Object[]{schedules.size()}, null))
              .append("):\n\n");

            for (SopSchedule schedule : schedules) {
                String statusLabel = schedule.getEnabled() 
                        ? SopMessageUtil.getMessage("schedule.detail.enabled")
                        : SopMessageUtil.getMessage("schedule.detail.disabled");
                
                sb.append("### ").append(schedule.getId()).append(". ").append(schedule.getSopName());
                sb.append(" (").append(statusLabel).append(")\n");
                sb.append("- **").append(SopMessageUtil.getMessage("schedule.detail.cron")).append("**: `").append(schedule.getCronExpression()).append("`\n");
                sb.append("- **").append(SopMessageUtil.getMessage("schedule.detail.status")).append("**: ").append(statusLabel).append("\n");
                
                if (schedule.getLastRunTime() != null) {
                    sb.append("- **").append(SopMessageUtil.getMessage("schedule.detail.last.run")).append("**: ").append(schedule.getLastRunTime().format(TIME_FORMATTER)).append("\n");
                }
                if (schedule.getNextRunTime() != null) {
                    sb.append("- **").append(SopMessageUtil.getMessage("schedule.detail.next.run")).append("**: ").append(schedule.getNextRunTime().format(TIME_FORMATTER)).append("\n");
                }
                sb.append("\n");
            }

            return sb.toString();

        } catch (Exception e) {
            log.error("Failed to list schedules", e);
            return "Error: " + e.getMessage();
        }
    }

    @Override
    @Tool(name = "deleteSchedule",
          description = "Delete a scheduled task by its ID. Use listSchedulesForConversation first to find the task ID.")
    public String deleteSchedule(
            @ToolParam(description = "ID of the schedule to delete", required = true) Long scheduleId) {

        log.info("AI deleting schedule: {}", scheduleId);

        try {
            SopSchedule schedule = scheduleService.getSchedule(scheduleId);
            if (schedule == null) {
                return SopMessageUtil.getMessage("schedule.error.not.found", new Object[]{scheduleId}, null);
            }

            String skillName = schedule.getSopName();
            scheduleService.deleteSchedule(scheduleId);

            return SopMessageUtil.getMessage("schedule.delete.success", new Object[]{scheduleId, skillName}, null);

        } catch (Exception e) {
            log.error("Failed to delete schedule {}", scheduleId, e);
            return "Error: " + e.getMessage();
        }
    }

    @Override
    @Tool(name = "toggleSchedule",
          description = "Enable or disable a scheduled task. Use listSchedulesForConversation first to find the task ID.")
    public String toggleSchedule(
            @ToolParam(description = "ID of the schedule to toggle", required = true) Long scheduleId,
            @ToolParam(description = "true to enable, false to disable", required = true) boolean enabled) {

        log.info("AI toggling schedule {} to enabled={}", scheduleId, enabled);

        try {
            SopSchedule schedule = scheduleService.getSchedule(scheduleId);
            if (schedule == null) {
                return SopMessageUtil.getMessage("schedule.error.not.found", new Object[]{scheduleId}, null);
            }

            SopSchedule updated = scheduleService.toggleSchedule(scheduleId, enabled);

            String messageKey = enabled ? "schedule.toggle.enabled" : "schedule.toggle.disabled";
            String statusLabel = enabled 
                    ? SopMessageUtil.getMessage("schedule.detail.enabled")
                    : SopMessageUtil.getMessage("schedule.detail.disabled");
            
            return SopMessageUtil.getMessage(messageKey, new Object[]{scheduleId, updated.getSopName()}, null)
                    + "\n\n" + SopMessageUtil.getMessage("schedule.toggle.status") + ": " + statusLabel;

        } catch (Exception e) {
            log.error("Failed to toggle schedule {}", scheduleId, e);
            return "Error: " + e.getMessage();
        }
    }
}
