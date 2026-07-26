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
import static org.junit.jupiter.api.Assertions.assertThrows;

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

            assertEquals(0.2D, properties.getTemperature());
            assertEquals(4096, properties.getMaxCompletionTokens());
            assertEquals(2048, properties.getMaxSteps());
            assertEquals(1024, properties.getMaxToolCalls());
            assertEquals(Duration.ofSeconds(360), properties.getModelRequestTimeout());
            assertEquals(Duration.ofSeconds(180), properties.getToolTimeout());
            assertEquals(32000, properties.getContext().getMaxTokens());
            assertEquals(0.9D, properties.getContext().getCompaction().getThresholdRatio());
            assertEquals(12000, properties.getContext().getCompaction().getRetainRecentTokens());
            assertEquals(4000, properties.getContext().getCompaction().getSummaryTokenBudget());
            assertEquals(28800, properties.getContext().compactionThresholdTokens());
            assertEquals(2, properties.getRetry().getMaxModelRetries());
            assertEquals(Duration.ofMillis(500), properties.getRetry().getInitialBackoff());
            assertEquals(1024, properties.getStream().getMaxBufferedEvents());
        });
    }

    @Test
    void runtimePropertiesShouldBind() {
        contextRunner.withPropertyValues(
            "hertzbeat.agent.runtime.temperature=0.4",
            "hertzbeat.agent.runtime.max-completion-tokens=2048",
            "hertzbeat.agent.runtime.max-steps=5",
            "hertzbeat.agent.runtime.max-tool-calls=3",
            "hertzbeat.agent.runtime.model-request-timeout=30s",
            "hertzbeat.agent.runtime.tool-timeout=250ms",
            "hertzbeat.agent.runtime.context.max-tokens=24000",
            "hertzbeat.agent.runtime.context.compaction.threshold-ratio=0.75",
            "hertzbeat.agent.runtime.context.compaction.retain-recent-tokens=9000",
            "hertzbeat.agent.runtime.context.compaction.summary-token-budget=2048",
            "hertzbeat.agent.runtime.retry.max-model-retries=1",
            "hertzbeat.agent.runtime.retry.initial-backoff=125ms",
            "hertzbeat.agent.runtime.stream.max-buffered-events=8")
            .run(context -> {
                AgentRuntimeProperties properties = context.getBean(AgentRuntimeProperties.class);

                assertEquals(0.4D, properties.getTemperature());
                assertEquals(2048, properties.getMaxCompletionTokens());
                assertEquals(5, properties.getMaxSteps());
                assertEquals(3, properties.getMaxToolCalls());
                assertEquals(Duration.ofSeconds(30), properties.getModelRequestTimeout());
                assertEquals(Duration.ofMillis(250), properties.getToolTimeout());
                assertEquals(24000, properties.getContext().getMaxTokens());
                assertEquals(0.75D, properties.getContext().getCompaction().getThresholdRatio());
                assertEquals(9000, properties.getContext().getCompaction().getRetainRecentTokens());
                assertEquals(2048, properties.getContext().getCompaction().getSummaryTokenBudget());
                assertEquals(18000, properties.getContext().compactionThresholdTokens());
                assertEquals(1, properties.getRetry().getMaxModelRetries());
                assertEquals(Duration.ofMillis(125), properties.getRetry().getInitialBackoff());
                assertEquals(8, properties.getStream().getMaxBufferedEvents());
            });
    }

    @Test
    void invalidCompactionPolicyShouldFailFast() {
        AgentRuntimeProperties properties = new AgentRuntimeProperties();

        assertThrows(IllegalArgumentException.class,
            () -> properties.getContext().getCompaction().setThresholdRatio(1D));

        properties.getContext().setMaxTokens(100);
        properties.getContext().getCompaction().setRetainRecentTokens(60);
        properties.getContext().getCompaction().setSummaryTokenBudget(30);
        assertThrows(IllegalArgumentException.class, properties::validate);
    }

    @EnableConfigurationProperties(AgentRuntimeProperties.class)
    static class BindingConfig {
    }
}
