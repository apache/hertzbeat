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

package org.apache.hertzbeat.ai.gateway.runtime.provider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeModelRequest;
import org.apache.hertzbeat.ai.gateway.runtime.HertzBeatModel;
import org.apache.hertzbeat.ai.gateway.runtime.RuntimePrompt;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.junit.jupiter.api.Test;
import org.springframework.ai.openai.OpenAiChatOptions;

/**
 * Test case for {@link OpenAiCompatibleAgentModelProvider}.
 */
class OpenAiCompatibleAgentModelProviderTest {

    private final OpenAiCompatibleAgentModelProvider provider = new OpenAiCompatibleAgentModelProvider();

    @Test
    void legacyZaiPresetShouldReceiveCompatibleDefaults() {
        ModelProviderConfig config = config("ZAI", null, null, "secret");

        assertInstanceOf(HertzBeatModel.class, provider.createModel(config));

        assertEquals("openai-compatible", config.getType());
        assertEquals("zai", config.getCode());
        assertEquals("https://api.z.ai/api/paas/v4", config.getBaseUrl());
        assertEquals("glm-4.6", config.getModel());
    }

    @Test
    void customCompatibleProviderShouldRequireExplicitEndpointAndModel() {
        ModelProviderConfig complete = config(
                "custom", "https://model.example.test/v1", "custom-model", "secret");

        assertInstanceOf(HertzBeatModel.class, provider.createModel(complete));
        assertThrows(IllegalArgumentException.class,
                () -> provider.createModel(config("custom", null, "custom-model", "secret")));
        assertThrows(IllegalArgumentException.class,
                () -> provider.createModel(config("custom", "https://model.example.test/v1", null, "secret")));
    }

    @Test
    void requestOptionsShouldUseOpenAiCompletionTokenField() {
        AgentRuntimeModelRequest request = AgentRuntimeModelRequest.builder()
                .prompt(RuntimePrompt.builder().instructions("system").build())
                .temperature(0.2D)
                .maxCompletionTokens(4096)
                .build();

        OpenAiChatOptions options = assertInstanceOf(OpenAiChatOptions.class,
                provider.requestOptions(request, List.of()));

        assertEquals(0.2D, options.getTemperature());
        assertEquals(4096, options.getMaxCompletionTokens());
    }

    private ModelProviderConfig config(String code, String baseUrl, String model, String apiKey) {
        ModelProviderConfig config = new ModelProviderConfig();
        config.setCode(code);
        config.setBaseUrl(baseUrl);
        config.setModel(model);
        config.setApiKey(apiKey);
        return config;
    }
}
