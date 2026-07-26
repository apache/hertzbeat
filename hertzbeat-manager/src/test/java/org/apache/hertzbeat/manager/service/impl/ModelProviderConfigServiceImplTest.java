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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfigState;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link ModelProviderConfigServiceImpl}.
 */
class ModelProviderConfigServiceImplTest {

    private final AtomicReference<GeneralConfig> storedConfig = new AtomicReference<>();

    private GeneralConfigDao generalConfigDao;

    private ModelProviderConfigServiceImpl service;

    @BeforeEach
    void setUp() {
        generalConfigDao = mock(GeneralConfigDao.class);
        when(generalConfigDao.findByType("provider")).thenAnswer(invocation -> storedConfig.get());
        doAnswer(invocation -> {
            GeneralConfig config = invocation.getArgument(0);
            storedConfig.set(config);
            return config;
        }).when(generalConfigDao).save(any(GeneralConfig.class));
        service = new ModelProviderConfigServiceImpl(generalConfigDao);
    }

    @Test
    void missingDatabaseConfigurationShouldRepresentTheYamlDefault() {
        ModelProviderConfigState state = service.getState();

        assertNull(state.getActiveProviderUid());
        assertTrue(state.getProviders().isEmpty());
    }

    @Test
    void persistedConfigurationWithoutUidShouldFailFast() {
        storedConfig.set(GeneralConfig.builder()
                .type("provider")
                .content("""
                        {
                          "activeProviderUid": null,
                          "providers": [
                            {
                              "type": "openai-compatible",
                              "code": "siliconflow"
                            }
                          ]
                        }
                        """)
                .build());

        assertThrows(IllegalStateException.class, service::getState);
    }

    @Test
    void configurationMutationsShouldPreserveSecretsAndDefaultAfterActiveDeletion() {
        ModelProviderConfigState firstState = service.createConfiguration(
                config("model-one", "secret-one"));
        String firstUid = firstState.getProviders().get(0).getUid();
        assertFalse(storedConfig.get().getContent().contains("\"schemaVersion\""));

        service.switchActiveConfiguration(firstUid);

        ModelProviderConfigState secondState = service.createConfiguration(
                config("model-two", "secret-two"));
        String secondUid = secondState.getProviders().stream()
                .filter(config -> !firstUid.equals(config.getUid()))
                .findFirst()
                .orElseThrow()
                .getUid();

        ModelProviderConfig inactiveUpdate = config("model-two-updated", "secret-two");
        service.updateConfiguration(secondUid, inactiveUpdate);

        ModelProviderConfig activeUpdate = config("model-one-updated", "");
        service.updateConfiguration(firstUid, activeUpdate);
        assertEquals("secret-one", service.getConfiguration(firstUid).getApiKey());

        service.deleteConfiguration(secondUid);

        ModelProviderConfigState defaultState = service.deleteConfiguration(firstUid);
        assertNull(defaultState.getActiveProviderUid());
        assertFalse(service.getState().getProviders().stream()
                .anyMatch(config -> firstUid.equals(config.getUid())));
    }

    private ModelProviderConfig config(String model, String apiKey) {
        ModelProviderConfig config = new ModelProviderConfig();
        config.setType("openai-compatible");
        config.setCode("siliconflow");
        config.setBaseUrl("https://api.siliconflow.cn/v1");
        config.setModel(model);
        config.setApiKey(apiKey);
        return config;
    }
}
