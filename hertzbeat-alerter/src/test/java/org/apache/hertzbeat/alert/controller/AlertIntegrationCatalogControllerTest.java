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

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.CatalogItem;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.CatalogResponse;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.IntegrationGuide;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.Readiness;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationRequestException;
import org.apache.hertzbeat.alert.integration.service.AlertIntegrationCatalogService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class AlertIntegrationCatalogControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AlertIntegrationCatalogService service;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new AlertIntegrationCatalogController(service))
                .build();
    }

    @Test
    void exposesTheUnversionedCatalogEndpoint() throws Exception {
        when(service.catalog()).thenReturn(new CatalogResponse(List.of(
                new CatalogItem(
                        "webhook",
                        "alert.integration.source.webhook",
                        "hertzbeat",
                        org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.Readiness.READY,
                        List.of()))));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/alerts/integrations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.items[0].source").value("webhook"))
                .andExpect(jsonPath("$.data.items[0].readiness").value("ready"));
    }

    @Test
    void exposesTheUnversionedRenderEndpoint() throws Exception {
        when(service.render("webhook")).thenReturn(new IntegrationGuide(
                "webhook",
                "alert.integration.source.webhook",
                "hertzbeat",
                "POST",
                "/api/alerts/report",
                "single_alert",
                Map.of("Authorization", "Bearer {token}"),
                List.of("labels"),
                List.of("alert.integration.webhook.step.configure_request"),
                List.of("{\"labels\":{\"alertname\":\"HighCPUUsage\"}}"),
                "alert.integration.ack.accepted_for_processing",
                Readiness.READY,
                List.of()));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/alerts/integrations/webhook"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.source").value("webhook"))
                .andExpect(jsonPath("$.data.requiredHeaders.Authorization").value("Bearer {token}"))
                .andExpect(jsonPath("$.data.readiness").value("ready"));
    }

    @Test
    void unknownSourcesReturnSafeStableErrors() throws Exception {
        String privateSource = "Bearer-private-source";
        when(service.render(privateSource)).thenThrow(
                AlertIntegrationRequestException.sourceUnsupported());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/alerts/integrations/{source}", privateSource))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("external_alert_source_unsupported"))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString(privateSource))));
    }
}
