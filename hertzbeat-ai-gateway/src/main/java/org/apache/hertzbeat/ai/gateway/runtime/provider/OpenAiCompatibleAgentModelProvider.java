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

import java.util.List;
import java.util.Locale;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeModelRequest;
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

    private static final String DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
    private static final String DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
    private static final String DEFAULT_ZHIPU_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
    private static final String DEFAULT_ZAI_BASE_URL = "https://api.z.ai/api/paas/v4";

    @Override
    public String type() {
        return TYPE;
    }

    @Override
    public HertzBeatModel createModel(ModelProviderConfig config) {
        completeAndValidate(config);
        OpenAiChatOptions defaultOptions = OpenAiChatOptions.builder()
                .baseUrl(config.getBaseUrl())
                .apiKey(config.getApiKey())
                .model(config.getModel())
                .build();
        OpenAiChatModel chatModel = OpenAiChatModel.builder()
                .options(defaultOptions)
                .build();
        return new HertzBeatModel(chatModel, this::requestOptions);
    }

    ChatOptions requestOptions(AgentRuntimeModelRequest request, List<ToolCallback> toolCallbacks) {
        OpenAiChatOptions.Builder builder = OpenAiChatOptions.builder();
        if (request.getTemperature() != null) {
            builder.temperature(request.getTemperature());
        }
        if (request.getMaxCompletionTokens() != null) {
            builder.maxCompletionTokens(request.getMaxCompletionTokens());
        }
        if (!toolCallbacks.isEmpty()) {
            builder.toolCallbacks(toolCallbacks);
        }
        return builder.build();
    }

    private void completeAndValidate(ModelProviderConfig config) {
        if (!StringUtils.hasText(config.getApiKey())) {
            throw new IllegalArgumentException("OpenAI-compatible provider API key must not be blank");
        }
        // Preset codes originate from UI selections and legacy records and are case-insensitive identifiers.
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
            case "zhipu", "bigmodel" -> DEFAULT_ZHIPU_BASE_URL;
            case "zai" -> DEFAULT_ZAI_BASE_URL;
            default -> throw new IllegalArgumentException(
                    "OpenAI-compatible provider base URL must not be blank for preset: " + code);
        };
    }

    private String defaultModel(String code) {
        return switch (code) {
            case "openai", TYPE -> "gpt-5";
            case "zhipu", "bigmodel", "zai" -> "glm-4.6";
            default -> throw new IllegalArgumentException(
                    "OpenAI-compatible provider model must not be blank for preset: " + code);
        };
    }
}
