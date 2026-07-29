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

import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigChangeEvent;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigResponse;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.apache.hertzbeat.manager.service.impl.ObjectStoreConfigServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * test case for {@link ObjectStoreConfigServiceImpl}
 */

@ExtendWith(MockitoExtension.class)
class ObjectStoreConfigServiceTest {

    private final DefaultListableBeanFactory beanFactory = new DefaultListableBeanFactory();

    @Mock
    private ApplicationContext ctx;

    @Mock
    private GeneralConfigDao generalConfigDao;

    private ObjectStoreConfigServiceImpl objectStoreConfigService;

    @BeforeEach
    void setUp() {
        objectStoreConfigService = new ObjectStoreConfigServiceImpl(generalConfigDao, new ObjectStoreConfigMapper());
        ReflectionTestUtils.setField(objectStoreConfigService, "beanFactory", beanFactory);
        ReflectionTestUtils.setField(objectStoreConfigService, "ctx", ctx);
    }

    @Test
    void testGetType() {
        String type = objectStoreConfigService.type();
        assertEquals(GeneralConfigTypeEnum.oss.name(), type);
    }

    @Test
    void testStartupWithNullConfigDoesNotPublishChange() throws Exception {
        objectStoreConfigService.afterPropertiesSet();
        verify(ctx, never()).publishEvent(any());
    }

    @Test
    void testCommittedObsConfigReplacesRuntimeAndPublishesChange() {
        ObjectStoreDTO<ObjectStoreDTO.ObsConfig> config = new ObjectStoreDTO<>();
        config.setType(ObjectStoreDTO.Type.OBS);
        ObjectStoreDTO.ObsConfig obsConfig = new ObjectStoreDTO.ObsConfig();
        obsConfig.setAccessKey("access-key");
        obsConfig.setSecretKey("secret-key");
        obsConfig.setEndpoint("https://xxx.myhuaweicloud.com");
        obsConfig.setBucketName("bucket-name");
        config.setConfig(obsConfig);

        objectStoreConfigService.applyCommittedConfig(
                new ObjectStoreConfigServiceImpl.ObjectStoreConfigPersistedEvent(config));

        assertTrue(beanFactory.containsSingleton("ObjectStoreService"));
        verify(ctx).publishEvent(any(ObjectStoreConfigChangeEvent.class));

        objectStoreConfigService.applyCommittedConfig(
                new ObjectStoreConfigServiceImpl.ObjectStoreConfigPersistedEvent(
                        new ObjectStoreDTO<>(ObjectStoreDTO.Type.DATABASE, null)));

        assertFalse(beanFactory.containsSingleton("ObjectStoreService"));
    }

    @Test
    void testValidateObsEndpoint() {
        // Test valid endpoint URL - should pass validation
        assertDoesNotThrow(() ->
                objectStoreConfigService.validateObsEndpoint("https://obs.myhuaweicloud.com"));

        // Test various invalid scenarios
        // 1. Using http protocol would transmit OBS credentials without transport security.
        assertThrows(IllegalArgumentException.class, () ->
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

    @Test
    void saveLocksExactTypeAndReturnsAuthoritativeRedactedConfig() {
        ObjectStoreConfigRequest request = new ObjectStoreConfigRequest();
        request.setType(ObjectStoreDTO.Type.DATABASE.name());
        ObjectStoreDTO<ObjectStoreDTO.ObsConfig> authoritative =
                new ObjectStoreDTO<>(ObjectStoreDTO.Type.DATABASE, null);
        GeneralConfig persisted = GeneralConfig.builder()
                .type("oss")
                .content(JsonUtil.toJson(authoritative))
                .build();
        when(generalConfigDao.findByType("oss")).thenReturn(null, persisted, persisted);

        ObjectStoreConfigResponse response = objectStoreConfigService.saveAndGetSafeConfig(request);

        assertEquals(ObjectStoreDTO.Type.DATABASE, response.type());
        verify(generalConfigDao).findByTypeForUpdate("oss");
        verify(generalConfigDao).save(any());
    }

    @Test
    void restoresPersistedObsConfigWithItsParameterizedType() {
        ObjectStoreDTO.ObsConfig options = obsConfig();
        GeneralConfig persisted = GeneralConfig.builder()
                .type("oss")
                .content(JsonUtil.toJson(new ObjectStoreDTO<>(ObjectStoreDTO.Type.OBS, options)))
                .build();
        when(generalConfigDao.findByType("oss")).thenReturn(persisted);

        ObjectStoreDTO<ObjectStoreDTO.ObsConfig> restored = objectStoreConfigService.getConfig();

        assertInstanceOf(ObjectStoreDTO.ObsConfig.class, restored.getConfig());
        assertEquals("stored-access", restored.getConfig().getAccessKey());
    }

    @Test
    void saveDoesNotMutateRuntimeOrPublishChangeBeforeCommit() {
        ObjectStoreConfigRequest request = request();
        GeneralConfig persisted = GeneralConfig.builder()
                .type("oss")
                .content(JsonUtil.toJson(new ObjectStoreDTO<>(ObjectStoreDTO.Type.OBS, obsConfig())))
                .build();
        when(generalConfigDao.findByType("oss")).thenReturn(null, persisted, persisted);

        objectStoreConfigService.saveAndGetSafeConfig(request);

        assertFalse(beanFactory.containsSingleton("ObjectStoreService"));
        verify(ctx, never()).publishEvent(any(ObjectStoreConfigChangeEvent.class));
    }

    private ObjectStoreConfigRequest request() {
        var options = new org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigOptions();
        options.setAccessKey("stored-access");
        options.setSecretKey("stored-secret");
        options.setEndpoint("https://obs.myhuaweicloud.com");
        options.setBucketName("bucket");
        ObjectStoreConfigRequest request = new ObjectStoreConfigRequest();
        request.setType(ObjectStoreDTO.Type.OBS.name());
        request.setConfig(options);
        return request;
    }

    private ObjectStoreDTO.ObsConfig obsConfig() {
        ObjectStoreDTO.ObsConfig options = new ObjectStoreDTO.ObsConfig();
        options.setAccessKey("stored-access");
        options.setSecretKey("stored-secret");
        options.setEndpoint("https://obs.myhuaweicloud.com");
        options.setBucketName("bucket");
        return options;
    }
}
