/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.manager.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.manager.pojo.dto.MuteConfig;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfig;
import org.apache.hertzbeat.manager.pojo.dto.SystemSecret;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.impl.MuteGeneralConfigServiceImpl;
import org.apache.hertzbeat.manager.service.impl.SystemGeneralConfigServiceImpl;
import org.apache.hertzbeat.manager.service.impl.SystemSecretServiceImpl;
import org.apache.hertzbeat.manager.service.impl.TemplateConfigServiceImpl;
import org.apache.hertzbeat.remoting.netty.ClusterMessageAuthConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class ConfigInitializerTest {

    @AfterEach
    void resetAesSecret() {
        AesUtil.setDefaultSecretKey(AesUtil.DEFAULT_ENCODE_RULES);
    }

    @Test
    void defaultManagerBootstrapPersistsAndReusesClusterAuthenticationRoot() {
        SystemSecretServiceImpl firstSecretService = mock(SystemSecretServiceImpl.class);
        ConfigInitializer first = initializer(firstSecretService, null);

        first.start();

        ArgumentCaptor<SystemSecret> persisted = ArgumentCaptor.forClass(SystemSecret.class);
        verify(firstSecretService).saveConfig(persisted.capture());
        String generatedSecret = persisted.getValue().getAesSecret();
        assertNotEquals(AesUtil.DEFAULT_ENCODE_RULES, generatedSecret);
        assertEquals(16, generatedSecret.length());
        assertEquals(generatedSecret, AesUtil.getDefaultSecretKey());
        ClusterMessageAuthConfig authentication = new ClusterMessageAuthConfig();
        authentication.validate(AesUtil::getDefaultSecretKey);

        SystemSecretServiceImpl restartSecretService = mock(SystemSecretServiceImpl.class);
        ConfigInitializer restart = initializer(
                restartSecretService,
                SystemSecret.builder().aesSecret(generatedSecret).build());

        restart.start();

        assertEquals(generatedSecret, AesUtil.getDefaultSecretKey());
        assertTrue(restart.isRunning());
        verify(restartSecretService, never()).saveConfig(any());
    }

    private ConfigInitializer initializer(
            SystemSecretServiceImpl systemSecretService,
            SystemSecret storedSecret) {
        SystemGeneralConfigServiceImpl systemConfigService =
                mock(SystemGeneralConfigServiceImpl.class);
        when(systemConfigService.getConfig()).thenReturn(SystemConfig.builder()
                .timeZoneId("UTC")
                .locale("en_US")
                .theme("default")
                .build());
        when(systemSecretService.getConfig()).thenReturn(storedSecret);
        TemplateConfigServiceImpl templateConfigService =
                mock(TemplateConfigServiceImpl.class);
        MuteGeneralConfigServiceImpl muteConfigService =
                mock(MuteGeneralConfigServiceImpl.class);
        when(muteConfigService.getConfig()).thenReturn(MuteConfig.builder().mute(true).build());

        ConfigInitializer initializer = new ConfigInitializer();
        ReflectionTestUtils.setField(
                initializer,
                "currentJwtSecret",
                "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=");
        ReflectionTestUtils.setField(
                initializer, "currentAesSecret", AesUtil.DEFAULT_ENCODE_RULES);
        ReflectionTestUtils.setField(
                initializer, "systemGeneralConfigService", systemConfigService);
        ReflectionTestUtils.setField(initializer, "systemSecretService", systemSecretService);
        ReflectionTestUtils.setField(
                initializer, "templateConfigService", templateConfigService);
        ReflectionTestUtils.setField(initializer, "muteGeneralConfigService", muteConfigService);
        ReflectionTestUtils.setField(initializer, "appService", mock(AppService.class));
        ReflectionTestUtils.setField(
                initializer, "generalConfigDao", mock(GeneralConfigDao.class));
        return initializer;
    }
}
