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

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
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
 * Test case for {@link MonitorController}
 */
@ExtendWith(MockitoExtension.class)
class MonitorControllerTest {

    private MockMvc mockMvc;

    @Mock
    private MonitorServiceImpl monitorService;

    @InjectMocks
    private MonitorController monitorController;

    public MonitorDto dataTest() {
        Monitor monitor = new Monitor();
        monitor.setApp("website");
        monitor.setId(87584674384L);
        monitor.setJobId(43243543543L);
        monitor.setName("Api-TanCloud.cn");
        monitor.setName("TanCloud");
        monitor.setHost("192.167.25.11");
        monitor.setIntervals(600);
        monitor.setDescription("对SAAS网站TanCloud的可用性监控");
        monitor.setCreator("tom");
        monitor.setModifier("tom");

        List<Param> params = new ArrayList<>();
        Param param = new Param();
        param.setField("host");
        param.setParamValue("124.222.98.77");
        params.add(param);

        MonitorDto monitorDto = new MonitorDto();
        monitorDto.setMonitor(monitor);
        monitorDto.setDetected(true);
        monitorDto.setParams(params);
        return monitorDto;
    }

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(monitorController).build();
    }

    @Test
    void addNewMonitor() throws Exception {

        MonitorDto monitorDto = dataTest();
        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/monitor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(monitorDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();

    }

    @Test
    void modifyMonitor() throws Exception {
        MonitorDto monitorDto = dataTest();

        this.mockMvc.perform(MockMvcRequestBuilders.put("/api/monitor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(monitorDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void getMonitor() throws Exception {
        Monitor monitor = new Monitor();
        monitor.setId(87584674384L);
        monitor.setJobId(43243543543L);
        monitor.setName("Api-TanCloud.cn");
        monitor.setName("TanCloud");
        monitor.setHost("192.167.25.11");
        monitor.setIntervals(600);
        monitor.setDescription("对SAAS网站TanCloud的可用性监控");
        monitor.setCreator("tom");
        monitor.setModifier("tom");

        MonitorDto monitorDto = new MonitorDto();
        monitorDto.setMonitor(monitor);


        Mockito.when(monitorService.getMonitorDto(6565463543L))
                .thenReturn(monitorDto);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitor/{id}", 6565463543L))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(status().isOk())
                .andReturn();
    }

    @Test
    void deleteMonitor() throws Exception {

        Monitor monitor = new Monitor();
        monitor.setId(87584674384L);
        monitor.setJobId(43243543543L);
        monitor.setName("Api-TanCloud.cn");
        monitor.setName("TanCloud");
        monitor.setHost("192.167.25.11");
        monitor.setIntervals(600);
        monitor.setDescription("对SAAS网站TanCloud的可用性监控");
        monitor.setCreator("tom");
        monitor.setModifier("tom");

        Mockito.when(monitorService.getMonitor(6565463543L))
                .thenReturn(monitor);

        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/monitor/{id}", 6565463543L))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Delete success"))
                .andExpect(status().isOk())
                .andReturn();
    }

    @Test
    void detectMonitor() throws Exception {
        MonitorDto monitorDto = dataTest();

        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/monitor/detect")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(monitorDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Detect success."))
                .andReturn();
    }

    @Test
    void addNewMonitorOptionalMetrics() throws Exception {
        MonitorDto monitorDto = dataTest();

        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/monitor/optional")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(monitorDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add success"))
                .andReturn();
    }

    @Test
    void getMonitorMetrics() throws Exception {

        List<String> metricNames = new ArrayList<>();

        Mockito.when(monitorService.getMonitorMetrics("app"))
                .thenReturn(metricNames);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitor/metric/{app}", "app"))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(status().isOk())
                .andReturn();

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/monitor/metric"))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(status().isOk())
                .andReturn();
    }
}
