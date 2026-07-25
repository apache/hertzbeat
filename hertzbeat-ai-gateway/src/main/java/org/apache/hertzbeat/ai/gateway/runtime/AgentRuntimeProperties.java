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

import java.time.Duration;
import java.util.Objects;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Agent runtime execution configuration baseline.
 */
@Getter
@Setter
@ToString
@ConfigurationProperties(prefix = AgentRuntimeProperties.PREFIX)
public class AgentRuntimeProperties {

    public static final String PREFIX = "hertzbeat.agent.runtime";

    private double temperature = 0.2D;

    private int maxCompletionTokens = 4096;

    private int maxSteps = 2048;

    private int maxToolCalls = 1024;

    private Duration modelRequestTimeout = Duration.ofSeconds(360);

    private Duration toolTimeout = Duration.ofSeconds(180);

    private ContextProperties context = new ContextProperties();

    private RetryProperties retry = new RetryProperties();

    private StreamProperties stream = new StreamProperties();

    public void setTemperature(double temperature) {
        if (temperature < 0 || temperature > 2) {
            throw new IllegalArgumentException("temperature must be between 0 and 2");
        }
        this.temperature = temperature;
    }

    public void setMaxCompletionTokens(int maxCompletionTokens) {
        this.maxCompletionTokens = requirePositive("maxCompletionTokens", maxCompletionTokens);
    }

    public void setMaxSteps(int maxSteps) {
        this.maxSteps = requirePositive("maxSteps", maxSteps);
    }

    public void setMaxToolCalls(int maxToolCalls) {
        this.maxToolCalls = requirePositive("maxToolCalls", maxToolCalls);
    }

    public void setModelRequestTimeout(Duration modelRequestTimeout) {
        this.modelRequestTimeout = requirePositive("modelRequestTimeout", modelRequestTimeout);
    }

    public void setToolTimeout(Duration toolTimeout) {
        this.toolTimeout = requirePositive("toolTimeout", toolTimeout);
    }

    public void setContext(ContextProperties context) {
        // The runtime loop needs a complete context policy before calculating every model input window.
        this.context = Objects.requireNonNull(context, "context must not be null");
    }

    public void setRetry(RetryProperties retry) {
        // The runtime loop dereferences retry policy on every model failure; binding must preserve that invariant.
        this.retry = Objects.requireNonNull(retry, "retry must not be null");
    }

    public void setStream(StreamProperties stream) {
        // Runtime event publishing dereferences stream policy for every invocation.
        this.stream = Objects.requireNonNull(stream, "stream must not be null");
    }

    void validate() {
        context.compactionThresholdTokens();
    }

    /**
     * Runtime model context window and compaction settings.
     */
    @Getter
    @Setter
    @ToString
    public static class ContextProperties {

        /**
         * Maximum token budget used to plan the model context window.
         */
        private long maxTokens = 32000;

        private CompactionProperties compaction = new CompactionProperties();

        public void setMaxTokens(long maxTokens) {
            this.maxTokens = requirePositive("context.maxTokens", maxTokens);
        }

        public void setCompaction(CompactionProperties compaction) {
            // Every context decision requires a complete compaction policy.
            this.compaction = Objects.requireNonNull(compaction, "context.compaction must not be null");
        }

        long compactionThresholdTokens() {
            long thresholdTokens = (long) Math.floor(maxTokens * compaction.getThresholdRatio());
            if (compaction.getRetainRecentTokens() + compaction.getSummaryTokenBudget() >= thresholdTokens) {
                throw new IllegalArgumentException(
                    "context compaction retain and summary budgets must be below the compaction threshold");
            }
            return thresholdTokens;
        }
    }

    /**
     * Runtime history compaction policy.
     */
    @Getter
    @Setter
    @ToString
    public static class CompactionProperties {

        private double thresholdRatio = 0.9D;

        private long retainRecentTokens = 12000;

        private int summaryTokenBudget = 4000;

        public void setThresholdRatio(double thresholdRatio) {
            if (thresholdRatio <= 0 || thresholdRatio >= 1) {
                throw new IllegalArgumentException("context.compaction.thresholdRatio must be between 0 and 1");
            }
            this.thresholdRatio = thresholdRatio;
        }

        public void setRetainRecentTokens(long retainRecentTokens) {
            this.retainRecentTokens = requirePositive(
                "context.compaction.retainRecentTokens", retainRecentTokens);
        }

        public void setSummaryTokenBudget(int summaryTokenBudget) {
            this.summaryTokenBudget = requirePositive(
                "context.compaction.summaryTokenBudget", summaryTokenBudget);
        }
    }

    /**
     * Runtime retry settings for transient model errors.
     */
    @Getter
    @Setter
    @ToString
    public static class RetryProperties {

        private int maxModelRetries = 2;

        private Duration initialBackoff = Duration.ofMillis(500);

        public void setMaxModelRetries(int maxModelRetries) {
            this.maxModelRetries = requireNonNegative("retry.maxModelRetries", maxModelRetries);
        }

        public void setInitialBackoff(Duration initialBackoff) {
            this.initialBackoff = requirePositive("retry.initialBackoff", initialBackoff);
        }
    }

    /**
     * Runtime streaming backpressure controls for slow clients.
     */
    @Getter
    @Setter
    @ToString
    public static class StreamProperties {

        private int maxBufferedEvents = 1024;

        public void setMaxBufferedEvents(int maxBufferedEvents) {
            this.maxBufferedEvents = requirePositive("stream.maxBufferedEvents", maxBufferedEvents);
        }
    }

    private static int requirePositive(String name, int value) {
        if (value <= 0) {
            throw new IllegalArgumentException(name + " must be > 0");
        }
        return value;
    }

    private static long requirePositive(String name, long value) {
        if (value <= 0) {
            throw new IllegalArgumentException(name + " must be > 0");
        }
        return value;
    }

    private static int requireNonNegative(String name, int value) {
        if (value < 0) {
            throw new IllegalArgumentException(name + " must be >= 0");
        }
        return value;
    }

    private static Duration requirePositive(String name, Duration value) {
        if (value == null || value.isZero() || value.isNegative()) {
            throw new IllegalArgumentException(name + " must be > 0");
        }
        return value;
    }
}
