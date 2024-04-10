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

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hertzbeat.manager.dao.GeneralConfigDao;
import org.apache.hertzbeat.manager.pojo.dto.TemplateConfig;
import org.apache.hertzbeat.manager.service.AppService;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;
import java.lang.reflect.Type;

/**
 * template config service impl
 */
@Service
public class TemplateConfigServiceImpl extends AbstractGeneralConfigServiceImpl<TemplateConfig> {
    
    @Resource
    private AppService appService;
    
    
    /**
     * 构造方法，传入GeneralConfigDao、ObjectMapper和type。
     *
     * <p>Constructor, passing in GeneralConfigDao, ObjectMapper and type.</p>
     *
     * @param generalConfigDao 配置Dao对象
     * @param objectMapper     JSON工具类对象
     */
    protected TemplateConfigServiceImpl(GeneralConfigDao generalConfigDao, ObjectMapper objectMapper) {
        super(generalConfigDao, objectMapper);
    }
    
    @Override
    public void handler(TemplateConfig templateConfig) {
        if (templateConfig != null) {
            appService.updateCustomTemplateConfig(templateConfig);
        }
    }
    
    @Override
    public String type() {
        return "template";
    }
    
    
    @Override
    protected TypeReference<TemplateConfig> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return TemplateConfig.class;
            }
        };
    }
}
