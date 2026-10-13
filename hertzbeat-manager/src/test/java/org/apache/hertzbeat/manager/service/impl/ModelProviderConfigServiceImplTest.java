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

import java.util.concurrent.atomic.AtomicReference;

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

    @Test
    void undecryptableCiphertextFailsInsteadOfLeakingToRuntime() {
        AesUtil.setDefaultSecretKey("0123456789abcdef");
        ModelProviderConfigState created = service.createConfiguration(provider(API_KEY));
        String uid = created.getProviders().getFirst().getUid();
        String ciphertext = persistedState(stored.get().getContent()).getProviders().getFirst().getApiKey();

        AesUtil.setDefaultSecretKey("fedcba9876543210");

        assertThrows(IllegalStateException.class, () -> service.getConfiguration(uid));

        service.updateConfiguration(uid, provider(""));

        assertEquals(ciphertext, persistedState(stored.get().getContent()).getProviders().getFirst().getApiKey());
    }

    @Test
    void legacySingleProviderRemainsActiveAfterMigration() {
        ModelProviderConfig legacy = provider(API_KEY);
        legacy.setParticipationModel("PROTECTED");
        stored.set(
                GeneralConfig.builder().type("provider").content(JsonUtil.toJson(legacy)).build());
        ModelProviderConfig active = service.getActiveConfiguration();
        org.junit.jupiter.api.Assertions.assertNotNull(active);
        assertEquals(API_KEY, active.getApiKey());
        assertEquals("PROTECTED", active.getParticipationModel());
        assertEquals(1, service.getState().getProviders().size());
    }

    @Test
    void danglingActiveSelectionFailsInsteadOfSelectingYaml() {
        stored.set(
                GeneralConfig.builder()
                        .type("provider")
                        .content("{\"activeProviderUid\":\"missing\",\"providers\":[]}")
                        .build());
        assertThrows(IllegalStateException.class, service::getActiveConfiguration);
    }

    @Test
    void customHeadersAreEncryptedAndBlankEditPreservesThem() {
        ModelProviderConfig config = provider(API_KEY);
        config.setHeaders(
                new java.util.LinkedHashMap<>(java.util.Map.of("X-Token", "header-secret")));
        String uid = service.createConfiguration(config).getProviders().getFirst().getUid();
        assertFalse(stored.get().getContent().contains("header-secret"));
        assertEquals("header-secret", service.getConfiguration(uid).getHeaders().get("X-Token"));
        config.setHeaders(new java.util.LinkedHashMap<>(java.util.Map.of("X-Token", "")));
        service.updateConfiguration(uid, config);
        assertEquals("header-secret", service.getConfiguration(uid).getHeaders().get("X-Token"));
        config.setHeaders(java.util.Map.of());
        service.updateConfiguration(uid, config);
        assertTrue(service.getConfiguration(uid).getHeaders().isEmpty());
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
