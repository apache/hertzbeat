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

package org.apache.hertzbeat.ai.agent.config;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.agent.pojo.dto.OpenAiConfigDto;
import org.apache.hertzbeat.ai.agent.service.OpenAiConfigService;
import org.springframework.ai.model.ApiKey;
import org.springframework.stereotype.Component;

/**
 * Dynamic OpenAI API Key implementation that retrieves the API key
 * from our configuration service (database first, then YAML fallback)
 */
@Slf4j
@Component
public class DynamicOpenAiApiKey implements ApiKey {

    private final OpenAiConfigService openAiConfigService;

    public DynamicOpenAiApiKey(OpenAiConfigService openAiConfigService) {
        this.openAiConfigService = openAiConfigService;
    }

    @Override
    public String getValue() {
        try {
            OpenAiConfigDto effectiveConfig = openAiConfigService.getEffectiveConfig();
            
            if (effectiveConfig != null && effectiveConfig.isEnable() && effectiveConfig.getApiKey() != null) {
                log.debug("Retrieved OpenAI API key from configuration service");
                return effectiveConfig.getApiKey();
            } else {
                log.warn("No valid OpenAI API key found in configuration");
                return null;
            }
        } catch (Exception e) {
            log.error("Error retrieving OpenAI API key from configuration", e);
            return null;
        }
    }
}