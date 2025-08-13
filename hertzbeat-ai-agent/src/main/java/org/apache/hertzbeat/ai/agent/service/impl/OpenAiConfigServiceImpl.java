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

package org.apache.hertzbeat.ai.agent.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.agent.config.OpenAiYamlConfig;
import org.apache.hertzbeat.ai.agent.dao.OpenAiConfigDao;
import org.apache.hertzbeat.ai.agent.entity.OpenAiConfig;
import org.apache.hertzbeat.ai.agent.event.OpenAiConfigChangeEvent;
import org.apache.hertzbeat.ai.agent.pojo.dto.OpenAiConfigDto;
import org.apache.hertzbeat.ai.agent.service.OpenAiConfigService;
import org.springframework.context.ApplicationContext;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

/**
 * OpenAI Configuration Service Implementation
 * Consolidated service for OpenAI configuration, validation, and client factory management
 */
@Slf4j
@Service
public class OpenAiConfigServiceImpl implements OpenAiConfigService {

    private static final String CONFIG_TYPE = "openai";
    private static final String OPENAI_MODELS_ENDPOINT = "https://api.openai.com/v1/models";
    
    private final OpenAiConfigDao openAiConfigDao;
    private final ObjectMapper objectMapper;
    private final ApplicationContext applicationContext;
    private final OpenAiYamlConfig yamlConfig;
    private final RestTemplate restTemplate;
    
    // Client factory cache
    private volatile OpenAiConfigDto currentConfig;

    public OpenAiConfigServiceImpl(OpenAiConfigDao openAiConfigDao, 
                                  ObjectMapper objectMapper,
                                  ApplicationContext applicationContext,
                                  OpenAiYamlConfig yamlConfig) {
        this.openAiConfigDao = openAiConfigDao;
        this.objectMapper = objectMapper;
        this.applicationContext = applicationContext;
        this.yamlConfig = yamlConfig;
        this.restTemplate = new RestTemplate();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveConfig(OpenAiConfigDto config) {
        try {
            String contentJson = objectMapper.writeValueAsString(config);
            
            OpenAiConfig openAiConfig = OpenAiConfig.builder()
                    .type(CONFIG_TYPE)
                    .content(contentJson)
                    .build();
            
            openAiConfigDao.save(openAiConfig);
            log.info("OpenAI configuration saved successfully");
            
            applicationContext.publishEvent(new OpenAiConfigChangeEvent(applicationContext));
            
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to save OpenAI configuration: " + e.getMessage());
        }
    }

    @Override
    public OpenAiConfigDto getConfig() {
        OpenAiConfig config = openAiConfigDao.findByType(CONFIG_TYPE);
        if (config == null || !StringUtils.hasText(config.getContent())) {
            return null;
        }
        
        try {
            return objectMapper.readValue(config.getContent(), OpenAiConfigDto.class);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to parse OpenAI configuration: " + e.getMessage());
        }
    }

    @Override
    public boolean isConfigured() {
        OpenAiConfigDto effective = getEffectiveConfig();
        return effective != null && effective.isEnable() && StringUtils.hasText(effective.getApiKey());
    }

    @Override
    public OpenAiConfigDto getEffectiveConfig() {
        OpenAiConfigDto dbConfig = getConfig();
        if (dbConfig != null && dbConfig.isEnable() && StringUtils.hasText(dbConfig.getApiKey())) {
            log.debug("Using database OpenAI configuration");
            return dbConfig;
        }
        
        if (yamlConfig != null && yamlConfig.isEnable() && StringUtils.hasText(yamlConfig.getApiKey())) {
            log.debug("Using YAML OpenAI configuration from spring.ai.openai.api-key");
            OpenAiConfigDto yamlDto = new OpenAiConfigDto();
            yamlDto.setEnable(true);
            yamlDto.setApiKey(yamlConfig.getApiKey());
            return yamlDto;
        }
        
        log.debug("No valid OpenAI configuration found");
        return null;
    }

    @Override
    public ValidationResult validateApiKey(String apiKey) {
        if (!StringUtils.hasText(apiKey)) {
            return ValidationResult.failure("API key cannot be empty");
        }

        if (!apiKey.startsWith("sk-")) {
            return ValidationResult.failure("Invalid API key format. OpenAI API keys should start with 'sk-'");
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + apiKey);
            headers.set("Content-Type", "application/json");
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            log.debug("Validating OpenAI API key by calling models endpoint");
            ResponseEntity<String> response = restTemplate.exchange(
                OPENAI_MODELS_ENDPOINT,
                HttpMethod.GET,
                entity,
                String.class
            );

            if (response.getStatusCode() == HttpStatus.OK) {
                log.info("OpenAI API key validation successful");
                return ValidationResult.success("API key is valid");
            } else {
                log.warn("OpenAI API key validation failed with status: {}", response.getStatusCode());
                return ValidationResult.failure("API key validation failed: " + response.getStatusCode());
            }

        } catch (Exception e) {
            log.error("Error validating OpenAI API key", e);
            String errorMessage = e.getMessage();
            
            // Parse common error messages
            if (errorMessage.contains("401")) {
                return ValidationResult.failure("Invalid API key - authentication failed");
            } else if (errorMessage.contains("403")) {
                return ValidationResult.failure("API key does not have permission to access models");
            } else if (errorMessage.contains("429")) {
                return ValidationResult.failure("Rate limit exceeded - please try again later");
            } else if (errorMessage.contains("timeout") || errorMessage.contains("connect")) {
                return ValidationResult.failure("Network error - unable to connect to OpenAI API");
            } else {
                return ValidationResult.failure("API key validation failed: " + errorMessage);
            }
        }
    }

    @Override
    public void reloadConfig() {
        synchronized (this) {
            currentConfig = null; // Force reload
        }
    }

    /**
     * OpenAI configuration change event listener
     */
    @EventListener(OpenAiConfigChangeEvent.class)
    public void onOpenAiConfigChange(OpenAiConfigChangeEvent event) {
        log.info("[OpenAiConfigService] OpenAI configuration change event received");
        reloadConfig();
    }
}