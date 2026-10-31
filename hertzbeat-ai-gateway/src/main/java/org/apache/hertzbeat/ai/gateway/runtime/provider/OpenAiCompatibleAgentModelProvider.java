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

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeModelRequest;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeProperties;
import org.apache.hertzbeat.ai.gateway.runtime.HertzBeatModel;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Spring AI provider for OpenAI and services exposing an OpenAI-compatible chat API.
 */
@Component
@ConditionalOnClass(OpenAiChatModel.class)
public class OpenAiCompatibleAgentModelProvider implements AgentModelProvider {

    public static final String TYPE = "openai-compatible";

    private final io.micrometer.observation.ObservationRegistry observationRegistry;
    private final AgentRuntimeProperties runtimeProperties;

    @org.springframework.beans.factory.annotation.Autowired
    public OpenAiCompatibleAgentModelProvider(
            AgentRuntimeProperties runtimeProperties,
            org.springframework.beans.factory.ObjectProvider<io.micrometer.observation.ObservationRegistry> registry) {
        this(runtimeProperties, registry.getIfAvailable(() -> io.micrometer.observation.ObservationRegistry.NOOP));
    }

    public OpenAiCompatibleAgentModelProvider(
            AgentRuntimeProperties runtimeProperties,
            io.micrometer.observation.ObservationRegistry registry) {
        this.runtimeProperties = Objects.requireNonNull(runtimeProperties, "runtimeProperties must not be null");
        this.observationRegistry = Objects.requireNonNullElse(
                registry, io.micrometer.observation.ObservationRegistry.NOOP);
    }

    public OpenAiCompatibleAgentModelProvider(AgentRuntimeProperties runtimeProperties) {
        this(runtimeProperties, io.micrometer.observation.ObservationRegistry.NOOP);
    }

    private Duration streamIdleTimeout() {
        return runtimeProperties.getModelStreamIdleTimeout();
    }

    private static final String DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
    private static final String DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
    private static final String DEFAULT_SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
    private static final String DEFAULT_ZHIPU_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
    private static final String DEFAULT_ZAI_BASE_URL = "https://api.z.ai/api/paas/v4";
    private static final String DEFAULT_OPENAI_MODEL = "gpt-5";
    private static final String DEFAULT_GLM_MODEL = "glm-4.6";
    private static final String DEFAULT_SILICONFLOW_MODEL = "deepseek-ai/DeepSeek-V3.2";
    private static final List<String> REQUIRED_FIELDS = List.of("apiKey", "baseUrl", "model");
    private static final List<AgentModelProviderOption> OPTIONS = List.of(
            new AgentModelProviderOption(
                    TYPE, "openai", "OpenAI", DEFAULT_OPENAI_BASE_URL, DEFAULT_OPENAI_MODEL, REQUIRED_FIELDS),
            new AgentModelProviderOption(
                    TYPE, "openrouter", "OpenRouter", DEFAULT_OPENROUTER_BASE_URL, null, REQUIRED_FIELDS),
            new AgentModelProviderOption(
                    TYPE, "siliconflow", "SiliconFlow",
                    DEFAULT_SILICONFLOW_BASE_URL, DEFAULT_SILICONFLOW_MODEL, REQUIRED_FIELDS),
            new AgentModelProviderOption(
                    TYPE, "zhipu", "ZhiPu", DEFAULT_ZHIPU_BASE_URL, DEFAULT_GLM_MODEL, REQUIRED_FIELDS),
            new AgentModelProviderOption(
                    TYPE, "zai", "ZAI", DEFAULT_ZAI_BASE_URL, DEFAULT_GLM_MODEL, REQUIRED_FIELDS),
            new AgentModelProviderOption(
                    TYPE, "custom", "OpenAI Compatible", null, null, REQUIRED_FIELDS));

    @Override
    public String type() {
        return TYPE;
    }

    @Override
    public List<AgentModelProviderOption> options() {
        return OPTIONS;
    }

