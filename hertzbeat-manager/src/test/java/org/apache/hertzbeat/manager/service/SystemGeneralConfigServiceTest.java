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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import java.util.Locale;
import java.util.TimeZone;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.support.event.SystemConfigChangeEvent;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfig;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfigRequest;
import org.apache.hertzbeat.manager.service.impl.SystemGeneralConfigServiceImpl;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationContext;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.core.type.TypeReference;

/**
 * test case for {@link SystemGeneralConfigServiceImpl}
 */

@ExtendWith(MockitoExtension.class)
class SystemGeneralConfigServiceTest {

    @Mock
    private GeneralConfigDao generalConfigDao;
    @Mock
    private ApplicationContext applicationContext;

    private SystemGeneralConfigServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SystemGeneralConfigServiceImpl(generalConfigDao);
        ReflectionTestUtils.setField(service, "applicationContext", applicationContext);
    }

    @Test
    void testType() {
        String result = service.type();
        assertEquals(GeneralConfigTypeEnum.system.name(), result);
    }

    @Test
    void testGetTypeReference() {
        TypeReference<SystemConfig> typeReference = service.getTypeReference();
        assertNotNull(typeReference);
        assertEquals(SystemConfig.class, typeReference.getType());
    }

    @Test
    void saveRejectsUnsupportedLanguageTimezoneAndInterfaceBeforePersistence() {
        assertThrows(IllegalArgumentException.class, () -> service.saveConfig(
                new SystemConfig("Not/AZone", "en_US", "dark-ops")));
        assertThrows(IllegalArgumentException.class, () -> service.saveConfig(
                new SystemConfig("UTC", "unsupported_LOCALE", "dark-ops")));
        assertThrows(IllegalArgumentException.class, () -> service.saveConfig(
                new SystemConfig("UTC", "en_US", "unsupported-interface")));
        verifyNoInteractions(generalConfigDao);
    }

    @Test
    void typedSaveRejectsUnknownFieldsBeforePersistence() {
        SystemConfigRequest request = new SystemConfigRequest();
        request.setTimeZoneId("UTC");
        request.setLocale("en_US");
        request.setTheme("dark-ops");
        request.markUnknownField("type", "sms");

        assertThrows(IllegalArgumentException.class, () -> service.saveAndGetConfig(request));
        verifyNoInteractions(generalConfigDao);
    }

    @Test
    void saveDoesNotApplyRuntimeOrPublishChangeBeforeCommit() {
        TimeZone originalTimeZone = TimeZone.getDefault();
        Locale originalLocale = Locale.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
            Locale.setDefault(Locale.US);
            SystemConfig target = new SystemConfig("Asia/Shanghai", "ja_JP", "light-ops");
            when(generalConfigDao.findByType(GeneralConfigTypeEnum.system.name()))
                    .thenReturn(GeneralConfig.builder()
                            .type(GeneralConfigTypeEnum.system.name())
                            .content(JsonUtil.toJson(target))
                            .build());

            service.saveConfig(target);

            assertEquals("UTC", TimeZone.getDefault().getID());
            assertEquals(Locale.US, Locale.getDefault());
            verify(applicationContext, never()).publishEvent(any(SystemConfigChangeEvent.class));
        } finally {
            TimeZone.setDefault(originalTimeZone);
            Locale.setDefault(originalLocale);
        }
    }

    @Test
    void typedSaveReturnsAuthoritativePersistedConfig() {
        SystemConfig persisted = new SystemConfig("Asia/Shanghai", "ja_JP", "light-ops");
        when(generalConfigDao.findByType(GeneralConfigTypeEnum.system.name()))
                .thenReturn(GeneralConfig.builder()
                        .type(GeneralConfigTypeEnum.system.name())
                        .content(JsonUtil.toJson(persisted))
                        .build());
        SystemConfigRequest request = new SystemConfigRequest();
        request.setTimeZoneId("UTC");
        request.setLocale("en_US");
        request.setTheme("dark-ops");

        SystemConfig result = service.saveAndGetConfig(request);

        assertEquals(persisted, result);
    }

    @Test
    void persistenceFailureDoesNotApplyRuntimeOrPublishEvents() {
        TimeZone originalTimeZone = TimeZone.getDefault();
        Locale originalLocale = Locale.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
            Locale.setDefault(Locale.US);
            when(generalConfigDao.save(any(GeneralConfig.class)))
                    .thenThrow(new DataAccessResourceFailureException("storage unavailable"));

            assertThrows(DataAccessResourceFailureException.class, () -> service.saveConfig(
                    new SystemConfig("Asia/Shanghai", "ja_JP", "light-ops")));

            assertEquals("UTC", TimeZone.getDefault().getID());
            assertEquals(Locale.US, Locale.getDefault());
            verifyNoInteractions(applicationContext);
        } finally {
            TimeZone.setDefault(originalTimeZone);
            Locale.setDefault(originalLocale);
        }
    }

    @Test
    void legacyReadMigratesDefaultThemeAndUnsupportedLocaleToCanonicalValues() {
        SystemConfig legacy = new SystemConfig("Asia/Shanghai", "fr_FR", "default");
        SystemConfig canonical = new SystemConfig("Asia/Shanghai", "en_US", "dark-ops");
        when(generalConfigDao.findByType(GeneralConfigTypeEnum.system.name()))
                .thenReturn(GeneralConfig.builder()
                                .type(GeneralConfigTypeEnum.system.name())
                                .content(JsonUtil.toJson(legacy))
                                .build(),
                        GeneralConfig.builder()
                                .type(GeneralConfigTypeEnum.system.name())
                                .content(JsonUtil.toJson(canonical))
                                .build());

        assertEquals(canonical, service.initializeCanonicalConfig());
        verify(generalConfigDao).save(any(GeneralConfig.class));
    }

    @Test
    void ordinaryReadDoesNotMigrateOrPublishForLegacyRows() {
        SystemConfig legacy = new SystemConfig("Asia/Shanghai", "fr_FR", "default");
        when(generalConfigDao.findByType(GeneralConfigTypeEnum.system.name()))
                .thenReturn(GeneralConfig.builder()
                        .type(GeneralConfigTypeEnum.system.name())
                        .content(JsonUtil.toJson(legacy))
                        .build());

        assertEquals(legacy, service.getConfig());

        verify(generalConfigDao, never()).save(any(GeneralConfig.class));
        verifyNoInteractions(applicationContext);
    }

}
