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

package org.apache.hertzbeat.observability.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.google.rpc.Code;
import com.google.rpc.Status;
import org.apache.hertzbeat.observability.service.OtlpLogIngestionService;
import org.apache.hertzbeat.observability.service.SignalWorkloadGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** OTLP/HTTP log route contract tests. */
@ExtendWith(MockitoExtension.class)
class OtlpLogControllerTest {

    @Mock
    private OtlpLogIngestionService logIngestionService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new OtlpLogController(logIngestionService, new SignalWorkloadGuard()))
                .setControllerAdvice(new OtlpHttpExceptionHandler())
                .build();
    }

    @Test
    void shouldRouteLogsToTheLogFanOut() throws Exception {
        when(logIngestionService.ingestHttp(any(), any()))
                .thenReturn(ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body("{}".getBytes()));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/otlp/v1/logs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        verify(logIngestionService).ingestHttp(any(), any(HttpHeaders.class));
    }

    @Test
    void shouldReturnBadRequestForMalformedOtlpPayload() throws Exception {
        when(logIngestionService.ingestHttp(any(), any()))
                .thenThrow(new IllegalArgumentException("Malformed OTLP logs JSON payload"));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/otlp/v1/logs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(Code.INVALID_ARGUMENT.getNumber()))
                .andExpect(jsonPath("$.message").value("Malformed OTLP logs JSON payload"));
    }

    @Test
    void shouldReturnBinaryRpcStatusForMalformedProtobufPayload() throws Exception {
        when(logIngestionService.ingestHttp(any(), any()))
                .thenThrow(new IllegalArgumentException("Malformed OTLP logs protobuf payload"));

        byte[] body = mockMvc.perform(MockMvcRequestBuilders.post("/api/otlp/v1/logs")
                        .contentType(OtlpHttpExceptionHandler.PROTOBUF)
                        .content(new byte[] {1, 2, 3}))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(OtlpHttpExceptionHandler.PROTOBUF))
                .andReturn().getResponse().getContentAsByteArray();

        Status status = Status.parseFrom(body);
        assertEquals(Code.INVALID_ARGUMENT.getNumber(), status.getCode());
        assertEquals("Malformed OTLP logs protobuf payload", status.getMessage());
    }
}
