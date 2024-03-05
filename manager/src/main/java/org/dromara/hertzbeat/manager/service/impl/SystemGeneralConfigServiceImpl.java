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

package org.dromara.hertzbeat.manager.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.support.event.SystemConfigChangeEvent;
import org.dromara.hertzbeat.manager.dao.GeneralConfigDao;
import org.dromara.hertzbeat.manager.pojo.dto.SystemConfig;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;
import java.lang.reflect.Type;
import java.util.Locale;
import java.util.TimeZone;

/**
 * @author ceilzcx
 * @since 4/7/2023
 */
@Service
public class SystemGeneralConfigServiceImpl extends AbstractGeneralConfigServiceImpl<SystemConfig> {
    
    private static final Integer LANG_REGION_LENGTH = 2;
    
    @Resource
    private ApplicationContext applicationContext;
    
    /**
     * 构造方法，传入GeneralConfigDao、ObjectMapper和type。
     *
     * <p>Constructor, passing in GeneralConfigDao, ObjectMapper and type.</p>
     *
     * @param generalConfigDao 配置Dao对象
     * @param objectMapper     JSON工具类对象
     */
    protected SystemGeneralConfigServiceImpl(GeneralConfigDao generalConfigDao, ObjectMapper objectMapper) {
        super(generalConfigDao, objectMapper);
    }
    
    @Override
    public void handler(SystemConfig systemConfig) {
        if (systemConfig != null) {
            if (systemConfig.getTimeZoneId() != null) {
                TimeZone.setDefault(TimeZone.getTimeZone(systemConfig.getTimeZoneId()));
            }
            if (systemConfig.getLocale() != null) {
                String[] arr = systemConfig.getLocale().split(CommonConstants.LOCALE_SEPARATOR);
                if (arr.length == LANG_REGION_LENGTH) {
                    String language = arr[0];
                    String country = arr[1];
                    Locale.setDefault(new Locale(language, country));
                }
            }
            applicationContext.publishEvent(new SystemConfigChangeEvent(applicationContext));
        }
    }
    
    @Override
    public String type() {
        return "system";
    }

    /**
     * 该方法用于获取NoticeSender类型的TypeReference，以供后续处理。
     * This method is used to get the TypeReference of NoticeSender type for subsequent processing.
     *
     * @return NoticeSender类型的TypeReference
     * a TypeReference of NoticeSender type
     */
    @Override
    protected TypeReference<SystemConfig> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return SystemConfig.class;
            }
        };
    }
}
