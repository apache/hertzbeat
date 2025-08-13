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

import org.apache.hertzbeat.ai.agent.pojo.dto.OpenAiConfigDto;

/**
 * OpenAI Configuration Service
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
}