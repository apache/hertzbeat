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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.manager.dao.GeneralConfigDao;
import org.apache.hertzbeat.manager.service.GeneralConfigService;
import org.springframework.transaction.annotation.Transactional;

/**
 * <p>Abstract implementation of GeneralConfigService, providing CRUD operations for configurations.</p>
 */
@Slf4j
abstract class AbstractGeneralConfigServiceImpl<T> implements GeneralConfigService<T> {
    protected final GeneralConfigDao generalConfigDao;
    protected final ObjectMapper objectMapper;

    /**
     * <p>Constructor, passing in GeneralConfigDao, ObjectMapper and type.</p>
     * @param generalConfigDao Dao object
     * @param objectMapper     JSON tool object
     */
    protected AbstractGeneralConfigServiceImpl(GeneralConfigDao generalConfigDao, ObjectMapper objectMapper) {
        this.generalConfigDao = generalConfigDao;
        this.objectMapper = objectMapper;
    }

    /**
     * <p>Save a configuration.</p>
     * @param config need to save configuration object
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public void saveConfig(T config) {
        try {
            String contentJson = objectMapper.writeValueAsString(config);

            GeneralConfig generalConfig2Save = GeneralConfig.builder()
                    .type(type())
                    .content(contentJson)
                    .build();
            generalConfigDao.save(generalConfig2Save);
            log.info("Configuration saved successfully");
            handler(getConfig());
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Configuration saved failed: " + e.getMessage());
        }
    }

    /**
     * <p>Get a configuration.</p>
     * @return query configuration object
     */
    @Override
    public T getConfig() {
        GeneralConfig generalConfig = generalConfigDao.findByType(type());
        if (generalConfig == null) {
            return null;
        }
        try {
            return objectMapper.readValue(generalConfig.getContent(), getTypeReference());
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Get configuration failed: " + e.getMessage());
        }
    }

    /**
     * <p>Get TypeReference object of configuration type.</p>
     * @return TypeReference object
     */
    protected abstract TypeReference<T> getTypeReference();

}
