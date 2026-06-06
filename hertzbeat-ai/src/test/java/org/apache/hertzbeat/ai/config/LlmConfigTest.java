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

package org.apache.hertzbeat.ai.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.support.GenericApplicationContext;

class LlmConfigTest {

    @Test
    void openAiChatClientSkipsMissingProviderConfig() {
        GeneralConfigDao generalConfigDao = mock(GeneralConfigDao.class);
        when(generalConfigDao.findByType("provider")).thenReturn(null);

        LlmConfig llmConfig = new LlmConfig(generalConfigDao, new GenericApplicationContext());

        assertNull(assertDoesNotThrow(llmConfig::openAiChatClient));
    }

    @Test
    void openAiChatClientSkipsBlankApiKey() {
        GeneralConfigDao generalConfigDao = mock(GeneralConfigDao.class);
        when(generalConfigDao.findByType("provider")).thenReturn(providerConfig(" "));

        LlmConfig llmConfig = new LlmConfig(generalConfigDao, new GenericApplicationContext());

        assertNull(assertDoesNotThrow(llmConfig::openAiChatClient));
    }

    @Test
    void openAiChatClientSkipsInvalidProviderContent() {
        GeneralConfigDao generalConfigDao = mock(GeneralConfigDao.class);
        when(generalConfigDao.findByType("provider")).thenReturn(GeneralConfig.builder()
                .type("provider")
                .content("{")
                .build());

        LlmConfig llmConfig = new LlmConfig(generalConfigDao, new GenericApplicationContext());

        assertNull(assertDoesNotThrow(llmConfig::openAiChatClient));
    }

    @Test
    void openAiChatClientCreatesClientWithConfiguredApiKey() {
        GeneralConfigDao generalConfigDao = mock(GeneralConfigDao.class);
        when(generalConfigDao.findByType("provider")).thenReturn(providerConfig("sk-test"));

        LlmConfig llmConfig = new LlmConfig(generalConfigDao, new GenericApplicationContext());

        assertNotNull(assertDoesNotThrow(llmConfig::openAiChatClient));
    }

    @Test
    void applicationContextStartsWithoutProviderConfig() {
        GeneralConfigDao generalConfigDao = mock(GeneralConfigDao.class);
        when(generalConfigDao.findByType("provider")).thenReturn(null);

        new ApplicationContextRunner()
                .withBean(GeneralConfigDao.class, () -> generalConfigDao)
                .withUserConfiguration(LlmConfig.class)
                .run(context -> {
                    assertFalse(context.containsBean(LlmConfig.OPEN_AI_CHAT_CLIENT_BEAN_NAME));
                    assertNull(context.getStartupFailure());
                });
    }

    @Test
    void applicationContextStartsWithoutBlankApiKey() {
        GeneralConfigDao generalConfigDao = mock(GeneralConfigDao.class);
        when(generalConfigDao.findByType("provider")).thenReturn(providerConfig(" "));

        new ApplicationContextRunner()
                .withBean(GeneralConfigDao.class, () -> generalConfigDao)
                .withUserConfiguration(LlmConfig.class)
                .run(context -> {
                    assertFalse(context.containsBean(LlmConfig.OPEN_AI_CHAT_CLIENT_BEAN_NAME));
                    assertNull(context.getStartupFailure());
                });
    }

    @Test
    void applicationContextRegistersClientWithConfiguredApiKey() {
        GeneralConfigDao generalConfigDao = mock(GeneralConfigDao.class);
        when(generalConfigDao.findByType("provider")).thenReturn(providerConfig("sk-test"));

        new ApplicationContextRunner()
                .withBean(GeneralConfigDao.class, () -> generalConfigDao)
                .withUserConfiguration(LlmConfig.class)
                .run(context -> {
                    assertTrue(context.containsBean(LlmConfig.OPEN_AI_CHAT_CLIENT_BEAN_NAME));
                    assertNull(context.getStartupFailure());
                });
    }

    private static GeneralConfig providerConfig(String apiKey) {
        ModelProviderConfig providerConfig = new ModelProviderConfig();
        providerConfig.setCode("openai");
        providerConfig.setApiKey(apiKey);
        return GeneralConfig.builder()
                .type("provider")
                .content(JsonUtil.toJson(providerConfig))
                .build();
    }
}
