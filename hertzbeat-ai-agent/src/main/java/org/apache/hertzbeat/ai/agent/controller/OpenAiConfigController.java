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

package org.apache.hertzbeat.ai.agent.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.agent.pojo.dto.OpenAiConfigDto;
import org.apache.hertzbeat.ai.agent.service.OpenAiConfigService;
import org.springframework.http.ResponseEntity;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * OpenAI Configuration API
 */
@RestController
@RequestMapping(value = "/api/ai-agent/config", produces = {APPLICATION_JSON_VALUE})
@Tag(name = "OpenAI Configuration API")
@Slf4j
public class OpenAiConfigController {

    private final OpenAiConfigService openAiConfigService;

    public OpenAiConfigController(OpenAiConfigService openAiConfigService) {
        this.openAiConfigService = openAiConfigService;
    }

    @PostMapping("/openai")
    @Operation(summary = "Save OpenAI configuration", description = "Save or update OpenAI configuration")
    public ResponseEntity<Map<String, Object>> saveOpenAiConfig(@Valid @RequestBody OpenAiConfigDto config) {
        try {
            Map<String, Object> response = new HashMap<>();
            
            // Validate API key if enabled
            if (config.isEnable() && config.getApiKey() != null && !config.getApiKey().trim().isEmpty()) {
                OpenAiConfigService.ValidationResult validationResult = openAiConfigService.validateApiKey(config.getApiKey());
                
                if (!validationResult.isValid()) {
                    log.warn("API key validation failed during save: {}", validationResult.getMessage());
                    response.put("code", 1);
                    response.put("msg", "API key validation failed: " + validationResult.getMessage());
                    return ResponseEntity.ok(response);
                }
                log.info("API key validation successful during save");
            }
            
            // Save the configuration
            openAiConfigService.saveConfig(config);
            
            response.put("code", 0);
            response.put("msg", "OpenAI configuration saved successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to save OpenAI configuration", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 1);
            response.put("msg", "Failed to save configuration: " + e.getMessage());
            
            return ResponseEntity.ok(response);
        }
    }

    @GetMapping("/openai")
    @Operation(summary = "Get OpenAI configuration", description = "Get current OpenAI configuration")
    public ResponseEntity<Map<String, Object>> getOpenAiConfig() {
        try {
            OpenAiConfigDto config = openAiConfigService.getConfig();
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 0);
            response.put("data", config);
            response.put("msg", "Success");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to get OpenAI configuration", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 1);
            response.put("msg", "Failed to get configuration: " + e.getMessage());
            
            return ResponseEntity.ok(response);
        }
    }

    @GetMapping("/openai/status")
    @Operation(summary = "Check OpenAI configuration status", description = "Check if OpenAI is properly configured")
    public ResponseEntity<Map<String, Object>> getOpenAiConfigStatus() {
        try {
            boolean configured = openAiConfigService.isConfigured();
            OpenAiConfigDto effectiveConfig = openAiConfigService.getEffectiveConfig();
            boolean hasDbConfig = openAiConfigService.getConfig() != null;
            boolean hasYamlConfig = effectiveConfig != null && !hasDbConfig;
            
            // Validate the effective configuration
            boolean validationPassed = false;
            String validationMessage = "No configuration found";
            
            if (effectiveConfig != null && effectiveConfig.isEnable() && effectiveConfig.getApiKey() != null && !effectiveConfig.getApiKey().trim().isEmpty()) {
                OpenAiConfigService.ValidationResult validationResult = openAiConfigService.validateApiKey(effectiveConfig.getApiKey());
                validationPassed = validationResult.isValid();
                validationMessage = validationResult.getMessage();
                
                if (!validationPassed) {
                    log.warn("OpenAI API key validation failed during status check: {}", validationMessage);
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 0);
            response.put("data", Map.of(
                "configured", configured && validationPassed,
                "hasDbConfig", hasDbConfig,
                "hasYamlConfig", hasYamlConfig,
                "validationPassed", validationPassed,
                "validationMessage", validationMessage
            ));
            response.put("msg", "Success");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to get OpenAI configuration status", e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 1);
            response.put("msg", "Failed to get status: " + e.getMessage());
            
            return ResponseEntity.ok(response);
        }
    }

}