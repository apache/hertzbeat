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

package org.apache.hertzbeat.manager.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;
import org.apache.hertzbeat.common.constants.CommonConstants;
import java.util.Set;
import org.apache.hertzbeat.manager.pojo.dto.EmailServerConfigResponse;
import org.apache.hertzbeat.manager.pojo.dto.MessageServerConfigResult;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigOptions;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigResponse;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfig;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.TemplateConfig;
import org.apache.hertzbeat.manager.service.MessageServerConfigConflictException;
import org.apache.hertzbeat.manager.service.MessageServerConfigRevisionRequiredException;
import org.apache.hertzbeat.manager.service.MessageServerConfigService;
import org.apache.hertzbeat.manager.service.SystemConfigService;
import org.apache.hertzbeat.manager.service.impl.ConfigServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Test case for {@link GeneralConfigController}
 */

@ExtendWith(MockitoExtension.class)
class GeneralConfigControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ConfigServiceImpl configService;

    @Mock
    private MessageServerConfigService messageServerConfigService;

    @Mock
    private SystemConfigService systemConfigService;

    @InjectMocks
    private GeneralConfigController generalConfigController;

    @BeforeEach
    public void setup() {

        mockMvc = standaloneSetup(generalConfigController).build();
    }

    @Test
    public void testSaveSystemConfig() throws Exception {
        when(systemConfigService.saveAndGetConfig(any())).thenReturn(
                new SystemConfig("UTC", "en_US", "dark-ops"));

        mockMvc.perform(post("/api/config/system")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"timeZoneId\":\"UTC\",\"locale\":\"en_US\",\"theme\":\"dark-ops\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.timeZoneId").value("UTC"));
        SystemConfigRequest expected = new SystemConfigRequest();
        expected.setTimeZoneId("UTC");
        expected.setLocale("en_US");
        expected.setTheme("dark-ops");
        verify(systemConfigService).saveAndGetConfig(expected);
    }

    @Test
    public void testGetSystemConfig() throws Exception {

        when(systemConfigService.getConfig()).thenReturn(
                new SystemConfig("UTC", "en_US", "dark-ops"));

        mockMvc.perform(get("/api/config/system")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    void missingSystemConfigIsDistinctFromStorageFailure() throws Exception {
        when(systemConfigService.getConfig()).thenReturn(null);

        mockMvc.perform(get("/api/config/system").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void systemConfigFailuresUseFixedEnvelopeWithoutStorageOrConfigText() throws Exception {
        when(systemConfigService.getConfig())
                .thenThrow(new DataAccessResourceFailureException("system-storage-sentinel"));
        when(systemConfigService.saveAndGetConfig(any()))
                .thenThrow(new IllegalArgumentException("system-config-sentinel"));

        mockMvc.perform(get("/api/config/system").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("System config storage unavailable"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("system-storage-sentinel"))));
        mockMvc.perform(post("/api/config/system")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"timeZoneId\":\"invalid-config-sentinel\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("Invalid system config"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("system-config-sentinel"))))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("invalid-config-sentinel"))));
    }

    @Test
    void systemConfigRejectsUnknownAndServerOwnedFieldsWithoutEchoingThem() throws Exception {
        when(systemConfigService.saveAndGetConfig(any()))
                .thenAnswer(invocation -> {
                    SystemConfigRequest request = invocation.getArgument(0);
                    if (request.isUnknownFieldPresent()) {
                        throw new IllegalArgumentException("unknown-field-sentinel");
                    }
                    return new SystemConfig(request.getTimeZoneId(), request.getLocale(), request.getTheme());
                });

        mockMvc.perform(post("/api/config/system")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"timeZoneId":"UTC","locale":"en_US","theme":"dark-ops",
                                 "type":"sms","token":"secret-token-sentinel"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("Invalid system config"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("secret-token-sentinel"))))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("unknown-field-sentinel"))));
    }

    @Test
    void emailConfigReadMustNotExposePassword() throws Exception {
        EmailServerConfigResponse response = new EmailServerConfigResponse(
                0, "smtp.example.test", "ops@example.test", 465, true, false, true,
                Set.of("emailPassword"));
        when(messageServerConfigService.getEmailConfig()).thenReturn(
                MessageServerConfigResult.configured("b7439dae-175f-4cf7-8182-cfd90ce48927", response));

        mockMvc.perform(get("/api/config/email").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("configured"))
                .andExpect(jsonPath("$.data.revision").value("b7439dae-175f-4cf7-8182-cfd90ce48927"))
                .andExpect(jsonPath("$.data.config.emailPassword").doesNotExist())
                .andExpect(jsonPath("$.data.config.configuredSecrets[0]").value("emailPassword"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("plaintext-sentinel"))));
    }

    @Test
    void smsConfigReadMustNotExposeToken() throws Exception {
        SmsServerConfigOptions options = new SmsServerConfigOptions();
        options.setAccountSid("account-sid");
        options.setAuthToken("plaintext-token-sentinel");
        options.setTwilioPhoneNumber("+12025550123");
        SmsServerConfigResponse response = new SmsServerConfigResponse(
                true, "twilio", options, Set.of("authToken"));
        when(messageServerConfigService.getSmsConfig()).thenReturn(
                MessageServerConfigResult.configured("8c9a1410-096f-43aa-97dc-fc2359b5b22f", response));

        mockMvc.perform(get("/api/config/sms").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.revision").value("8c9a1410-096f-43aa-97dc-fc2359b5b22f"))
                .andExpect(jsonPath("$.data.config.options.authToken").doesNotExist())
                .andExpect(jsonPath("$.data.config.configuredSecrets[0]").value("authToken"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("plaintext-token-sentinel"))));
    }

    @Test
    void messageServerStorageUnavailableIsDistinctFromGenericError() throws Exception {
        when(messageServerConfigService.getEmailConfig())
                .thenThrow(new DataAccessResourceFailureException("db-sentinel"));
        when(messageServerConfigService.getSmsConfig()).thenThrow(new IllegalStateException("error-sentinel"));

        mockMvc.perform(get("/api/config/email").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("Message server storage unavailable"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("db-sentinel"))));
        mockMvc.perform(get("/api/config/sms").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("Message server config error"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("error-sentinel"))));
    }

    @Test
    void staleMessageServerWriteReturnsStableConflictWithoutExceptionBody() throws Exception {
        when(messageServerConfigService.saveEmailConfig(any()))
                .thenThrow(new MessageServerConfigConflictException());

        mockMvc.perform(post("/api/config/email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"expectedRevision":"b7439dae-175f-4cf7-8182-cfd90ce48927",
                                 "type":0,"emailHost":"smtp.example.test",
                                 "emailUsername":"ops@example.test","emailPort":465,
                                 "emailSsl":true,"emailStarttls":false,"enable":true}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("message_server_config_revision_conflict"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("secret-db-exception"))));
    }

    @Test
    void oldMessageServerClientFailsClosedWithStablePreconditionError() throws Exception {
        when(messageServerConfigService.saveSmsConfig(any()))
                .thenThrow(new MessageServerConfigRevisionRequiredException());

        mockMvc.perform(post("/api/config/sms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enable\":false,\"type\":\"twilio\",\"options\":{}}"))
                .andExpect(status().isPreconditionRequired())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("message_server_config_revision_required"));
    }

    @Test
    public void testUpdateTemplateAppConfig() throws Exception {

        doNothing().when(configService).updateTemplateAppConfig(anyString(), any(TemplateConfig.AppTemplate.class));

        mockMvc.perform(put("/api/config/template/appName")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateKey\":\"templateValue\",\"hide\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

}
