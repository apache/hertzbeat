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

import java.util.Locale;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.support.event.AiProviderConfigChangeEvent;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.context.event.EventListener;
import org.springframework.util.StringUtils;

/**
 * Runtime model client that atomically follows HertzBeat provider configuration changes.
 */
@Slf4j
public class ReloadableAgentRuntimeModelClient implements AgentRuntimeModelClient {

    private static final String DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
    private static final String DEFAULT_ZHIPU_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
    private static final String DEFAULT_ZAI_BASE_URL = "https://api.z.ai/api/paas/v4";

    private final GeneralConfigDao generalConfigDao;
    private final AgentRuntimeProperties properties;
    private final AgentRuntimeModelClient fallbackClient;
    private final AtomicReference<AgentRuntimeModelClient> delegate = new AtomicReference<>();

    public ReloadableAgentRuntimeModelClient(GeneralConfigDao generalConfigDao,
                                             AgentRuntimeProperties properties,
                                             ChatModel fallbackChatModel) {
        this.generalConfigDao = generalConfigDao;
        this.properties = properties;
        this.fallbackClient = fallbackChatModel == null ? null : new SpringAiAgentRuntimeModelClient(fallbackChatModel);
        try {
            reload();
        } catch (RuntimeException exception) {
            log.error("Failed to initialize Agent Gateway model provider", exception);
            delegate.set(fallbackClient);
        }
    }

    @Override
    public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request, AgentRuntimeControl control,
                                            Consumer<String> textDeltaConsumer) {
        AgentRuntimeModelClient client = delegate.get();
        if (client == null) {
            throw new IllegalStateException("Agent Gateway runtime model provider is not configured");
        }
        return client.stream(request, control, textDeltaConsumer);
    }

    @Override
    public boolean isAgentClientConfigured() {
        return delegate.get() != null;
    }

    @EventListener(AiProviderConfigChangeEvent.class)
    public void onProviderConfigChanged() {
        try {
            reload();
        } catch (RuntimeException exception) {
            log.error("Failed to reload Agent Gateway model provider; keeping the previous provider", exception);
        }
    }

    void reload() {
        ModelProviderConfig provider = databaseProvider();
        if (provider == null) {
            provider = propertyProvider();
        }
        if (provider == null) {
            delegate.set(fallbackClient);
            return;
        }
        AgentRuntimeModelClient replacement = new SpringAiAgentRuntimeModelClient(createChatModel(provider));
        delegate.set(replacement);
        properties.setProvider(provider.getCode());
        properties.setModel(provider.getModel());
        properties.setBaseUrl(provider.getBaseUrl());
        log.info("Agent Gateway model provider reloaded: provider={}, model={}",
                provider.getCode(), provider.getModel());
    }

    AgentRuntimeModelClient currentClient() {
        return delegate.get();
    }

    private ModelProviderConfig databaseProvider() {
        GeneralConfig config = generalConfigDao.findByType(GeneralConfigTypeEnum.provider.name());
        if (config == null || !StringUtils.hasText(config.getContent())) {
            return null;
        }
        ModelProviderConfig provider = JsonUtil.fromJson(config.getContent(), ModelProviderConfig.class);
        if (provider == null || !StringUtils.hasText(provider.getApiKey())) {
            log.warn("Ignoring incomplete AI provider configuration from database");
            return null;
        }
        complete(provider);
        return provider;
    }

    private ModelProviderConfig propertyProvider() {
        if (!StringUtils.hasText(properties.getApiKey()) || !StringUtils.hasText(properties.getModel())) {
            return null;
        }
        ModelProviderConfig provider = new ModelProviderConfig();
        provider.setCode(properties.getProvider());
        provider.setBaseUrl(properties.getBaseUrl());
        provider.setModel(properties.getModel());
        provider.setApiKey(properties.getApiKey());
        complete(provider);
        return provider;
    }

    private void complete(ModelProviderConfig provider) {
        // Provider codes originate from UI selections and are case-insensitive identifiers at this boundary.
        String code = StringUtils.hasText(provider.getCode())
                ? provider.getCode().trim().toLowerCase(Locale.ROOT) : "openai-compatible";
        provider.setCode(code);
        if (!StringUtils.hasText(provider.getBaseUrl())) {
            provider.setBaseUrl(switch (code) {
                case "openai" -> DEFAULT_OPENAI_BASE_URL;
                case "zhipu", "bigmodel" -> DEFAULT_ZHIPU_BASE_URL;
                case "zai" -> DEFAULT_ZAI_BASE_URL;
                default -> DEFAULT_OPENAI_BASE_URL;
            });
        }
        if (!StringUtils.hasText(provider.getModel())) {
            provider.setModel(switch (code) {
                case "zhipu", "bigmodel", "zai" -> "glm-4.6";
                default -> "gpt-5";
            });
        }
    }

    private ChatModel createChatModel(ModelProviderConfig provider) {
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .baseUrl(provider.getBaseUrl())
                .apiKey(provider.getApiKey())
                .model(provider.getModel())
                .temperature(properties.getTemperature())
                .maxCompletionTokens(properties.getMaxCompletionTokens())
                .build();
        return OpenAiChatModel.builder()
                .options(options)
                .build();
    }
}
