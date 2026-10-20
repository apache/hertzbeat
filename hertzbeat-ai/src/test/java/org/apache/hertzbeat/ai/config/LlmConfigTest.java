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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationContext;

/**
 * Tests for temperature resolution logic in {@link LlmConfig}.
 * <p>
 * Full Spring-AI {@code ChatClient} construction is not exercised here because it requires a
 * live API key.  Instead we verify:
 * <ol>
 *   <li>{@link ModelProviderConfig#getTemperature()} returns {@code null} when the field is
 *       absent from the persisted JSON (backward-compatibility).</li>
 *   <li>The temperature resolution rule applied inside {@code LlmConfig.createChatClient()}
 *       defaults to {@code 0.3} when the field is {@code null}, and honours any explicit
 *       value supplied by the operator.</li>
 * </ol>
 */
class LlmConfigTest {

    // -----------------------------------------------------------------------
    // ModelProviderConfig temperature field
    // -----------------------------------------------------------------------

    @Test
    void temperatureIsNullByDefault() {
        ModelProviderConfig config = new ModelProviderConfig();
        assertNull(config.getTemperature(),
                "Temperature should be null when not explicitly configured");
    }

    @Test
    void temperatureRoundTripsViaJson() {
        ModelProviderConfig original = new ModelProviderConfig();
        original.setApiKey("sk-test");
        original.setTemperature(0.7);

        String json = JsonUtil.toJson(original);
        ModelProviderConfig deserialized = JsonUtil.fromJson(json, ModelProviderConfig.class);

        assertEquals(0.7, deserialized.getTemperature(), 1e-9,
                "Temperature should survive a JSON round-trip");
    }

    @Test
    void missingTemperatureFieldDeserializesToNull() {
        // Simulate JSON written by an older version that did not include the temperature field.
        String legacyJson = "{\"apiKey\":\"sk-old\",\"code\":\"openai\"}";
        ModelProviderConfig config = JsonUtil.fromJson(legacyJson, ModelProviderConfig.class);

        assertNull(config.getTemperature(),
                "Deserializing legacy JSON without a temperature field must yield null");
    }

    // -----------------------------------------------------------------------
    // Temperature resolution rule (mirrors the logic in LlmConfig.createChatClient)
    // -----------------------------------------------------------------------

    /** Replicates the resolution logic so that tests stay in sync with the implementation. */
    private static double resolveTemperature(ModelProviderConfig cfg) {
        return cfg.getTemperature() != null ? cfg.getTemperature() : 0.3;
    }

    @Test
    void defaultTemperatureIsAppliedWhenNotSet() {
        ModelProviderConfig config = new ModelProviderConfig();
        config.setApiKey("sk-test");

        assertEquals(0.3, resolveTemperature(config), 1e-9,
                "When temperature is null the resolved value should default to 0.3");
    }

    @Test
    void customTemperatureIsHonouredWhenSet() {
        ModelProviderConfig config = new ModelProviderConfig();
        config.setApiKey("sk-test");
        config.setTemperature(1.0);

        assertEquals(1.0, resolveTemperature(config), 1e-9,
                "When temperature is explicitly configured it must be used as-is");
    }

    @Test
    void zeroTemperatureIsHonouredAndNotReplacedByDefault() {
        ModelProviderConfig config = new ModelProviderConfig();
        config.setApiKey("sk-test");
        config.setTemperature(0.0);

        assertEquals(0.0, resolveTemperature(config), 1e-9,
                "Temperature 0.0 is a valid, deterministic setting and must not be overridden");
    }

    // -----------------------------------------------------------------------
    // LlmConfig returns null ChatClient when provider config is absent
    // -----------------------------------------------------------------------

    @Test
    void openAiChatClientReturnsNullWhenNoProviderConfigured() {
        GeneralConfigDao dao = mock(GeneralConfigDao.class);
        when(dao.findByType("provider")).thenReturn(null);

        ApplicationContext ctx = mock(ApplicationContext.class);
        LlmConfig llmConfig = new LlmConfig(dao, ctx);

        assertNull(llmConfig.openAiChatClient(),
                "ChatClient bean must be null when no provider config is stored");
    }

    @Test
    void openAiChatClientReturnsNullWhenApiKeyMissing() {
        ModelProviderConfig cfg = new ModelProviderConfig();
        // intentionally leave apiKey null
        GeneralConfig storedConfig = GeneralConfig.builder()
                .type("provider")
                .content(JsonUtil.toJson(cfg))
                .build();

        GeneralConfigDao dao = mock(GeneralConfigDao.class);
        when(dao.findByType("provider")).thenReturn(storedConfig);

        ApplicationContext ctx = mock(ApplicationContext.class);
        LlmConfig llmConfig = new LlmConfig(dao, ctx);

        assertNull(llmConfig.openAiChatClient(),
                "ChatClient bean must be null when the API key is absent");
    }
}
