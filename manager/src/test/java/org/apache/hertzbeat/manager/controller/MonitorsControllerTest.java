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

import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.service.impl.MonitorServiceImpl;
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

    @Test
    void export() throws Exception {
        List<Long> ids = Arrays.asList(6565463543L, 6565463544L);
        String type = "JSON";

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitors/export")
                        .param("ids", ids.stream().map(String::valueOf).collect(Collectors.joining(",")))
                        .param("type", type))
                .andExpect(status().isOk())
                .andReturn();
    }

    @Test
    void export2() throws Exception {
        // Mock the behavior of monitorService.importConfig
        doNothing().when(monitorService).importConfig(Mockito.any());

        // Perform the request and verify the response
        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/monitors/import")
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .param("file", "testFileContent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("0"))
                .andExpect(jsonPath("$.msg").value("Import success"));
    }

    @Test
    void duplicateMonitors() throws Exception {
        // Mock the behavior of monitorService.copyMonitors
        doNothing().when(monitorService).copyMonitors(List.of(6565463543L));

        // Perform the POST request and verify the response
        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/monitors/copy")
                        .param("ids", "6565463543"))
                .andExpect(status().isOk());
    }
}
