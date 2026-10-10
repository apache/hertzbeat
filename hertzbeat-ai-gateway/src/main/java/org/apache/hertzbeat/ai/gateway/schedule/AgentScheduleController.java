/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.ai.gateway.schedule;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * System-level Agent schedule API.
 */
@Tag(name = "Agent Schedule API")
@RestController
@RequestMapping("/api/agent/schedules")
public class AgentScheduleController {

    private final AgentScheduleService scheduleService;
    private final AgentScheduleExecutor scheduleExecutor;
    private final AgentSessionService sessionService;

    public AgentScheduleController(AgentScheduleService scheduleService,
                                   AgentScheduleExecutor scheduleExecutor,
                                   AgentSessionService sessionService) {
        this.scheduleService = scheduleService;
        this.scheduleExecutor = scheduleExecutor;
        this.sessionService = sessionService;
    }

    @PostMapping
    @Operation(summary = "Create an Agent schedule")
    public ResponseEntity<Message<AgentSchedule>> create(@RequestBody ScheduleRequest request) {
        return ResponseEntity.ok(Message.success(scheduleService.create(request.toEntity())));
    }

    @PutMapping("/{scheduleId}")
    @Operation(summary = "Update an Agent schedule")
    public ResponseEntity<Message<AgentSchedule>> update(@PathVariable Long scheduleId,
                                                          @RequestBody ScheduleRequest request) {
        return ResponseEntity.ok(Message.success(scheduleService.update(scheduleId, request.toEntity())));
    }

    @GetMapping
    @Operation(summary = "List Agent schedules")
    public ResponseEntity<Message<Page<AgentSchedule>>> list(
            @RequestParam(defaultValue = "0") int pageIndex,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ResponseEntity.ok(Message.success(
                scheduleService.list(PageRequest.of(pageIndex, pageSize))));
    }

    @GetMapping("/{scheduleId}")
    @Operation(summary = "Get an Agent schedule")
    public ResponseEntity<Message<AgentSchedule>> get(@PathVariable Long scheduleId) {
        return ResponseEntity.ok(Message.success(scheduleService.get(scheduleId)));
    }

    @DeleteMapping("/{scheduleId}")
    @Operation(summary = "Delete an Agent schedule")
    public ResponseEntity<Message<Void>> delete(@PathVariable Long scheduleId) {
        scheduleService.delete(scheduleId);
        return ResponseEntity.ok(Message.success("Agent schedule deleted"));
    }

    @PatchMapping("/{scheduleId}/enabled")
    @Operation(summary = "Enable or disable an Agent schedule")
    public ResponseEntity<Message<AgentSchedule>> toggle(@PathVariable Long scheduleId,
                                                          @RequestParam boolean enabled) {
        return ResponseEntity.ok(Message.success(scheduleService.toggle(scheduleId, enabled)));
    }

    @PostMapping("/{scheduleId}/run")
    @Operation(summary = "Run an Agent schedule immediately")
    public ResponseEntity<Message<AgentRun>> runNow(@PathVariable Long scheduleId) {
        return ResponseEntity.ok(Message.success(scheduleExecutor.executeNow(scheduleId)));
    }

    @GetMapping("/{scheduleId}/transcript")
    @Operation(summary = "List the fixed Agent session transcript for a schedule")
    public ResponseEntity<Message<Page<AgentTranscriptEntry>>> transcript(
            @PathVariable Long scheduleId,
            @RequestParam(defaultValue = "0") int pageIndex,
            @RequestParam(defaultValue = "20") int pageSize) {
        AgentSchedule schedule = scheduleService.get(scheduleId);
        PageRequest pageable = PageRequest.of(pageIndex, pageSize);
        Page<AgentTranscriptEntry> transcript = schedule.getSessionId() == null
                ? Page.empty(pageable)
                : sessionService.findConversationTranscriptEntries(schedule.getSessionId(), pageable);
        return ResponseEntity.ok(Message.success(transcript));
    }

    /**
     * Create and update boundary for schedule-owned fields.
     */
    public record ScheduleRequest(
            String name,
            String instruction,
            String cronExpression,
            Boolean enabled,
            List<Long> receiverIds,
            Long templateId) {

        AgentSchedule toEntity() {
            return AgentSchedule.builder()
                    .name(name)
                    .instruction(instruction)
                    .cronExpression(cronExpression)
                    .enabled(enabled == null || enabled)
                    .receiverIds(receiverIds)
                    .templateId(templateId)
                    .build();
        }
    }
}
