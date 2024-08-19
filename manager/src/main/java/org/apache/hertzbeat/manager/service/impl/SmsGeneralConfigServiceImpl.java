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
import java.lang.reflect.Type;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.manager.dao.GeneralConfigDao;
import org.apache.hertzbeat.manager.pojo.dto.SmsNoticeSender;
import org.springframework.stereotype.Service;

/**
 * SmsGeneralConfigServiceImpl class is the implementation of general sms configuration service,
 * which inherits the AbstractGeneralConfigServiceImpl class.
 */

@Service
public class SmsGeneralConfigServiceImpl extends AbstractGeneralConfigServiceImpl<SmsNoticeSender> {

    /**
     * SmsGeneralConfigServiceImpl's constructor creates an instance of this class
     * through the default constructor or deserialization construction (setBeanProps).
     * The parameter generalConfigDao is used for dao layer operation data,
     * and objectMapper is used for object mapping.
     * @param generalConfigDao dao layer operation data, needed to create an instance of this class
     * @param objectMapper     object mapping , needed to create an instance of this class
     */
    public SmsGeneralConfigServiceImpl(GeneralConfigDao generalConfigDao, ObjectMapper objectMapper) {
        super(generalConfigDao, objectMapper);
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
    public TypeReference<SmsNoticeSender> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return SmsNoticeSender.class;
            }
        };
    }
}
