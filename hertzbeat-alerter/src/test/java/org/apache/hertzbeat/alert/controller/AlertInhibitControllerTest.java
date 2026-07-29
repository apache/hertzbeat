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

package org.apache.hertzbeat.alert.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dto.AlertInhibitRequest;
import org.apache.hertzbeat.alert.dto.AlertInhibitResponse;
import org.apache.hertzbeat.alert.service.AlertInhibitNotFoundException;
import org.apache.hertzbeat.alert.service.AlertInhibitOperationException;
import org.apache.hertzbeat.alert.service.AlertInhibitService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@ExtendWith(MockitoExtension.class)
class AlertInhibitControllerTest {

    private MockMvc mockMvc;
    @Mock
    private AlertInhibitService service;
    @InjectMocks
    private AlertInhibitController controller;

    @BeforeEach
    void setUp() {
        mockMvc = standaloneSetup(controller).setControllerAdvice(new AlertInhibitControllerAdvice()).build();
    }

    @Test
    void createAndUpdateReturnAuthoritativeExplicitRecords() throws Exception {
        AlertInhibitResponse response = response();
        when(service.create(any(AlertInhibitRequest.class))).thenReturn(response);
        when(service.update(any(AlertInhibitRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/alert/inhibit").contentType(MediaType.APPLICATION_JSON).content(createBody()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.id").value(7));
        mockMvc.perform(put("/api/alert/inhibit").contentType(MediaType.APPLICATION_JSON)
                        .content(createBody().replaceFirst("\\{", "{\"id\":7,")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.name").value("Host suppression"));
    }

    @Test
    void createRejectsAuditFieldsWithoutReflectingValues() throws Exception {
        String body = """
                {"name":"Host suppression","enable":true,
                 "sourceLabels":{"severity":"critical"},"targetLabels":{"severity":"warning"},
                 "equalLabels":["instance"],"creator":"attacker"}
                """;
        mockMvc.perform(post("/api/alert/inhibit").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("attacker"))));
    }

    @Test
    void detailDistinguishesMissingUnavailableAndErrorWithoutReflectingMessages() throws Exception {
        when(service.get(1L)).thenThrow(new AlertInhibitNotFoundException());
        when(service.get(2L)).thenThrow(new DataAccessResourceFailureException("matcher-sentinel"));
        when(service.get(3L)).thenThrow(new IllegalStateException("body-sentinel"));
        when(service.get(7L)).thenReturn(response());

        mockMvc.perform(get("/api/alert/inhibit/7")).andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.id").value(7));
        mockMvc.perform(get("/api/alert/inhibit/1")).andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.MONITOR_NOT_EXIST_CODE))
                .andExpect(jsonPath("$.msg").value("AlertInhibit not exist."));
        mockMvc.perform(get("/api/alert/inhibit/2")).andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("Alert inhibit storage unavailable"));
        mockMvc.perform(get("/api/alert/inhibit/3")).andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("Alert inhibit operation error"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("body-sentinel"))));
    }

    @Test
    void uncertainCreateReturnsSafeNonValidationOutcome() throws Exception {
        when(service.create(any(AlertInhibitRequest.class)))
                .thenThrow(new AlertInhibitOperationException("write-sentinel"));

        mockMvc.perform(post("/api/alert/inhibit").contentType(MediaType.APPLICATION_JSON).content(createBody()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Alert inhibit operation error"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("write-sentinel"))));
    }

    private String createBody() {
        return """
                {"name":"Host suppression","enable":true,
                 "sourceLabels":{"severity":"critical"},"targetLabels":{"severity":"warning"},
                 "equalLabels":["instance"]}
                """;
    }

    private AlertInhibitResponse response() {
        return new AlertInhibitResponse(7L, "Host suppression", Map.of("severity", "critical"),
                Map.of("severity", "warning"), List.of("instance"), true, null, null, null, null);
    }
}
