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

package org.apache.hertzbeat.ai.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Proxy;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.support.event.AiProviderConfigChangeEvent;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.StaticApplicationContext;

/**
 * Verifies that the provider configuration cache reacts to enable and disable events.
 */
class ChatClientProviderServiceImplTest {

    @Test
    void configurationChangeShouldRefreshConfiguredState() {
        AtomicReference<GeneralConfig> currentConfig = new AtomicReference<>();
        GeneralConfigDao configDao = configDao(currentConfig);
        ChatClientProviderServiceImpl service = new ChatClientProviderServiceImpl(null, configDao, null);

        assertFalse(service.isConfigured());

        currentConfig.set(providerConfig("sk-test"));
        service.onAiProviderConfigChange(changeEvent());
        assertTrue(service.isConfigured());

        currentConfig.set(providerConfig(" "));
        service.onAiProviderConfigChange(changeEvent());
        assertFalse(service.isConfigured());
    }

    private GeneralConfigDao configDao(AtomicReference<GeneralConfig> currentConfig) {
        return (GeneralConfigDao) Proxy.newProxyInstance(
                GeneralConfigDao.class.getClassLoader(),
                new Class<?>[]{GeneralConfigDao.class},
                (proxy, method, args) -> "findByType".equals(method.getName()) ? currentConfig.get() : null);
    }

    private GeneralConfig providerConfig(String apiKey) {
        ModelProviderConfig modelConfig = new ModelProviderConfig();
        modelConfig.setApiKey(apiKey);
        return GeneralConfig.builder()
                .type("provider")
                .content(JsonUtil.toJson(modelConfig))
                .build();
    }

    private AiProviderConfigChangeEvent changeEvent() {
        return new AiProviderConfigChangeEvent(new StaticApplicationContext());
    }
}
