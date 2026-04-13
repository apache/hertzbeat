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

import tools.jackson.core.type.TypeReference;
import jakarta.annotation.Resource;
import java.lang.reflect.Type;
import java.util.Objects;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.support.event.SystemConfigChangeEvent;
import org.apache.hertzbeat.common.util.TimeZoneUtil;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfig;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;

/**
 * system config service impl
 */
@Service
public class SystemGeneralConfigServiceImpl extends AbstractGeneralConfigServiceImpl<SystemConfig> {
    @Resource
    private ApplicationContext applicationContext;

    public SystemGeneralConfigServiceImpl(GeneralConfigDao generalConfigDao) {
        super(generalConfigDao);
    }

    @Override
    public void handler(SystemConfig systemConfig) {
        if (Objects.isNull(systemConfig)) {
            return;
        }

        TimeZoneUtil.setTimeZoneAndLocale(systemConfig.getTimeZoneId(), systemConfig.getLocale());
        applicationContext.publishEvent(new SystemConfigChangeEvent(applicationContext));
    }

    @Override
    public String type() {
        return GeneralConfigTypeEnum.system.name();
    }

    @Override
    public TypeReference<SystemConfig> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return SystemConfig.class;
            }
        };
    }
}
