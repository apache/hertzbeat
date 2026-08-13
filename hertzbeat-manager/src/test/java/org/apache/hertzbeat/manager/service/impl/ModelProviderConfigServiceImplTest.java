/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfigState;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.core.type.TypeReference;

/** Secret-at-rest contracts for model provider configurations. */
@ExtendWith(MockitoExtension.class)
class ModelProviderConfigServiceImplTest {

    private static final String API_KEY = "provider-secret-value";

    @Mock
    private GeneralConfigDao generalConfigDao;

    private AtomicReference<GeneralConfig> stored;
    private ModelProviderConfigServiceImpl service;

    @BeforeEach
    void setUp() {
        stored = new AtomicReference<>();
        when(generalConfigDao.findByType("provider")).thenAnswer(invocation -> stored.get());
        lenient().when(generalConfigDao.save(any(GeneralConfig.class))).thenAnswer(invocation -> {
            GeneralConfig config = invocation.getArgument(0);
            stored.set(config);
            return config;
        });
        service = new ModelProviderConfigServiceImpl(generalConfigDao);
    }

    @AfterEach
    void restoreSecretKey() {
        AesUtil.setDefaultSecretKey(AesUtil.DEFAULT_ENCODE_RULES);
    }

    @Test
    void createEncryptsApiKeyAtRestAndDecryptsOnlyForRuntimeUse() {
        ModelProviderConfig request = provider(API_KEY);
        assertFalse(request.toString().contains(API_KEY));

        ModelProviderConfigState state = service.createConfiguration(request);
        String content = stored.get().getContent();
        assertFalse(content.contains(API_KEY));

        ModelProviderConfig persisted = persistedState(content).getProviders().getFirst();
        assertTrue(AesUtil.isCiphertext(persisted.getApiKey()));
        assertEquals(API_KEY, AesUtil.aesDecode(persisted.getApiKey()));
        assertTrue(AesUtil.isCiphertext(state.getProviders().getFirst().getApiKey()));
        assertEquals(API_KEY, service.getConfiguration(persisted.getUid()).getApiKey());
    }

    @Test
    void blankUpdatePreservesExistingCiphertextWithoutExposingIt() {
        ModelProviderConfigState created = service.createConfiguration(provider(API_KEY));
        String uid = created.getProviders().getFirst().getUid();
        String ciphertext = persistedState(stored.get().getContent()).getProviders().getFirst().getApiKey();

        service.updateConfiguration(uid, provider(""));

        assertEquals(ciphertext, persistedState(stored.get().getContent()).getProviders().getFirst().getApiKey());
        assertEquals(API_KEY, service.getConfiguration(uid).getApiKey());
    }

    @Test
    void encryptionFailureNeverPersistsPlaintext() {
        AesUtil.setDefaultSecretKey("invalid-key");

        assertThrows(IllegalStateException.class, () -> service.createConfiguration(provider(API_KEY)));

        verify(generalConfigDao, never()).save(any(GeneralConfig.class));
    }

    private ModelProviderConfig provider(String apiKey) {
        ModelProviderConfig config = new ModelProviderConfig();
        config.setType("openai-compatible");
        config.setCode("openai");
        config.setBaseUrl("https://provider.invalid");
        config.setModel("model");
        config.setApiKey(apiKey);
        return config;
    }

    private ModelProviderConfigState persistedState(String content) {
        return JsonUtil.fromJson(content, new TypeReference<>() { });
    }
}
