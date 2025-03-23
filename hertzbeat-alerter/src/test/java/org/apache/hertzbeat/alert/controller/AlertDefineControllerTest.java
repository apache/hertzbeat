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

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.util.Collections;
import java.util.List;
import org.apache.hertzbeat.alert.service.impl.AlertDefineServiceImpl;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.AlertDefineMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Test case for {@link AlertDefineController}
 */
@ExtendWith(MockitoExtension.class)
class AlertDefineControllerTest {

    private MockMvc mockMvc;

    private AlertDefine alertDefine;

    private List<AlertDefineMonitorBind> alertDefineMonitorBinds;

    @Mock
    private AlertDefineServiceImpl alertDefineService;

    @InjectMocks
    private AlertDefineController alertDefineController;

    @BeforeEach
    void setUp() {
        // standaloneSetup: Standalone setup, not integrated with a web environment for testing
        this.mockMvc = MockMvcBuilders.standaloneSetup(alertDefineController).build();

        this.alertDefine = AlertDefine.builder()
                .id(1L)
                .name("alertDefine")
                .expr("1 > 0")
                .times(1)
                .template("template")
                .creator("tom")
                .modifier("tom")
                .build();

        this.alertDefineMonitorBinds = Collections.singletonList(
                AlertDefineMonitorBind.builder()
                        .id(1L)
                        .alertDefineId(this.alertDefine.getId())
                        .monitorId(1L)
                        .monitor(
                                Monitor.builder()
                                        .id(1L)
                                        .app("app")
                                        .host("localhost")
                                        .name("monitor")
                                        .build()
                        )
                        .build()
        );
    }

    @Test
    void addNewAlertDefine() throws Exception {
        // Simulate the client sending a request to the server
        mockMvc.perform(MockMvcRequestBuilders.post("/api/alert/define")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(this.alertDefine)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void modifyAlertDefine() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.put("/api/alert/define")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(this.alertDefine)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void getAlertDefine() throws Exception {
        // Simulate returning data from getAlertDefine
        Mockito.when(alertDefineService.getAlertDefine(this.alertDefine.getId()))
                .thenReturn(this.alertDefine);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/alert/define/" + this.alertDefine.getId())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.id").value(alertDefine.getId()))
                .andExpect(jsonPath("$.data.expr").value(alertDefine.getExpr()))
                .andExpect(jsonPath("$.data.template").value(alertDefine.getTemplate()))
                .andExpect(jsonPath("$.data.gmtCreate").value(alertDefine.getGmtCreate()))
                .andExpect(jsonPath("$.data.gmtUpdate").value(alertDefine.getGmtUpdate()))
                .andReturn();
    }

    @Test
    void deleteAlertDefine() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.delete("/api/alert/define/" + this.alertDefine.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(this.alertDefine)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }
}
