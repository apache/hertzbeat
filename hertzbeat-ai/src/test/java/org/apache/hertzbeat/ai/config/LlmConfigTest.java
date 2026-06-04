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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;

class LlmConfigTest {

    @Test
    void openAiChatClientSkipsBlankApiKey() {
        GeneralConfigDao generalConfigDao = mock(GeneralConfigDao.class);
        when(generalConfigDao.findByType("provider")).thenReturn(providerConfig(" "));

        LlmConfig llmConfig = new LlmConfig(generalConfigDao, new GenericApplicationContext());

        assertNull(assertDoesNotThrow(llmConfig::openAiChatClient));
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
