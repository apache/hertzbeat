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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.apache.hertzbeat.log.service.OtlpSignalForwarder;
import org.apache.hertzbeat.log.service.SignalWorkloadGuard;
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

/** OTLP/HTTP route contract tests. */
@ExtendWith(MockitoExtension.class)
class OtlpSignalControllerTest {

    @Mock
    private OtlpSignalForwarder signalForwarder;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new OtlpSignalController(signalForwarder, new SignalWorkloadGuard())).build();
    }

    @Test
    void shouldRouteAllThreeSignals() throws Exception {
        when(signalForwarder.forwardHttp(any(), any(), any()))
                .thenReturn(ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body("{}".getBytes()));

        for (String signal : new String[] {"metrics", "logs", "traces"}) {
            mockMvc.perform(MockMvcRequestBuilders.post("/api/otlp/v1/" + signal)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isOk());
            verify(signalForwarder).forwardHttp(eq(signal), any(), any(HttpHeaders.class));
        }
    }

    @Test
    void shouldReturnBadRequestForMalformedOtlpPayload() throws Exception {
        when(signalForwarder.forwardHttp(eq("metrics"), any(), any()))
                .thenThrow(new IllegalArgumentException("Malformed OTLP metrics JSON payload"));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/otlp/v1/metrics")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Malformed OTLP metrics JSON payload"));
    }
}
