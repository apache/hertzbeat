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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;
import org.apache.hertzbeat.alert.service.AlertSilenceService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * tes case for {@link AlertSilenceController}
 */

@ExtendWith(MockitoExtension.class)
class AlertSilenceControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AlertSilenceService alertSilenceService;

    private AlertSilence alertSilence;

    @InjectMocks
    private AlertSilenceController alertSilenceController;

    @BeforeEach
    void setUp() {

        this.mockMvc = standaloneSetup(alertSilenceController).build();

        alertSilence = AlertSilence.builder()
                .id(1L)
                .name("Test Silence")
                .type((byte) 1)
                .build();
    }

    @Test
    void testAddNewAlertSilence() throws Exception {

        doNothing().when(alertSilenceService).validate(any(AlertSilence.class), eq(false));
        doNothing().when(alertSilenceService).addAlertSilence(any(AlertSilence.class));

        mockMvc.perform(post("/api/alert/silence")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(alertSilence)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    void testModifyAlertSilence() throws Exception {

        doNothing().when(alertSilenceService).validate(any(AlertSilence.class), eq(true));
        doNothing().when(alertSilenceService).modifyAlertSilence(any(AlertSilence.class));

        mockMvc.perform(put("/api/alert/silence")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(alertSilence)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    void testGetAlertSilence() throws Exception {

        when(alertSilenceService.getAlertSilence(1L)).thenReturn(alertSilence);

        mockMvc.perform(get("/api/alert/silence/1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("Test Silence"));
    }

    @Test
    void testGetAlertSilenceNotExists() throws Exception {

        when(alertSilenceService.getAlertSilence(1L)).thenReturn(null);

        mockMvc.perform(get("/api/alert/silence/1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.MONITOR_NOT_EXIST_CODE))
                .andExpect(jsonPath("$.msg").value("AlertSilence not exist."));
    }

}
