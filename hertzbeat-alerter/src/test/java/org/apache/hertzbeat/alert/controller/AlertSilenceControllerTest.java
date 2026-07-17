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

import java.time.ZonedDateTime;
import org.apache.hertzbeat.alert.dto.AlertSilenceRequest;
import org.apache.hertzbeat.alert.dto.AlertSilenceResponse;
import org.apache.hertzbeat.alert.service.AlertSilenceNotFoundException;
import org.apache.hertzbeat.alert.service.AlertSilenceService;
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
class AlertSilenceControllerTest {

    private MockMvc mockMvc;
    @Mock
    private AlertSilenceService alertSilenceService;
    @InjectMocks
    private AlertSilenceController controller;

    @BeforeEach
    void setUp() {
        mockMvc = standaloneSetup(controller).setControllerAdvice(new AlertSilenceControllerAdvice()).build();
    }

    @Test
    void createAndUpdateUseExplicitContractsAndReturnAuthoritativeRecords() throws Exception {
        AlertSilenceResponse response = response();
        when(alertSilenceService.create(any(AlertSilenceRequest.class))).thenReturn(response);
        when(alertSilenceService.update(any(AlertSilenceRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/alert/silence").contentType(MediaType.APPLICATION_JSON).content(createBody()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.id").value(7));
        mockMvc.perform(put("/api/alert/silence").contentType(MediaType.APPLICATION_JSON)
                        .content(createBody().replaceFirst("\\{", "{\"id\":7,")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.name").value("Maintenance"));
    }

    @Test
    void createRejectsResponseOnlyAndAuditFields() throws Exception {
        String body = """
                {"name":"Maintenance","enable":true,"matchAll":true,"type":0,"labels":{},"days":[],
                 "periodStart":"2026-07-17T10:00:00Z","periodEnd":"2026-07-17T11:00:00Z",
                 "times":99,"creator":"attacker"}
                """;
        mockMvc.perform(post("/api/alert/silence").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("attacker"))));
    }

    @Test
    void detailDistinguishesMissingUnavailableAndErrorWithoutReflectingMessages() throws Exception {
        when(alertSilenceService.get(1L)).thenThrow(new AlertSilenceNotFoundException());
        when(alertSilenceService.get(2L)).thenThrow(new DataAccessResourceFailureException("matcher-sentinel"));
        when(alertSilenceService.get(3L)).thenThrow(new IllegalStateException("body-sentinel"));

        mockMvc.perform(get("/api/alert/silence/1")).andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("AlertSilence not exist."));
        mockMvc.perform(get("/api/alert/silence/2")).andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("Alert silence storage unavailable"));
        mockMvc.perform(get("/api/alert/silence/3")).andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("Alert silence operation error"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("body-sentinel"))));
    }

    private String createBody() {
        return """
                {"name":"Maintenance","enable":true,"matchAll":true,"type":0,"labels":{},"days":[],
                 "periodStart":"2026-07-17T10:00:00Z","periodEnd":"2026-07-17T11:00:00Z"}
                """;
    }

    private AlertSilenceResponse response() {
        return new AlertSilenceResponse(7L, "Maintenance", true, true, (byte) 0, 0, null, null,
                ZonedDateTime.parse("2026-07-17T10:00:00Z"), ZonedDateTime.parse("2026-07-17T11:00:00Z"),
                null, null, null, null);
    }
}
