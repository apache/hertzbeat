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
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPOutputStream;
import io.grpc.Status;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse;
import org.apache.hertzbeat.observability.ingestion.adapter.OtlpLogProtocolAdapter;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationContext;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationEnricher;
import org.apache.hertzbeat.observability.ingestion.forwarder.GreptimeOtlpForwarder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    @Mock
    private OtlpCorrelationEnricher otlpCorrelationEnricher;

    @Mock
    private GreptimeOtlpForwarder greptimeOtlpForwarder;

    private OtlpLogController otlpLogController;

    @BeforeEach
    void setUp() {
        this.otlpLogController = new OtlpLogController(otlpLogProtocolAdapter, otlpCorrelationEnricher,
                greptimeOtlpForwarder);
        this.mockMvc = MockMvcBuilders.standaloneSetup(otlpLogController).build();
    }

    @Test
    void testIngestJsonLogsSuccess() throws Exception {
        String jsonContent = "{\"resourceLogs\":[]}";

        byte[] enrichedContent = ExportLogsServiceRequest.getDefaultInstance().toByteArray();
        when(otlpCorrelationEnricher.enrichLogsHttp(any(byte[].class), any(org.springframework.http.HttpHeaders.class),
                any(OtlpCorrelationContext.class))).thenReturn(enrichedContent);
        when(greptimeOtlpForwarder.forwardLogsProtobuf(enrichedContent))
                .thenReturn(new ResponseEntity<>(ExportLogsServiceResponse.getDefaultInstance().toByteArray(), HttpStatus.OK));
        doNothing().when(otlpLogProtocolAdapter).publishRealtimeSignals(any(ExportLogsServiceRequest.class));

        mockMvc.perform(
                MockMvcRequestBuilders
                        .post("/api/otlp/v1/logs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonContent)
        )
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        verify(otlpLogProtocolAdapter).publishRealtimeSignals(any(ExportLogsServiceRequest.class));
    }

    @Test
    void testIngestJsonLogsFailure() throws Exception {
        String jsonContent = "{\"invalid\":\"content\"}";

        doThrow(new IllegalArgumentException("Invalid OTLP JSON log content"))
                .when(otlpCorrelationEnricher).enrichLogsHttp(any(byte[].class),
                        any(org.springframework.http.HttpHeaders.class), any(OtlpCorrelationContext.class));

        mockMvc.perform(
                MockMvcRequestBuilders
                        .post("/api/otlp/v1/logs")
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

        byte[] enrichedContent = ExportLogsServiceRequest.getDefaultInstance().toByteArray();
        when(otlpCorrelationEnricher.enrichLogsHttp(any(byte[].class), any(org.springframework.http.HttpHeaders.class),
                any(OtlpCorrelationContext.class))).thenReturn(enrichedContent);
        when(greptimeOtlpForwarder.forwardLogsProtobuf(enrichedContent))
                .thenReturn(new ResponseEntity<>(ExportLogsServiceResponse.getDefaultInstance().toByteArray(), HttpStatus.OK));
        doNothing().when(otlpLogProtocolAdapter).publishRealtimeSignals(any(ExportLogsServiceRequest.class));

        mockMvc.perform(
                MockMvcRequestBuilders
                        .post("/api/otlp/v1/logs")
                        .contentType(CONTENT_TYPE_PROTOBUF)
                        .content(binaryContent)
        )
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF))
                .andReturn();

        verify(otlpLogProtocolAdapter).publishRealtimeSignals(any(ExportLogsServiceRequest.class));
    }

    @Test
    void testIngestBinaryLogsFailure() throws Exception {
        byte[] binaryContent = new byte[]{0x0a, 0x0b, 0x0c};

        doThrow(new IllegalArgumentException("Invalid OTLP binary log content"))
                .when(otlpCorrelationEnricher).enrichLogsHttp(any(byte[].class),
                        any(org.springframework.http.HttpHeaders.class), any(OtlpCorrelationContext.class));

        mockMvc.perform(
                MockMvcRequestBuilders
                        .post("/api/otlp/v1/logs")
                        .contentType(CONTENT_TYPE_PROTOBUF)
                        .content(binaryContent)
        )
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF))
                .andReturn();
    }

    @Test
    void testIngestBinaryLogsForwardFailureDoesNotPublishRealtimeSignals() throws Exception {
        byte[] binaryContent = new byte[]{0x0a, 0x0b, 0x0c};
        byte[] enrichedContent = ExportLogsServiceRequest.getDefaultInstance().toByteArray();
        when(otlpCorrelationEnricher.enrichLogsHttp(any(byte[].class), any(org.springframework.http.HttpHeaders.class),
                any(OtlpCorrelationContext.class))).thenReturn(enrichedContent);
        when(greptimeOtlpForwarder.forwardLogsProtobuf(enrichedContent))
                .thenThrow(Status.UNAVAILABLE.withDescription("greptime down").asRuntimeException());

        mockMvc.perform(
                MockMvcRequestBuilders
                        .post("/api/otlp/v1/logs")
                        .contentType(CONTENT_TYPE_PROTOBUF)
                        .content(binaryContent)
        )
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF))
                .andReturn();

        verify(otlpLogProtocolAdapter, never()).publishRealtimeSignals(any(ExportLogsServiceRequest.class));
    }

    @Test
    void testIngestGzipBinaryLogsSuccess() throws Exception {
        byte[] binaryContent = gzip(new byte[]{0x0a, 0x0b, 0x0c});

        byte[] enrichedContent = ExportLogsServiceRequest.getDefaultInstance().toByteArray();
        when(otlpCorrelationEnricher.enrichLogsHttp(any(byte[].class), any(org.springframework.http.HttpHeaders.class),
                any(OtlpCorrelationContext.class))).thenReturn(enrichedContent);
        when(greptimeOtlpForwarder.forwardLogsProtobuf(enrichedContent))
                .thenReturn(new ResponseEntity<>(ExportLogsServiceResponse.getDefaultInstance().toByteArray(), HttpStatus.OK));
        doNothing().when(otlpLogProtocolAdapter).publishRealtimeSignals(any(ExportLogsServiceRequest.class));

        mockMvc.perform(
                        MockMvcRequestBuilders
                                .post("/api/otlp/v1/logs")
                                .contentType(CONTENT_TYPE_PROTOBUF)
                                .header("Content-Encoding", "gzip")
                                .content(binaryContent)
                )
                .andExpect(status().isOk())
                .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF))
                .andReturn();
    }

    @Test
    void testIngestGzipJsonLogsSuccess() throws Exception {
        byte[] jsonContent = gzip("{\"resourceLogs\":[]}".getBytes(StandardCharsets.UTF_8));

        byte[] enrichedContent = ExportLogsServiceRequest.getDefaultInstance().toByteArray();
        when(otlpCorrelationEnricher.enrichLogsHttp(any(byte[].class), any(org.springframework.http.HttpHeaders.class),
                any(OtlpCorrelationContext.class))).thenReturn(enrichedContent);
        when(greptimeOtlpForwarder.forwardLogsProtobuf(enrichedContent))
                .thenReturn(new ResponseEntity<>(ExportLogsServiceResponse.getDefaultInstance().toByteArray(), HttpStatus.OK));
        doNothing().when(otlpLogProtocolAdapter).publishRealtimeSignals(any(ExportLogsServiceRequest.class));

        mockMvc.perform(
                        MockMvcRequestBuilders
                                .post("/api/otlp/v1/logs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .header("Content-Encoding", "gzip")
                                .content(jsonContent)
                )
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();
    }

    private byte[] gzip(byte[] content) throws Exception {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        try (GZIPOutputStream gzipOutputStream = new GZIPOutputStream(outputStream)) {
            gzipOutputStream.write(content);
        }
        return outputStream.toByteArray();
    }
}
