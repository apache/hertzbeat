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

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * Test case for {@link AgentRuntimeProperties}.
 */
class AgentRuntimePropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withUserConfiguration(BindingConfig.class);

    @Test
    void defaultRuntimeShouldUseBoundedLimits() {
        contextRunner.run(context -> {
            AgentRuntimeProperties properties = context.getBean(AgentRuntimeProperties.class);

            assertEquals("openai-compatible", properties.getProvider());
            assertEquals("", properties.getModel());
            assertEquals("", properties.getBaseUrl());
            assertEquals("", properties.getApiKey());
            assertEquals(0.2D, properties.getTemperature());
            assertEquals(4096, properties.getMaxCompletionTokens());
            assertEquals(2048, properties.getMaxSteps());
            assertEquals(1024, properties.getMaxToolCalls());
            assertEquals(Duration.ofSeconds(360), properties.getModelRequestTimeout());
            assertEquals(Duration.ofSeconds(180), properties.getToolTimeout());
            assertEquals(32000, properties.getHistoryContextTokenBudget());
            assertEquals(8000, properties.getHistoryReserveTokens());
            assertEquals(12000, properties.getHistoryRecentTokenBudget());
            assertEquals(4000, properties.getHistoryCompactionSummaryLimit());
            assertEquals(2, properties.getRetry().getMaxModelRetries());
            assertEquals(Duration.ofMillis(500), properties.getRetry().getInitialBackoff());
            assertEquals(1024, properties.getStream().getMaxBufferedEvents());
        });
    }

    @Test
    void runtimePropertiesShouldBindAndHideApiKeyFromToString() {
        contextRunner.withPropertyValues(
            "hertzbeat.agent.gateway.runtime.provider=openai-compatible",
            "hertzbeat.agent.gateway.runtime.model=gpt-runtime",
            "hertzbeat.agent.gateway.runtime.base-url=https://model.example.test/v1",
            "hertzbeat.agent.gateway.runtime.api-key=runtime-secret",
            "hertzbeat.agent.gateway.runtime.temperature=0.4",
            "hertzbeat.agent.gateway.runtime.max-completion-tokens=2048",
            "hertzbeat.agent.gateway.runtime.max-steps=5",
            "hertzbeat.agent.gateway.runtime.max-tool-calls=3",
            "hertzbeat.agent.gateway.runtime.model-request-timeout=30s",
            "hertzbeat.agent.gateway.runtime.tool-timeout=250ms",
            "hertzbeat.agent.gateway.runtime.history-context-token-budget=24000",
            "hertzbeat.agent.gateway.runtime.history-reserve-tokens=6000",
            "hertzbeat.agent.gateway.runtime.history-recent-token-budget=9000",
            "hertzbeat.agent.gateway.runtime.history-compaction-summary-limit=2048",
            "hertzbeat.agent.gateway.runtime.retry.max-model-retries=1",
            "hertzbeat.agent.gateway.runtime.retry.initial-backoff=125ms",
            "hertzbeat.agent.gateway.runtime.stream.max-buffered-events=8")
            .run(context -> {
                AgentRuntimeProperties properties = context.getBean(AgentRuntimeProperties.class);

                assertEquals("openai-compatible", properties.getProvider());
                assertEquals("gpt-runtime", properties.getModel());
                assertEquals("https://model.example.test/v1", properties.getBaseUrl());
                assertEquals("runtime-secret", properties.getApiKey());
                assertEquals(0.4D, properties.getTemperature());
                assertEquals(2048, properties.getMaxCompletionTokens());
                assertEquals(5, properties.getMaxSteps());
                assertEquals(3, properties.getMaxToolCalls());
                assertEquals(Duration.ofSeconds(30), properties.getModelRequestTimeout());
                assertEquals(Duration.ofMillis(250), properties.getToolTimeout());
                assertEquals(24000, properties.getHistoryContextTokenBudget());
                assertEquals(6000, properties.getHistoryReserveTokens());
                assertEquals(9000, properties.getHistoryRecentTokenBudget());
                assertEquals(2048, properties.getHistoryCompactionSummaryLimit());
                assertEquals(1, properties.getRetry().getMaxModelRetries());
                assertEquals(Duration.ofMillis(125), properties.getRetry().getInitialBackoff());
                assertEquals(8, properties.getStream().getMaxBufferedEvents());
                assertFalse(properties.toString().contains("runtime-secret"));
            });
    }

    @EnableConfigurationProperties(AgentRuntimeProperties.class)
    static class BindingConfig {
    }
}