    @Override
    public HertzBeatModel createModel(ModelProviderConfig config) {
        completeAndValidate(config);
        if (AgentModelProtocol.parse(config.getProtocol()) == AgentModelProtocol.RESPONSES) {
            var defaults = org.springframework.ai.openai.responses.OpenAiResponsesChatOptions.builder()
                    .baseUrl(config.getBaseUrl()).apiKey(config.getApiKey()).model(config.getModel()).build();
            return new HertzBeatModel(new OpenAiResponsesStreamBridge(defaults, observationRegistry),
                    (request, callbacks) -> requestOptions(config, request, callbacks), AgentModelBinding.of(config));
        }
        OpenAiChatOptions defaultOptions = OpenAiChatOptions.builder()
                .baseUrl(config.getBaseUrl())
                .apiKey(config.getApiKey())
                .model(config.getModel())
                // Provider-internal retries hide failures from the runtime loop; retries and their
                // user-visible MODEL_RETRY progress are owned by AgentRuntimeLoop instead.
                .maxRetries(0)
                .build();
        OpenAiStreamBridge chatModel = new OpenAiStreamBridge(defaultOptions, streamIdleTimeout(), observationRegistry);
        return new HertzBeatModel(chatModel,
                (request, toolCallbacks) -> requestOptions(config, request, toolCallbacks), AgentModelBinding.of(config));
    }

    ChatOptions requestOptions(ModelProviderConfig config, AgentRuntimeModelRequest request,
                               List<ToolCallback> toolCallbacks) {
        if (AgentModelProtocol.parse(config.getProtocol()) == AgentModelProtocol.RESPONSES) {
            var builder = org.springframework.ai.openai.responses.OpenAiResponsesChatOptions.builder()
                    .model(config.getModel());
            if (request.getTemperature() != null) {
                builder.temperature(request.getTemperature());
            }
            if (request.getMaxCompletionTokens() != null) {
                builder.maxOutputTokens(request.getMaxCompletionTokens());
            }
            if (!toolCallbacks.isEmpty()) {
                builder.toolCallbacks(toolCallbacks);
                if (request.isToolCallRequired()) {
                    builder.toolChoice("required");
                }
            }
            return builder.build();
        }
        OpenAiChatOptions.Builder builder = OpenAiChatOptions.builder()
                .model(config.getModel())
                // Per-request options must not resurrect the SDK default retry policy (3 hidden attempts).
                .maxRetries(0);
        if (request.getTemperature() != null) {
            builder.temperature(request.getTemperature());
        }
        if (request.getMaxCompletionTokens() != null) {
            builder.maxCompletionTokens(request.getMaxCompletionTokens());
        }
        if (!toolCallbacks.isEmpty()) {
            builder.toolCallbacks(toolCallbacks);
            if (request.isToolCallRequired()) {
                builder.toolChoice("required");
            }
        }
        return builder.build();
    }

    private void completeAndValidate(ModelProviderConfig config) {
        AgentModelProtocol.parse(config.getProtocol());
        if (!StringUtils.hasText(config.getApiKey())) {
            throw new IllegalArgumentException("OpenAI-compatible provider API key must not be blank");
        }
        // Preset codes originate from UI selections and configuration inputs and are case-insensitive identifiers.
        String code = StringUtils.hasText(config.getCode())
                ? config.getCode().trim().toLowerCase(Locale.ROOT) : "openai";
        config.setCode(code);
        config.setType(TYPE);
        if (!StringUtils.hasText(config.getBaseUrl())) {
            config.setBaseUrl(defaultBaseUrl(code));
        }
        if (!StringUtils.hasText(config.getModel())) {
            config.setModel(defaultModel(code));
        }
    }

    private String defaultBaseUrl(String code) {
        return switch (code) {
            case "openai", TYPE -> DEFAULT_OPENAI_BASE_URL;
            case "openrouter" -> DEFAULT_OPENROUTER_BASE_URL;
            case "siliconflow" -> DEFAULT_SILICONFLOW_BASE_URL;
            case "zhipu", "bigmodel" -> DEFAULT_ZHIPU_BASE_URL;
            case "zai" -> DEFAULT_ZAI_BASE_URL;
            default -> throw new IllegalArgumentException(
                    "OpenAI-compatible provider base URL must not be blank for preset: " + code);
        };
    }

    private String defaultModel(String code) {
        return switch (code) {
            case "openai", TYPE -> DEFAULT_OPENAI_MODEL;
            case "siliconflow" -> DEFAULT_SILICONFLOW_MODEL;
            case "zhipu", "bigmodel", "zai" -> DEFAULT_GLM_MODEL;
            default -> throw new IllegalArgumentException(
                    "OpenAI-compatible provider model must not be blank for preset: " + code);
        };
    }
}
