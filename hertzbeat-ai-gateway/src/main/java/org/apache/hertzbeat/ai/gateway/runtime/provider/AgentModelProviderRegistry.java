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

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.runtime.HertzBeatModel;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Resolves configured model provider types to their Spring AI-backed implementations.
 */
@Component
public class AgentModelProviderRegistry {

    private final Map<String, AgentModelProvider> providers;
    private final List<AgentModelProviderOption> options;

    public AgentModelProviderRegistry(List<AgentModelProvider> providers) {
        // Spring supplies every provider bean at this composition boundary; a missing list is a wiring error.
        Objects.requireNonNull(providers, "providers must not be null");
        Map<String, AgentModelProvider> registered = new LinkedHashMap<>();
        List<AgentModelProviderOption> registeredOptions = new java.util.ArrayList<>();
        Set<String> registeredOptionIds = new LinkedHashSet<>();
        for (AgentModelProvider provider : providers) {
            // Provider beans are runtime extensions and must be complete before they enter the registry.
            Objects.requireNonNull(provider, "provider must not be null");
            if (!StringUtils.hasText(provider.type())) {
                throw new IllegalArgumentException("Agent model provider type must not be blank");
            }
            // Provider type identifiers originate from configuration and Spring beans and are case-insensitive.
            String type = provider.type().trim().toLowerCase(Locale.ROOT);
            AgentModelProvider previous = registered.putIfAbsent(type, provider);
            if (previous != null) {
                throw new IllegalArgumentException("Duplicate Agent model provider type: " + type);
            }
            List<AgentModelProviderOption> providerOptions = provider.options();
            // Provider options form a public configuration contract and cannot be omitted by an implementation.
            Objects.requireNonNull(providerOptions, "provider options must not be null");
            if (providerOptions.isEmpty()) {
                throw new IllegalArgumentException("Agent model provider must expose at least one option: " + type);
            }
            for (AgentModelProviderOption option : providerOptions) {
                validateOption(type, option, registeredOptionIds);
                registeredOptions.add(option);
            }
        }
        if (registered.isEmpty()) {
            throw new IllegalArgumentException("At least one Agent model provider is required");
        }
        this.providers = Map.copyOf(registered);
        this.options = List.copyOf(registeredOptions);
    }

    /**
     * List configuration presets contributed by all registered providers.
     *
     * @return immutable provider option list
     */
    public List<AgentModelProviderOption> options() {
        return options;
    }

    /**
     * Create a HertzBeat model for the configured provider type.
     *
     * @param config effective provider configuration
     * @return configured HertzBeat model
     */
    public HertzBeatModel createModel(ModelProviderConfig config) {
        // Provider configuration is mandatory once a config source has selected it.
        Objects.requireNonNull(config, "provider config must not be null");
        String type = resolveType(config);
        AgentModelProvider provider = providers.get(type);
        if (provider == null) {
            throw new IllegalArgumentException("Unsupported Agent model provider type: " + type);
        }
        return provider.createModel(config);
    }

    String resolveType(ModelProviderConfig config) {
        String configuredType = config.getType();
        if (!StringUtils.hasText(configuredType)) {
            throw new IllegalArgumentException("Agent model provider type must not be blank");
        }
        // Provider types are persisted identifiers and are matched case-insensitively at the registry boundary.
        return configuredType.trim().toLowerCase(Locale.ROOT);
    }

    private void validateOption(String providerType, AgentModelProviderOption option, Set<String> registeredOptionIds) {
        // Options are supplied by provider extensions and must be complete before being exposed through the API.
        Objects.requireNonNull(option, "provider option must not be null");
        if (!providerType.equals(option.type())) {
            throw new IllegalArgumentException("Agent model provider option type must match its provider: " + providerType);
        }
        if (!StringUtils.hasText(option.code()) || !StringUtils.hasText(option.label())) {
            throw new IllegalArgumentException("Agent model provider option code and label must not be blank");
        }
        String optionId = providerType + ":" + option.code();
        if (!registeredOptionIds.add(optionId)) {
            throw new IllegalArgumentException("Duplicate Agent model provider option: " + optionId);
        }
    }
}
