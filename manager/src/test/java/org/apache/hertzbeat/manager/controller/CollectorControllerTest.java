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
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.manager.service.impl.CollectorServiceImpl;
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

/**
 * Test case for {@link CollectorController}
 */
@ExtendWith(MockitoExtension.class)
@Slf4j
public class CollectorControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    private CollectorController collectorController;

    @Mock
    private CollectorServiceImpl collectorService;

    @Mock
    private ManageServer manageServer;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(collectorController).build();
    }

    @Test
    public void getCollectors() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.get(
                        "/api/collector?name={name}&pageIndex={pageIndex}&pageSize={pageSize}",
                        "tom", 0, 10))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    public void onlineCollector() throws Exception {
        List<String> collectors = new ArrayList<>();
        collectors.add("demo-collector");
        this.mockMvc.perform(MockMvcRequestBuilders.put(
                                "/api/collector/online")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(collectors)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    public void offlineCollector() throws Exception {
        List<String> collectors = new ArrayList<>();
        collectors.add("demo-collector");
        this.mockMvc.perform(MockMvcRequestBuilders.put(
                                "/api/collector/offline")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(collectors)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }


    @Test
    public void deleteCollector() throws Exception {
        List<String> collectors = new ArrayList<>();
        collectors.add("demo-collector");
        this.mockMvc.perform(MockMvcRequestBuilders.delete(
                                "/api/collector")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(collectors)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    public void generateCollectorDeployInfo() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.post(
                        "/api/collector/generate/{collector}",
                        "demo-collector"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }


}
