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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Set;
import org.apache.hertzbeat.common.entity.dto.MailServerConfig;
import org.apache.hertzbeat.common.entity.dto.sms.SmsConfig;
import org.apache.hertzbeat.common.entity.dto.sms.TwilioSmsProperties;
import org.apache.hertzbeat.manager.pojo.dto.EmailServerConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigOptions;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MessageServerConfigMapperTest {

    private MessageServerConfigMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new MessageServerConfigMapper();
    }

    @Test
    void emailSecretOmissionPreservesAndExplicitClearRemoves() {
        MailServerConfig existing = new MailServerConfig(
                0, "old.example.test", "old@example.test", "stored-password", 465, true, false, true);
        EmailServerConfigRequest update = emailRequest();

        MailServerConfig preserved = mapper.toEmailConfig(update, existing);
        assertEquals("stored-password", preserved.getEmailPassword());
        assertEquals(Set.of("emailPassword"), mapper.toEmailResponse(preserved).configuredSecrets());

        update.setEnable(false);
        update.setClearSecrets(Set.of("emailPassword"));
        MailServerConfig cleared = mapper.toEmailConfig(update, existing);
        assertNull(cleared.getEmailPassword());
        assertEquals(Set.of(), mapper.toEmailResponse(cleared).configuredSecrets());
    }

    @Test
    void enabledEmailRejectsClearedPassword() {
        EmailServerConfigRequest request = emailRequest();
        request.setClearSecrets(Set.of("emailPassword"));
        assertThrows(IllegalArgumentException.class, () -> mapper.toEmailConfig(request,
                new MailServerConfig(0, "old", "old@example.test", "stored", 465, true, false, true)));
    }

    @Test
    void emailRejectsUnknownTypeAndInvalidAddress() {
        EmailServerConfigRequest request = emailRequest();
        request.setType(2);
        assertThrows(IllegalArgumentException.class, () -> mapper.toEmailConfig(request, null));
        request.setType(0);
        request.setEmailUsername("not-an-email");
        assertThrows(IllegalArgumentException.class, () -> mapper.toEmailConfig(request, null));
    }

    @Test
    void smsProviderAllowsOnlyOwnedOptionsAndPreservesSecret() {
        SmsConfig existing = new SmsConfig();
        existing.setType("twilio");
        existing.setEnable(true);
        existing.setTwilio(new TwilioSmsProperties("account", "stored-token", "+12025550123"));
        SmsServerConfigRequest request = twilioRequest();

        SmsConfig updated = mapper.toSmsConfig(request, existing);
        assertEquals("stored-token", updated.getTwilio().getAuthToken());
        assertEquals(Set.of("authToken"), mapper.toSmsResponse(updated).configuredSecrets());

        request.getOptions().setRegion("us-east-1");
        assertThrows(IllegalArgumentException.class, () -> mapper.toSmsConfig(request, existing));
    }

    @Test
    void smsClearIsExplicitAndCannotLeaveEnabledProviderWithoutSecret() {
        SmsConfig existing = new SmsConfig();
        existing.setType("twilio");
        existing.setEnable(true);
        existing.setTwilio(new TwilioSmsProperties("account", "stored-token", "+12025550123"));
        SmsServerConfigRequest request = twilioRequest();
        request.setClearSecrets(Set.of("authToken"));

        assertThrows(IllegalArgumentException.class, () -> mapper.toSmsConfig(request, existing));
        request.setEnable(false);
        assertNull(mapper.toSmsConfig(request, existing).getTwilio().getAuthToken());
    }

    private EmailServerConfigRequest emailRequest() {
        EmailServerConfigRequest request = new EmailServerConfigRequest();
        request.setType(0);
        request.setEmailHost(" smtp.example.test ");
        request.setEmailUsername(" ops@example.test ");
        request.setEmailPort(465);
        request.setEmailSsl(true);
        request.setEmailStarttls(false);
        request.setEnable(true);
        return request;
    }

    private SmsServerConfigRequest twilioRequest() {
        SmsServerConfigOptions options = new SmsServerConfigOptions();
        options.setAccountSid("account");
        options.setTwilioPhoneNumber("+12025550123");
        SmsServerConfigRequest request = new SmsServerConfigRequest();
        request.setEnable(true);
        request.setType("twilio");
        request.setOptions(options);
        return request;
    }
}
