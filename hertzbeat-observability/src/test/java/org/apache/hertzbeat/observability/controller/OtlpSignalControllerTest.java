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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.google.rpc.Code;
import com.google.rpc.Status;
import org.apache.hertzbeat.observability.service.OtlpSignalForwarder;
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
import org.springframework.web.client.ResourceAccessException;

/** OTLP/HTTP route contract tests. */
@ExtendWith(MockitoExtension.class)
class OtlpSignalControllerTest {

    @Mock
    private OtlpSignalForwarder signalForwarder;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new OtlpSignalController(signalForwarder, new SignalWorkloadGuard()))
                .setControllerAdvice(new OtlpHttpExceptionHandler())
                .build();
    }

    @Test
    void shouldRouteGreptimeSignals() throws Exception {
        when(signalForwarder.forwardHttp(any(), any(), any()))
                .thenReturn(ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body("{}".getBytes()));

        for (String signal : new String[] {"metrics", "traces"}) {
            mockMvc.perform(MockMvcRequestBuilders.post("/api/otlp/v1/" + signal)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isOk());
            verify(signalForwarder).forwardHttp(eq(signal), any(), any(HttpHeaders.class));
        }

        verifyNoMoreInteractions(signalForwarder);
    }

    @Test
    void shouldReturnBadRequestForMalformedOtlpPayload() throws Exception {
        when(signalForwarder.forwardHttp(eq("metrics"), any(), any()))
                .thenThrow(new IllegalArgumentException("Malformed OTLP metrics JSON payload"));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/otlp/v1/metrics")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(Code.INVALID_ARGUMENT.getNumber()))
                .andExpect(jsonPath("$.message").value("Malformed OTLP metrics JSON payload"));
    }

    @Test
    void shouldReturnRetryableServiceUnavailableWhenGreptimeWriteFails() throws Exception {
        when(signalForwarder.forwardHttp(eq("traces"), any(), any()))
                .thenThrow(new ResourceAccessException("connect refused: http://greptime:4000"));

        byte[] body = mockMvc.perform(MockMvcRequestBuilders.post("/api/otlp/v1/traces")
                        .contentType(OtlpHttpExceptionHandler.PROTOBUF)
                        .content(new byte[] {1, 2, 3}))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string(HttpHeaders.RETRY_AFTER, "1"))
                .andExpect(content().contentType(OtlpHttpExceptionHandler.PROTOBUF))
                .andReturn().getResponse().getContentAsByteArray();

        Status status = Status.parseFrom(body);
        assertEquals(Code.UNAVAILABLE.getNumber(), status.getCode());
        assertEquals("GreptimeDB storage is unavailable", status.getMessage());
    }
}
