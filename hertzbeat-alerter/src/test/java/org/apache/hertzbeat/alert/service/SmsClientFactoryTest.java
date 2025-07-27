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

package org.apache.hertzbeat.alert.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hertzbeat.alert.config.SmsConfig;
import org.apache.hertzbeat.alert.config.SmslocalSmsProperties;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;


/**
 * unit test for {@link SmsClientFactory }
 */
@ExtendWith(MockitoExtension.class)
public class SmsClientFactoryTest {


    @Mock
    private GeneralConfigDao generalConfigDao;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private SmsConfig yamlSmsConfig;

    @InjectMocks
    private SmsClientFactory smsClientFactory;


    @Test
    void testloadDbConfig() throws JsonProcessingException {
        GeneralConfig generalConfig = new GeneralConfig();

        SmsConfig smsConfig = new SmsConfig();
        smsConfig.setType("smslocal");
        smsConfig.setEnable(true);
        smsConfig.setSmslocal(new SmslocalSmsProperties("11"));

        generalConfig.setContent(JsonUtil.toJson(smsConfig));
        when(objectMapper.readValue(generalConfig.getContent(), SmsConfig.class)).thenReturn(smsConfig);
        when(generalConfigDao.findByType(GeneralConfigTypeEnum.sms.name())).thenReturn(generalConfig);

        assertNotNull(smsClientFactory.getSmsClient());

    }

    @Test
    void testloadYamlConfig() {
        when(generalConfigDao.findByType(GeneralConfigTypeEnum.sms.name())).thenReturn(null);
        when(yamlSmsConfig.getType()).thenReturn("smslocal");
        when(yamlSmsConfig.isEnable()).thenReturn(true);
        when(yamlSmsConfig.getSmslocal()).thenReturn(new SmslocalSmsProperties("11"));
        assertNotNull(smsClientFactory.getSmsClient());
    }

    @Test
    void testNull() {
        when(generalConfigDao.findByType(GeneralConfigTypeEnum.sms.name())).thenReturn(null);
        when(yamlSmsConfig.getType()).thenReturn("");
        assertNull(smsClientFactory.getSmsClient());
    }

}