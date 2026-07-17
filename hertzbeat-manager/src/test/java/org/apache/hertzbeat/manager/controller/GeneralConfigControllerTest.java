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
import org.apache.hertzbeat.manager.pojo.dto.TemplateConfig;
import org.apache.hertzbeat.manager.service.MessageServerConfigService;
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

    @InjectMocks
    private GeneralConfigController generalConfigController;

    @BeforeEach
    public void setup() {

        mockMvc = standaloneSetup(generalConfigController).build();
    }

    @Test
    public void testSaveOrUpdateConfig() throws Exception {

        doNothing().when(configService).saveConfig(anyString(), any());

        mockMvc.perform(post("/api/config/system")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"key\":\"value\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Update config success"));
    }

    @Test
    public void testGetConfig() throws Exception {

        when(configService.getConfig(anyString())).thenReturn(any());

        mockMvc.perform(get("/api/config/system")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    void emailConfigReadMustNotExposePassword() throws Exception {
        EmailServerConfigResponse response = new EmailServerConfigResponse(
                0, "smtp.example.test", "ops@example.test", 465, true, false, true,
                Set.of("emailPassword"));
        when(messageServerConfigService.getEmailConfig()).thenReturn(MessageServerConfigResult.configured(response));

        mockMvc.perform(get("/api/config/email").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("configured"))
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
        when(messageServerConfigService.getSmsConfig()).thenReturn(MessageServerConfigResult.configured(response));

        mockMvc.perform(get("/api/config/sms").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
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
    public void testUpdateTemplateAppConfig() throws Exception {

        doNothing().when(configService).updateTemplateAppConfig(anyString(), any(TemplateConfig.AppTemplate.class));

        mockMvc.perform(put("/api/config/template/appName")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateKey\":\"templateValue\",\"hide\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

}
