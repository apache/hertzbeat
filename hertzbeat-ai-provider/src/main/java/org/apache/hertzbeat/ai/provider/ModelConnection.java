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

package org.apache.hertzbeat.ai.provider;

import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.util.Map;
import java.util.Set;

/** Validates a connection without issuing a request or mutating its selection. */
public final class ModelConnection {
    public static final Set<String> PROTOCOLS =
            Set.of("openai-chat", "openai-responses", "anthropic-messages");

    private ModelConnection() {}

    public static String protocol(ModelProviderConfig config) {
        return StringUtils.hasText(config.getProtocol()) ? config.getProtocol() : "openai-chat";
    }

    public static String authMode(ModelProviderConfig config) {
        return StringUtils.hasText(config.getAuthMode()) ? config.getAuthMode() : "default";
    }

    public static ModelProviderConfig validate(ModelProviderConfig input) {
        ModelProviderConfig config = input.copy();
        if (!StringUtils.hasText(config.getProtocol())) {
            legacyDefaults(config);
        } else if (!StringUtils.hasText(config.getName())) {
            throw new IllegalArgumentException("Connection name is required");
        }
        if (!PROTOCOLS.contains(protocol(config))) {
            throw new IllegalArgumentException("Unsupported model protocol");
        }
        if (!StringUtils.hasText(config.getModel())) {
            throw new IllegalArgumentException("Model is required");
        }
        endpoint(config);
        String auth = authMode(config);
        if (!Set.of("default", "custom-header", "none").contains(auth)) {
            throw new IllegalArgumentException("Unsupported authentication mode");
        }
        if ("default".equals(auth) && !StringUtils.hasText(config.getApiKey())) {
            throw new IllegalArgumentException("API key is required for default authentication");
        }
        Map<String, String> headers = config.getHeaders() == null ? Map.of() : config.getHeaders();
        if ("custom-header".equals(auth) && headers.isEmpty()) {
            throw new IllegalArgumentException("Custom authentication headers are required");
        }
        headers.forEach(
                (name, value) -> {
                    if (name == null
                            || !name.matches("[!#$%&'*+.^_`|~0-9a-zA-Z-]+")
                            || value == null
                            || value.isBlank()
                            || value.contains("\r")
                            || value.contains("\n")) {
                        throw new IllegalArgumentException("Invalid custom header");
                    }
                    if (Set.of("host", "content-length", "content-type", "accept", "connection")
                            .contains(name.toLowerCase(java.util.Locale.ROOT))) {
                        throw new IllegalArgumentException("Reserved custom header");
                    }
                    if ((name.equalsIgnoreCase("authorization")
                                    || name.equalsIgnoreCase("x-api-key"))
                            && !"custom-header".equals(auth)) {
                        throw new IllegalArgumentException(
                                "Authentication headers require custom-header mode");
                    }
                });
        return config;
    }

    public static String endpoint(ModelProviderConfig config) {
        if (!StringUtils.hasText(config.getBaseUrl())) {
            throw new IllegalArgumentException("Base URL is required");
        }
        URI uri;
        try {
            uri = URI.create(config.getBaseUrl().trim());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid model base URL");
        }
        if (!("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))
                || uri.getHost() == null
                || uri.getUserInfo() != null
                || uri.getQuery() != null
                || uri.getFragment() != null) {
            throw new IllegalArgumentException(
                    "Model URL must be HTTP(S), without credentials, query or fragment");
        }
        String base = uri.toString().replaceAll("/+$", "");
        String suffix = switch (protocol(config)) {
            case "openai-chat" -> "/chat/completions";
            case "openai-responses" -> "/responses";
            case "anthropic-messages" -> "/messages";
            default -> throw new IllegalArgumentException("Unsupported model protocol");
        };
        return base.endsWith(suffix) ? base : base + suffix;
    }

    private static void legacyDefaults(ModelProviderConfig config) {
        String code =
                StringUtils.hasText(config.getCode())
                        ? config.getCode().toLowerCase(java.util.Locale.ROOT)
                        : "openai";
        if (!StringUtils.hasText(config.getBaseUrl())) {
            config.setBaseUrl(
                switch (code) {
                    case "zhipu", "bigmodel" -> "https://open.bigmodel.cn/api/paas/v4";
                    case "zai" -> "https://api.z.ai/api/paas/v4";
                    case "openrouter" -> "https://openrouter.ai/api/v1";
                    case "siliconflow" -> "https://api.siliconflow.cn/v1";
                    case "openai", "openai-compatible" -> "https://api.openai.com/v1";
                    default -> throw new IllegalArgumentException("Base URL is required");
                });
        }
        if (!StringUtils.hasText(config.getModel())) {
            config.setModel(
                switch (code) {
                    case "zhipu", "bigmodel", "zai" -> "glm-4.6";
                    case "siliconflow" -> "deepseek-ai/DeepSeek-V3.2";
                    case "openai", "openai-compatible" -> "gpt-5";
                    default -> throw new IllegalArgumentException("Model is required");
                });
        }
    }
}
