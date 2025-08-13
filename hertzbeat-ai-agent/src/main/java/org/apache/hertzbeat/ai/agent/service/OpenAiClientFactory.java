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


import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.agent.event.OpenAiConfigChangeEvent;
import org.apache.hertzbeat.ai.agent.pojo.dto.OpenAiConfigDto;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * OpenAI Client Factory - manages OpenAI client lifecycle based on configuration
 */
@Slf4j
@Component
public class OpenAiClientFactory {

    private final OpenAiConfigService openAiConfigService;
    private volatile OpenAiConfigDto currentConfig;

    public OpenAiClientFactory(OpenAiConfigService openAiConfigService) {
        this.openAiConfigService = openAiConfigService;
    }

    /**
     * OpenAI configuration change event listener
     */
    @EventListener(OpenAiConfigChangeEvent.class)
    public void onOpenAiConfigChange(OpenAiConfigChangeEvent event) {
        log.info("[OpenAiClientFactory] OpenAI configuration change event received");
        synchronized (this) {
            currentConfig = null; // Force reload
        }
    }

    public OpenAiConfigDto getOpenAiConfig() {
        if (currentConfig != null) {
            return currentConfig;
        }
        synchronized (this) {
            if (currentConfig != null) {
                return currentConfig;
            }
            loadConfig();
            return currentConfig;
        }
    }

    private void loadConfig() {
        try {
            // Get effective configuration (DB first, then YAML fallback)
            OpenAiConfigDto effectiveConfig = openAiConfigService.getEffectiveConfig();
            
            if (effectiveConfig != null && effectiveConfig.isEnable()) {
                currentConfig = effectiveConfig;
                log.info("[OpenAiClientFactory] OpenAI configuration loaded successfully");
            } else {
                log.warn("[OpenAiClientFactory] No valid OpenAI configuration found");
                currentConfig = null;
            }

        } catch (Exception e) {
            log.error("[OpenAiClientFactory] Failed to load OpenAI configuration", e);
            currentConfig = null;
        }
    }

    public boolean isConfigured() {
        return getOpenAiConfig() != null;
    }
}