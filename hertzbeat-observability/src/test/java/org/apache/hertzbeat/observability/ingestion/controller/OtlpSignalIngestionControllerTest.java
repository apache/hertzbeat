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

package org.apache.hertzbeat.observability.ingestion.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.apache.hertzbeat.observability.ingestion.service.OtlpGrpcIngestionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class OtlpSignalIngestionControllerTest {

    private static final String CONTENT_TYPE_PROTOBUF = "application/x-protobuf";
    private static final String CONTENT_TYPE_PROTOBUF_ALT = "application/protobuf";

    private MockMvc mockMvc;

    @Mock
    private OtlpGrpcIngestionService otlpGrpcIngestionService;

    @BeforeEach
    void setUp() {
        OtlpSignalIngestionController controller = new OtlpSignalIngestionController(otlpGrpcIngestionService);
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void shouldProxyMetricsToUnifiedBackend() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        when(otlpGrpcIngestionService.ingestMetricsHttp(any(byte[].class), any(HttpHeaders.class)))
                .thenReturn(new ResponseEntity<>("{\"partialSuccess\":{}}".getBytes(), headers, HttpStatus.OK));

        mockMvc.perform(post("/api/otlp/v1/metrics")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resourceMetrics\":[]}"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    void shouldReturnOtlpCompatibleErrorWhenTraceBackendUnavailable() throws Exception {
        when(otlpGrpcIngestionService.ingestTracesHttp(any(byte[].class), any(HttpHeaders.class)))
                .thenReturn(ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .contentType(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF))
                        .body(new byte[] {0x01, 0x02}));

        mockMvc.perform(post("/api/otlp/v1/traces")
                        .contentType(CONTENT_TYPE_PROTOBUF)
                        .content(new byte[] {0x01, 0x02}))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF));
    }

    @Test
    void shouldAcceptAlternateProtobufMediaTypeForMetricsAndTraces() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF));
        when(otlpGrpcIngestionService.ingestMetricsHttp(any(byte[].class), any(HttpHeaders.class)))
                .thenReturn(new ResponseEntity<>(new byte[] {0x00}, headers, HttpStatus.OK));
        when(otlpGrpcIngestionService.ingestTracesHttp(any(byte[].class), any(HttpHeaders.class)))
                .thenReturn(new ResponseEntity<>(new byte[] {0x00}, headers, HttpStatus.OK));

        mockMvc.perform(post("/api/otlp/v1/metrics")
                        .contentType(CONTENT_TYPE_PROTOBUF_ALT)
                        .accept(CONTENT_TYPE_PROTOBUF_ALT)
                        .content(new byte[] {0x00}))
                .andExpect(status().isOk())
                .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF));

        mockMvc.perform(post("/api/otlp/v1/traces")
                        .contentType(CONTENT_TYPE_PROTOBUF_ALT)
                        .accept(CONTENT_TYPE_PROTOBUF_ALT)
                        .content(new byte[] {0x00}))
                .andExpect(status().isOk())
                .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF));
    }
}
