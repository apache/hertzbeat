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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;

import org.apache.hertzbeat.log.service.impl.OtlpLogProtocolAdapter;
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
 * Unit test for {@link OtlpLogController}
 */
@ExtendWith(MockitoExtension.class)
class OtlpLogControllerTest {

    private static final String CONTENT_TYPE_PROTOBUF = "application/x-protobuf";

    private MockMvc mockMvc;

    @Mock
    private OtlpLogProtocolAdapter otlpLogProtocolAdapter;

    private OtlpLogController otlpLogController;

    @BeforeEach
    void setUp() {
        this.otlpLogController = new OtlpLogController(otlpLogProtocolAdapter);
        this.mockMvc = MockMvcBuilders.standaloneSetup(otlpLogController).build();
    }

    @Test
    void testIngestJsonLogsSuccess() throws Exception {
        String jsonContent = "{\"resourceLogs\":[]}";
        
        doNothing().when(otlpLogProtocolAdapter).ingest(anyString());

        mockMvc.perform(
                MockMvcRequestBuilders
                        .post("/api/logs/otlp/v1/logs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonContent)
        )
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();
    }

    @Test
    void testIngestJsonLogsFailure() throws Exception {
        String jsonContent = "{\"invalid\":\"content\"}";
        
        doThrow(new IllegalArgumentException("Invalid OTLP JSON log content"))
                .when(otlpLogProtocolAdapter).ingest(anyString());

        mockMvc.perform(
                MockMvcRequestBuilders
                        .post("/api/logs/otlp/v1/logs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonContent)
        )
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();
    }

    @Test
    void testIngestBinaryLogsSuccess() throws Exception {
        byte[] binaryContent = new byte[]{0x0a, 0x0b, 0x0c};
        
        doNothing().when(otlpLogProtocolAdapter).ingestBinary(any(byte[].class));

        mockMvc.perform(
                MockMvcRequestBuilders
                        .post("/api/logs/otlp/v1/logs")
                        .contentType(CONTENT_TYPE_PROTOBUF)
                        .content(binaryContent)
        )
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF))
                .andReturn();
    }

    @Test
    void testIngestBinaryLogsFailure() throws Exception {
        byte[] binaryContent = new byte[]{0x0a, 0x0b, 0x0c};
        
        doThrow(new IllegalArgumentException("Invalid OTLP binary log content"))
                .when(otlpLogProtocolAdapter).ingestBinary(any(byte[].class));

        mockMvc.perform(
                MockMvcRequestBuilders
                        .post("/api/logs/otlp/v1/logs")
                        .contentType(CONTENT_TYPE_PROTOBUF)
                        .content(binaryContent)
        )
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF))
                .andReturn();
    }
}
