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

import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link ReloadableAgentRuntimeModelClient}.
 */
class ReloadableAgentRuntimeModelClientTest {

    @Test
    void shouldReportUnavailableWithoutAnyModelClientSource() {
        GeneralConfigDao configDao = mock(GeneralConfigDao.class);

        ReloadableAgentRuntimeModelClient client =
                new ReloadableAgentRuntimeModelClient(configDao, new AgentRuntimeProperties(), null);

        assertFalse(client.isAgentClientConfigured());
    }

    @Test
    void databaseProviderShouldReplacePropertyProviderAfterConfigChange() {
        GeneralConfigDao configDao = mock(GeneralConfigDao.class);
        when(configDao.findByType("provider")).thenReturn(null);
        AgentRuntimeProperties properties = new AgentRuntimeProperties();
        properties.setProvider("openai-compatible");
        properties.setBaseUrl("https://property.example.test/v1");
        properties.setModel("property-model");
        properties.setApiKey("property-secret");
        ReloadableAgentRuntimeModelClient client =
                new ReloadableAgentRuntimeModelClient(configDao, properties, null);
        AgentRuntimeModelClient propertyClient = client.currentClient();
        assertNotNull(propertyClient);
        assertTrue(client.isAgentClientConfigured());

        ModelProviderConfig databaseProvider = new ModelProviderConfig();
        databaseProvider.setCode("zai");
        databaseProvider.setBaseUrl("https://database.example.test/v1");
        databaseProvider.setModel("database-model");
        databaseProvider.setApiKey("database-secret");
        when(configDao.findByType("provider")).thenReturn(GeneralConfig.builder()
                .type("provider")
                .content(JsonUtil.toJson(databaseProvider))
                .build());

        client.onProviderConfigChanged();

        assertNotSame(propertyClient, client.currentClient());
        assertEquals("zai", properties.getProvider());
        assertEquals("database-model", properties.getModel());
        assertEquals("https://database.example.test/v1", properties.getBaseUrl());
        assertTrue(client.isAgentClientConfigured());
    }
}
