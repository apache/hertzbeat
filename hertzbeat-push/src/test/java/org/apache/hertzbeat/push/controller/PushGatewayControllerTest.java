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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.io.InputStream;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.push.service.PushGatewayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * test case for {@link PushGatewayController}
 */

@ExtendWith(MockitoExtension.class)
class PushGatewayControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PushGatewayService pushGatewayService;

    @InjectMocks
    private PushGatewayController gatewayController;

    @BeforeEach
    void setUp() {

        mockMvc = MockMvcBuilders.standaloneSetup(gatewayController).build();
    }

    @Test
    void testPushMetricsSuccess() throws Exception {

        String mockData = "some metric data";

        when(pushGatewayService.pushMetricsData(any(InputStream.class))).thenReturn(true);

        mockMvc.perform(post("/api/push/pushgateway")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mockData))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Push success"));
    }

    @Test
    void testPushMetricsFailure() throws Exception {

        String mockData = "some metric data";

        when(pushGatewayService.pushMetricsData(any(InputStream.class))).thenReturn(false);

        mockMvc.perform(post("/api/push/pushgateway")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mockData))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("Push failed"));
    }

}
