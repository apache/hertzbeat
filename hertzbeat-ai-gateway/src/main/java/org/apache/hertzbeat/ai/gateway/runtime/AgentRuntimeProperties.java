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
 * Agent Gateway runtime configuration baseline.
 */
@Getter
@Setter
@ToString
@ConfigurationProperties(prefix = AgentRuntimeProperties.PREFIX)
public class AgentRuntimeProperties {

    public static final String PREFIX = "hertzbeat.agent.gateway.runtime";

    private String provider = "openai-compatible";

    private String model = "";

    private String baseUrl = "";

    @ToString.Exclude
    private String apiKey = "";

    private double temperature = 0.2D;

    private int maxCompletionTokens = 4096;

    private int maxSteps = 2048;

    private int maxToolCalls = 1024;

    private Duration modelRequestTimeout = Duration.ofSeconds(360);

    private Duration toolTimeout = Duration.ofSeconds(180);

    private int historyContextTokenBudget = 32000;

    private int historyReserveTokens = 8000;

    private int historyRecentTokenBudget = 12000;

    private int historyCompactionSummaryLimit = 4000;

    private RetryProperties retry = new RetryProperties();

    private StreamProperties stream = new StreamProperties();

    public void setProvider(String provider) {
        // Configuration values may come from padded environment variables; trim at the binding boundary.
        this.provider = provider == null ? "" : provider.trim();
    }

    public void setModel(String model) {
        // Configuration values may come from padded environment variables; trim at the binding boundary.
        this.model = model == null ? "" : model.trim();
    }

    public void setBaseUrl(String baseUrl) {
        // Configuration values may come from padded environment variables; trim at the binding boundary.
        this.baseUrl = baseUrl == null ? "" : baseUrl.trim();
    }

    public void setApiKey(String apiKey) {
        // Configuration values may come from padded environment variables; trim at the binding boundary.
        this.apiKey = apiKey == null ? "" : apiKey.trim();
    }

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

    public void setHistoryContextTokenBudget(int historyContextTokenBudget) {
        this.historyContextTokenBudget = requirePositive("historyContextTokenBudget", historyContextTokenBudget);
    }

    public void setHistoryReserveTokens(int historyReserveTokens) {
        this.historyReserveTokens = requireNonNegative("historyReserveTokens", historyReserveTokens);
    }

    public void setHistoryRecentTokenBudget(int historyRecentTokenBudget) {
        this.historyRecentTokenBudget = requirePositive("historyRecentTokenBudget", historyRecentTokenBudget);
    }

    public void setHistoryCompactionSummaryLimit(int historyCompactionSummaryLimit) {
        this.historyCompactionSummaryLimit = requirePositive("historyCompactionSummaryLimit",
            historyCompactionSummaryLimit);
    }

    public void setRetry(RetryProperties retry) {
        // The runtime loop dereferences retry policy on every model failure; binding must preserve that invariant.
        this.retry = Objects.requireNonNull(retry, "retry must not be null");
    }

    public void setStream(StreamProperties stream) {
        // Runtime event publishing dereferences stream policy for every invocation.
        this.stream = Objects.requireNonNull(stream, "stream must not be null");
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
     * Runtime streaming controls for slow clients and visible text delta batching.
     */
    @Getter
    @Setter
    @ToString
    public static class StreamProperties {

        private int maxBufferedEvents = 1024;

        private Duration deltaFlushInterval = Duration.ofMillis(20);

        private int deltaFlushChars = 512;

        private boolean cancelOnBackpressure = true;

        public void setMaxBufferedEvents(int maxBufferedEvents) {
            this.maxBufferedEvents = requirePositive("stream.maxBufferedEvents", maxBufferedEvents);
        }

        public void setDeltaFlushInterval(Duration deltaFlushInterval) {
            this.deltaFlushInterval = requirePositive("stream.deltaFlushInterval", deltaFlushInterval);
        }

        public void setDeltaFlushChars(int deltaFlushChars) {
            this.deltaFlushChars = requirePositive("stream.deltaFlushChars", deltaFlushChars);
        }
    }

    private static int requirePositive(String name, int value) {
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
