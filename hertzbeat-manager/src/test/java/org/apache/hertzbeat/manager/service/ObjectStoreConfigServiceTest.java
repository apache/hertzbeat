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

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigChangeEvent;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.apache.hertzbeat.manager.service.impl.ObjectStoreConfigServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * test case for {@link ObjectStoreConfigServiceImpl}
 */

@ExtendWith(SpringExtension.class)
class ObjectStoreConfigServiceTest {

    private final DefaultListableBeanFactory beanFactory = new DefaultListableBeanFactory();

    @Mock
    private ApplicationContext ctx;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private ObjectStoreConfigServiceImpl objectStoreConfigService;

    @BeforeEach
    void setUp() {

        ReflectionTestUtils.setField(objectStoreConfigService, "beanFactory", beanFactory);
        ReflectionTestUtils.setField(objectStoreConfigService, "ctx", ctx);
    }

    @Test
    void testGetType() {

        String type = objectStoreConfigService.type();
        assertEquals(GeneralConfigTypeEnum.oss.name(), type);
    }

    @Test
    void testHandlerNullConfig() {

        objectStoreConfigService.handler(null);
        verify(ctx, never()).publishEvent(any());
    }

    @Test
    void testHandlerObsConfig() {

        ObjectStoreDTO<ObjectStoreDTO.ObsConfig> config = new ObjectStoreDTO<>();
        config.setType(ObjectStoreDTO.Type.OBS);
        ObjectStoreDTO.ObsConfig obsConfig = new ObjectStoreDTO.ObsConfig();
        obsConfig.setAccessKey("access-key");
        obsConfig.setSecretKey("secret-key");
        obsConfig.setEndpoint("http://xxx.myhuaweicloud.com");
        obsConfig.setBucketName("bucket-name");
        config.setConfig(obsConfig);

        objectStoreConfigService.handler(config);

        verify(ctx).publishEvent(any(ObjectStoreConfigChangeEvent.class));
    }

    @Test
    void testValidateObsEndpoint() {
        // Test valid endpoint URL - should pass validation
        assertDoesNotThrow(() ->
                objectStoreConfigService.validateObsEndpoint("https://obs.myhuaweicloud.com"));

        // Test various invalid scenarios
        // 1. Using http protocol (insecure)
        assertDoesNotThrow(() ->
                objectStoreConfigService.validateObsEndpoint("http://obs.myhuaweicloud.com"));

        // 2. Using invalid domain names
        assertThrows(IllegalArgumentException.class, () ->
                objectStoreConfigService.validateObsEndpoint("https://obs.someotherdomain.com"));
        assertThrows(IllegalArgumentException.class, () ->
                objectStoreConfigService.validateObsEndpoint("https://obs.myhuaweicloud.com.abc.com"));
        assertThrows(IllegalArgumentException.class, () ->
                objectStoreConfigService.validateObsEndpoint("https://obs.xxxmyhuaweicloud.com"));


        // 3. Using internal network addresses
        assertThrows(IllegalArgumentException.class, () ->
                objectStoreConfigService.validateObsEndpoint("https://127.0.0.1"));
        assertThrows(IllegalArgumentException.class, () ->
                objectStoreConfigService.validateObsEndpoint("https://192.168.1.1"));
        assertThrows(IllegalArgumentException.class, () ->
                objectStoreConfigService.validateObsEndpoint("https://10.0.0.1"));

        // 4. Test invalid URL format
        assertThrows(IllegalArgumentException.class, () ->
                objectStoreConfigService.validateObsEndpoint("not-a-url"));

        // 5. Test null and empty values
        assertThrows(IllegalArgumentException.class, () ->
                objectStoreConfigService.validateObsEndpoint(null));
        assertThrows(IllegalArgumentException.class, () ->
                objectStoreConfigService.validateObsEndpoint(""));
    }
}
