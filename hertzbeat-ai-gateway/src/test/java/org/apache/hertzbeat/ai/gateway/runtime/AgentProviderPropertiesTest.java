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

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * Test case for {@link AgentProviderProperties}.
 */
class AgentProviderPropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withUserConfiguration(BindingConfig.class);

    @Test
    void defaultProviderShouldRemainUnconfigured() {
        contextRunner.run(context -> {
            AgentProviderProperties properties = context.getBean(AgentProviderProperties.class);

            assertEquals("openai-compatible", properties.getType());
            assertEquals("", properties.getCode());
            assertEquals("", properties.getModel());
            assertEquals("", properties.getBaseUrl());
            assertEquals("", properties.getApiKey());
        });
    }

    @Test
    void providerPropertiesShouldBindAndHideApiKeyFromToString() {
        contextRunner.withPropertyValues(
            "hertzbeat.agent.provider.type=openai-compatible",
            "hertzbeat.agent.provider.code=openrouter",
            "hertzbeat.agent.provider.model=gpt-runtime",
            "hertzbeat.agent.provider.base-url=https://model.example.test/v1",
            "hertzbeat.agent.provider.api-key=provider-secret")
            .run(context -> {
                AgentProviderProperties properties = context.getBean(AgentProviderProperties.class);

                assertEquals("openai-compatible", properties.getType());
                assertEquals("openrouter", properties.getCode());
                assertEquals("gpt-runtime", properties.getModel());
                assertEquals("https://model.example.test/v1", properties.getBaseUrl());
                assertEquals("provider-secret", properties.getApiKey());
                assertFalse(properties.toString().contains("provider-secret"));
            });
    }

    @EnableConfigurationProperties(AgentProviderProperties.class)
    static class BindingConfig {
    }
}
