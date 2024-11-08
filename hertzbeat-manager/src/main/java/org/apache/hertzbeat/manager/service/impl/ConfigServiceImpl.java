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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.hertzbeat.manager.pojo.dto.TemplateConfig;
import org.apache.hertzbeat.manager.service.ConfigService;
import org.apache.hertzbeat.manager.service.GeneralConfigService;
import org.springframework.stereotype.Component;


/**
 * GeneralConfigService proxy class
 */
@Component
public class ConfigServiceImpl implements ConfigService {

    private static final String TEMPLATE_CONFIG_TYPE = "template";

    private final Map<String, GeneralConfigService> configServiceMap;

    public ConfigServiceImpl(List<GeneralConfigService> generalConfigServices){
        configServiceMap = new ConcurrentHashMap<>(8);
        if (CollectionUtils.isNotEmpty(generalConfigServices)) {
            generalConfigServices.forEach(config -> configServiceMap.put(config.type(), config));
        }
    }

    @Override
    public void saveConfig(String type, Object config) {
        GeneralConfigService configService = configServiceMap.get(type);
        if (configService == null) {
            throw new IllegalArgumentException("Not supported this config type: " + type);
        }
        configService.saveConfig(config);
    }

    @Override
    public Object getConfig(String type) {
        GeneralConfigService configService = configServiceMap.get(type);
        if (configService == null) {
            throw new IllegalArgumentException("Not supported this config type: " + type);
        }
        return configService.getConfig();
    }

    @Override
    public void updateTemplateAppConfig(String app, TemplateConfig.AppTemplate template){
        GeneralConfigService configService = configServiceMap.get(TEMPLATE_CONFIG_TYPE);
        if (!(configService instanceof TemplateConfigServiceImpl)) {
            throw new IllegalArgumentException("Not supported this config type: template");
        }
        TemplateConfig config = ((TemplateConfigServiceImpl) configService).getConfig();
        if (config == null) {
            config = new TemplateConfig();
        }
        if (config.getApps() == null) {
            config.setApps(new HashMap<>(8));
        }
        config.getApps().put(app, template);
        configService.saveConfig(config);
    }
}
