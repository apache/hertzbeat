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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.manager.dao.GeneralConfigDao;
import org.apache.hertzbeat.manager.pojo.dto.TemplateConfig;
import org.apache.hertzbeat.manager.service.impl.TemplateConfigServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * test case for {@link TemplateConfigServiceImpl}
 */

@ExtendWith(MockitoExtension.class)
class TemplateConfigServiceTest {

    @Mock
    private GeneralConfigDao generalConfigDao;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private AppService appService;

    @InjectMocks
    private TemplateConfigServiceImpl templateConfigServiceImpl;

    @BeforeEach
    void setUp() {

        templateConfigServiceImpl = new TemplateConfigServiceImpl(generalConfigDao, objectMapper);
        ReflectionTestUtils.setField(templateConfigServiceImpl, "appService", appService);
    }

    @Test
    void testHandlerValidTemplateConfig() {

        TemplateConfig templateConfig = mock(TemplateConfig.class);
        templateConfigServiceImpl.handler(templateConfig);

        verify(
                appService,
                times(1)
        ).updateCustomTemplateConfig(templateConfig);
    }

    @Test
    void testHandlerNullTemplateConfig() {

        templateConfigServiceImpl.handler(null);

        verify(
                appService,
                times(0)
        ).updateCustomTemplateConfig(any());
    }

    @Test
    void testType() {

        String type = templateConfigServiceImpl.type();
        assertEquals(GeneralConfigTypeEnum.template.name(), type);
    }

}
