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
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.dto.MailServerConfig;
import org.apache.hertzbeat.common.entity.dto.sms.SmsConfig;
import org.apache.hertzbeat.manager.pojo.dto.EmailServerConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigRequest;
import org.apache.hertzbeat.manager.service.impl.MessageServerConfigServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
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
        when(configService.getConfig("email")).thenReturn(null);
        assertEquals("missing", service.getEmailConfig().status());
    }

    @Test
    void saveUsesAuthoritativeReread() {
        EmailServerConfigRequest request = new EmailServerConfigRequest();
        MailServerConfig merged = new MailServerConfig();
        MailServerConfig authoritative = new MailServerConfig();
        when(configService.getConfig("email")).thenReturn(null, authoritative);
        when(mapper.toEmailConfig(request, null)).thenReturn(merged);
        when(mapper.toEmailResponse(authoritative)).thenReturn(null);

        assertEquals("configured", service.saveEmailConfig(request).status());
        InOrder order = inOrder(configService, mapper);
        order.verify(configService).getConfig("email");
        order.verify(mapper).toEmailConfig(request, null);
        order.verify(configService).saveConfig("email", merged);
        order.verify(configService).getConfig("email");
        order.verify(mapper).toEmailResponse(authoritative);
    }

    @Test
    void saveLoadsExistingEmailConfigUnderItsExactRowLockBeforeMergingCredentials() {
        EmailServerConfigRequest request = new EmailServerConfigRequest();
        MailServerConfig existing = new MailServerConfig();
        MailServerConfig merged = new MailServerConfig();
        when(configService.getConfig("email")).thenReturn(existing, merged);
        when(mapper.toEmailConfig(request, existing)).thenReturn(merged);

        service.saveEmailConfig(request);

        InOrder order = inOrder(generalConfigDao, configService, mapper);
        order.verify(generalConfigDao).findByTypeForUpdate("email");
        order.verify(configService).getConfig("email");
        order.verify(mapper).toEmailConfig(request, existing);
        order.verify(configService).saveConfig("email", merged);
        verify(generalConfigDao).findByTypeForUpdate("email");
    }

    @Test
    void saveLoadsExistingSmsConfigUnderItsExactRowLockBeforeMergingCredentials() {
        SmsServerConfigRequest request = new SmsServerConfigRequest();
        SmsConfig existing = new SmsConfig();
        SmsConfig merged = new SmsConfig();
        merged.setType("twilio");
        when(configService.getConfig("sms")).thenReturn(existing, merged);
        when(mapper.toSmsConfig(request, existing)).thenReturn(merged);

        service.saveSmsConfig(request);

        InOrder order = inOrder(generalConfigDao, configService, mapper);
        order.verify(generalConfigDao).findByTypeForUpdate("sms");
        order.verify(configService).getConfig("sms");
        order.verify(mapper).toSmsConfig(request, existing);
        order.verify(configService).saveConfig("sms", merged);
    }

    @Test
    void missingAuthoritativeRereadIsAnError() {
        EmailServerConfigRequest request = new EmailServerConfigRequest();
        when(configService.getConfig("email")).thenReturn(null);
        when(mapper.toEmailConfig(any(), any())).thenReturn(new MailServerConfig());
        assertThrows(IllegalStateException.class, () -> service.saveEmailConfig(request));
    }
}
