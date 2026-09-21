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

package org.apache.hertzbeat.ai.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.junit.jupiter.api.Test;
import org.springframework.ai.openai.OpenAiChatOptions;

/**
 * Test case for the provider defaults and request options built by {@link LlmConfig}.
 */
class LlmConfigTest {

    private static final String API_KEY = "sk-test";

    private ModelProviderConfig newConfig(String code) {
        ModelProviderConfig config = new ModelProviderConfig();
        config.setCode(code);
        config.setApiKey(API_KEY);
        return config;
    }

    @Test
    void defaultOpenAiProvider() {
        OpenAiChatOptions options = LlmConfig.buildChatOptions(newConfig("openai"));
        assertEquals("https://api.openai.com/v1", options.getBaseUrl());
        assertEquals("gpt-5", options.getModel());
    }

    @Test
    void defaultZhipuProvider() {
        OpenAiChatOptions options = LlmConfig.buildChatOptions(newConfig("zhipu"));
        assertEquals("https://open.bigmodel.cn/api/paas/v4", options.getBaseUrl());
        assertEquals("glm-4.6", options.getModel());
    }

    @Test
    void defaultZaiProvider() {
        OpenAiChatOptions options = LlmConfig.buildChatOptions(newConfig("zai"));
        assertEquals("https://api.z.ai/api/paas/v4", options.getBaseUrl());
        assertEquals("glm-4.6", options.getModel());
    }

    @Test
    void unknownProviderFallsBackToOpenAi() {
        OpenAiChatOptions options = LlmConfig.buildChatOptions(newConfig("deepseek"));
        assertEquals("https://api.openai.com/v1", options.getBaseUrl());
        assertEquals("gpt-5", options.getModel());
    }

    @Test
    void explicitBaseUrlAndModelAreNotOverwritten() {
        ModelProviderConfig config = newConfig("deepseek");
        config.setBaseUrl("https://api.deepseek.com/v1");
        config.setModel("deepseek-chat");

        OpenAiChatOptions options = LlmConfig.buildChatOptions(config);
        assertEquals("https://api.deepseek.com/v1", options.getBaseUrl());
        assertEquals("deepseek-chat", options.getModel());
    }

    @Test
    void temperatureFallsBackToBuiltInDefault() {
        OpenAiChatOptions options = LlmConfig.buildChatOptions(newConfig("openai"));
        assertEquals(Double.valueOf(0.3D), options.getTemperature());
    }

    @Test
    void configuredTemperatureIsUsed() {
        ModelProviderConfig config = newConfig("openai");
        config.setTemperature(0.9D);

        assertEquals(Double.valueOf(0.9D), LlmConfig.buildChatOptions(config).getTemperature());
    }
}
