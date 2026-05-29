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

import static org.junit.jupiter.api.Assertions.assertEquals;
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
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.zip.GZIPOutputStream;
import io.grpc.Status;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.logs.v1.LogRecord;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
import io.opentelemetry.proto.resource.v1.Resource;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.observability.ingestion.adapter.OtlpLogProtocolAdapter;
import org.apache.hertzbeat.observability.ingestion.audit.OtlpIngestionAuditEvent;
import org.apache.hertzbeat.observability.ingestion.audit.OtlpIngestionAuditService;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationContext;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationEnricher;
import org.apache.hertzbeat.observability.ingestion.error.OtlpIngestionErrorResponseFactory;
import org.apache.hertzbeat.observability.ingestion.forwarder.GreptimeOtlpForwarder;
import org.apache.hertzbeat.observability.ingestion.governance.OtlpIngestionGovernanceService;
import org.apache.hertzbeat.observability.ingestion.quota.OtlpIngestionQuotaService;
import org.apache.hertzbeat.observability.ingestion.security.OtlpIngestionRequestContextResolver;
import org.apache.hertzbeat.observability.ingestion.service.impl.OtlpGrpcIngestionServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
    private static final String CONTENT_TYPE_PROTOBUF_ALT = "application/protobuf";

    private MockMvc mockMvc;

    @Mock
    private OtlpLogProtocolAdapter otlpLogProtocolAdapter;

    @Mock
    private OtlpCorrelationEnricher otlpCorrelationEnricher;

    @Mock
    private GreptimeOtlpForwarder greptimeOtlpForwarder;

    @Mock
    private ObservabilityWorkspaceQueryGateway workspaceQueryGateway;

    private OtlpIngestionAuditService auditService;

    private OtlpLogController otlpLogController;

    private OtlpGrpcIngestionServiceImpl otlpGrpcIngestionService;

    @BeforeEach
    void setUp() {
        this.auditService = new OtlpIngestionAuditService();
        rebuildControllerWithQuotaLimit(Long.MAX_VALUE);
    }

    private void rebuildControllerWithQuotaLimit(long maxRequestBytes) {
        rebuildControllerWithQuotaLimits(maxRequestBytes, Long.MAX_VALUE);
    }

    private void rebuildControllerWithQuotaLimits(long maxRequestBytes, long maxSignalItems) {
        rebuildControllerWithQuotaLimitsAndGovernance(maxRequestBytes, maxSignalItems, "");
    }

    private void rebuildControllerWithQuotaLimitsAndGovernance(long maxRequestBytes, long maxSignalItems,
                                                               String dropServiceNames) {
        this.otlpGrpcIngestionService = new OtlpGrpcIngestionServiceImpl(
                org.mockito.Mockito.mock(org.springframework.web.client.RestTemplate.class),
                org.mockito.Mockito.mock(org.springframework.beans.factory.ObjectProvider.class),
                otlpLogProtocolAdapter,
                greptimeOtlpForwarder,
                otlpCorrelationEnricher,
                new OtlpIngestionErrorResponseFactory(),
                new OtlpIngestionRequestContextResolver(),
                auditService,
                new OtlpIngestionGovernanceService(dropServiceNames),
                new OtlpIngestionQuotaService(maxRequestBytes, maxSignalItems),
                org.mockito.Mockito.mock(org.apache.hertzbeat.common.observability.gateway.ObservabilitySignalIntakeGateway.class),
                new org.apache.hertzbeat.observability.ingestion.enricher.OtlpEntityIdentityResolver(
                        java.util.List.of(workspaceQueryGateway)));
        this.otlpLogController = new OtlpLogController(otlpGrpcIngestionService);
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
    void jsonLogsCanReturnProtobufWhenClientAcceptsProtobuf() throws Exception {
        String jsonContent = "{\"resourceLogs\":[]}";

        byte[] enrichedContent = ExportLogsServiceRequest.getDefaultInstance().toByteArray();
        when(otlpCorrelationEnricher.enrichLogsHttp(any(byte[].class), any(org.springframework.http.HttpHeaders.class),
                any(OtlpCorrelationContext.class))).thenReturn(enrichedContent);
        when(greptimeOtlpForwarder.forwardLogsProtobuf(enrichedContent))
                .thenReturn(new ResponseEntity<>(
                        ExportLogsServiceResponse.getDefaultInstance().toByteArray(), HttpStatus.OK));
        doNothing().when(otlpLogProtocolAdapter).publishRealtimeSignals(any(ExportLogsServiceRequest.class));

        mockMvc.perform(
                MockMvcRequestBuilders
                        .post("/api/otlp/v1/logs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(CONTENT_TYPE_PROTOBUF)
                        .content(jsonContent)
        )
                .andExpect(status().isOk())
                .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF))
                .andExpect(content().bytes(ExportLogsServiceResponse.getDefaultInstance().toByteArray()))
                .andReturn();

        verify(otlpLogProtocolAdapter).publishRealtimeSignals(any(ExportLogsServiceRequest.class));
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
    void shouldAcceptAlternateProtobufMediaTypeForBinaryLogs() throws Exception {
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
                        .contentType(CONTENT_TYPE_PROTOBUF_ALT)
                        .accept(CONTENT_TYPE_PROTOBUF_ALT)
                        .content(binaryContent)
        )
                .andExpect(status().isOk())
                .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF))
                .andReturn();

        verify(otlpLogProtocolAdapter).publishRealtimeSignals(any(ExportLogsServiceRequest.class));
    }

    @Test
    void binaryLogsCanReturnJsonWhenClientAcceptsJson() throws Exception {
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
                        .accept(MediaType.APPLICATION_JSON)
                        .content(binaryContent)
        )
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("{}"))
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
    void binaryLogsQuotaFailureRecordsRejectedAuditEventWithWorkspace() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            byte[] binaryContent = new byte[]{0x0a, 0x0b, 0x0c};
            byte[] enrichedContent = ExportLogsServiceRequest.getDefaultInstance().toByteArray();
            when(otlpCorrelationEnricher.enrichLogsHttp(any(byte[].class),
                    any(org.springframework.http.HttpHeaders.class), any(OtlpCorrelationContext.class)))
                    .thenReturn(enrichedContent);
            when(greptimeOtlpForwarder.forwardLogsProtobuf(enrichedContent))
                    .thenThrow(Status.RESOURCE_EXHAUSTED.withDescription("quota exceeded").asRuntimeException());

            mockMvc.perform(
                            MockMvcRequestBuilders
                                    .post("/api/otlp/v1/logs")
                                    .contentType(CONTENT_TYPE_PROTOBUF)
                                    .content(binaryContent)
                    )
                    .andExpect(status().isTooManyRequests())
                    .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF))
                    .andReturn();

            OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
            assertEquals("logs", event.signal());
            assertEquals("http", event.protocol());
            assertEquals("rejected", event.outcome());
            assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
            assertEquals("team-a", event.workspaceId());
            assertEquals(3L, event.requestBytes());
            assertEquals("quota exceeded", event.reason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void binaryLogsOverQuotaRejectsBeforeForwardingAndAuditsRejected() throws Exception {
        rebuildControllerWithQuotaLimit(2L);
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            byte[] binaryContent = new byte[]{0x0a, 0x0b, 0x0c};

            mockMvc.perform(
                            MockMvcRequestBuilders
                                    .post("/api/otlp/v1/logs")
                                    .contentType(CONTENT_TYPE_PROTOBUF)
                                    .content(binaryContent)
                    )
                    .andExpect(status().isTooManyRequests())
                    .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF))
                    .andReturn();

            verify(otlpCorrelationEnricher, never()).enrichLogsHttp(any(byte[].class),
                    any(org.springframework.http.HttpHeaders.class), any(OtlpCorrelationContext.class));
            verify(greptimeOtlpForwarder, never()).forwardLogsProtobuf(any(byte[].class));
            verify(otlpLogProtocolAdapter, never()).publishRealtimeSignals(any(ExportLogsServiceRequest.class));

            OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
            assertEquals("logs", event.signal());
            assertEquals("http", event.protocol());
            assertEquals("rejected", event.outcome());
            assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
            assertEquals("team-a", event.workspaceId());
            assertEquals(3L, event.requestBytes());
            assertEquals("OTLP logs http payload exceeds 2 bytes.", event.reason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void binaryLogsOverSignalItemLimitRejectsBeforeForwardingAndAuditsRejected() throws Exception {
        rebuildControllerWithQuotaLimits(Long.MAX_VALUE, 1L);
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            byte[] content = ExportLogsServiceRequest.newBuilder()
                    .addResourceLogs(ResourceLogs.newBuilder()
                            .addScopeLogs(ScopeLogs.newBuilder()
                                    .addLogRecords(LogRecord.newBuilder()
                                            .setTimeUnixNano(1_710_000_000_000_000_000L)
                                            .build())
                                    .addLogRecords(LogRecord.newBuilder()
                                            .setTimeUnixNano(1_710_000_001_000_000_000L)
                                            .build())
                                    .build())
                            .build())
                    .build()
                    .toByteArray();
            when(otlpCorrelationEnricher.enrichLogsHttp(any(byte[].class),
                    any(org.springframework.http.HttpHeaders.class), any(OtlpCorrelationContext.class)))
                    .thenReturn(content);

            mockMvc.perform(
                            MockMvcRequestBuilders
                                    .post("/api/otlp/v1/logs")
                                    .contentType(CONTENT_TYPE_PROTOBUF)
                                    .content(content)
                    )
                    .andExpect(status().isTooManyRequests())
                    .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF))
                    .andReturn();

            verify(greptimeOtlpForwarder, never()).forwardLogsProtobuf(any(byte[].class));
            verify(otlpLogProtocolAdapter, never()).publishRealtimeSignals(any(ExportLogsServiceRequest.class));

            OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
            assertEquals("logs", event.signal());
            assertEquals("http", event.protocol());
            assertEquals("rejected", event.outcome());
            assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
            assertEquals("team-a", event.workspaceId());
            assertEquals(content.length, event.requestBytes());
            assertEquals(2L, event.signalItems());
            assertEquals("OTLP logs http batch exceeds 1 signal items.", event.reason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void binaryLogsDropPolicySkipsForwardingAndRealtimeAndAuditsDropped() throws Exception {
        rebuildControllerWithQuotaLimitsAndGovernance(Long.MAX_VALUE, Long.MAX_VALUE, "checkout");
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            byte[] content = ExportLogsServiceRequest.newBuilder()
                    .addResourceLogs(ResourceLogs.newBuilder()
                            .setResource(Resource.newBuilder()
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("service.name")
                                            .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                            .build())
                                    .build())
                            .addScopeLogs(ScopeLogs.newBuilder()
                                    .addLogRecords(LogRecord.newBuilder()
                                            .setTimeUnixNano(1_710_000_000_000_000_000L)
                                            .build())
                                    .build())
                            .build())
                    .build()
                    .toByteArray();
            when(otlpCorrelationEnricher.enrichLogsHttp(any(byte[].class),
                    any(org.springframework.http.HttpHeaders.class), any(OtlpCorrelationContext.class)))
                    .thenAnswer(invocation -> new OtlpCorrelationEnricher().enrichLogsHttp(
                            invocation.getArgument(0), invocation.getArgument(1), invocation.getArgument(2)));

            mockMvc.perform(
                            MockMvcRequestBuilders
                                    .post("/api/otlp/v1/logs")
                                    .contentType(CONTENT_TYPE_PROTOBUF)
                                    .content(content)
                    )
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF))
                    .andReturn();

            verify(greptimeOtlpForwarder, never()).forwardLogsProtobuf(any(byte[].class));
            verify(otlpLogProtocolAdapter, never()).publishRealtimeSignals(any(ExportLogsServiceRequest.class));

            OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
            assertEquals("logs", event.signal());
            assertEquals("http", event.protocol());
            assertEquals("dropped", event.outcome());
            assertEquals("OK", event.statusCode());
            assertEquals("team-a", event.workspaceId());
            assertEquals(1L, event.signalItems());
            assertEquals("OTLP logs http dropped by governance policy: service.name=checkout", event.reason());
        } finally {
            AuthTokenRequestContext.clear();
        }
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

    @Test
    void shouldPassAuthenticatedWorkspaceContextToJsonLogEnrichment() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("prod-west");
        try {
            String jsonContent = "{\"resourceLogs\":[]}";
            byte[] enrichedContent = ExportLogsServiceRequest.getDefaultInstance().toByteArray();
            when(otlpCorrelationEnricher.enrichLogsHttp(any(byte[].class),
                    any(org.springframework.http.HttpHeaders.class), any(OtlpCorrelationContext.class)))
                    .thenReturn(enrichedContent);
            when(greptimeOtlpForwarder.forwardLogsProtobuf(enrichedContent))
                    .thenReturn(new ResponseEntity<>(ExportLogsServiceResponse.getDefaultInstance().toByteArray(),
                            HttpStatus.OK));

            mockMvc.perform(
                            MockMvcRequestBuilders
                                    .post("/api/otlp/v1/logs")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(jsonContent)
                    )
                    .andExpect(status().isOk())
                    .andReturn();

            ArgumentCaptor<OtlpCorrelationContext> contextCaptor =
                    ArgumentCaptor.forClass(OtlpCorrelationContext.class);
            verify(otlpCorrelationEnricher).enrichLogsHttp(any(byte[].class),
                    any(org.springframework.http.HttpHeaders.class), contextCaptor.capture());
            org.junit.jupiter.api.Assertions.assertEquals("prod-west", contextCaptor.getValue().workspaceId());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void binaryLogsResolveEntityIdBeforeForwardingAndRealtimePublication() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("prod-west");
        try {
            when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(any(), any()))
                    .thenReturn(java.util.List.of(
                            entityIdentity(42L, "service.name", "checkout", "checkout", 90, true)));
            when(workspaceQueryGateway.findEntitiesByIds(Set.of(42L)))
                    .thenReturn(Map.of(42L, observeEntity(42L, "prod-west")));
            byte[] content = ExportLogsServiceRequest.newBuilder()
                    .addResourceLogs(ResourceLogs.newBuilder()
                            .setResource(Resource.newBuilder()
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("service.name")
                                            .setValue(AnyValue.newBuilder().setStringValue("Checkout").build())
                                            .build())
                                    .build())
                            .addScopeLogs(ScopeLogs.newBuilder()
                                    .addLogRecords(LogRecord.newBuilder()
                                            .setTimeUnixNano(1_710_000_000_000_000_000L)
                                            .setBody(AnyValue.newBuilder().setStringValue("checkout started").build())
                                            .build())
                                    .build())
                            .build())
                    .build()
                    .toByteArray();
            when(otlpCorrelationEnricher.enrichLogsHttp(any(byte[].class),
                    any(org.springframework.http.HttpHeaders.class), any(OtlpCorrelationContext.class)))
                    .thenAnswer(invocation -> new OtlpCorrelationEnricher().enrichLogsHttp(
                            invocation.getArgument(0), invocation.getArgument(1), invocation.getArgument(2)));
            when(greptimeOtlpForwarder.forwardLogsProtobuf(any(byte[].class)))
                    .thenReturn(new ResponseEntity<>(ExportLogsServiceResponse.getDefaultInstance().toByteArray(),
                            HttpStatus.OK));

            mockMvc.perform(
                            MockMvcRequestBuilders
                                    .post("/api/otlp/v1/logs")
                                    .contentType(CONTENT_TYPE_PROTOBUF)
                                    .content(content)
                    )
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(CONTENT_TYPE_PROTOBUF))
                    .andReturn();

            verify(greptimeOtlpForwarder).forwardLogsProtobuf(org.mockito.ArgumentMatchers.argThat(payload -> {
                try {
                    return "42".equals(logResourceAttributes(ExportLogsServiceRequest.parseFrom(payload))
                            .get("hertzbeat.entity_id"));
                } catch (Exception ex) {
                    return false;
                }
            }));
            verify(otlpLogProtocolAdapter).publishRealtimeSignals(org.mockito.ArgumentMatchers.argThat(request ->
                    "42".equals(logResourceAttributes(request).get("hertzbeat.entity_id"))
                            && "prod-west".equals(logResourceAttributes(request).get("hertzbeat.workspace_id"))));
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    private byte[] gzip(byte[] content) throws Exception {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        try (GZIPOutputStream gzipOutputStream = new GZIPOutputStream(outputStream)) {
            gzipOutputStream.write(content);
        }
        return outputStream.toByteArray();
    }

    private Map<String, String> logResourceAttributes(ExportLogsServiceRequest request) {
        return request.getResourceLogs(0)
                .getResource()
                .getAttributesList()
                .stream()
                .filter(attribute -> attribute.hasValue()
                        && attribute.getValue().getValueCase() == AnyValue.ValueCase.STRING_VALUE)
                .collect(Collectors.toMap(
                        KeyValue::getKey,
                        attribute -> attribute.getValue().getStringValue(),
                        (left, right) -> right));
    }

    private EntityIdentity entityIdentity(Long entityId, String key, String value, String normalizedValue,
                                          int priority, boolean primary) {
        return EntityIdentity.builder()
                .entityId(entityId)
                .identityKey(key)
                .identityValue(value)
                .normalizedValue(normalizedValue)
                .priority(priority)
                .primaryIdentity(primary)
                .build();
    }

    private ObserveEntity observeEntity(Long entityId, String workspaceId) {
        return ObserveEntity.builder()
                .id(entityId)
                .workspaceId(workspaceId)
                .type("service")
                .name("checkout")
                .status("unknown")
                .build();
    }
}
