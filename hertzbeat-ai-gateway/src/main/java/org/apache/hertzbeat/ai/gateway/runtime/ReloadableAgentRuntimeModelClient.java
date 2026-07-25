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

import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelProviderRegistry;
import org.apache.hertzbeat.alert.service.AgentClientAvailability;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.support.event.AiProviderConfigChangeEvent;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Runtime model client that atomically follows HertzBeat provider configuration changes.
 */
@Slf4j
@Component
public class ReloadableAgentRuntimeModelClient implements AgentRuntimeModelClient, AgentClientAvailability {

    private static final String DEFAULT_PROVIDER_TYPE = "openai-compatible";

    private final GeneralConfigDao generalConfigDao;
    private final AgentProviderProperties providerProperties;
    private final AgentModelProviderRegistry providerRegistry;
    private final AtomicReference<HertzBeatModel> model = new AtomicReference<>();

    public ReloadableAgentRuntimeModelClient(GeneralConfigDao generalConfigDao,
                                             AgentProviderProperties providerProperties,
                                             AgentModelProviderRegistry providerRegistry) {
        this.generalConfigDao = generalConfigDao;
        this.providerProperties = providerProperties;
        this.providerRegistry = providerRegistry;
        try {
            reload();
        } catch (RuntimeException exception) {
            log.error("Failed to initialize Agent Gateway model provider", exception);
        }
    }

    @Override
    public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request, AgentRuntimeControl control,
                                            Consumer<String> textDeltaConsumer) {
        HertzBeatModel current = model.get();
        if (current == null) {
            throw new IllegalStateException("Agent Gateway runtime model provider is not configured");
        }
        return current.stream(request, control, textDeltaConsumer);
    }

    @Override
    public boolean isAgentClientConfigured() {
        return model.get() != null;
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
            model.set(null);
            return;
        }
        HertzBeatModel replacement = providerRegistry.createModel(provider);
        model.set(replacement);
        log.info("Agent Gateway model provider reloaded: type={}, preset={}, model={}",
                provider.getType(), provider.getCode(), provider.getModel());
    }

    private ModelProviderConfig databaseProvider() {
        GeneralConfig config = generalConfigDao.findByType(GeneralConfigTypeEnum.provider.name());
        if (config == null || !StringUtils.hasText(config.getContent())) {
            return null;
        }
        ModelProviderConfig provider = JsonUtil.fromJson(config.getContent(), ModelProviderConfig.class);
        if (provider == null) {
            log.warn("Ignoring invalid AI provider configuration from database");
            return null;
        }
        return provider;
    }

    private ModelProviderConfig propertyProvider() {
        boolean defaultEmptyConfig = DEFAULT_PROVIDER_TYPE.equalsIgnoreCase(providerProperties.getType())
                && !StringUtils.hasText(providerProperties.getCode())
                && !StringUtils.hasText(providerProperties.getBaseUrl())
                && !StringUtils.hasText(providerProperties.getModel())
                && !StringUtils.hasText(providerProperties.getApiKey());
        if (defaultEmptyConfig) {
            return null;
        }
        ModelProviderConfig provider = new ModelProviderConfig();
        provider.setType(providerProperties.getType());
        provider.setCode(providerProperties.getCode());
        provider.setBaseUrl(providerProperties.getBaseUrl());
        provider.setModel(providerProperties.getModel());
        provider.setApiKey(providerProperties.getApiKey());
        return provider;
    }
}
