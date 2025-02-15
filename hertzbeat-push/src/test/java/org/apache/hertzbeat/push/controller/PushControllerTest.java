/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.push.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.push.PushMetricsDto;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.push.service.PushService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

/**
 * test case for {@link PushController}
 */

@ExtendWith(MockitoExtension.class)
class PushControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PushService pushService;

    @InjectMocks
    private PushController pushController;

    private PushMetricsDto mockPushMetricsDto;

    @BeforeEach
    void setUp() {

        this.mockMvc = standaloneSetup(this.pushController).build();

        mockPushMetricsDto = PushMetricsDto.builder().build();
    }

    @Test
    void testPushMetrics() throws Exception {

        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/push")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(mockPushMetricsDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void testGetMetrics() throws Exception {

        Long id = 6565463543L;
        Long time = 6565463543L;

        when(pushService.getPushMetricData(id, time)).thenReturn(mockPushMetricsDto);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/push")
                        .contentType(MediaType.APPLICATION_JSON)
                        .param("id", id.toString())
                        .param("time", time.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

}
