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
import static org.mockito.Mockito.verifyNoInteractions;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
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

}
