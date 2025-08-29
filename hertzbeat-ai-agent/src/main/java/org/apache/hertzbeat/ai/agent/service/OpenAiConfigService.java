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

package org.apache.hertzbeat.ai.agent.service;

import org.apache.hertzbeat.ai.agent.event.OpenAiConfigChangeEvent;
import org.apache.hertzbeat.ai.agent.pojo.dto.OpenAiConfigDto;

/**
 * OpenAI Configuration Service
 * Consolidated service for OpenAI configuration, validation, and client factory management
 */
public interface OpenAiConfigService {

    /**
     * Save OpenAI configuration
     * @param config OpenAI configuration
     */
    void saveConfig(OpenAiConfigDto config);

    /**
     * Get OpenAI configuration
     * @return OpenAI configuration
     */
    OpenAiConfigDto getConfig();

    /**
     * Check if OpenAI is properly configured
     * @return true if configured and enabled
     */
    boolean isConfigured();

    /**
     * Get effective OpenAI configuration (DB first, then YAML fallback)
     * @return effective configuration or null if not configured
     */
    OpenAiConfigDto getEffectiveConfig();

    /**
     * Validate OpenAI API key by calling the OpenAI API
     * @param apiKey the API key to validate
     * @return validation result with success status and message
     */
    ValidationResult validateApiKey(String apiKey);

    /**
     * Force reload of OpenAI configuration cache
     * This method is typically called when configuration changes
     */
    void reloadConfig();

    /**
     * Handle OpenAI configuration change events
     * @param event OpenAI configuration change event
     */
    void onOpenAiConfigChange(OpenAiConfigChangeEvent event);

    /**
     * Validation result class
     */
    class ValidationResult {
        private final boolean valid;
        private final String message;

        private ValidationResult(boolean valid, String message) {
            this.valid = valid;
            this.message = message;
        }

        public static ValidationResult success(String message) {
            return new ValidationResult(true, message);
        }

        public static ValidationResult failure(String message) {
            return new ValidationResult(false, message);
        }

        public boolean isValid() {
            return valid;
        }

        public String getMessage() {
            return message;
        }
    }
}