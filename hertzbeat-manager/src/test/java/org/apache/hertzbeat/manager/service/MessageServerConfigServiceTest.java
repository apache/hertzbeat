/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.dto.MailServerConfig;
import org.apache.hertzbeat.common.entity.dto.sms.SmsConfig;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.manager.pojo.dto.EmailServerConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigRequest;
import org.apache.hertzbeat.manager.service.impl.MessageServerConfigServiceImpl;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.dao.DataIntegrityViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MessageServerConfigServiceTest {

    @Mock
    private ConfigService configService;
    @Mock
    private MessageServerConfigMapper mapper;
    @Mock
    private GeneralConfigDao generalConfigDao;
    private MessageServerConfigServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new MessageServerConfigServiceImpl(configService, mapper, generalConfigDao);
    }

    @Test
    void missingReadIsDistinct() {
        when(generalConfigDao.findByType("email")).thenReturn(null);
        assertEquals("missing", service.getEmailConfig().status());
        assertEquals("missing", service.getEmailConfig().revision());
    }

    @Test
    void configuredReadReturnsPersistedOpaqueRevisionWithoutChangingSafeResponseMapping() {
        MailServerConfig stored = new MailServerConfig();
        stored.setEmailHost("smtp.example.test");
        GeneralConfig entity = GeneralConfig.builder()
                .type("email")
                .content(JsonUtil.toJson(stored))
                .revision("b7439dae-175f-4cf7-8182-cfd90ce48927")
                .build();
        when(generalConfigDao.findByType("email")).thenReturn(entity);

        assertEquals("b7439dae-175f-4cf7-8182-cfd90ce48927", service.getEmailConfig().revision());
        verify(mapper).toEmailResponse(stored);
    }

    @Test
    void saveRequiresExpectedRevisionSoOldClientsFailClosed() {
        EmailServerConfigRequest request = new EmailServerConfigRequest();
        MessageServerConfigRevisionRequiredException exception = assertThrows(
                MessageServerConfigRevisionRequiredException.class, () -> service.saveEmailConfig(request));
        assertEquals("message_server_config_revision_required", exception.getMessage());
    }

    @Test
    void staleEmailWriteReturnsStableConflictAndDoesNotPersistOrReplay() {
        EmailServerConfigRequest request = new EmailServerConfigRequest();
        request.setExpectedRevision("b7439dae-175f-4cf7-8182-cfd90ce48927");
        MailServerConfig existing = new MailServerConfig();
        MailServerConfig merged = new MailServerConfig();
        GeneralConfig entity = GeneralConfig.builder()
                .type("email")
                .content(JsonUtil.toJson(existing))
                .revision(request.getExpectedRevision())
                .build();
        when(generalConfigDao.findByType("email")).thenReturn(entity);
        when(mapper.toEmailConfig(request, existing)).thenReturn(merged);
        when(generalConfigDao.updateContentIfRevision(eq("email"), any(), any(), eq(request.getExpectedRevision())))
                .thenReturn(0);

        MessageServerConfigConflictException conflict = assertThrows(
                MessageServerConfigConflictException.class, () -> service.saveEmailConfig(request));
        assertEquals("message_server_config_revision_conflict", conflict.getMessage());
        verify(configService, never()).handleConfig(any(), any());
    }

    @Test
    void firstCreateUsesMissingRevisionAndUniqueKeyLoserIsTheSameStableConflict() {
        EmailServerConfigRequest request = new EmailServerConfigRequest();
        request.setExpectedRevision("missing");
        MailServerConfig merged = new MailServerConfig();
        when(generalConfigDao.findByType("email")).thenReturn(null);
        when(mapper.toEmailConfig(request, null)).thenReturn(merged);
        when(generalConfigDao.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("secret-db-exception"));

        MessageServerConfigConflictException conflict = assertThrows(
                MessageServerConfigConflictException.class, () -> service.saveEmailConfig(request));
        assertEquals("message_server_config_revision_conflict", conflict.getMessage());
        verify(configService, never()).handleConfig(any(), any());
    }

    @Test
    void successfulSmsCasReturnsTheNewPersistedRevision() {
        SmsServerConfigRequest request = new SmsServerConfigRequest();
        request.setExpectedRevision("8c9a1410-096f-43aa-97dc-fc2359b5b22f");
        SmsConfig existing = new SmsConfig();
        SmsConfig merged = new SmsConfig();
        merged.setType("twilio");
        GeneralConfig entity = GeneralConfig.builder()
                .type("sms")
                .content(JsonUtil.toJson(existing))
                .revision(request.getExpectedRevision())
                .build();
        when(generalConfigDao.findByType("sms")).thenReturn(entity);
        when(mapper.toSmsConfig(request, existing)).thenReturn(merged);
        when(generalConfigDao.updateContentIfRevision(eq("sms"), any(), any(), eq(request.getExpectedRevision())))
                .thenReturn(1);

        var result = service.saveSmsConfig(request);

        assertEquals("configured", result.status());
        org.junit.jupiter.api.Assertions.assertNotEquals(request.getExpectedRevision(), result.revision());
        verify(configService).handleConfig("sms", merged);
    }
}
