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
import org.apache.hertzbeat.alert.service.AlertConvergeService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertConverge;
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
 * test case for {@link AlertConvergeController}
 */

@ExtendWith(MockitoExtension.class)
public class AlertConvergeControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AlertConvergeService alertConvergeService;

    private AlertConverge alertConverge;

    @InjectMocks
    private AlertConvergeController alertConvergeController;

    @BeforeEach
    void setUp() {

        this.mockMvc = standaloneSetup(alertConvergeController).build();

        alertConverge = AlertConverge.builder()
                .name("test")
                .creator("admin")
                .modifier("admin")
                .id(1L)
                .build();
    }

    @Test
    void testAddNewAlertConverge() throws Exception {

        doNothing().when(alertConvergeService).validate(any(AlertConverge.class), eq(false));
        doNothing().when(alertConvergeService).addAlertConverge(any(AlertConverge.class));

        mockMvc.perform(post("/api/alert/converge")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(alertConverge))
                ).andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add success"));
    }

    @Test
    void testModifyAlertConverge() throws Exception {

        doNothing().when(alertConvergeService).validate(any(AlertConverge.class), eq(true));
        doNothing().when(alertConvergeService).modifyAlertConverge(any(AlertConverge.class));

        mockMvc.perform(put("/api/alert/converge")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(alertConverge))
                ).andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Modify success"));
    }

    @Test
    void testGetAlertConvergeExists() throws Exception {

        when(alertConvergeService.getAlertConverge(1L)).thenReturn(alertConverge);

        mockMvc.perform(get("/api/alert/converge/{id}", 1L)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(alertConverge.getId()));
    }

    @Test
    void testGetAlertConvergeNotExists() throws Exception {

        when(alertConvergeService.getAlertConverge(1L)).thenReturn(null);

        mockMvc.perform(get("/api/alert/converge/{id}", 1L)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.MONITOR_NOT_EXIST_CODE))
                .andExpect(jsonPath("$.msg").value("AlertConverge not exist."));
    }

}
