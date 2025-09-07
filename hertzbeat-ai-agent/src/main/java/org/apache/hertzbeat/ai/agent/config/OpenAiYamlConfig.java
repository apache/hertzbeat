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

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * OpenAI YAML Configuration - reads from spring.ai.openai.api-key
 */
@Data
@Component
@ConfigurationProperties(prefix = "spring.ai.openai")
public class OpenAiYamlConfig {

    /**
     * OpenAI API key from spring.ai.openai.api-key
     */
    private String apiKey;

    /**
     * Check if OpenAI is enabled (has API key)
     */
    public boolean isEnable() {
        return apiKey != null && !apiKey.trim().isEmpty();
    }
}