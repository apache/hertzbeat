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

package org.apache.hertzbeat.ai.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.apache.hertzbeat.ai.service.SopScheduleService;
import org.apache.hertzbeat.common.entity.ai.SopSchedule;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for managing scheduled SOP executions.
 */
@Tag(name = "SOP Schedule API", description = "Manage scheduled SOP executions")
@RestController
@RequestMapping("/api/ai/schedule")
public class SopScheduleController {

    private final SopScheduleService sopScheduleService;
    private final org.apache.hertzbeat.ai.sop.registry.SkillRegistry skillRegistry;

    @Autowired
    public SopScheduleController(SopScheduleService sopScheduleService,
                                  org.apache.hertzbeat.ai.sop.registry.SkillRegistry skillRegistry) {
        this.sopScheduleService = sopScheduleService;
        this.skillRegistry = skillRegistry;
    }

    @Operation(summary = "Get all available SOP skills")
    @GetMapping("/skills")
    public ResponseEntity<Message<List<java.util.Map<String, String>>>> getAvailableSkills() {
        List<java.util.Map<String, String>> skills = new java.util.ArrayList<>();
        for (var skill : skillRegistry.getAllSkills()) {
            java.util.Map<String, String> skillInfo = new java.util.HashMap<>();
            skillInfo.put("name", skill.getName());
            skillInfo.put("description", skill.getDescription());
            skills.add(skillInfo);
        }
        return ResponseEntity.ok(Message.success(skills));
    }

    @Operation(summary = "Get all schedules for a conversation")
    @GetMapping("/conversation/{conversationId}")
    public ResponseEntity<Message<List<SopSchedule>>> getSchedulesByConversation(
            @PathVariable Long conversationId) {
        List<SopSchedule> schedules = sopScheduleService.getSchedulesByConversation(conversationId);
        return ResponseEntity.ok(Message.success(schedules));
    }

    @Operation(summary = "Get a schedule by ID")
    @GetMapping("/{id}")
    public ResponseEntity<Message<SopSchedule>> getSchedule(@PathVariable Long id) {
        SopSchedule schedule = sopScheduleService.getSchedule(id);
        if (schedule == null) {
            return ResponseEntity.ok(Message.fail((byte) 404, "Schedule not found"));
        }
        return ResponseEntity.ok(Message.success(schedule));
    }

    @Operation(summary = "Create a new scheduled SOP task")
    @PostMapping
    public ResponseEntity<Message<SopSchedule>> createSchedule(@RequestBody SopSchedule schedule) {
        try {
            SopSchedule created = sopScheduleService.createSchedule(schedule);
            return ResponseEntity.ok(Message.success(created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Message.fail((byte) 400, e.getMessage()));
        }
    }

    @Operation(summary = "Update an existing schedule")
    @PutMapping("/{id}")
    public ResponseEntity<Message<SopSchedule>> updateSchedule(
            @PathVariable Long id, 
            @RequestBody SopSchedule schedule) {
        try {
            schedule.setId(id);
            SopSchedule updated = sopScheduleService.updateSchedule(schedule);
            return ResponseEntity.ok(Message.success(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Message.fail((byte) 400, e.getMessage()));
        }
    }

    @Operation(summary = "Delete a schedule")
    @DeleteMapping("/{id}")
    public ResponseEntity<Message<Void>> deleteSchedule(@PathVariable Long id) {
        sopScheduleService.deleteSchedule(id);
        return ResponseEntity.ok(Message.success());
    }

    @Operation(summary = "Toggle schedule enabled status")
    @PutMapping("/{id}/toggle")
    public ResponseEntity<Message<SopSchedule>> toggleSchedule(
            @PathVariable Long id,
            @RequestParam boolean enabled) {
        try {
            SopSchedule updated = sopScheduleService.toggleSchedule(id, enabled);
            return ResponseEntity.ok(Message.success(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Message.fail((byte) 400, e.getMessage()));
        }
    }
}
