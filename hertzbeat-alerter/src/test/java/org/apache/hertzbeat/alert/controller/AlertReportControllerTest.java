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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.integration.service.AlertIntegrationVerificationService;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.alert.service.impl.AlertManagerExternAlertService;
import org.apache.hertzbeat.alert.service.impl.AlibabaCloudSlsExternAlertService;
import org.apache.hertzbeat.alert.service.impl.DefaultExternAlertService;
import org.apache.hertzbeat.alert.service.impl.PrometheusExternAlertService;
import org.apache.hertzbeat.alert.service.impl.ZabbixExternAlertServiceImpl;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Unit contract for {@link AlertReportController}.
 */
@ExtendWith(MockitoExtension.class)
class AlertReportControllerTest {

    private static final String BODY = "{\"summary\":\"database unavailable\"}";
    private static final String WORKSPACE_ID = "team-a";

    private MockMvc mockMvc;

    @Mock
    private ExternAlertService externAlertService;

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @Mock
    private AlertIntegrationVerificationService verificationService;

    @BeforeEach
    void setUp() {
        AuthTokenRequestContext.bindWorkspaceId(WORKSPACE_ID);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new AlertReportController(List.of(externAlertService), verificationService))
                .build();
    }

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
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

        verify(externAlertService).addExternAlert(WORKSPACE_ID, BODY);
        verify(verificationService).recordAcceptedIngress(WORKSPACE_ID, "tencent");

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

        verify(externAlertService).addExternAlert(WORKSPACE_ID, BODY);
        verify(verificationService).recordAcceptedIngress(WORKSPACE_ID, "default");
    }

    @Test
    void acceptedIngressRemainsSuccessfulWhenVerificationEvidenceCannotBeStored() throws Exception {
        when(externAlertService.supportSource()).thenReturn("default");
        doThrow(new IllegalStateException("verification storage unavailable"))
                .when(verificationService).recordAcceptedIngress(WORKSPACE_ID, "default");

        mockMvc.perform(MockMvcRequestBuilders.post("/api/alerts/report")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));

        verify(externAlertService).addExternAlert(WORKSPACE_ID, BODY);
    }

    @Test
    void missingAuthenticatedWorkspaceRejectsBeforeIngress() throws Exception {
        when(externAlertService.supportSource()).thenReturn("default");
        AuthTokenRequestContext.clear();

        mockMvc.perform(MockMvcRequestBuilders.post("/api/alerts/report")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.msg").value("external_alert_rejected"));

        verify(externAlertService, org.mockito.Mockito.never()).addExternAlert(any(), any());
        verify(verificationService, never()).recordAcceptedIngress(any(), any());
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

        verify(externAlertService).addExternAlert(WORKSPACE_ID, BODY);
    }

    @Test
    void handlerFailureReturnsStableSafeBadRequest() throws Exception {
        String privateBody = "{\"token\":\"Bearer-private\",\"path\":\"/secret/alert.json\"}";
        when(externAlertService.supportSource()).thenReturn("default");
        doThrow(new IllegalArgumentException("Bearer-private at /secret/alert.json: " + privateBody))
                .when(externAlertService).addExternAlert(WORKSPACE_ID, privateBody);

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
    void realIngressRejectsMalformedEmptyAndUnprocessablePayloadsSafely() throws Exception {
        MockMvc realIngress = MockMvcBuilders
                .standaloneSetup(new AlertReportController(realIngressServices(), verificationService))
                .build();
        String privateBody = "Bearer-private-token private-test-source /secret/private-body";
        List<RequestBuilder> rejectedRequests = List.of(
                post("/api/alerts/report", privateBody),
                post("/api/alerts/report", "{}"),
                post("/api/v2/alerts", privateBody),
                post("/api/v2/alerts", "[]"),
                post("/api/alerts/report/alertmanager", privateBody),
                post("/api/alerts/report/alertmanager", "{\"alerts\":[]}"),
                post("/api/alerts/report/alibabacloud-sls", privateBody),
                post("/api/alerts/report/alibabacloud-sls", "[]"),
                post("/api/alerts/report/zabbix", privateBody),
                post("/api/alerts/report/zabbix", "{}"));

        for (RequestBuilder request : rejectedRequests) {
            realIngress.perform(request)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                    .andExpect(jsonPath("$.msg").value("external_alert_rejected"))
                    .andExpect(content().string(org.hamcrest.Matchers.not(
                            org.hamcrest.Matchers.containsString("Bearer-private-token"))))
                    .andExpect(content().string(org.hamcrest.Matchers.not(
                            org.hamcrest.Matchers.containsString("private-test-source"))))
                    .andExpect(content().string(org.hamcrest.Matchers.not(
                            org.hamcrest.Matchers.containsString("/secret/private-body"))));
        }
        verifyNoInteractions(alarmCommonReduce);
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
                .standaloneSetup(new AlertReportController(List.of(), verificationService))
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

    private List<ExternAlertService> realIngressServices() {
        return List.of(
                withReducer(new DefaultExternAlertService()),
                withReducer(new PrometheusExternAlertService()),
                withReducer(new AlertManagerExternAlertService()),
                new AlibabaCloudSlsExternAlertService(alarmCommonReduce),
                withReducer(new ZabbixExternAlertServiceImpl()));
    }

    private <T extends ExternAlertService> T withReducer(T service) {
        ReflectionTestUtils.setField(service, "alarmCommonReduce", alarmCommonReduce);
        return service;
    }

    private static RequestBuilder post(String path, String body) {
        return MockMvcRequestBuilders.post(path)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }
}
