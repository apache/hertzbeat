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
import java.lang.reflect.Type;

import jakarta.annotation.Resource;

import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.dto.sms.SmsConfig;
import org.apache.hertzbeat.common.support.event.SmsConfigChangeEvent;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;

/**
 * SmsGeneralConfigServiceImpl class is the implementation of general sms configuration service,
 * which inherits the AbstractGeneralConfigServiceImpl class.
 */

@Service
public class SmsGeneralConfigServiceImpl extends AbstractGeneralConfigServiceImpl<SmsConfig> {
    @Resource
    private ApplicationContext applicationContext;

    public SmsGeneralConfigServiceImpl(GeneralConfigDao generalConfigDao) {
        super(generalConfigDao);
    }

    /**
     * This method is used to handle the sms configuration change event.
     */
    @Override
    public void handler(SmsConfig smsConfig) {
        applicationContext.publishEvent(new SmsConfigChangeEvent(applicationContext));
    }

    @Override
    public String type() {
        return GeneralConfigTypeEnum.sms.name();
    }

    /**
     * This method is used to get the TypeReference of NoticeSender type for subsequent processing.
     * a TypeReference of NoticeSender type
     */
    @Override
    public TypeReference<SmsConfig> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return SmsConfig.class;
            }
        };
    }
}
