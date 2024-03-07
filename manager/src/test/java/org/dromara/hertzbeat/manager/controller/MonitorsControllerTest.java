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

package org.dromara.hertzbeat.manager.controller;

import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.manager.service.impl.MonitorServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;
import java.util.List;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test case for {@link MonitorsController}
 */
@ExtendWith(MockitoExtension.class)
class MonitorsControllerTest {

    private MockMvc mockMvc;

    @Mock
    private MonitorServiceImpl monitorService;

    @InjectMocks
    private MonitorsController monitorsController;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(monitorsController).build();
    }

    @Test
    void getMonitors() throws Exception {

        this.mockMvc.perform(MockMvcRequestBuilders.get(
                "/api/monitors?app={app}&ids={ids}&host={host}&id={id}",
                        "website",
                                    6565463543L,
                                    "127.0.0.1",
                                    "id"
                        ))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void getAppMonitors() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitors/{app}", "linux"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void deleteMonitors() throws Exception {
        List<Long> ids = new ArrayList<>();
        ids.add(6565463543L);

        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/monitors")
                .contentType(MediaType.APPLICATION_JSON)
                .content(JsonUtil.toJson(ids)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void cancelManageMonitors() throws Exception {
        List<Long> ids = new ArrayList<>();
        ids.add(6565463543L);

        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/monitors/manage")
                .contentType(MediaType.APPLICATION_JSON)
                .content(JsonUtil.toJson(ids)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void enableManageMonitors() throws Exception {
        List<Long> ids = new ArrayList<>();
        ids.add(6565463543L);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitors/manage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(ids)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }
}
