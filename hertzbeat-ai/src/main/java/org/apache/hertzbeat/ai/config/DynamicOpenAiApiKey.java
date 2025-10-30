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

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.pojo.dto.ModelProviderConfig;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.jetbrains.annotations.NotNull;
import org.springframework.ai.model.ApiKey;
import org.springframework.stereotype.Component;

/**
 * Dynamic LLM Provider API Key implementation that retrieves the API key
 */
@Slf4j
@Component
public class DynamicOpenAiApiKey implements ApiKey {

    private final GeneralConfigDao generalConfigDao;
    
    public DynamicOpenAiApiKey(GeneralConfigDao generalConfigDao) {
        this.generalConfigDao = generalConfigDao;
    }

    @NotNull
    @Override
    public String getValue() {
        GeneralConfig providerConfig = generalConfigDao.findByType("provider");
        ModelProviderConfig modelProviderConfig = JsonUtil.fromJson(providerConfig.getContent(), ModelProviderConfig.class);

        if (modelProviderConfig != null && modelProviderConfig.isEnable() && modelProviderConfig.isStatus()) {
            log.debug("Retrieved {} API key from configuration service", modelProviderConfig.getCode());
            return modelProviderConfig.getApiKey();
        } else {
            log.warn("No valid LLM Provider API key found in configuration");
            return "";
        }
    }
}
