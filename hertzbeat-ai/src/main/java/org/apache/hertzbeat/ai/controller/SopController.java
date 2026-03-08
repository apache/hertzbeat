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
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.sop.engine.SopEngine;
import org.apache.hertzbeat.ai.sop.model.SopDefinition;
import org.apache.hertzbeat.ai.sop.model.SopResult;
import org.apache.hertzbeat.ai.sop.registry.SkillRegistry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

/**
 * Controller for AI SOP (Standard Operating Procedure) execution.
 */
@Slf4j
@RestController
@RequestMapping("/api/ai/sop")
@Tag(name = "AI SOP", description = "AI Standard Operating Procedure Management")
public class SopController {

    private final SkillRegistry skillRegistry;
    private final SopEngine sopEngine;

    @Autowired
    public SopController(SkillRegistry skillRegistry, SopEngine sopEngine) {
        this.skillRegistry = skillRegistry;
        this.sopEngine = sopEngine;
    }

    /**
     * List all available SOP skills.
     */
    @GetMapping("/skills")
    @Operation(summary = "List available SOP skills", 
               description = "Get all registered SOP skill definitions")
    public ResponseEntity<List<Map<String, String>>> listSkills() {
        List<Map<String, String>> skills = skillRegistry.getAllSkills().stream()
                .map(skill -> {
                    Map<String, String> info = new HashMap<>();
                    info.put("name", skill.getName());
                    info.put("description", skill.getDescription());
                    info.put("version", skill.getVersion());
                    return info;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(skills);
    }

    /**
     * Get details of a specific SOP skill.
     */
    @GetMapping("/skills/{skillName}")
    @Operation(summary = "Get SOP skill details", 
               description = "Get detailed definition of a specific SOP skill")
    public ResponseEntity<SopDefinition> getSkillDetails(
            @Parameter(description = "Name of the SOP skill") 
            @PathVariable String skillName) {
        SopDefinition skill = skillRegistry.getSkill(skillName);
        if (skill == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(skill);
    }

    /**
     * Execute a SOP skill with streaming output (SSE mode).
     * Use this for real-time progress updates in UI.
     */
    @PostMapping(value = "/execute/{skillName}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Execute SOP skill (streaming)", 
               description = "Execute a SOP skill with streaming output for real-time progress")
    public Flux<String> executeSopStream(
            @Parameter(description = "Name of the SOP skill to execute") 
            @PathVariable String skillName,
            @Parameter(description = "Input parameters for the SOP") 
            @RequestBody(required = false) Map<String, Object> params) {
        
        log.info("Executing SOP skill (stream): {} with params: {}", skillName, params);
        
        SopDefinition skill = skillRegistry.getSkill(skillName);
        if (skill == null) {
            return Flux.just("Error: SOP skill not found: " + skillName);
        }
        
        Map<String, Object> inputParams = params != null ? params : new HashMap<>();
        
        return sopEngine.execute(skill, inputParams)
                .doOnNext(msg -> log.debug("SOP output: {}", msg))
                .doOnError(e -> log.error("SOP execution error: {}", e.getMessage()))
                .doOnComplete(() -> log.info("SOP {} execution completed", skillName));
    }
    
    /**
     * Execute a SOP skill synchronously and return unified result.
     * Use this for AI tool calls and programmatic access.
     */
    @PostMapping(value = "/execute/{skillName}/sync", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Execute SOP skill (sync)", 
               description = "Execute a SOP skill synchronously and return unified result")
    public ResponseEntity<SopResult> executeSopSync(
            @Parameter(description = "Name of the SOP skill to execute") 
            @PathVariable String skillName,
            @Parameter(description = "Input parameters for the SOP") 
            @RequestBody(required = false) Map<String, Object> params) {
        
        log.info("Executing SOP skill (sync): {} with params: {}", skillName, params);
        
        SopDefinition skill = skillRegistry.getSkill(skillName);
        if (skill == null) {
            SopResult errorResult = SopResult.builder()
                    .sopName(skillName)
                    .status("FAILED")
                    .error("SOP skill not found: " + skillName)
                    .build();
            return ResponseEntity.notFound().build();
        }
        
        Map<String, Object> inputParams = params != null ? params : new HashMap<>();
        
        SopResult result = sopEngine.executeSync(skill, inputParams);
        return ResponseEntity.ok(result);
    }
    
    /**
     * Execute a SOP skill and return AI-friendly text response.
     * Use this when SOP is called as a tool by AI.
     */
    @PostMapping(value = "/execute/{skillName}/ai", produces = MediaType.TEXT_PLAIN_VALUE)
    @Operation(summary = "Execute SOP skill (AI format)", 
               description = "Execute a SOP and return AI-friendly text response")
    public ResponseEntity<String> executeSopForAi(
            @Parameter(description = "Name of the SOP skill to execute") 
            @PathVariable String skillName,
            @Parameter(description = "Input parameters for the SOP") 
            @RequestBody(required = false) Map<String, Object> params) {
        
        log.info("Executing SOP skill (AI): {} with params: {}", skillName, params);
        
        SopDefinition skill = skillRegistry.getSkill(skillName);
        if (skill == null) {
            return ResponseEntity.ok("Error: SOP skill not found: " + skillName);
        }
        
        Map<String, Object> inputParams = params != null ? params : new HashMap<>();
        
        SopResult result = sopEngine.executeSync(skill, inputParams);
        return ResponseEntity.ok(result.toAiResponse());
    }
}
