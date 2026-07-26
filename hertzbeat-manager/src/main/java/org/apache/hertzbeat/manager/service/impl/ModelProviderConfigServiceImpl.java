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

package org.apache.hertzbeat.manager.service.impl;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfigState;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.service.ModelProviderConfigurationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import tools.jackson.core.type.TypeReference;

/**
 * Persists saved LLM provider configurations and their active selection.
 */
@Service
public class ModelProviderConfigServiceImpl extends AbstractGeneralConfigServiceImpl<ModelProviderConfigState>
        implements ModelProviderConfigurationService {

    public ModelProviderConfigServiceImpl(GeneralConfigDao generalConfigDao) {
        super(generalConfigDao);
    }

    @Override
    public String type() {
        return GeneralConfigTypeEnum.provider.name();
    }

    @Override
    public ModelProviderConfigState getState() {
        return getConfig();
    }

    @Override
    public ModelProviderConfig getConfiguration(String uid) {
        return copyConfiguration(findConfiguration(getConfig(), uid));
    }

    @Override
    public ModelProviderConfig getActiveConfiguration() {
        ModelProviderConfig activeConfiguration = activeConfiguration(getConfig());
        return activeConfiguration == null ? null : copyConfiguration(activeConfiguration);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ModelProviderConfigState createConfiguration(ModelProviderConfig config) {
        // Commands supply the configuration, while this persistence boundary owns its stable identity.
        Objects.requireNonNull(config, "model provider config is required");
        ModelProviderConfigState state = getConfig();
        ModelProviderConfig savedConfig = copyConfiguration(config);
        savedConfig.setUid(UUID.randomUUID().toString());
        state.getProviders().add(savedConfig);
        saveConfig(state);
        return getConfig();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ModelProviderConfigState updateConfiguration(String uid, ModelProviderConfig config) {
        if (!StringUtils.hasText(uid)) {
            throw new IllegalArgumentException("Model provider configuration UID is required");
        }
        // Commands supply the replacement fields, while this boundary preserves an omitted stored secret.
        Objects.requireNonNull(config, "model provider config is required");
        ModelProviderConfigState state = getConfig();
        ModelProviderConfig previous = findConfiguration(state, uid);
        ModelProviderConfig replacement = copyConfiguration(config);
        replacement.setUid(uid);
        boolean sameProvider = Objects.equals(previous.getCode(), replacement.getCode())
                && Objects.equals(previous.getType(), replacement.getType());
        if (!StringUtils.hasText(replacement.getApiKey())
                && sameProvider) {
            replacement.setApiKey(previous.getApiKey());
        }
        int index = state.getProviders().indexOf(previous);
        state.getProviders().set(index, replacement);
        saveConfig(state);
        return getConfig();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ModelProviderConfigState deleteConfiguration(String uid) {
        ModelProviderConfigState state = getConfig();
        ModelProviderConfig config = findConfiguration(state, uid);
        state.getProviders().remove(config);
        if (Objects.equals(uid, state.getActiveProviderUid())) {
            state.setActiveProviderUid(null);
        }
        saveConfig(state);
        return getConfig();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ModelProviderConfigState switchActiveConfiguration(String uid) {
        ModelProviderConfigState state = getConfig();
        if (StringUtils.hasText(uid)) {
            findConfiguration(state, uid);
        }
        if (Objects.equals(state.getActiveProviderUid(), uid)) {
            return state;
        }
        state.setActiveProviderUid(uid);
        saveConfig(state);
        return getConfig();
    }

    @Override
    public ModelProviderConfigState getConfig() {
        GeneralConfig generalConfig = generalConfigDao.findByType(type());
        if (generalConfig == null || !StringUtils.hasText(generalConfig.getContent())) {
            return emptyState();
        }
        return normalizeState(JsonUtil.fromJson(generalConfig.getContent(), getTypeReference()));
    }

    @Override
    protected TypeReference<ModelProviderConfigState> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return ModelProviderConfigState.class;
            }
        };
    }

    private ModelProviderConfigState normalizeState(ModelProviderConfigState state) {
        if (state == null) {
            throw new IllegalStateException("Invalid model provider configuration state");
        }
        List<ModelProviderConfig> persistedProviders = state.getProviders();
        if (persistedProviders == null) {
            state.setProviders(new ArrayList<>());
            state.setActiveProviderUid(null);
            return state;
        }
        Set<String> providerUids = new HashSet<>();
        for (ModelProviderConfig provider : persistedProviders) {
            if (provider == null) {
                throw new IllegalStateException("Model provider configuration must not be null");
            }
            if (!StringUtils.hasText(provider.getUid())) {
                throw new IllegalStateException("Model provider configuration UID must not be blank");
            }
            if (!providerUids.add(provider.getUid())) {
                throw new IllegalStateException("Duplicate model provider configuration UID: " + provider.getUid());
            }
        }
        if (StringUtils.hasText(state.getActiveProviderUid())
                && !providerUids.contains(state.getActiveProviderUid())) {
            state.setActiveProviderUid(null);
        }
        state.setProviders(new ArrayList<>(persistedProviders));
        return state;
    }

    private ModelProviderConfigState emptyState() {
        return new ModelProviderConfigState(
                null,
                new ArrayList<>());
    }

    private ModelProviderConfig findConfiguration(ModelProviderConfigState state, String uid) {
        if (!StringUtils.hasText(uid)) {
            throw new IllegalArgumentException("Model provider configuration UID is required");
        }
        return state.getProviders().stream()
                .filter(config -> uid.equals(config.getUid()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Model provider configuration does not exist: " + uid));
    }

    private ModelProviderConfig activeConfiguration(ModelProviderConfigState state) {
        if (state == null || !StringUtils.hasText(state.getActiveProviderUid())) {
            return null;
        }
        return findConfiguration(state, state.getActiveProviderUid());
    }

    private ModelProviderConfig copyConfiguration(ModelProviderConfig source) {
        ModelProviderConfig copy = new ModelProviderConfig();
        copy.setUid(source.getUid());
        copy.setType(source.getType());
        copy.setCode(source.getCode());
        copy.setBaseUrl(source.getBaseUrl());
        copy.setModel(source.getModel());
        copy.setApiKey(source.getApiKey());
        return copy;
    }
}
