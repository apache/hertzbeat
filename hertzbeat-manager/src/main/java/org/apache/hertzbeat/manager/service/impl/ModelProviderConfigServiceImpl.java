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

import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfigState;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.support.event.AiProviderConfigChangeEvent;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.service.ModelProviderConfigurationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import tools.jackson.core.type.TypeReference;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Persists saved LLM provider configurations and their active selection. */
@Service
public class ModelProviderConfigServiceImpl extends AbstractGeneralConfigServiceImpl<ModelProviderConfigState>
        implements ModelProviderConfigurationService {

    @Autowired(required = false)
    private ApplicationContext applicationContext;

    public ModelProviderConfigServiceImpl(GeneralConfigDao generalConfigDao) {
        super(generalConfigDao);
    }

    @Override
    public String type() {
        return GeneralConfigTypeEnum.provider.name();
    }

    @Override
    public ModelProviderConfigState getState() {
        return copyState(getConfig());
    }

    @Override
    public ModelProviderConfig getConfiguration(String uid) {
        return decryptedConfiguration(findConfiguration(getConfig(), uid));
    }

    @Override
    public ModelProviderConfig getActiveConfiguration() {
        ModelProviderConfig activeConfiguration = activeConfiguration(getConfig());
        return activeConfiguration == null ? null : decryptedConfiguration(activeConfiguration);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ModelProviderConfigState createConfiguration(ModelProviderConfig config) {
        Objects.requireNonNull(config, "model provider config is required");
        ModelProviderConfigState state = getConfig();
        ModelProviderConfig savedConfig = copyConfiguration(config);
        savedConfig.setUid(UUID.randomUUID().toString());
        state.getProviders().add(savedConfig);
        saveConfig(state);
        return getState();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ModelProviderConfigState updateConfiguration(String uid, ModelProviderConfig config) {
        if (!StringUtils.hasText(uid)) {
            throw new IllegalArgumentException("Model provider configuration UID is required");
        }
        Objects.requireNonNull(config, "model provider config is required");
        ModelProviderConfigState state = getConfig();
        ModelProviderConfig previous = findConfiguration(state, uid);
        ModelProviderConfig replacement = copyConfiguration(config);
        replacement.setUid(uid);
        boolean sameProvider = Objects.equals(previous.getCode(), replacement.getCode())
                && Objects.equals(previous.getType(), replacement.getType());
        if (!StringUtils.hasText(replacement.getApiKey()) && sameProvider) {
            replacement.setApiKey(previous.getApiKey());
        }
        if (replacement.getHeaders() == null) {
            replacement.setHeaders(previous.getHeaders());
        } else {
            replacement
                    .getHeaders()
                    .replaceAll(
                            (name, value) ->
                                    !StringUtils.hasText(value) && previous.getHeaders() != null
                                            ? previous.getHeaders().get(name)
                                            : value);
        }
        int index = state.getProviders().indexOf(previous);
        state.getProviders().set(index, replacement);
        saveConfig(state);
        return getState();
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
        return getState();
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
        return getState();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveConfig(ModelProviderConfigState state) {
        super.saveConfig(encryptedState(state));
        if (applicationContext != null) {
            Runnable publish =
                    () ->
                            applicationContext.publishEvent(
                                    new AiProviderConfigChangeEvent(applicationContext));
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(
                        new TransactionSynchronization() {
                            @Override
                            public void afterCommit() {
                                publish.run();
                            }
                        });
            } else {
                publish.run();
            }
        }
    }

    @Override
    public ModelProviderConfigState getConfig() {
        GeneralConfig generalConfig = generalConfigDao.findByType(type());
        if (generalConfig == null || !StringUtils.hasText(generalConfig.getContent())) {
            return emptyState();
        }
        Map<?, ?> json = JsonUtil.fromJson(generalConfig.getContent(), Map.class);
        if (json == null) {
            throw new IllegalStateException("Invalid model provider configuration state");
        }
        if (!json.containsKey("providers") && !json.containsKey("activeProviderUid")) {
            ModelProviderConfig legacy =
                    JsonUtil.fromJson(generalConfig.getContent(), ModelProviderConfig.class);
            legacy.setUid("legacy-provider");
            if (!StringUtils.hasText(legacy.getType())) {
                legacy.setType("openai-compatible");
            }
            return new ModelProviderConfigState(legacy.getUid(), new ArrayList<>(List.of(legacy)));
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
            persistedProviders = List.of();
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
            throw new IllegalStateException("Active model provider configuration is missing");
        }
        state.setProviders(new ArrayList<>(persistedProviders));
        return state;
    }

    private ModelProviderConfigState emptyState() {
        return new ModelProviderConfigState(null, new ArrayList<>());
    }

    private ModelProviderConfigState encryptedState(ModelProviderConfigState state) {
        Objects.requireNonNull(state, "model provider configuration state is required");
        List<ModelProviderConfig> providers = state.getProviders() == null
                ? List.of()
                : state.getProviders();
        List<ModelProviderConfig> encryptedProviders = new ArrayList<>(providers.size());
        for (ModelProviderConfig provider : providers) {
            ModelProviderConfig encrypted = copyConfiguration(provider);
            encrypted.setApiKey(encryptSecret(encrypted.getApiKey()));
            if (encrypted.getHeaders() != null) {
                encrypted.getHeaders().replaceAll((name, value) -> encryptSecret(value));
            }
            encryptedProviders.add(encrypted);
        }
        return new ModelProviderConfigState(state.getActiveProviderUid(), encryptedProviders);
    }

    private ModelProviderConfigState copyState(ModelProviderConfigState state) {
        List<ModelProviderConfig> providers = state.getProviders().stream()
                .map(this::copyConfiguration)
                .toList();
        return new ModelProviderConfigState(state.getActiveProviderUid(), new ArrayList<>(providers));
    }

    private String encryptSecret(String secret) {
        if (!StringUtils.hasText(secret) || AesUtil.isCiphertext(secret) || AesUtil.isEncryptedPayload(secret)) {
            return secret;
        }
        String encrypted = AesUtil.aesEncode(secret);
        if (!AesUtil.isCiphertext(encrypted)) {
            throw new IllegalStateException("Model provider secret encryption failed");
        }
        return encrypted;
    }

    private ModelProviderConfig decryptedConfiguration(ModelProviderConfig persisted) {
        ModelProviderConfig copy = copyConfiguration(persisted);
        copy.setApiKey(decryptSecret(copy.getApiKey()));
        if (copy.getHeaders() != null) {
            copy.getHeaders().replaceAll((name, value) -> decryptSecret(value));
        }
        return copy;
    }

    private String decryptSecret(String ciphertext) {
        if (!StringUtils.hasText(ciphertext) || !AesUtil.isEncryptedPayload(ciphertext)) {
            return ciphertext;
        }
        if (!AesUtil.isCiphertext(ciphertext)) {
            throw new IllegalStateException("Model provider secret cannot be decrypted with the configured AES key");
        }
        String plaintext = AesUtil.aesDecode(ciphertext);
        if (Objects.equals(ciphertext, plaintext)) {
            throw new IllegalStateException("Model provider secret decryption failed");
        }
        return plaintext;
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
        return source.copy();
    }
}
