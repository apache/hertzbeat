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

package org.apache.hertzbeat.ai.schedule;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.dao.ChatMessageDao;
import org.apache.hertzbeat.ai.service.SopScheduleService;
import org.apache.hertzbeat.ai.sop.engine.SopEngine;
import org.apache.hertzbeat.ai.sop.model.SopResult;
import org.apache.hertzbeat.ai.sop.registry.SkillRegistry;
import org.apache.hertzbeat.ai.utils.SopMessageUtil;
import org.apache.hertzbeat.common.entity.ai.ChatMessage;
import org.apache.hertzbeat.common.entity.ai.SopSchedule;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled executor that checks for due SOP schedules and executes them.
 * Runs every minute to check if any schedules are due for execution.
 */
@Slf4j
@Component
@EnableScheduling
public class SopScheduleExecutor {

    /**
     * Role identifier for system push messages in conversations.
     */
    public static final String ROLE_SYSTEM_PUSH = "system_push";

    private final SopScheduleService sopScheduleService;
    private final SopEngine sopEngine;
    private final SkillRegistry skillRegistry;
    private final ChatMessageDao chatMessageDao;

    @Autowired
    public SopScheduleExecutor(SopScheduleService sopScheduleService,
                               @Lazy SopEngine sopEngine,
                               @Lazy SkillRegistry skillRegistry,
                               ChatMessageDao chatMessageDao) {
        this.sopScheduleService = sopScheduleService;
        this.sopEngine = sopEngine;
        this.skillRegistry = skillRegistry;
        this.chatMessageDao = chatMessageDao;
    }

    /**
     * Check for due schedules every minute and execute them.
     */
    @Scheduled(fixedRate = 60000) // Every minute
    public void checkAndExecuteDueSchedules() {
        try {
            List<SopSchedule> dueSchedules = sopScheduleService.getDueSchedules();
            
            if (dueSchedules.isEmpty()) {
                return;
            }
            
            log.info("Found {} due schedules to execute", dueSchedules.size());
            
            for (SopSchedule schedule : dueSchedules) {
                executeSchedule(schedule);
            }
        } catch (Exception e) {
            log.error("Error checking due schedules", e);
        }
    }

    /**
     * Execute a single scheduled SOP and push result to conversation.
     */
    private void executeSchedule(SopSchedule schedule) {
        log.info("Executing scheduled SOP {} for conversation {}", 
                schedule.getSopName(), schedule.getConversationId());
        
        try {
            // Check if skill exists
            var definition = skillRegistry.getSkill(schedule.getSopName());
            if (definition == null) {
                log.warn("Skill {} not found, skipping schedule {}", 
                        schedule.getSopName(), schedule.getId());
                return;
            }
            
            // Parse parameters
            Map<String, Object> params = new HashMap<>();
            if (schedule.getSopParams() != null && !schedule.getSopParams().isEmpty()) {
                try {
                    params = JsonUtil.fromJson(schedule.getSopParams(), Map.class);
                } catch (Exception e) {
                    log.warn("Failed to parse SOP params: {}", schedule.getSopParams());
                }
            }
            
            // Execute SOP
            SopResult result = sopEngine.executeSync(definition, params);
            
            // Create push message
            String messageContent = formatPushMessage(schedule, result);
            
            // Save message to conversation
            ChatMessage pushMessage = ChatMessage.builder()
                    .conversationId(schedule.getConversationId())
                    .role(ROLE_SYSTEM_PUSH)
                    .content(messageContent)
                    .build();
            
            chatMessageDao.save(pushMessage);
            
            log.info("Successfully pushed SOP result to conversation {}", 
                    schedule.getConversationId());
            
        } catch (Exception e) {
            log.error("Failed to execute scheduled SOP {} for conversation {}", 
                    schedule.getSopName(), schedule.getConversationId(), e);
            
            // Still save an error message
            String errorContent = SopMessageUtil.getMessage("schedule.push.error.prefix") + " " + schedule.getSopName() 
                    + "\n\n" + SopMessageUtil.getMessage("schedule.push.error.label") + " " + e.getMessage();
            ChatMessage errorMessage = ChatMessage.builder()
                    .conversationId(schedule.getConversationId())
                    .role(ROLE_SYSTEM_PUSH)
                    .content(errorContent)
                    .build();
            chatMessageDao.save(errorMessage);
            
        } finally {
            // Update schedule times
            sopScheduleService.updateAfterExecution(schedule.getId());
        }
    }

    /**
     * Format the push message content with SOP result.
     */
    private String formatPushMessage(SopSchedule schedule, SopResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append(SopMessageUtil.getMessage("schedule.push.report.title")).append("\n\n");
        sb.append(SopMessageUtil.getMessage("schedule.push.report.skill")).append(": ").append(schedule.getSopName()).append("\n");
        sb.append(SopMessageUtil.getMessage("schedule.push.report.time")).append(": ").append(LocalDateTime.now()).append("\n\n");
        sb.append("---\n\n");
        
        if ("SUCCESS".equals(result.getStatus())) {
            sb.append(result.getContent());
        } else {
            sb.append(SopMessageUtil.getMessage("schedule.push.report.failed")).append("\n\n");
            sb.append(result.getError());
        }
        
        return sb.toString();
    }
}
