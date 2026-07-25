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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelProvider;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelProviderRegistry;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;

/**
 * Test case for {@link ReloadableAgentRuntimeModelClient}.
 */
class ReloadableAgentRuntimeModelClientTest {

    @Test
    void shouldReportUnavailableWithoutAnyModelSource() {
        GeneralConfigDao configDao = mock(GeneralConfigDao.class);

        ReloadableAgentRuntimeModelClient client =
                new ReloadableAgentRuntimeModelClient(configDao, new AgentProviderProperties(), providerRegistry());

        assertFalse(client.isAgentClientConfigured());
    }

    @Test
    void databaseProviderShouldReplacePropertyProviderAfterConfigChange() {
        GeneralConfigDao configDao = mock(GeneralConfigDao.class);
        when(configDao.findByType("provider")).thenReturn(null);
        AgentProviderProperties properties = new AgentProviderProperties();
        properties.setType("test-provider");
        properties.setCode("property-preset");
        properties.setBaseUrl("https://property.example.test/v1");
        properties.setModel("property-model");
        properties.setApiKey("property-secret");
        ReloadableAgentRuntimeModelClient client =
                new ReloadableAgentRuntimeModelClient(configDao, properties, providerRegistry());
        HertzBeatModel propertyModel = client.currentModel();
        assertNotNull(propertyModel);
        assertTrue(client.isAgentClientConfigured());
        assertEquals("property-preset", ((TaggedModel) propertyModel).providerCode);
        assertEquals("property-model", ((TaggedModel) propertyModel).model);

        ModelProviderConfig databaseProvider = new ModelProviderConfig();
        databaseProvider.setType("test-provider");
        databaseProvider.setCode("database-preset");
        databaseProvider.setBaseUrl("https://database.example.test/v1");
        databaseProvider.setModel("database-model");
        databaseProvider.setApiKey("database-secret");
        when(configDao.findByType("provider")).thenReturn(GeneralConfig.builder()
                .type("provider")
                .content(JsonUtil.toJson(databaseProvider))
                .build());

        client.onProviderConfigChanged();

        assertNotSame(propertyModel, client.currentModel());
        assertEquals("database-preset", ((TaggedModel) client.currentModel()).providerCode);
        assertEquals("database-model", ((TaggedModel) client.currentModel()).model);
        assertEquals("test-provider", properties.getType());
        assertEquals("property-preset", properties.getCode());
        assertEquals("property-model", properties.getModel());
        assertEquals("https://property.example.test/v1", properties.getBaseUrl());
        assertTrue(client.isAgentClientConfigured());
    }

    @Test
    void removingDatabaseProviderShouldRestorePropertyProvider() {
        GeneralConfigDao configDao = mock(GeneralConfigDao.class);
        AtomicReference<GeneralConfig> databaseConfig = new AtomicReference<>();
        when(configDao.findByType("provider")).thenAnswer(invocation -> databaseConfig.get());
        AgentProviderProperties properties = new AgentProviderProperties();
        properties.setType("test-provider");
        properties.setCode("property-preset");
        properties.setModel("property-model");
        properties.setApiKey("property-secret");
        ReloadableAgentRuntimeModelClient client =
                new ReloadableAgentRuntimeModelClient(configDao, properties, providerRegistry());

        ModelProviderConfig provider = new ModelProviderConfig();
        provider.setType("test-provider");
        provider.setModel("database-model");
        databaseConfig.set(GeneralConfig.builder()
                .type("provider")
                .content(JsonUtil.toJson(provider))
                .build());
        client.onProviderConfigChanged();
        assertEquals("database-model", ((TaggedModel) client.currentModel()).model);

        databaseConfig.set(null);
        client.onProviderConfigChanged();

        assertEquals("property-model", ((TaggedModel) client.currentModel()).model);
    }

    private AgentModelProviderRegistry providerRegistry() {
        return new AgentModelProviderRegistry(List.of(new TestAgentModelProvider()));
    }

    private static final class TestAgentModelProvider implements AgentModelProvider {

        @Override
        public String type() {
            return "test-provider";
        }

        @Override
        public HertzBeatModel createModel(ModelProviderConfig config) {
            return new TaggedModel(config.getCode(), config.getModel());
        }
    }

    private static final class TaggedModel extends HertzBeatModel {

        private final String providerCode;

        private final String model;

        private TaggedModel(String providerCode, String model) {
            super(mock(ChatModel.class));
            this.providerCode = providerCode;
            this.model = model;
        }
    }
}
