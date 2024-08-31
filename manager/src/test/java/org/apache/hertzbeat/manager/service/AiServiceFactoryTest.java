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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.constants.AiTypeEnum;
import org.apache.hertzbeat.manager.service.ai.AiService;
import org.apache.hertzbeat.manager.service.ai.factory.AiServiceFactoryImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * test case for {@link AiServiceFactoryImpl}
 */

@ExtendWith(MockitoExtension.class)
class AiServiceFactoryTest {

    @Mock
    private List<AiService> aiService;

    @Mock
    private AiService aiService1;

    @Mock
    private AiService aiService2;

    @InjectMocks
    private AiServiceFactoryImpl aiServiceFactory;

    @BeforeEach
    public void setup() {

        when(aiService1.getType()).thenReturn(AiTypeEnum.alibabaAi);
        when(aiService2.getType()).thenReturn(AiTypeEnum.zhiPu);

        aiService = Arrays.asList(aiService1, aiService2);
        ReflectionTestUtils.setField(aiServiceFactory, "aiService", aiService);

        aiServiceFactory.init();
    }

    @Test
    public void testInit() {

        Map<AiTypeEnum, AiService> expectedMap = aiService.stream()
                .collect(Collectors.toMap(AiService::getType, Function.identity()));

        Map<AiTypeEnum, AiService> actualMap = (Map<AiTypeEnum, AiService>) ReflectionTestUtils.getField(aiServiceFactory, "aiServiceFactoryMap");

        assertEquals(expectedMap, actualMap);
    }

    @Test
    public void testGetAiServiceImplBean_Success() {

        AiService service = aiServiceFactory.getAiServiceImplBean(AiTypeEnum.alibabaAi + "");
        assertNotNull(service);
        assertEquals(aiService1, service);

        service = aiServiceFactory.getAiServiceImplBean(AiTypeEnum.zhiPu + "");
        assertNotNull(service);
        assertEquals(aiService2, service);
    }

    @Test
    public void testGetAiServiceImplBeanTypeNotFound() {

        Exception exception = assertThrows(
                IllegalArgumentException.class,
                () -> aiServiceFactory.getAiServiceImplBean("InvalidType")
        );

        assertTrue(exception.getMessage().contains("The current type is not supported"));
    }

    @Test
    public void testGetAiServiceImplBeanNoBean() {

        aiServiceFactory.init();

        when(aiService1.getType()).thenReturn(AiTypeEnum.kimiAi);
        List<AiService> singleServiceList = Collections.singletonList(aiService1);
        ReflectionTestUtils.setField(aiServiceFactory, "aiService", singleServiceList);
        aiServiceFactory.init();

        Exception exception = assertThrows(
                IllegalArgumentException.class,
                () -> aiServiceFactory.getAiServiceImplBean(AiTypeEnum.sparkDesk + "")
        );

        assertTrue(exception.getMessage().contains("No bean for current type found"));
    }

}
