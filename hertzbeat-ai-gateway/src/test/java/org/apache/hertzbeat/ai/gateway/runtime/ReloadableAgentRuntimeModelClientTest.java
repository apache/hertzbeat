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
                new ReloadableAgentRuntimeModelClient(configDao, new AgentProviderProperties(),
                        new AgentModelProviderRegistry(List.of(new TestAgentModelProvider())));

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
        TestAgentModelProvider provider = new TestAgentModelProvider();
        ReloadableAgentRuntimeModelClient client =
                new ReloadableAgentRuntimeModelClient(configDao, properties,
                        new AgentModelProviderRegistry(List.of(provider)));
        TaggedModel propertyModel = provider.lastCreatedModel();
        assertNotNull(propertyModel);
        assertTrue(client.isAgentClientConfigured());
        assertEquals("property-preset", propertyModel.providerCode);
        assertEquals("property-model", propertyModel.model);

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

        TaggedModel databaseModel = provider.lastCreatedModel();
        assertNotSame(propertyModel, databaseModel);
        assertEquals("database-preset", databaseModel.providerCode);
        assertEquals("database-model", databaseModel.model);
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
        TestAgentModelProvider modelProvider = new TestAgentModelProvider();
        ReloadableAgentRuntimeModelClient client =
                new ReloadableAgentRuntimeModelClient(configDao, properties,
                        new AgentModelProviderRegistry(List.of(modelProvider)));

        ModelProviderConfig provider = new ModelProviderConfig();
        provider.setType("test-provider");
        provider.setModel("database-model");
        databaseConfig.set(GeneralConfig.builder()
                .type("provider")
                .content(JsonUtil.toJson(provider))
                .build());
        client.onProviderConfigChanged();
        assertEquals("database-model", modelProvider.lastCreatedModel().model);

        databaseConfig.set(null);
        client.onProviderConfigChanged();

        assertEquals("property-model", modelProvider.lastCreatedModel().model);
    }

    private static final class TestAgentModelProvider implements AgentModelProvider {

        private final AtomicReference<TaggedModel> lastCreatedModel = new AtomicReference<>();

        @Override
        public String type() {
            return "test-provider";
        }

        @Override
        public HertzBeatModel createModel(ModelProviderConfig config) {
            TaggedModel model = new TaggedModel(config.getCode(), config.getModel());
            lastCreatedModel.set(model);
            return model;
        }

        private TaggedModel lastCreatedModel() {
            return lastCreatedModel.get();
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
