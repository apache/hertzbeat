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

package org.apache.hertzbeat.manager.service;


import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.manager.pojo.dto.EmailNoticeSender;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.apache.hertzbeat.manager.pojo.dto.TemplateConfig;
import org.apache.hertzbeat.manager.service.impl.ConfigServiceImpl;
import org.apache.hertzbeat.manager.service.impl.MailGeneralConfigServiceImpl;
import org.apache.hertzbeat.manager.service.impl.ObjectStoreConfigServiceImpl;
import org.apache.hertzbeat.manager.service.impl.TemplateConfigServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;


/**
 * Test case for {@link ConfigService}
 */
@ExtendWith(MockitoExtension.class)
public class ConfigServiceTest {

    @InjectMocks
    private ConfigServiceImpl configService;
    @Mock
    private ObjectStoreConfigServiceImpl objectStoreConfigService;
    @Mock
    private TemplateConfigServiceImpl templateConfigService;
    @Mock
    private MailGeneralConfigServiceImpl mailGeneralConfigService;

    @BeforeEach
    public void setUp() {
        List<GeneralConfigService> generalConfigServices = new ArrayList<>();
        when(objectStoreConfigService.type()).thenReturn("oss");
        when(templateConfigService.type()).thenReturn("template");
        when(mailGeneralConfigService.type()).thenReturn("mail");
        generalConfigServices.add(objectStoreConfigService);
        generalConfigServices.add(templateConfigService);
        generalConfigServices.add(mailGeneralConfigService);
        configService = new ConfigServiceImpl(generalConfigServices);
    }

    @Test
    public void testSaveConfig() {
        configService.saveConfig("oss", new ObjectStoreDTO<>());
        verify(objectStoreConfigService, times(1)).saveConfig(any(ObjectStoreDTO.class));

        configService.saveConfig("mail", new EmailNoticeSender());
        verify(mailGeneralConfigService, times(1)).saveConfig(any(EmailNoticeSender.class));
    }

    @Test
    public void testGetConfig() {
        ObjectStoreDTO ossConfig = new ObjectStoreDTO<>();
        when(objectStoreConfigService.getConfig()).thenReturn(ossConfig);
        assertNotNull(configService.getConfig("oss"));

        EmailNoticeSender emailNoticeSender = new EmailNoticeSender();
        when(mailGeneralConfigService.getConfig()).thenReturn(emailNoticeSender);
        configService.getConfig("mail");
        verify(mailGeneralConfigService, times(1)).getConfig();
    }

    @Test
    public void testUpdateTemplateAppConfig(){
        TemplateConfig templateConfig = new TemplateConfig();
        when(templateConfigService.getConfig()).thenReturn(templateConfig);
        configService.updateTemplateAppConfig("custom", new TemplateConfig.AppTemplate());

        verify(templateConfigService, times(1)).getConfig();
        verify(templateConfigService, times(1)).saveConfig(templateConfig);
    }

    @Test
    public void testException(){
        assertThrows(IllegalArgumentException.class, () -> configService.saveConfig("test", new ObjectStoreDTO<>()));
        assertThrows(IllegalArgumentException.class, () -> configService.getConfig("test2"), "Not supported this config type: test2");
    }
}
