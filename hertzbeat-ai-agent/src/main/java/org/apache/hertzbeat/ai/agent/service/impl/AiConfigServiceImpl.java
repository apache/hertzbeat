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

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.agent.service.AiConfigService;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

/**
 * Ai Configuration Service Implementation
 */
@Slf4j
@Service
public class AiConfigServiceImpl implements AiConfigService {
    
    private static final String OPENAI_MODELS_ENDPOINT = "https://api.openai.com/v1/models";
    private final RestTemplate restTemplate;

    private final GeneralConfigDao generalConfigDao;

    public AiConfigServiceImpl(GeneralConfigDao generalConfigDao, RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
        this.generalConfigDao = generalConfigDao;
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
}
