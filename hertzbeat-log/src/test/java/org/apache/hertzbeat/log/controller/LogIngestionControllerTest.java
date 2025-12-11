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

package org.apache.hertzbeat.log.controller;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;

import java.util.Arrays;
import java.util.List;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.log.service.LogProtocolAdapter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Unit test for {@link LogIngestionController}
 */
@ExtendWith(MockitoExtension.class)
class LogIngestionControllerTest {

    private MockMvc mockMvc;

    @Mock
    private LogProtocolAdapter vectorAdapter;

    private LogIngestionController logIngestionController;

    @BeforeEach
    void setUp() {
        List<LogProtocolAdapter> adapters = Arrays.asList(vectorAdapter);
        this.logIngestionController = new LogIngestionController(adapters);
        this.mockMvc = MockMvcBuilders.standaloneSetup(logIngestionController).build();
    }

    @Test
    void testIngestLogWithKnownProtocol() throws Exception {
        String logContent = "{\"message\":\"Test log message\"}";

        when(vectorAdapter.supportProtocol()).thenReturn("vector");
        doNothing().when(vectorAdapter).ingest(anyString());

        mockMvc.perform(
                MockMvcRequestBuilders
                        .post("/api/logs/ingest/vector")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(logContent)
        )
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add extern log success"))
                .andReturn();
    }

    @Test
    void testIngestLogWithUnsupportedProtocol() throws Exception {
        String logContent = "{\"message\":\"Unsupported protocol log\"}";

        when(vectorAdapter.supportProtocol()).thenReturn("vector");

        mockMvc.perform(
                MockMvcRequestBuilders
                        .post("/api/logs/ingest/unsupported")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(logContent)
        )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Not support the unsupported protocol log"));
    }

    @Test
    void testIngestLogWithAdapterException() throws Exception {
        String logContent = "{\"message\":\"Log message that will cause exception\"}";

        when(vectorAdapter.supportProtocol()).thenReturn("vector");
        doThrow(new IllegalArgumentException("Invalid log format")).when(vectorAdapter).ingest(anyString());

        mockMvc.perform(
                MockMvcRequestBuilders
                        .post("/api/logs/ingest/vector")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(logContent)
        )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Add extern log failed: Invalid log format"));
    }
}
