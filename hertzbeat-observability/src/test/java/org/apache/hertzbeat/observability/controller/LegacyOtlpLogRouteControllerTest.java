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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.google.rpc.Code;
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

/** Deprecated 1.8.x OTLP log route alias contract tests. */
@ExtendWith(MockitoExtension.class)
class LegacyOtlpLogRouteControllerTest {

    @Mock
    private OtlpLogIngestionService logIngestionService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new LegacyOtlpLogRouteController(logIngestionService, new SignalWorkloadGuard()))
                .setControllerAdvice(new OtlpHttpExceptionHandler())
                .build();
    }

    @Test
    void legacyOtlpRouteShouldForwardToTheCanonicalLogFanOutWithDeprecationHeaders() throws Exception {
        when(logIngestionService.ingestHttp(any(), any()))
                .thenReturn(ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body("{}".getBytes()));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/logs/otlp/v1/logs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Deprecation", "true"))
                .andExpect(header().string("Link", "</api/otlp/v1/logs>; rel=\"successor-version\""))
                .andExpect(content().string("{}"));

        verify(logIngestionService).ingestHttp(any(), any(HttpHeaders.class));
    }

    @Test
    void legacyIngestOtlpRouteShouldForwardToTheCanonicalLogFanOut() throws Exception {
        when(logIngestionService.ingestHttp(any(), any()))
                .thenReturn(ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body("{}".getBytes()));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/logs/ingest/OTLP")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Deprecation", "true"));

        verify(logIngestionService).ingestHttp(any(), any(HttpHeaders.class));
    }

    @Test
    void legacyIngestRouteShouldRejectNonOtlpProtocolsWithoutTouchingTheFanOut() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.post("/api/logs/ingest/vector")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Deprecation", "true"));

        verifyNoInteractions(logIngestionService);
    }

    @Test
    void legacyRouteShouldPreserveCanonicalErrorStatus() throws Exception {
        when(logIngestionService.ingestHttp(any(), any()))
                .thenThrow(new IllegalArgumentException("Malformed OTLP logs JSON payload"));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/logs/otlp/v1/logs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Deprecation", "true"))
                .andExpect(header().string("Link", "</api/otlp/v1/logs>; rel=\"successor-version\""))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(Code.INVALID_ARGUMENT.getNumber()))
                .andExpect(jsonPath("$.message").value("Malformed OTLP logs JSON payload"));
    }
}
