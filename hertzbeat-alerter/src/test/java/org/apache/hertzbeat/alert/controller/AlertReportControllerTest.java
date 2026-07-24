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

package org.apache.hertzbeat.alert.controller;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Unit contract for {@link AlertReportController}.
 */
@ExtendWith(MockitoExtension.class)
class AlertReportControllerTest {

    private static final String BODY = "{\"summary\":\"database unavailable\"}";

    private MockMvc mockMvc;

    @Mock
    private ExternAlertService externAlertService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new AlertReportController(List.of(externAlertService)))
                .build();
    }

    @Test
    void namedSourceUsesExactCaseSensitiveServiceAndHistoricalSuccessEnvelope() throws Exception {
        when(externAlertService.supportSource()).thenReturn("tencent");

        mockMvc.perform(MockMvcRequestBuilders.post("/api/alerts/report/tencent")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add extern alert success"))
                .andExpect(jsonPath("$.data").doesNotExist());

        verify(externAlertService).addExternAlert(BODY);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/alerts/report/Tencent")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("external_alert_source_unsupported"));
    }

    @Test
    void sourceLessWebhookUsesDefaultService() throws Exception {
        when(externAlertService.supportSource()).thenReturn("default");

        mockMvc.perform(MockMvcRequestBuilders.post("/api/alerts/report")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add extern alert success"));

        verify(externAlertService).addExternAlert(BODY);
    }

    @Test
    void prometheusCompatibilityRouteUsesPrometheusService() throws Exception {
        when(externAlertService.supportSource()).thenReturn("prometheus");

        mockMvc.perform(MockMvcRequestBuilders.post("/api/v2/alerts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add extern alert success"));

        verify(externAlertService).addExternAlert(BODY);
    }

    @Test
    void handlerFailureReturnsStableSafeBadRequest() throws Exception {
        String privateBody = "{\"token\":\"Bearer-private\",\"path\":\"/secret/alert.json\"}";
        when(externAlertService.supportSource()).thenReturn("default");
        doThrow(new IllegalArgumentException("Bearer-private at /secret/alert.json: " + privateBody))
                .when(externAlertService).addExternAlert(privateBody);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/alerts/report")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(privateBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("external_alert_rejected"))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("Bearer-private"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("/secret/"))));
    }

    @Test
    void missingBodyReturnsStableSafeBadRequest() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.post("/api/alerts/report")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("external_alert_rejected"));
    }

    @Test
    void unsupportedOrUnavailableSourceReturnsStableFailureEnvelope() throws Exception {
        String privateSource = "Bearer-private-source";
        when(externAlertService.supportSource()).thenReturn("other");

        mockMvc.perform(MockMvcRequestBuilders.post("/api/alerts/report/{source}", privateSource)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("external_alert_source_unsupported"))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString(privateSource))));

        MockMvc unavailable = MockMvcBuilders
                .standaloneSetup(new AlertReportController(List.of()))
                .build();
        unavailable.perform(MockMvcRequestBuilders.post("/api/v2/alerts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("external_alert_source_unsupported"));
    }

    @Test
    void integrationIngressHasNoReadUpdateOrDeleteApi() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/alerts/report"))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(MockMvcRequestBuilders.put("/api/alerts/report")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(MockMvcRequestBuilders.delete("/api/alerts/report"))
                .andExpect(status().isMethodNotAllowed());
    }
}
