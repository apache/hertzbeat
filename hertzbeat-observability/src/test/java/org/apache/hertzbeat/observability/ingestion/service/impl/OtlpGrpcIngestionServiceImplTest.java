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

package org.apache.hertzbeat.observability.ingestion.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.protobuf.util.JsonFormat;
import io.grpc.StatusRuntimeException;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse;
import io.opentelemetry.proto.logs.v1.LogRecord;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
import io.opentelemetry.proto.metrics.v1.AggregationTemporality;
import io.opentelemetry.proto.metrics.v1.Exemplar;
import io.opentelemetry.proto.metrics.v1.ExponentialHistogram;
import io.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint;
import io.opentelemetry.proto.metrics.v1.Gauge;
import io.opentelemetry.proto.metrics.v1.Histogram;
import io.opentelemetry.proto.metrics.v1.HistogramDataPoint;
import io.opentelemetry.proto.metrics.v1.Metric;
import io.opentelemetry.proto.metrics.v1.NumberDataPoint;
import io.opentelemetry.proto.metrics.v1.ResourceMetrics;
import io.opentelemetry.proto.metrics.v1.ScopeMetrics;
import io.opentelemetry.proto.metrics.v1.Summary;
import io.opentelemetry.proto.metrics.v1.SummaryDataPoint;
import io.opentelemetry.proto.resource.v1.Resource;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.trace.v1.ResourceSpans;
import io.opentelemetry.proto.trace.v1.ScopeSpans;
import io.opentelemetry.proto.trace.v1.Span;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.GZIPOutputStream;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.ObservabilitySignalIntakeGateway;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.observability.ingestion.adapter.OtlpLogProtocolAdapter;
import org.apache.hertzbeat.observability.ingestion.audit.OtlpIngestionAuditEvent;
import org.apache.hertzbeat.observability.ingestion.audit.OtlpIngestionAuditService;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationContext;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationEnricher;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpEntityIdentityResolver;
import org.apache.hertzbeat.observability.ingestion.error.OtlpIngestionErrorResponseFactory;
import org.apache.hertzbeat.observability.ingestion.forwarder.GreptimeOtlpForwarder;
import org.apache.hertzbeat.observability.ingestion.governance.OtlpIngestionGovernanceService;
import org.apache.hertzbeat.observability.ingestion.quota.OtlpIngestionQuotaService;
import org.apache.hertzbeat.observability.ingestion.retry.OtlpIngestionRetryService;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.apache.hertzbeat.observability.ingestion.security.OtlpIngestionRequestContextResolver;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class OtlpGrpcIngestionServiceImplTest {

    private static final String GREPTIME_PROMOTE_ALL_RESOURCE_ATTRS_HEADER =
            "X-Greptime-OTLP-Metric-Promote-All-Resource-Attrs";
    private static final String GREPTIME_PROMOTE_RESOURCE_ATTRS_HEADER =
            "X-Greptime-OTLP-Metric-Promote-Resource-Attrs";
    private static final String GREPTIME_PROMOTE_SCOPE_ATTRS_HEADER =
            "X-Greptime-OTLP-Metric-Promote-Scope-Attrs";
    private static final String GREPTIME_TRACE_TABLE_NAME_HEADER = "X-Greptime-Trace-Table-Name";
    private static final String GREPTIME_PIPELINE_NAME_HEADER = "X-Greptime-Pipeline-Name";

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ObjectProvider<GreptimeProperties> greptimePropertiesProvider;

    @Mock
    private GreptimeProperties greptimeProperties;

    @Mock
    private OtlpLogProtocolAdapter otlpLogProtocolAdapter;

    @Mock
    private GreptimeOtlpForwarder greptimeOtlpForwarder;

    @Mock
    private OtlpCorrelationEnricher otlpCorrelationEnricher;

    @Mock
    private ObservabilitySignalIntakeGateway observabilitySignalIntakeGateway;

    @Mock
    private ObservabilityWorkspaceQueryGateway workspaceQueryGateway;

    private OtlpIngestionAuditService auditService;

    private OtlpGrpcIngestionServiceImpl service;
    private final OtlpCorrelationEnricher realCorrelationEnricher = new OtlpCorrelationEnricher();

    @BeforeEach
    void setUp() {
        auditService = new OtlpIngestionAuditService();
        service = serviceWithQuota(Long.MAX_VALUE);
        org.mockito.Mockito.lenient()
                .when(otlpCorrelationEnricher.enrichTraces(any(ExportTraceServiceRequest.class),
                        any(OtlpCorrelationContext.class)))
                .thenAnswer(invocation -> realCorrelationEnricher.enrichTraces(
                        invocation.getArgument(0), invocation.getArgument(1)));
        org.mockito.Mockito.lenient()
                .when(otlpCorrelationEnricher.enrichMetrics(any(ExportMetricsServiceRequest.class),
                        any(OtlpCorrelationContext.class)))
                .thenAnswer(invocation -> realCorrelationEnricher.enrichMetrics(
                        invocation.getArgument(0), invocation.getArgument(1)));
    }

    private OtlpGrpcIngestionServiceImpl serviceWithQuota(long maxRequestBytes) {
        return serviceWithQuota(maxRequestBytes, Long.MAX_VALUE);
    }

    private OtlpGrpcIngestionServiceImpl serviceWithQuota(long maxRequestBytes, long maxSignalItems) {
        return serviceWithQuotaAndGovernance(maxRequestBytes, maxSignalItems, "");
    }

    private OtlpGrpcIngestionServiceImpl serviceWithQuotaAndGovernance(long maxRequestBytes, long maxSignalItems,
                                                                       String dropServiceNames) {
        return new OtlpGrpcIngestionServiceImpl(restTemplate, greptimePropertiesProvider, otlpLogProtocolAdapter,
                greptimeOtlpForwarder, otlpCorrelationEnricher, new OtlpIngestionErrorResponseFactory(),
                new OtlpIngestionRequestContextResolver(), auditService,
                new OtlpIngestionGovernanceService(dropServiceNames),
                new OtlpIngestionQuotaService(maxRequestBytes, maxSignalItems), observabilitySignalIntakeGateway,
                new OtlpEntityIdentityResolver(List.of(workspaceQueryGateway)));
    }

    private OtlpGrpcIngestionServiceImpl serviceWithMemoryPressure(double maxHeapUsageRatio, double heapUsageRatio) {
        return new OtlpGrpcIngestionServiceImpl(restTemplate, greptimePropertiesProvider, otlpLogProtocolAdapter,
                greptimeOtlpForwarder, otlpCorrelationEnricher, new OtlpIngestionErrorResponseFactory(),
                new OtlpIngestionRequestContextResolver(), auditService,
                new OtlpIngestionGovernanceService(""),
                new OtlpIngestionQuotaService(Long.MAX_VALUE, Long.MAX_VALUE, maxHeapUsageRatio, () -> heapUsageRatio),
                observabilitySignalIntakeGateway, new OtlpEntityIdentityResolver(List.of(workspaceQueryGateway)));
    }

    private OtlpGrpcIngestionServiceImpl serviceWithRetryAttempts(int retryAttempts) {
        return new OtlpGrpcIngestionServiceImpl(restTemplate, greptimePropertiesProvider, otlpLogProtocolAdapter,
                greptimeOtlpForwarder, otlpCorrelationEnricher, new OtlpIngestionErrorResponseFactory(),
                new OtlpIngestionRequestContextResolver(), auditService,
                new OtlpIngestionGovernanceService(""),
                new OtlpIngestionQuotaService(Long.MAX_VALUE, Long.MAX_VALUE), observabilitySignalIntakeGateway,
                new OtlpEntityIdentityResolver(List.of(workspaceQueryGateway)),
                new OtlpIngestionRetryService(retryAttempts));
    }

    @Test
    void metricsHttpGreptimePropertiesLookupFailureReturnsUnavailableAndRecordsRejectedAudit() {
        when(greptimePropertiesProvider.getIfAvailable())
                .thenThrow(new IllegalStateException("greptime properties unavailable"));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(
                ExportMetricsServiceRequest.getDefaultInstance().toByteArray(), requestHeaders);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        verify(restTemplate, org.mockito.Mockito.never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(byte[].class));
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("UNAVAILABLE", event.statusCode());
        assertEquals("OTLP backend is not configured.", event.reason());
    }

    @Test
    void tracesGrpcGreptimePropertiesLookupFailureThrowsUnavailableAndRecordsRejectedAudit() {
        when(greptimePropertiesProvider.getIfAvailable())
                .thenThrow(new IllegalStateException("greptime properties unavailable"));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> service.ingestTracesGrpc(ExportTraceServiceRequest.getDefaultInstance()));

        assertEquals(io.grpc.Status.Code.UNAVAILABLE, io.grpc.Status.fromThrowable(exception).getCode());
        assertEquals("OTLP backend is not configured.", io.grpc.Status.fromThrowable(exception).getDescription());
        verify(restTemplate, org.mockito.Mockito.never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(byte[].class));
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("traces", event.signal());
        assertEquals("grpc", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("UNAVAILABLE", event.statusCode());
        assertEquals("OTLP backend is not configured.", event.reason());
    }

    @Test
    void metricsHttpMalformedPayloadRecordsRejectedAuditEventWithWorkspace() {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            HttpHeaders requestHeaders = new HttpHeaders();
            requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

            ResponseEntity<byte[]> response = service.ingestMetricsHttp(new byte[]{0x0a}, requestHeaders);

            assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
            OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
            assertEquals("metrics", event.signal());
            assertEquals("http", event.protocol());
            assertEquals("rejected", event.outcome());
            assertEquals("INVALID_ARGUMENT", event.statusCode());
            assertEquals("team-a", event.workspaceId());
            assertEquals(1L, event.requestBytes());
            assertEquals("Malformed OTLP metrics payload.", event.reason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void metricsHttpMalformedGzipPayloadRecordsSignalSpecificRejectedAuditEvent() {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            byte[] malformedGzip = "not-gzip".getBytes(StandardCharsets.UTF_8);
            HttpHeaders requestHeaders = new HttpHeaders();
            requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
            requestHeaders.add(HttpHeaders.CONTENT_ENCODING, "gzip");

            ResponseEntity<byte[]> response = service.ingestMetricsHttp(malformedGzip, requestHeaders);

            assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
            verify(greptimePropertiesProvider, org.mockito.Mockito.never()).getIfAvailable();
            OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
            assertEquals("metrics", event.signal());
            assertEquals("http", event.protocol());
            assertEquals("rejected", event.outcome());
            assertEquals("INVALID_ARGUMENT", event.statusCode());
            assertEquals("team-a", event.workspaceId());
            assertEquals(malformedGzip.length, event.requestBytes());
            assertNull(event.signalItems());
            assertEquals("Malformed gzip-compressed OTLP metrics http payload.", event.reason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void metricsHttpMalformedBackendResponseDoesNotRecordReadModelOrAcceptedAuditForProtobufClient() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[]{0x0a},
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyMap());
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("INTERNAL", event.statusCode());
        assertEquals(1L, event.signalItems());
        assertEquals("OTLP metrics response is malformed.", event.reason());
    }

    @Test
    void metricsHttpReadModelFailureDoesNotFailAcceptedIngestionOrAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));
        doThrow(new IllegalStateException("read model down"))
                .when(observabilitySignalIntakeGateway)
                .recordOtlpMetricIntake(
                        org.mockito.ArgumentMatchers.anyMap(),
                        org.mockito.ArgumentMatchers.anyLong(),
                        org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.anyMap());
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("accepted", event.outcome());
        assertEquals("OK", event.statusCode());
        assertEquals(1L, event.signalItems());
    }

    @Test
    void logsHttpMalformedPayloadRecordsInvalidArgumentInsteadOfInternalError() {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            when(otlpCorrelationEnricher.enrichLogsHttp(
                    any(byte[].class), any(HttpHeaders.class), any(OtlpCorrelationContext.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            HttpHeaders requestHeaders = new HttpHeaders();
            requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

            ResponseEntity<byte[]> response = service.ingestLogsHttp(new byte[]{0x0a}, requestHeaders);

            assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
            verify(greptimeOtlpForwarder, org.mockito.Mockito.never()).forwardLogsProtobuf(any(byte[].class));
            verify(otlpLogProtocolAdapter, org.mockito.Mockito.never()).publishRealtimeSignals(any());
            OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
            assertEquals("logs", event.signal());
            assertEquals("http", event.protocol());
            assertEquals("rejected", event.outcome());
            assertEquals("INVALID_ARGUMENT", event.statusCode());
            assertEquals("team-a", event.workspaceId());
            assertEquals(1L, event.requestBytes());
            assertNull(event.signalItems());
            assertEquals("Malformed OTLP logs payload.", event.reason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void logsHttpReturnsGreptimePartialSuccessResponseBody() throws Exception {
        when(otlpCorrelationEnricher.enrichLogsHttp(
                any(byte[].class), any(HttpHeaders.class), any(OtlpCorrelationContext.class)))
                .thenAnswer(invocation -> realCorrelationEnricher.enrichLogsHttp(
                        invocation.getArgument(0), invocation.getArgument(1), invocation.getArgument(2)));
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .addLogRecords(LogRecord.newBuilder()
                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setBody(AnyValue.newBuilder().setStringValue("accepted with partials").build())
                                        .build())
                                .build())
                        .build())
                .build();
        ExportLogsServiceResponse backendResponse = ExportLogsServiceResponse.newBuilder()
                .setPartialSuccess(ExportLogsPartialSuccess.newBuilder()
                        .setRejectedLogRecords(2)
                        .setErrorMessage("backend accepted part of the batch"))
                .build();
        when(greptimeOtlpForwarder.forwardLogsProtobuf(any(byte[].class)))
                .thenReturn(new ResponseEntity<>(backendResponse.toByteArray(), HttpStatus.OK));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestLogsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.parseMediaType("application/x-protobuf"), response.getHeaders().getContentType());
        ExportLogsServiceResponse returned = ExportLogsServiceResponse.parseFrom(response.getBody());
        assertEquals(2, returned.getPartialSuccess().getRejectedLogRecords());
        assertEquals("backend accepted part of the batch", returned.getPartialSuccess().getErrorMessage());
        verify(otlpLogProtocolAdapter).publishRealtimeSignals(any(ExportLogsServiceRequest.class));
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("logs", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("accepted", event.outcome());
        assertEquals(1L, event.signalItems());
    }

    @Test
    void logsHttpRealtimePublishFailureDoesNotFailAcceptedIngestionOrAudit() {
        when(otlpCorrelationEnricher.enrichLogsHttp(
                any(byte[].class), any(HttpHeaders.class), any(OtlpCorrelationContext.class)))
                .thenAnswer(invocation -> realCorrelationEnricher.enrichLogsHttp(
                        invocation.getArgument(0), invocation.getArgument(1), invocation.getArgument(2)));
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .addLogRecords(LogRecord.newBuilder()
                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setBody(AnyValue.newBuilder().setStringValue("accepted despite sse").build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimeOtlpForwarder.forwardLogsProtobuf(any(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportLogsServiceResponse.getDefaultInstance().toByteArray(),
                        HttpStatus.OK));
        doThrow(new IllegalStateException("realtime down"))
                .when(otlpLogProtocolAdapter)
                .publishRealtimeSignals(any(ExportLogsServiceRequest.class));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestLogsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(otlpLogProtocolAdapter, times(1)).publishRealtimeSignals(any(ExportLogsServiceRequest.class));
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("logs", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("accepted", event.outcome());
        assertEquals("OK", event.statusCode());
        assertEquals(1L, event.signalItems());
    }

    @Test
    void logsHttpMalformedBackendResponseDoesNotPublishRealtimeOrAcceptedAuditForProtobufClient() {
        when(otlpCorrelationEnricher.enrichLogsHttp(
                any(byte[].class), any(HttpHeaders.class), any(OtlpCorrelationContext.class)))
                .thenAnswer(invocation -> realCorrelationEnricher.enrichLogsHttp(
                        invocation.getArgument(0), invocation.getArgument(1), invocation.getArgument(2)));
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .addLogRecords(LogRecord.newBuilder()
                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setBody(AnyValue.newBuilder().setStringValue("malformed response").build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimeOtlpForwarder.forwardLogsProtobuf(any(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[]{0x0a}, HttpStatus.OK));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestLogsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        verify(otlpLogProtocolAdapter, org.mockito.Mockito.never()).publishRealtimeSignals(any());
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("logs", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("INTERNAL", event.statusCode());
        assertEquals(1L, event.signalItems());
        assertEquals("OTLP logs response is malformed.", event.reason());
    }

    @Test
    void logsHttpMalformedBackendResponseDoesNotPublishRealtimeOrAcceptedAuditForJsonClient() {
        when(otlpCorrelationEnricher.enrichLogsHttp(
                any(byte[].class), any(HttpHeaders.class), any(OtlpCorrelationContext.class)))
                .thenAnswer(invocation -> realCorrelationEnricher.enrichLogsHttp(
                        invocation.getArgument(0), invocation.getArgument(1), invocation.getArgument(2)));
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .addLogRecords(LogRecord.newBuilder()
                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setBody(AnyValue.newBuilder().setStringValue("malformed response").build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimeOtlpForwarder.forwardLogsProtobuf(any(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[]{0x0a}, HttpStatus.OK));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        requestHeaders.setAccept(List.of(MediaType.APPLICATION_JSON));

        ResponseEntity<byte[]> response = service.ingestLogsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals(MediaType.APPLICATION_JSON, response.getHeaders().getContentType());
        String responseBody = new String(response.getBody(), StandardCharsets.UTF_8);
        assertTrue(responseBody.contains("\"code\": 13"));
        assertTrue(responseBody.contains("OTLP logs response is malformed."));
        verify(otlpLogProtocolAdapter, org.mockito.Mockito.never()).publishRealtimeSignals(any());
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("logs", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("INTERNAL", event.statusCode());
        assertEquals(1L, event.signalItems());
        assertEquals("OTLP logs response is malformed.", event.reason());
    }

    @Test
    void logsHttpNullForwardResponseReturnsUnavailableAndRecordsRejectedAudit() {
        when(otlpCorrelationEnricher.enrichLogsHttp(
                any(byte[].class), any(HttpHeaders.class), any(OtlpCorrelationContext.class)))
                .thenAnswer(invocation -> realCorrelationEnricher.enrichLogsHttp(
                        invocation.getArgument(0), invocation.getArgument(1), invocation.getArgument(2)));
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .addLogRecords(LogRecord.newBuilder()
                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setBody(AnyValue.newBuilder().setStringValue("missing backend response")
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimeOtlpForwarder.forwardLogsProtobuf(any(byte[].class))).thenReturn(null);
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestLogsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        verify(otlpLogProtocolAdapter, org.mockito.Mockito.never()).publishRealtimeSignals(any());
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("logs", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("UNAVAILABLE", event.statusCode());
        assertEquals(1L, event.signalItems());
        assertEquals("OTLP backend returned no response.", event.reason());
    }

    @Test
    void logsHttpBackendTooManyRequestsResponseReturnsResourceExhaustedAndRecordsRejectedAudit() {
        when(otlpCorrelationEnricher.enrichLogsHttp(
                any(byte[].class), any(HttpHeaders.class), any(OtlpCorrelationContext.class)))
                .thenAnswer(invocation -> realCorrelationEnricher.enrichLogsHttp(
                        invocation.getArgument(0), invocation.getArgument(1), invocation.getArgument(2)));
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .addLogRecords(LogRecord.newBuilder()
                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setBody(AnyValue.newBuilder().setStringValue("backend saturated").build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimeOtlpForwarder.forwardLogsProtobuf(any(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportLogsServiceResponse.getDefaultInstance().toByteArray(),
                        HttpStatus.TOO_MANY_REQUESTS));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestLogsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        verify(otlpLogProtocolAdapter, org.mockito.Mockito.never()).publishRealtimeSignals(any());
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("logs", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
        assertEquals(1L, event.signalItems());
        assertEquals("OTLP backend returned 429 TOO_MANY_REQUESTS", event.reason());
    }

    @Test
    void metricsGrpcOverQuotaRejectsBeforeProxyAndAuditsRejected() {
        service = serviceWithQuota(1L);
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                    .addResourceMetrics(ResourceMetrics.newBuilder()
                            .setResource(Resource.newBuilder()
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("service.name")
                                            .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                            .build())
                                    .build())
                            .build())
                    .build();

            StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                    () -> service.ingestMetricsGrpc(request));

            assertEquals(io.grpc.Status.Code.RESOURCE_EXHAUSTED,
                    io.grpc.Status.fromThrowable(exception).getCode());
            verify(restTemplate, org.mockito.Mockito.never()).exchange(
                    contains("/v1/otlp/v1/metrics"),
                    eq(HttpMethod.POST),
                    any(HttpEntity.class),
                    eq(byte[].class));
            verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                    org.mockito.ArgumentMatchers.anyMap(),
                    org.mockito.ArgumentMatchers.anyLong(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.anyMap());

            OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
            assertEquals("metrics", event.signal());
            assertEquals("grpc", event.protocol());
            assertEquals("rejected", event.outcome());
            assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
            assertEquals("team-a", event.workspaceId());
            assertEquals(request.getSerializedSize(), event.requestBytes());
            assertEquals("OTLP metrics grpc payload exceeds 1 bytes.", event.reason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void metricsGrpcOverSignalItemLimitRejectsBeforeProxyAndAuditsRejected() {
        service = serviceWithQuota(Long.MAX_VALUE, 1L);
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                    .addResourceMetrics(ResourceMetrics.newBuilder()
                            .setResource(Resource.newBuilder()
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("service.name")
                                            .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                            .build())
                                    .build())
                            .addScopeMetrics(ScopeMetrics.newBuilder()
                                    .addMetrics(Metric.newBuilder()
                                            .setName("checkout.requests")
                                            .setGauge(Gauge.newBuilder()
                                                    .addDataPoints(NumberDataPoint.newBuilder()
                                                            .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                            .setAsDouble(1.0)
                                                            .build())
                                                    .addDataPoints(NumberDataPoint.newBuilder()
                                                            .setTimeUnixNano(1_710_000_001_000_000_000L)
                                                            .setAsDouble(2.0)
                                                            .build())
                                                    .build())
                                            .build())
                                    .build())
                            .build())
                    .build();

            StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                    () -> service.ingestMetricsGrpc(request));

            assertEquals(io.grpc.Status.Code.RESOURCE_EXHAUSTED,
                    io.grpc.Status.fromThrowable(exception).getCode());
            verify(restTemplate, org.mockito.Mockito.never()).exchange(
                    contains("/v1/otlp/v1/metrics"),
                    eq(HttpMethod.POST),
                    any(HttpEntity.class),
                    eq(byte[].class));
            verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                    org.mockito.ArgumentMatchers.anyMap(),
                    org.mockito.ArgumentMatchers.anyLong(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.anyMap());

            OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
            assertEquals("metrics", event.signal());
            assertEquals("grpc", event.protocol());
            assertEquals("rejected", event.outcome());
            assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
            assertEquals("team-a", event.workspaceId());
            assertEquals(2L, event.signalItems());
            assertEquals("OTLP metrics grpc batch exceeds 1 signal items.", event.reason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void metricsGrpcHeapPressureRejectsBeforeProxyAndAuditsRejected() {
        service = serviceWithMemoryPressure(0.75D, 0.76D);
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                    .addResourceMetrics(ResourceMetrics.newBuilder()
                            .setResource(Resource.newBuilder()
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("service.name")
                                            .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                            .build())
                                    .build())
                            .addScopeMetrics(ScopeMetrics.newBuilder()
                                    .addMetrics(Metric.newBuilder()
                                            .setName("checkout.requests")
                                            .setGauge(Gauge.newBuilder()
                                                    .addDataPoints(NumberDataPoint.newBuilder()
                                                            .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                            .setAsDouble(1.0)
                                                            .build())
                                                    .build())
                                            .build())
                                    .build())
                            .build())
                    .build();

            StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                    () -> service.ingestMetricsGrpc(request));

            assertEquals(io.grpc.Status.Code.RESOURCE_EXHAUSTED,
                    io.grpc.Status.fromThrowable(exception).getCode());
            verify(restTemplate, org.mockito.Mockito.never()).exchange(
                    contains("/v1/otlp/v1/metrics"),
                    eq(HttpMethod.POST),
                    any(HttpEntity.class),
                    eq(byte[].class));
            verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                    org.mockito.ArgumentMatchers.anyMap(),
                    org.mockito.ArgumentMatchers.anyLong(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.anyMap());

            OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
            assertEquals("metrics", event.signal());
            assertEquals("grpc", event.protocol());
            assertEquals("rejected", event.outcome());
            assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
            assertEquals("team-a", event.workspaceId());
            assertNull(event.signalItems());
            assertEquals("OTLP metrics grpc ingestion paused because heap usage is 76% (limit 75%).",
                    event.reason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void metricsHttpGzipPayloadRejectsWhenDecompressedBytesExceedLimitBeforeBackendLookup() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                    .addResourceMetrics(ResourceMetrics.newBuilder()
                            .setResource(Resource.newBuilder()
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("service.name")
                                            .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                            .build())
                                    .build())
                            .addScopeMetrics(ScopeMetrics.newBuilder()
                                    .addMetrics(Metric.newBuilder()
                                            .setName("checkout.large")
                                            .setGauge(Gauge.newBuilder()
                                                    .addDataPoints(NumberDataPoint.newBuilder()
                                                            .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                            .setAsDouble(1.0)
                                                            .addAttributes(KeyValue.newBuilder()
                                                                    .setKey("payload")
                                                                    .setValue(AnyValue.newBuilder()
                                                                            .setStringValue("x".repeat(4096))
                                                                            .build())
                                                                    .build())
                                                            .build())
                                                    .build())
                                            .build())
                                    .build())
                            .build())
                    .build();
            byte[] compressed = gzip(request.toByteArray());
            service = serviceWithQuota(compressed.length + 8L);
            HttpHeaders requestHeaders = new HttpHeaders();
            requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
            requestHeaders.add(HttpHeaders.CONTENT_ENCODING, "gzip");

            ResponseEntity<byte[]> response = service.ingestMetricsHttp(compressed, requestHeaders);

            assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
            verify(greptimePropertiesProvider, org.mockito.Mockito.never()).getIfAvailable();
            verify(restTemplate, org.mockito.Mockito.never()).exchange(
                    contains("/v1/otlp/v1/metrics"),
                    eq(HttpMethod.POST),
                    any(HttpEntity.class),
                    eq(byte[].class));
            verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                    org.mockito.ArgumentMatchers.anyMap(),
                    org.mockito.ArgumentMatchers.anyLong(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.anyMap());
            OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
            assertEquals("metrics", event.signal());
            assertEquals("http", event.protocol());
            assertEquals("rejected", event.outcome());
            assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
            assertEquals("team-a", event.workspaceId());
            assertEquals(compressed.length, event.requestBytes());
            assertNull(event.signalItems());
            assertEquals("OTLP metrics http payload exceeds " + (compressed.length + 8L) + " bytes.",
                    event.reason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void metricsHttpTruncatedGzipPayloadRejectsOnDecodedSizeBeforeTrailerValidation() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                    .addResourceMetrics(ResourceMetrics.newBuilder()
                            .addScopeMetrics(ScopeMetrics.newBuilder()
                                    .addMetrics(Metric.newBuilder()
                                            .setName("checkout.large.truncated")
                                            .setGauge(Gauge.newBuilder()
                                                    .addDataPoints(NumberDataPoint.newBuilder()
                                                            .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                            .setAsDouble(1.0)
                                                            .addAttributes(KeyValue.newBuilder()
                                                                    .setKey("payload")
                                                                    .setValue(AnyValue.newBuilder()
                                                                            .setStringValue("x".repeat(4096))
                                                                            .build())
                                                                    .build())
                                                            .build())
                                                    .build())
                                            .build())
                                    .build())
                            .build())
                    .build();
            byte[] compressed = gzip(request.toByteArray());
            byte[] truncatedCompressed = java.util.Arrays.copyOf(compressed, compressed.length - 8);
            long maxRequestBytes = truncatedCompressed.length + 8L;
            service = serviceWithQuota(maxRequestBytes);
            HttpHeaders requestHeaders = new HttpHeaders();
            requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
            requestHeaders.add(HttpHeaders.CONTENT_ENCODING, "gzip");

            ResponseEntity<byte[]> response = service.ingestMetricsHttp(truncatedCompressed, requestHeaders);

            assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
            verify(greptimePropertiesProvider, org.mockito.Mockito.never()).getIfAvailable();
            verify(restTemplate, org.mockito.Mockito.never()).exchange(
                    contains("/v1/otlp/v1/metrics"),
                    eq(HttpMethod.POST),
                    any(HttpEntity.class),
                    eq(byte[].class));
            verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                    org.mockito.ArgumentMatchers.anyMap(),
                    org.mockito.ArgumentMatchers.anyLong(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.anyMap());
            OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
            assertEquals("metrics", event.signal());
            assertEquals("http", event.protocol());
            assertEquals("rejected", event.outcome());
            assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
            assertEquals("team-a", event.workspaceId());
            assertEquals(truncatedCompressed.length, event.requestBytes());
            assertNull(event.signalItems());
            assertEquals("OTLP metrics http payload exceeds " + maxRequestBytes + " bytes.", event.reason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void metricsGrpcDropPolicySkipsProxyAndReadModelAndAuditsDropped() {
        service = serviceWithQuotaAndGovernance(Long.MAX_VALUE, Long.MAX_VALUE, "checkout");
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        try {
            ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                    .addResourceMetrics(ResourceMetrics.newBuilder()
                            .setResource(Resource.newBuilder()
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("service.name")
                                            .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                            .build())
                                    .build())
                            .addScopeMetrics(ScopeMetrics.newBuilder()
                                    .addMetrics(Metric.newBuilder()
                                            .setName("checkout.requests")
                                            .setGauge(Gauge.newBuilder()
                                                    .addDataPoints(NumberDataPoint.newBuilder()
                                                            .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                            .setAsDouble(1.0)
                                                            .build())
                                                    .build())
                                            .build())
                                    .build())
                            .build())
                    .build();

            ExportMetricsServiceResponse response = service.ingestMetricsGrpc(request);

            assertEquals(ExportMetricsServiceResponse.getDefaultInstance(), response);
            verify(restTemplate, org.mockito.Mockito.never()).exchange(
                    contains("/v1/otlp/v1/metrics"),
                    eq(HttpMethod.POST),
                    any(HttpEntity.class),
                    eq(byte[].class));
            verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                    org.mockito.ArgumentMatchers.anyMap(),
                    org.mockito.ArgumentMatchers.anyLong(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.anyMap());

            OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
            assertEquals("metrics", event.signal());
            assertEquals("grpc", event.protocol());
            assertEquals("dropped", event.outcome());
            assertEquals("OK", event.statusCode());
            assertEquals("team-a", event.workspaceId());
            assertEquals(1L, event.signalItems());
            assertEquals("OTLP metrics grpc dropped by governance policy: service.name=checkout", event.reason());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void shouldProxyMetricsGrpcToUnifiedBackend() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("local-otlp-service").build())
                                        .build())
                                .build())
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("local_otlp_metric")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(42.5)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        ExportMetricsServiceResponse upstream = ExportMetricsServiceResponse.getDefaultInstance();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(upstream.toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        ExportMetricsServiceResponse response = service.ingestMetricsGrpc(request);

        assertNotNull(response);
        verify(observabilitySignalIntakeGateway).recordOtlpMetricIntake(org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_000_000L), eq("local_otlp_metric"), eq("gauge"), eq(null),
                eq(42.5), org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsGrpcNormalizesTrailingSlashGreptimeEndpointBeforeForwarding() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.getDefaultInstance();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000/");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        ExportMetricsServiceResponse response = service.ingestMetricsGrpc(request);

        assertEquals(ExportMetricsServiceResponse.getDefaultInstance(), response);
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void metricsGrpcTrimsAndNormalizesGreptimeEndpointBeforeForwarding() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.getDefaultInstance();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("  http://greptime:4000///  ");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        ExportMetricsServiceResponse response = service.ingestMetricsGrpc(request);

        assertEquals(ExportMetricsServiceResponse.getDefaultInstance(), response);
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void metricsGrpcMalformedBackendResponseDoesNotRecordReadModelOrAcceptedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[]{0x0a},
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> service.ingestMetricsGrpc(request));

        assertEquals(io.grpc.Status.Code.INTERNAL, io.grpc.Status.fromThrowable(exception).getCode());
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyMap());
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("grpc", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("INTERNAL", event.statusCode());
        assertEquals(1L, event.signalItems());
        assertEquals("OTLP metrics response is malformed.", event.reason());
    }

    @Test
    void shouldRetryMetricsGrpcTransientGreptimeFailureBeforeRecordingIntake() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenThrow(new ResourceAccessException("connection reset"))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        ExportMetricsServiceResponse response = service.ingestMetricsGrpc(request);

        assertEquals(ExportMetricsServiceResponse.getDefaultInstance(), response);
        verify(restTemplate, times(2)).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, times(1)).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_000_000L),
                eq("checkout.requests"),
                eq("gauge"),
                eq(null),
                eq(1.0),
                org.mockito.ArgumentMatchers.anyMap());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("accepted", event.outcome());
        assertEquals("OK", event.statusCode());
    }

    @Test
    void shouldUseInjectedRetryConfigurationForMetricsGrpcGreptimeProxy() {
        service = serviceWithRetryAttempts(3);
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenThrow(new ResourceAccessException("connection reset"))
                .thenThrow(new ResourceAccessException("connection reset"))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        ExportMetricsServiceResponse response = service.ingestMetricsGrpc(request);

        assertEquals(ExportMetricsServiceResponse.getDefaultInstance(), response);
        verify(restTemplate, times(3)).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void shouldRetryMetricsGrpcRetryableGreptimeStatusBeforeRecordingIntake() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.SERVICE_UNAVAILABLE))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        ExportMetricsServiceResponse response = service.ingestMetricsGrpc(request);

        assertEquals(ExportMetricsServiceResponse.getDefaultInstance(), response);
        verify(restTemplate, times(2)).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, times(1)).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_000_000L),
                eq("checkout.requests"),
                eq("gauge"),
                eq(null),
                eq(1.0),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpNullBackendResponseReturnsUnavailableAndRecordsRejectedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(null)
                .thenReturn(null);
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("UNAVAILABLE", event.statusCode());
        assertEquals("OTLP backend returned no response.", event.reason());
        verify(restTemplate, times(2)).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendTooManyRequestsReturnsResourceExhaustedAndRecordsRejectedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.TOO_MANY_REQUESTS))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.TOO_MANY_REQUESTS));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
        assertEquals("OTLP backend returned 429 TOO_MANY_REQUESTS", event.reason());
        verify(restTemplate, times(2)).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendInternalServerErrorReturnsInternalAndRecordsRejectedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.INTERNAL_SERVER_ERROR));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("INTERNAL", event.statusCode());
        assertEquals("OTLP backend returned 500 INTERNAL_SERVER_ERROR", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendNotFoundReturnsNotFoundAndRecordsRejectedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.NOT_FOUND));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("NOT_FOUND", event.statusCode());
        assertEquals("OTLP backend returned 404 NOT_FOUND", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendConflictReturnsConflictAndRecordsAbortedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.CONFLICT));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("ABORTED", event.statusCode());
        assertEquals("OTLP backend returned 409 CONFLICT", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendLockedReturnsConflictAndRecordsAbortedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.LOCKED));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("ABORTED", event.statusCode());
        assertEquals("OTLP backend returned 423 LOCKED", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendTooEarlyReturnsServiceUnavailableAndRecordsUnavailableAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.TOO_EARLY))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.TOO_EARLY));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("UNAVAILABLE", event.statusCode());
        assertEquals("OTLP backend returned 425 TOO_EARLY", event.reason());
        verify(restTemplate, times(2)).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendMethodNotAllowedReturnsNotImplementedAndRecordsUnimplementedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.METHOD_NOT_ALLOWED));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.NOT_IMPLEMENTED, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("UNIMPLEMENTED", event.statusCode());
        assertEquals("OTLP backend returned 405 METHOD_NOT_ALLOWED", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendNotAcceptableReturnsBadRequestAndRecordsInvalidArgumentAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.NOT_ACCEPTABLE));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("INVALID_ARGUMENT", event.statusCode());
        assertEquals("OTLP backend returned 406 NOT_ACCEPTABLE", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendRequestHeadersTooLargeReturnsTooManyRequestsAndRecordsResourceExhaustedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.REQUEST_HEADER_FIELDS_TOO_LARGE));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
        assertEquals("OTLP backend returned 431 REQUEST_HEADER_FIELDS_TOO_LARGE", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendInsufficientStorageReturnsTooManyRequestsAndRecordsResourceExhaustedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.INSUFFICIENT_STORAGE));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
        assertEquals("OTLP backend returned 507 INSUFFICIENT_STORAGE", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendPreconditionFailedReturnsBadRequestAndRecordsFailedPreconditionAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.PRECONDITION_FAILED));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("FAILED_PRECONDITION", event.statusCode());
        assertEquals("OTLP backend returned 412 PRECONDITION_FAILED", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendPreconditionRequiredReturnsBadRequestAndRecordsFailedPreconditionAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.PRECONDITION_REQUIRED));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("FAILED_PRECONDITION", event.statusCode());
        assertEquals("OTLP backend returned 428 PRECONDITION_REQUIRED", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendRangeNotSatisfiableReturnsBadRequestAndRecordsOutOfRangeAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("OUT_OF_RANGE", event.statusCode());
        assertEquals("OTLP backend returned 416 REQUESTED_RANGE_NOT_SATISFIABLE", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendNotImplementedReturnsNotImplementedAndRecordsRejectedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.NOT_IMPLEMENTED));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.NOT_IMPLEMENTED, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("UNIMPLEMENTED", event.statusCode());
        assertEquals("OTLP backend returned 501 NOT_IMPLEMENTED", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendTooManyRequestsPropagatesRetryAfterHeader() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        retryAfterHeaders(MediaType.parseMediaType("application/x-protobuf"), "0"),
                        HttpStatus.TOO_MANY_REQUESTS))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        retryAfterHeaders(MediaType.parseMediaType("application/x-protobuf"), "0"),
                        HttpStatus.TOO_MANY_REQUESTS));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertEquals("0", response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER));
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
        verify(restTemplate, times(2)).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void metricsHttpBackendTooManyRequestsDropsMalformedRetryAfterHeader() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        retryAfterHeaders(MediaType.parseMediaType("application/x-protobuf"),
                                "not-a-retry-after"),
                        HttpStatus.TOO_MANY_REQUESTS))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        retryAfterHeaders(MediaType.parseMediaType("application/x-protobuf"),
                                "not-a-retry-after"),
                        HttpStatus.TOO_MANY_REQUESTS));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertNull(response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER));
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
        verify(restTemplate, times(2)).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void metricsHttpBackendRequestTimeoutReturnsDeadlineExceededAndRecordsRejectedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.REQUEST_TIMEOUT))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.REQUEST_TIMEOUT));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.GATEWAY_TIMEOUT, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("DEADLINE_EXCEEDED", event.statusCode());
        assertEquals("OTLP backend returned 408 REQUEST_TIMEOUT", event.reason());
        verify(restTemplate, times(2)).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendGatewayTimeoutReturnsDeadlineExceededAndRecordsRejectedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.GATEWAY_TIMEOUT))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.GATEWAY_TIMEOUT));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.GATEWAY_TIMEOUT, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("DEADLINE_EXCEEDED", event.statusCode());
        assertEquals("OTLP backend returned 504 GATEWAY_TIMEOUT", event.reason());
        verify(restTemplate, times(2)).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendBadRequestReturnsInvalidArgumentAndRecordsRejectedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.BAD_REQUEST));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("INVALID_ARGUMENT", event.statusCode());
        assertEquals("OTLP backend returned 400 BAD_REQUEST", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendUnauthorizedReturnsUnauthenticatedAndRecordsRejectedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.UNAUTHORIZED));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("UNAUTHENTICATED", event.statusCode());
        assertEquals("OTLP backend returned 401 UNAUTHORIZED", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendUnsupportedMediaTypeReturnsInvalidArgumentAndRecordsRejectedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.UNSUPPORTED_MEDIA_TYPE));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("INVALID_ARGUMENT", event.statusCode());
        assertEquals("OTLP backend returned 415 UNSUPPORTED_MEDIA_TYPE", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendUnprocessableEntityReturnsInvalidArgumentAndRecordsRejectedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")),
                        HttpStatus.UNPROCESSABLE_ENTITY));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("INVALID_ARGUMENT", event.statusCode());
        assertEquals("OTLP backend returned 422 UNPROCESSABLE_ENTITY", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpBackendPayloadTooLargeReturnsResourceExhaustedAndRecordsRejectedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(new byte[0],
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.PAYLOAD_TOO_LARGE));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("RESOURCE_EXHAUSTED", event.statusCode());
        assertEquals("OTLP backend returned 413 PAYLOAD_TOO_LARGE", event.reason());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpWithoutContentTypeStillForwardsProtobufContentTypeToGreptime() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));
        HttpHeaders requestHeaders = new HttpHeaders();

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.parseMediaType("application/x-protobuf"), response.getHeaders().getContentType());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity ->
                        MediaType.parseMediaType("application/x-protobuf")
                                .equals(entity.getHeaders().getContentType())),
                eq(byte[].class));
    }

    @Test
    void metricsHttpWithNullHeadersStillUsesProtobufDefaultsAndRecordsAcceptedAudit() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.parseMediaType("application/x-protobuf"), response.getHeaders().getContentType());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity ->
                        MediaType.parseMediaType("application/x-protobuf")
                                .equals(entity.getHeaders().getContentType())),
                eq(byte[].class));
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("accepted", event.outcome());
        assertEquals(1L, event.signalItems());
    }

    @Test
    void metricsHttpWithNullBodyUsesEmptyProtobufRequestAndRecordsAcceptedAudit() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));
        HttpHeaders requestHeaders = new HttpHeaders();

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(null, requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.parseMediaType("application/x-protobuf"), response.getHeaders().getContentType());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                    try {
                        assertEquals(MediaType.parseMediaType("application/x-protobuf"),
                                entity.getHeaders().getContentType());
                        assertEquals(ExportMetricsServiceRequest.getDefaultInstance(),
                                ExportMetricsServiceRequest.parseFrom(entity.getBody()));
                        return true;
                    } catch (Exception ex) {
                        return false;
                    }
                }),
                eq(byte[].class));
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("metrics", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("accepted", event.outcome());
        assertEquals(0L, event.requestBytes());
        assertEquals(0L, event.signalItems());
    }

    @Test
    void metricsHttpWithApplicationProtobufNormalizesGreptimeContentType() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/protobuf"));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.parseMediaType("application/x-protobuf"), response.getHeaders().getContentType());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity ->
                        MediaType.parseMediaType("application/x-protobuf")
                                .equals(entity.getHeaders().getContentType())),
                eq(byte[].class));
    }

    @Test
    void metricsHttpWithApplicationProtobufAcceptNormalizesGreptimeAccept() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        requestHeaders.setAccept(List.of(MediaType.parseMediaType("application/protobuf")));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.parseMediaType("application/x-protobuf"), response.getHeaders().getContentType());
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity ->
                        List.of(MediaType.parseMediaType("application/x-protobuf"))
                                .equals(entity.getHeaders().getAccept())),
                eq(byte[].class));
    }

    @Test
    void shouldAddGreptimeMetricPromotionHeadersWhenProxyingMetricsGrpc() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("http.server.request.duration.count")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        service.ingestMetricsGrpc(request);

        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                    HttpHeaders headers = entity.getHeaders();
                    assertEquals("false", headers.getFirst(GREPTIME_PROMOTE_ALL_RESOURCE_ATTRS_HEADER));
                    assertEquals("false", headers.getFirst(GREPTIME_PROMOTE_SCOPE_ATTRS_HEADER));
                    String promotedAttrs = headers.getFirst(GREPTIME_PROMOTE_RESOURCE_ATTRS_HEADER);
                    assertNotNull(promotedAttrs);
                    assertFalse(promotedAttrs.isBlank());
                    List<String> promotedKeys = List.of(promotedAttrs.split(";"));
                    return promotedKeys.contains(OtlpResourceSemanticAttributes.SERVICE_NAME)
                            && promotedKeys.contains(OtlpResourceSemanticAttributes.SERVICE_NAMESPACE)
                            && promotedKeys.contains(OtlpResourceSemanticAttributes.DEPLOYMENT_ENVIRONMENT_NAME)
                            && promotedKeys.contains(OtlpResourceSemanticAttributes.SERVICE_INSTANCE_ID)
                            && promotedKeys.contains(OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID)
                            && promotedKeys.contains(OtlpResourceSemanticAttributes.HERTZBEAT_WORKSPACE_ID);
                }),
                eq(byte[].class)
        );
    }

    @Test
    void metricsGrpcTrimsGreptimeDatabaseHeaderBeforeForwarding() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.getDefaultInstance();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn(" public ");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                    assertEquals("public", entity.getHeaders().getFirst("X-Greptime-DB-Name"));
                    return true;
                }),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        ExportMetricsServiceResponse response = service.ingestMetricsGrpc(request);

        assertEquals(ExportMetricsServiceResponse.getDefaultInstance(), response);
        verify(restTemplate).exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
    }

    @Test
    void metricsGrpcTrimsGreptimeBasicAuthCredentialsBeforeForwarding() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.getDefaultInstance();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(greptimeProperties.username()).thenReturn(" demo ");
        when(greptimeProperties.password()).thenReturn(" secret ");
        String expectedAuthorization = "Basic "
                + Base64.getEncoder().encodeToString("demo:secret".getBytes(StandardCharsets.UTF_8));
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                    assertEquals(expectedAuthorization, entity.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
                    return true;
                }),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        ExportMetricsServiceResponse response = service.ingestMetricsGrpc(request);

        assertEquals(ExportMetricsServiceResponse.getDefaultInstance(), response);
    }

    @Test
    void shouldRecordEveryMetricDataPointInsteadOfOnlyTheFirstOne() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("local-otlp-service").build())
                                        .build())
                                .build())
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("queue.depth")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_010_000_000_000L)
                                                        .addAttributes(KeyValue.newBuilder()
                                                                .setKey("queue")
                                                                .setValue(AnyValue.newBuilder().setStringValue("fast").build())
                                                                .build())
                                                        .setAsDouble(12)
                                                        .build())
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_011_000_000_000L)
                                                        .addAttributes(KeyValue.newBuilder()
                                                                .setKey("queue")
                                                                .setValue(AnyValue.newBuilder().setStringValue("slow").build())
                                                                .build())
                                                        .setAsDouble(34)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        service.ingestMetricsGrpc(request);

        verify(observabilitySignalIntakeGateway, times(2)).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                eq("queue.depth"),
                eq("gauge"),
                eq(null),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void shouldPreserveHistogramCompatibilityMetadataWhenProxyingMetricsGrpc() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("http.server.request.duration")
                                        .setUnit("ms")
                                        .setHistogram(Histogram.newBuilder()
                                                .setAggregationTemporality(AggregationTemporality.AGGREGATION_TEMPORALITY_DELTA)
                                                .addDataPoints(HistogramDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setCount(10)
                                                        .setSum(321.5)
                                                        .addExplicitBounds(50)
                                                        .addExplicitBounds(100)
                                                        .addBucketCounts(3)
                                                        .addBucketCounts(7)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        service.ingestMetricsGrpc(request);

        verify(observabilitySignalIntakeGateway).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_000_000L),
                eq("http.server.request.duration"),
                eq("histogram"),
                eq("ms"),
                eq(321.5),
                org.mockito.ArgumentMatchers.argThat(attributes ->
                        "partial".equals(attributes.get("otlp.metric.compatibility"))
                                && "supported".equals(attributes.get("otlp.metric.greptime.compatibility"))
                                && "partial".equals(attributes.get("otlp.metric.facade.compatibility"))
                                && "AGGREGATION_TEMPORALITY_DELTA".equals(
                                attributes.get("otlp.metric.aggregation_temporality"))
                                && "[50.0,100.0]".equals(attributes.get("otlp.metric.histogram.explicit_bounds"))
                                && "[3,7]".equals(attributes.get("otlp.metric.histogram.bucket_counts"))
                                && attributes.get("otlp.metric.compatibility.reason") != null
                ));
    }

    @Test
    void shouldPreserveSummaryCompatibilityMetadataWhenProxyingMetricsGrpc() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("http.server.request.size")
                                        .setUnit("By")
                                        .setSummary(Summary.newBuilder()
                                                .addDataPoints(SummaryDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_001_000_000_000L)
                                                        .setCount(2)
                                                        .setSum(512)
                                                        .addQuantileValues(SummaryDataPoint.ValueAtQuantile.newBuilder()
                                                                .setQuantile(0.5)
                                                                .setValue(128)
                                                                .build())
                                                        .addQuantileValues(SummaryDataPoint.ValueAtQuantile.newBuilder()
                                                                .setQuantile(0.95)
                                                                .setValue(384)
                                                                .build())
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        service.ingestMetricsGrpc(request);

        verify(observabilitySignalIntakeGateway).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_001_000L),
                eq("http.server.request.size"),
                eq("summary"),
                eq("By"),
                eq(512.0),
                org.mockito.ArgumentMatchers.argThat(attributes ->
                        "partial".equals(attributes.get("otlp.metric.compatibility"))
                                && "partial".equals(attributes.get("otlp.metric.greptime.compatibility"))
                                && "partial".equals(attributes.get("otlp.metric.facade.compatibility"))
                                && "2".equals(attributes.get("otlp.metric.summary.count"))
                                && attributes.get("otlp.metric.summary.quantiles") != null
                                && attributes.get("otlp.metric.summary.quantiles").contains("\"quantile\":0.5")
                                && attributes.get("otlp.metric.compatibility.reason") != null
                ));
    }

    @Test
    void shouldMarkExponentialHistogramAsUnsupportedWhenProxyingMetricsGrpc() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("http.server.request.duration.exp")
                                        .setUnit("ms")
                                        .setExponentialHistogram(ExponentialHistogram.newBuilder()
                                                .setAggregationTemporality(AggregationTemporality.AGGREGATION_TEMPORALITY_DELTA)
                                                .addDataPoints(ExponentialHistogramDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_002_000_000_000L)
                                                        .setCount(4)
                                                        .setSum(128)
                                                        .setScale(2)
                                                        .setZeroCount(1)
                                                        .setZeroThreshold(0.001)
                                                        .setPositive(ExponentialHistogramDataPoint.Buckets.newBuilder()
                                                                .setOffset(3)
                                                                .addBucketCounts(1)
                                                                .addBucketCounts(2)
                                                                .build())
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        service.ingestMetricsGrpc(request);

        verify(observabilitySignalIntakeGateway).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_002_000L),
                eq("http.server.request.duration.exp"),
                eq("exponential_histogram"),
                eq("ms"),
                eq(128.0),
                org.mockito.ArgumentMatchers.argThat(attributes ->
                        "unsupported".equals(attributes.get("otlp.metric.compatibility"))
                                && "unsupported".equals(attributes.get("otlp.metric.greptime.compatibility"))
                                && "partial".equals(attributes.get("otlp.metric.facade.compatibility"))
                                && "2".equals(attributes.get("otlp.metric.exponential_histogram.scale"))
                                && "1".equals(attributes.get("otlp.metric.exponential_histogram.zero_count"))
                                && attributes.get("otlp.metric.compatibility.reason") != null
                                && attributes.get("otlp.metric.compatibility.reason").contains("ExponentialHistogram")
                ));
    }

    @Test
    void shouldForwardLogsGrpcToGreptimeBeforePublishingRealtimeSignals() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        ExportLogsServiceRequest enrichedRequest = ExportLogsServiceRequest.newBuilder().build();
        when(otlpCorrelationEnricher.enrichLogs(eq(request), eq(OtlpCorrelationContext.empty())))
                .thenReturn(enrichedRequest);
        when(greptimeOtlpForwarder.forwardLogsGrpc(enrichedRequest))
                .thenReturn(ExportLogsServiceResponse.getDefaultInstance().toByteArray());

        ExportLogsServiceResponse response = service.ingestLogsGrpc(request);

        verify(greptimeOtlpForwarder).forwardLogsGrpc(enrichedRequest);
        verify(otlpLogProtocolAdapter).publishRealtimeSignals(enrichedRequest);
        assertEquals(ExportLogsServiceResponse.getDefaultInstance(), response);
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("logs", event.signal());
        assertEquals("grpc", event.protocol());
        assertEquals("accepted", event.outcome());
        assertEquals("OK", event.statusCode());
    }

    @Test
    void logsGrpcRealtimePublishFailureDoesNotFailAcceptedIngestionOrAudit() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        ExportLogsServiceRequest enrichedRequest = ExportLogsServiceRequest.newBuilder().build();
        when(otlpCorrelationEnricher.enrichLogs(eq(request), eq(OtlpCorrelationContext.empty())))
                .thenReturn(enrichedRequest);
        when(greptimeOtlpForwarder.forwardLogsGrpc(enrichedRequest))
                .thenReturn(ExportLogsServiceResponse.getDefaultInstance().toByteArray());
        doThrow(new IllegalStateException("realtime down"))
                .when(otlpLogProtocolAdapter)
                .publishRealtimeSignals(any(ExportLogsServiceRequest.class));

        ExportLogsServiceResponse response = service.ingestLogsGrpc(request);

        assertEquals(ExportLogsServiceResponse.getDefaultInstance(), response);
        verify(otlpLogProtocolAdapter, times(1)).publishRealtimeSignals(any(ExportLogsServiceRequest.class));
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("logs", event.signal());
        assertEquals("grpc", event.protocol());
        assertEquals("accepted", event.outcome());
        assertEquals("OK", event.statusCode());
        assertEquals(0L, event.signalItems());
    }

    @Test
    void shouldNotPublishRealtimeSignalsWhenLogsForwardingFails() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        ExportLogsServiceRequest enrichedRequest = ExportLogsServiceRequest.newBuilder().build();
        when(otlpCorrelationEnricher.enrichLogs(eq(request), eq(OtlpCorrelationContext.empty())))
                .thenReturn(enrichedRequest);
        when(greptimeOtlpForwarder.forwardLogsGrpc(enrichedRequest))
                .thenThrow(io.grpc.Status.UNAVAILABLE.withDescription("greptime down").asRuntimeException());

        assertThrows(StatusRuntimeException.class, () -> service.ingestLogsGrpc(request));

        verify(otlpLogProtocolAdapter, org.mockito.Mockito.never()).publishRealtimeSignals(any());
    }

    @Test
    void logsGrpcNullForwardResponseThrowsUnavailableAndRecordsRejectedAudit() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        ExportLogsServiceRequest enrichedRequest = ExportLogsServiceRequest.newBuilder().build();
        when(otlpCorrelationEnricher.enrichLogs(eq(request), eq(OtlpCorrelationContext.empty())))
                .thenReturn(enrichedRequest);
        when(greptimeOtlpForwarder.forwardLogsGrpc(enrichedRequest)).thenReturn(null);

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> service.ingestLogsGrpc(request));

        assertEquals(io.grpc.Status.Code.UNAVAILABLE, io.grpc.Status.fromThrowable(exception).getCode());
        assertEquals("OTLP backend returned no response.", io.grpc.Status.fromThrowable(exception).getDescription());
        verify(otlpLogProtocolAdapter, org.mockito.Mockito.never()).publishRealtimeSignals(any());
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("logs", event.signal());
        assertEquals("grpc", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("UNAVAILABLE", event.statusCode());
        assertEquals(0L, event.signalItems());
        assertEquals("OTLP backend returned no response.", event.reason());
    }

    @Test
    void logsGrpcMalformedBackendResponseDoesNotPublishRealtimeOrAcceptedAudit() {
        ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
        ExportLogsServiceRequest enrichedRequest = ExportLogsServiceRequest.newBuilder().build();
        when(otlpCorrelationEnricher.enrichLogs(eq(request), eq(OtlpCorrelationContext.empty())))
                .thenReturn(enrichedRequest);
        when(greptimeOtlpForwarder.forwardLogsGrpc(enrichedRequest))
                .thenReturn(new byte[]{0x0a});

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> service.ingestLogsGrpc(request));

        assertEquals(io.grpc.Status.Code.INTERNAL, io.grpc.Status.fromThrowable(exception).getCode());
        verify(otlpLogProtocolAdapter, org.mockito.Mockito.never()).publishRealtimeSignals(any());
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("logs", event.signal());
        assertEquals("grpc", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("INTERNAL", event.statusCode());
        assertEquals(0L, event.signalItems());
        assertEquals("OTLP logs response is malformed.", event.reason());
    }

    @Test
    void shouldPassAuthenticatedWorkspaceContextToLogsGrpcEnrichment() {
        AuthTokenRequestContext.bindWorkspaceId("prod-west");
        try {
            ExportLogsServiceRequest request = ExportLogsServiceRequest.getDefaultInstance();
            ExportLogsServiceRequest enrichedRequest = ExportLogsServiceRequest.newBuilder().build();
            when(otlpCorrelationEnricher.enrichLogs(eq(request),
                    org.mockito.ArgumentMatchers.argThat(context ->
                            context != null && "prod-west".equals(context.workspaceId()))))
                    .thenReturn(enrichedRequest);
            when(greptimeOtlpForwarder.forwardLogsGrpc(enrichedRequest))
                    .thenReturn(ExportLogsServiceResponse.getDefaultInstance().toByteArray());

            service.ingestLogsGrpc(request);

            verify(greptimeOtlpForwarder).forwardLogsGrpc(enrichedRequest);
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void logsGrpcResolveEntityIdBeforeForwardingAndRealtimePublication() {
        AuthTokenRequestContext.bindWorkspaceId("prod-west");
        try {
            when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(any(), any()))
                    .thenReturn(List.of(entityIdentity(42L, "service.name", "checkout", "checkout", 90, true)));
            when(workspaceQueryGateway.findEntitiesByIds(Set.of(42L)))
                    .thenReturn(Map.of(42L, observeEntity(42L, "prod-west")));
            when(otlpCorrelationEnricher.enrichLogs(any(ExportLogsServiceRequest.class),
                    any(OtlpCorrelationContext.class)))
                    .thenAnswer(invocation -> realCorrelationEnricher.enrichLogs(
                            invocation.getArgument(0), invocation.getArgument(1)));
            ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
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
                    .build();
            when(greptimeOtlpForwarder.forwardLogsGrpc(any(ExportLogsServiceRequest.class)))
                    .thenReturn(ExportLogsServiceResponse.getDefaultInstance().toByteArray());

            service.ingestLogsGrpc(request);

            verify(greptimeOtlpForwarder).forwardLogsGrpc(org.mockito.ArgumentMatchers.argThat(forwarded ->
                    "42".equals(logResourceAttributes(forwarded).get("hertzbeat.entity_id"))
                            && "service".equals(logResourceAttributes(forwarded).get("hertzbeat.entity_type"))
                            && "checkout".equals(logResourceAttributes(forwarded).get("hertzbeat.entity_name"))
                            && "prod-west".equals(logResourceAttributes(forwarded).get("hertzbeat.workspace_id"))));
            verify(otlpLogProtocolAdapter).publishRealtimeSignals(org.mockito.ArgumentMatchers.argThat(published ->
                    "42".equals(logResourceAttributes(published).get("hertzbeat.entity_id"))
                            && "service".equals(logResourceAttributes(published).get("hertzbeat.entity_type"))
                            && "checkout".equals(logResourceAttributes(published).get("hertzbeat.entity_name"))
                            && "prod-west".equals(logResourceAttributes(published).get("hertzbeat.workspace_id"))));
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void shouldRedactSensitiveLogsBeforeForwardingAndRealtimePublication() {
        when(otlpCorrelationEnricher.enrichLogs(any(ExportLogsServiceRequest.class),
                any(OtlpCorrelationContext.class)))
                .thenAnswer(invocation -> realCorrelationEnricher.enrichLogs(
                        invocation.getArgument(0), invocation.getArgument(1)));
        ExportLogsServiceRequest request = ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("cloud.auth.token")
                                        .setValue(AnyValue.newBuilder().setStringValue("resource-token").build())
                                        .build())
                                .build())
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .setScope(io.opentelemetry.proto.common.v1.InstrumentationScope.newBuilder()
                                        .setName("checkout-logger")
                                        .addAttributes(KeyValue.newBuilder()
                                                .setKey("client_secret")
                                                .setValue(AnyValue.newBuilder().setStringValue("scope-secret").build())
                                                .build())
                                        .build())
                                .addLogRecords(LogRecord.newBuilder()
                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setBody(AnyValue.newBuilder()
                                                .setStringValue("failed login password=hunter2 token=abc123")
                                                .build())
                                        .addAttributes(KeyValue.newBuilder()
                                                .setKey("http.request.header.authorization")
                                                .setValue(AnyValue.newBuilder()
                                                        .setStringValue("Bearer live-token")
                                                        .build())
                                                .build())
                                        .addAttributes(KeyValue.newBuilder()
                                                .setKey("message")
                                                .setValue(AnyValue.newBuilder()
                                                        .setStringValue("token=nested-token")
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimeOtlpForwarder.forwardLogsGrpc(any(ExportLogsServiceRequest.class)))
                .thenReturn(ExportLogsServiceResponse.getDefaultInstance().toByteArray());

        service.ingestLogsGrpc(request);

        verify(greptimeOtlpForwarder).forwardLogsGrpc(org.mockito.ArgumentMatchers.argThat(this::logRequestRedacted));
        verify(otlpLogProtocolAdapter).publishRealtimeSignals(
                org.mockito.ArgumentMatchers.argThat(this::logRequestRedacted));
    }

    @Test
    void shouldApplyAuthenticatedWorkspaceToMetricIntakeResourceAttributes() {
        AuthTokenRequestContext.bindWorkspaceId("prod-west");
        try {
            ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                    .addResourceMetrics(ResourceMetrics.newBuilder()
                            .setResource(Resource.newBuilder()
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("service.name")
                                            .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                            .build())
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("hertzbeat.workspace_id")
                                            .setValue(AnyValue.newBuilder().setStringValue("spoofed").build())
                                            .build())
                                    .build())
                            .addScopeMetrics(ScopeMetrics.newBuilder()
                                    .addMetrics(Metric.newBuilder()
                                            .setName("checkout.requests")
                                            .setGauge(Gauge.newBuilder()
                                                    .addDataPoints(NumberDataPoint.newBuilder()
                                                            .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                            .setAsDouble(1.0)
                                                            .build())
                                                    .build())
                                            .build())
                                    .build())
                            .build())
                    .build();
            when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
            when(greptimeProperties.enabled()).thenReturn(true);
            when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
            when(greptimeProperties.database()).thenReturn("public");
            when(restTemplate.exchange(
                    contains("/v1/otlp/v1/metrics"),
                    eq(HttpMethod.POST),
                    any(HttpEntity.class),
                    eq(byte[].class)))
                    .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                            headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

            service.ingestMetricsGrpc(request);

            verify(observabilitySignalIntakeGateway).recordOtlpMetricIntake(
                    org.mockito.ArgumentMatchers.argThat(attributes ->
                            "checkout".equals(attributes.get("service.name"))
                                    && "prod-west".equals(attributes.get("hertzbeat.workspace_id"))),
                    eq(1_710_000_000_000L),
                    eq("checkout.requests"),
                    eq("gauge"),
                    eq(null),
                    eq(1.0),
                    org.mockito.ArgumentMatchers.anyMap());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void shouldApplyAuthenticatedWorkspaceToForwardedMetricResourceAttributes() {
        AuthTokenRequestContext.bindWorkspaceId("prod-west");
        try {
            ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                    .addResourceMetrics(ResourceMetrics.newBuilder()
                            .setResource(Resource.newBuilder()
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("service.name")
                                            .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                            .build())
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("hertzbeat.workspace_id")
                                            .setValue(AnyValue.newBuilder().setStringValue("spoofed").build())
                                            .build())
                                    .build())
                            .addScopeMetrics(ScopeMetrics.newBuilder()
                                    .addMetrics(Metric.newBuilder()
                                            .setName("checkout.requests")
                                            .setGauge(Gauge.newBuilder()
                                                    .addDataPoints(NumberDataPoint.newBuilder()
                                                            .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                            .setAsDouble(1.0)
                                                            .build())
                                                    .build())
                                            .build())
                                    .build())
                            .build())
                    .build();
            when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
            when(greptimeProperties.enabled()).thenReturn(true);
            when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
            when(greptimeProperties.database()).thenReturn("public");
            when(restTemplate.exchange(
                    contains("/v1/otlp/v1/metrics"),
                    eq(HttpMethod.POST),
                    any(HttpEntity.class),
                    eq(byte[].class)))
                    .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                            headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

            service.ingestMetricsGrpc(request);

            verify(restTemplate).exchange(
                    contains("/v1/otlp/v1/metrics"),
                    eq(HttpMethod.POST),
                    org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                        try {
                            ExportMetricsServiceRequest forwarded =
                                    ExportMetricsServiceRequest.parseFrom(entity.getBody());
                            return forwarded.getResourceMetrics(0).getResource().getAttributesList().stream()
                                    .anyMatch(attribute -> OtlpResourceSemanticAttributes.HERTZBEAT_WORKSPACE_ID
                                            .equals(attribute.getKey())
                                            && attribute.hasValue()
                                            && "prod-west".equals(attribute.getValue().getStringValue()));
                        } catch (Exception ex) {
                            return false;
                        }
                    }),
                    eq(byte[].class));
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void shouldApplyAuthenticatedWorkspaceToForwardedTraceResourceAttributes() {
        AuthTokenRequestContext.bindWorkspaceId("prod-west");
        try {
            ExportTraceServiceRequest request = ExportTraceServiceRequest.newBuilder()
                    .addResourceSpans(ResourceSpans.newBuilder()
                            .setResource(Resource.newBuilder()
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("service.name")
                                            .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                            .build())
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("hertzbeat.entity_id")
                                            .setValue(AnyValue.newBuilder().setStringValue("upstream-entity").build())
                                            .build())
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("hertzbeat.workspace_id")
                                            .setValue(AnyValue.newBuilder().setStringValue("spoofed").build())
                                            .build())
                                    .build())
                            .addScopeSpans(ScopeSpans.newBuilder()
                                    .addSpans(Span.newBuilder()
                                            .setTraceId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                    .parseHex("1234567890abcdef1234567890abcdef")))
                                            .setSpanId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                    .parseHex("1234567890abcdef")))
                                            .setName("checkout")
                                            .setStartTimeUnixNano(1_710_000_000_000_000_000L)
                                            .setEndTimeUnixNano(1_710_000_001_000_000_000L)
                                            .build())
                                    .build())
                            .build())
                    .build();
            when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
            when(greptimeProperties.enabled()).thenReturn(true);
            when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
            when(greptimeProperties.database()).thenReturn("public");
            doReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                    headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                    .when(restTemplate)
                    .exchange(contains("/v1/otlp/v1/traces"),
                            eq(HttpMethod.POST),
                            any(HttpEntity.class),
                            eq(byte[].class));

            service.ingestTracesGrpc(request);

            verify(restTemplate).exchange(
                    contains("/v1/otlp/v1/traces"),
                    eq(HttpMethod.POST),
                    org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                        try {
                            ExportTraceServiceRequest forwarded = ExportTraceServiceRequest.parseFrom(entity.getBody());
                            java.util.Map<String, String> attributes = forwarded.getResourceSpans(0)
                                    .getResource()
                                    .getAttributesList()
                                    .stream()
                                    .filter(attribute -> attribute.hasValue()
                                            && attribute.getValue().getValueCase()
                                            == AnyValue.ValueCase.STRING_VALUE)
                                    .collect(java.util.stream.Collectors.toMap(
                                            KeyValue::getKey,
                                            attribute -> attribute.getValue().getStringValue(),
                                            (left, right) -> right));
                            return "upstream-entity".equals(attributes.get("hertzbeat.entity_id"))
                                    && "prod-west".equals(attributes.get("hertzbeat.workspace_id"));
                        } catch (Exception ex) {
                            return false;
                        }
                    }),
                    eq(byte[].class));
            verify(observabilitySignalIntakeGateway).recordOtlpTraceIntake(
                    org.mockito.ArgumentMatchers.argThat(resource ->
                            "upstream-entity".equals(resource.get("hertzbeat.entity_id"))
                                    && "prod-west".equals(resource.get("hertzbeat.workspace_id"))),
                    eq(1_710_000_000_000L),
                    eq("1234567890abcdef1234567890abcdef"),
                    eq("1234567890abcdef"),
                    eq("checkout"),
                    eq("status_code_unset"),
                    org.mockito.ArgumentMatchers.anyMap());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void tracesGrpcMalformedBackendResponseDoesNotRecordReadModelOrAcceptedAudit() {
        ExportTraceServiceRequest request = ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeSpans(ScopeSpans.newBuilder()
                                .addSpans(Span.newBuilder()
                                        .setTraceId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef1234567890abcdef")))
                                        .setSpanId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef")))
                                        .setName("GET /checkout")
                                        .setStartTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setEndTimeUnixNano(1_710_000_001_000_000_000L)
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        doReturn(new ResponseEntity<>(new byte[]{0x0a},
                headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                .when(restTemplate)
                .exchange(contains("/v1/otlp/v1/traces"),
                        eq(HttpMethod.POST),
                        any(HttpEntity.class),
                        eq(byte[].class));

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> service.ingestTracesGrpc(request));

        assertEquals(io.grpc.Status.Code.INTERNAL, io.grpc.Status.fromThrowable(exception).getCode());
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpTraceIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyMap());
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("traces", event.signal());
        assertEquals("grpc", event.protocol());
        assertEquals("rejected", event.outcome());
        assertEquals("INTERNAL", event.statusCode());
        assertEquals(1L, event.signalItems());
        assertEquals("OTLP trace response is malformed.", event.reason());
    }

    @Test
    void tracesGrpcWithMissingTraceIdentifiersStillForwardsButSkipsReadModelIntake() {
        ExportTraceServiceRequest request = ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeSpans(ScopeSpans.newBuilder()
                                .addSpans(Span.newBuilder()
                                        .setName("missing-identifiers")
                                        .setStartTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setEndTimeUnixNano(1_710_000_001_000_000_000L)
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        doReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                .when(restTemplate)
                .exchange(contains("/v1/otlp/v1/traces"),
                        eq(HttpMethod.POST),
                        any(HttpEntity.class),
                        eq(byte[].class));

        service.ingestTracesGrpc(request);

        verify(restTemplate).exchange(contains("/v1/otlp/v1/traces"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpTraceIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyMap());
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("traces", event.signal());
        assertEquals("grpc", event.protocol());
        assertEquals("accepted", event.outcome());
        assertEquals(1L, event.signalItems());
    }

    @Test
    void tracesGrpcWithAllZeroTraceIdentifiersStillForwardsButSkipsReadModelIntake() {
        ExportTraceServiceRequest request = ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeSpans(ScopeSpans.newBuilder()
                                .addSpans(Span.newBuilder()
                                        .setTraceId(com.google.protobuf.ByteString.copyFrom(new byte[16]))
                                        .setSpanId(com.google.protobuf.ByteString.copyFrom(new byte[8]))
                                        .setName("zero-identifiers")
                                        .setStartTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setEndTimeUnixNano(1_710_000_001_000_000_000L)
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        doReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                .when(restTemplate)
                .exchange(contains("/v1/otlp/v1/traces"),
                        eq(HttpMethod.POST),
                        any(HttpEntity.class),
                        eq(byte[].class));

        service.ingestTracesGrpc(request);

        verify(restTemplate).exchange(contains("/v1/otlp/v1/traces"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway, org.mockito.Mockito.never()).recordOtlpTraceIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyMap());
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("traces", event.signal());
        assertEquals("grpc", event.protocol());
        assertEquals("accepted", event.outcome());
        assertEquals(1L, event.signalItems());
    }

    @Test
    void shouldResolveEntityIdFromMetricResourceIdentityBeforeForwardingAndReadModelIntake() {
        AuthTokenRequestContext.bindWorkspaceId("prod-west");
        try {
            when(workspaceQueryGateway.findIdentitiesByKeysAndNormalizedValues(any(), any()))
                    .thenReturn(List.of(entityIdentity(42L, "service.name", "checkout", "checkout", 90, true)));
            when(workspaceQueryGateway.findEntitiesByIds(Set.of(42L)))
                    .thenReturn(Map.of(42L, observeEntity(42L, "prod-west")));
            ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                    .addResourceMetrics(ResourceMetrics.newBuilder()
                            .setResource(Resource.newBuilder()
                                    .addAttributes(KeyValue.newBuilder()
                                            .setKey("service.name")
                                            .setValue(AnyValue.newBuilder().setStringValue("Checkout").build())
                                            .build())
                                    .build())
                            .addScopeMetrics(ScopeMetrics.newBuilder()
                                    .addMetrics(Metric.newBuilder()
                                            .setName("checkout.requests")
                                            .setGauge(Gauge.newBuilder()
                                                    .addDataPoints(NumberDataPoint.newBuilder()
                                                            .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                            .setAsDouble(1.0)
                                                            .build())
                                                    .build())
                                            .build())
                                    .build())
                            .build())
                    .build();
            when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
            when(greptimeProperties.enabled()).thenReturn(true);
            when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
            when(greptimeProperties.database()).thenReturn("public");
            when(restTemplate.exchange(
                    contains("/v1/otlp/v1/metrics"),
                    eq(HttpMethod.POST),
                    any(HttpEntity.class),
                    eq(byte[].class)))
                    .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                            headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

            service.ingestMetricsGrpc(request);

            verify(restTemplate).exchange(
                    contains("/v1/otlp/v1/metrics"),
                    eq(HttpMethod.POST),
                    org.mockito.ArgumentMatchers.<HttpEntity<byte[]>>argThat(entity -> {
                        try {
                            ExportMetricsServiceRequest forwarded =
                                    ExportMetricsServiceRequest.parseFrom(entity.getBody());
                            Map<String, String> attributes = forwarded.getResourceMetrics(0)
                                    .getResource()
                                    .getAttributesList()
                                    .stream()
                                    .filter(attribute -> attribute.hasValue()
                                            && attribute.getValue().getValueCase()
                                            == AnyValue.ValueCase.STRING_VALUE)
                                    .collect(java.util.stream.Collectors.toMap(
                                            KeyValue::getKey,
                                            attribute -> attribute.getValue().getStringValue(),
                                            (left, right) -> right));
                            return "42".equals(attributes.get("hertzbeat.entity_id"))
                                    && "service".equals(attributes.get("hertzbeat.entity_type"))
                                    && "checkout".equals(attributes.get("hertzbeat.entity_name"))
                                    && "prod-west".equals(attributes.get("hertzbeat.workspace_id"));
                        } catch (Exception ex) {
                            return false;
                        }
                    }),
                    eq(byte[].class));
            verify(observabilitySignalIntakeGateway).recordOtlpMetricIntake(
                    org.mockito.ArgumentMatchers.argThat(resource ->
                            "42".equals(resource.get("hertzbeat.entity_id"))
                                    && "service".equals(resource.get("hertzbeat.entity_type"))
                                    && "checkout".equals(resource.get("hertzbeat.entity_name"))
                                    && "prod-west".equals(resource.get("hertzbeat.workspace_id"))),
                    eq(1_710_000_000_000L),
                    eq("checkout.requests"),
                    eq("gauge"),
                    eq(null),
                    eq(1.0),
                    org.mockito.ArgumentMatchers.anyMap());
        } finally {
            AuthTokenRequestContext.clear();
        }
    }

    @Test
    void shouldRedactSensitiveMetricAttributesBeforeForwardingAndReadModelIntake() throws Exception {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("cloud.auth.token")
                                        .setValue(AnyValue.newBuilder().setStringValue("resource-token").build())
                                        .build())
                                .build())
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("checkout.requests")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(1.0)
                                                        .addAttributes(KeyValue.newBuilder()
                                                                .setKey("http.request.header.authorization")
                                                                .setValue(AnyValue.newBuilder()
                                                                        .setStringValue("Bearer live-token")
                                                                        .build())
                                                                .build())
                                                        .addAttributes(KeyValue.newBuilder()
                                                                .setKey("user.id")
                                                                .setValue(AnyValue.newBuilder()
                                                                        .setStringValue("alice")
                                                                        .build())
                                                                .build())
                                                        .addExemplars(Exemplar.newBuilder()
                                                                .setTimeUnixNano(1_710_000_000_500_000_000L)
                                                                .setAsDouble(1.0)
                                                                .addFilteredAttributes(KeyValue.newBuilder()
                                                                        .setKey("api_key")
                                                                        .setValue(AnyValue.newBuilder()
                                                                                .setStringValue("metric-key")
                                                                                .build())
                                                                        .build())
                                                                .addFilteredAttributes(KeyValue.newBuilder()
                                                                        .setKey("message")
                                                                        .setValue(AnyValue.newBuilder()
                                                                                .setStringValue("token=exemplar-token")
                                                                                .build())
                                                                        .build())
                                                                .build())
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        service.ingestMetricsGrpc(request);

        verify(restTemplate).exchange(contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.argThat((HttpEntity<byte[]> entity) -> {
                    try {
                        ExportMetricsServiceRequest forwarded = ExportMetricsServiceRequest.parseFrom(entity.getBody());
                        ResourceMetrics metrics = forwarded.getResourceMetrics(0);
                        NumberDataPoint dataPoint = metrics.getScopeMetrics(0).getMetrics(0).getGauge()
                                .getDataPoints(0);
                        return "[REDACTED]".equals(metrics.getResource().getAttributes(1).getValue().getStringValue())
                                && "[REDACTED]".equals(dataPoint.getAttributes(0).getValue().getStringValue())
                                && "alice".equals(dataPoint.getAttributes(1).getValue().getStringValue())
                                && "[REDACTED]".equals(dataPoint.getExemplars(0).getFilteredAttributes(0)
                                        .getValue().getStringValue())
                                && "token=[REDACTED]".equals(dataPoint.getExemplars(0).getFilteredAttributes(1)
                                        .getValue().getStringValue())
                                && !forwarded.toString().contains("resource-token")
                                && !forwarded.toString().contains("live-token")
                                && !forwarded.toString().contains("metric-key")
                                && !forwarded.toString().contains("exemplar-token");
                    } catch (Exception ex) {
                        return false;
                    }
                }),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.argThat(resource ->
                        "checkout".equals(resource.get("service.name"))
                                && "[REDACTED]".equals(resource.get("cloud.auth.token"))
                                && !resource.toString().contains("resource-token")),
                eq(1_710_000_000_000L),
                eq("checkout.requests"),
                eq("gauge"),
                eq(null),
                eq(1.0),
                org.mockito.ArgumentMatchers.argThat(attributes ->
                        "[REDACTED]".equals(attributes.get("http.request.header.authorization"))
                                && "alice".equals(attributes.get("user.id"))
                                && !attributes.toString().contains("live-token")));
    }

    @Test
    void shouldFailTraceGrpcWhenBackendUnavailable() {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(null);

        assertThrows(StatusRuntimeException.class,
                () -> service.ingestTracesGrpc(ExportTraceServiceRequest.getDefaultInstance()));
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldConvertJsonTracePayloadToProtobufForHttpProxy() throws Exception {
        String jsonPayload = """
                {
                  "resourceSpans": [
                    {
                      "resource": {
                        "attributes": [
                          {
                            "key": "service.name",
                            "value": {
                              "stringValue": "local-otlp-service"
                            }
                          }
                        ]
                      },
                      "scopeSpans": [
                        {
                          "spans": [
                            {
                              "traceId": "1234567890abcdef1234567890abcdef",
                              "spanId": "1234567890abcdef",
                              "name": "local-span",
                              "startTimeUnixNano": "1710000000000000000",
                              "endTimeUnixNano": "1710000000100000000",
                              "status": {
                                "code": 2
                              }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.APPLICATION_JSON);
        requestHeaders.setAccept(List.of(MediaType.APPLICATION_JSON));

        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        doReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                .when(restTemplate)
                .exchange(contains("/v1/otlp/v1/traces"),
                        eq(HttpMethod.POST),
                        any(HttpEntity.class),
                        eq(byte[].class));

        ResponseEntity<byte[]> response = service.ingestTracesHttp(jsonPayload.getBytes(StandardCharsets.UTF_8), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.APPLICATION_JSON, response.getHeaders().getContentType());
        assertEquals("{}", new String(response.getBody(), StandardCharsets.UTF_8).replaceAll("\\s+", ""));
        verify(restTemplate).exchange(contains("/v1/otlp/v1/traces"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.argThat((HttpEntity<byte[]> entity) -> {
                    try {
                        assertEquals(MediaType.parseMediaType("application/x-protobuf"), entity.getHeaders().getContentType());
                        ExportTraceServiceRequest forwarded = ExportTraceServiceRequest.parseFrom(entity.getBody());
                        return forwarded.getResourceSpansCount() == 1
                                && forwarded.getResourceSpans(0).getScopeSpans(0).getSpans(0).getName().equals("local-span")
                                && forwarded.getResourceSpans(0).getScopeSpans(0).getSpans(0).getTraceId().size() == 16
                                && forwarded.getResourceSpans(0).getScopeSpans(0).getSpans(0).getSpanId().size() == 8;
                    } catch (Exception ex) {
                        return false;
                    }
                }),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway).recordOtlpTraceIntake(
                org.mockito.ArgumentMatchers.argThat(resource -> "local-otlp-service".equals(resource.get("service.name"))),
                eq(1_710_000_000_000L),
                eq("1234567890abcdef1234567890abcdef"),
                eq("1234567890abcdef"),
                eq("local-span"),
                eq("status_code_error"),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void tracesHttpJsonClientWithEqualQualityAcceptPreservesJsonResponse() throws Exception {
        String jsonPayload = """
                {
                  "resourceSpans": [
                    {
                      "resource": {
                        "attributes": [
                          {
                            "key": "service.name",
                            "value": {
                              "stringValue": "local-otlp-service"
                            }
                          }
                        ]
                      },
                      "scopeSpans": [
                        {
                          "spans": [
                            {
                              "traceId": "1234567890abcdef1234567890abcdef",
                              "spanId": "1234567890abcdef",
                              "name": "equal-accept-json-trace",
                              "startTimeUnixNano": "1710000000000000000",
                              "endTimeUnixNano": "1710000000100000000",
                              "status": {
                                "code": 2
                              }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.APPLICATION_JSON);
        requestHeaders.setAccept(List.of(
                MediaType.parseMediaType("application/x-protobuf;q=1.0"),
                MediaType.parseMediaType("application/json;q=1.0")));

        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        doReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                .when(restTemplate)
                .exchange(contains("/v1/otlp/v1/traces"),
                        eq(HttpMethod.POST),
                        any(HttpEntity.class),
                        eq(byte[].class));

        ResponseEntity<byte[]> response = service.ingestTracesHttp(
                jsonPayload.getBytes(StandardCharsets.UTF_8), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.APPLICATION_JSON, response.getHeaders().getContentType());
        assertEquals("{}", new String(response.getBody(), StandardCharsets.UTF_8).replaceAll("\\s+", ""));
        verify(observabilitySignalIntakeGateway).recordOtlpTraceIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_000_000L),
                eq("1234567890abcdef1234567890abcdef"),
                eq("1234567890abcdef"),
                eq("equal-accept-json-trace"),
                eq("status_code_error"),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void tracesHttpJsonClientWithJsonRejectedAndWildcardAcceptUsesProtobufResponse() throws Exception {
        String jsonPayload = """
                {
                  "resourceSpans": [
                    {
                      "resource": {
                        "attributes": [
                          {
                            "key": "service.name",
                            "value": {
                              "stringValue": "local-otlp-service"
                            }
                          }
                        ]
                      },
                      "scopeSpans": [
                        {
                          "spans": [
                            {
                              "traceId": "1234567890abcdef1234567890abcdef",
                              "spanId": "1234567890abcdef",
                              "name": "wildcard-protobuf-fallback-trace",
                              "startTimeUnixNano": "1710000000000000000",
                              "endTimeUnixNano": "1710000000100000000"
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.APPLICATION_JSON);
        requestHeaders.setAccept(List.of(
                MediaType.parseMediaType("application/json;q=0"),
                MediaType.parseMediaType("*/*;q=1.0")));

        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        doReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                .when(restTemplate)
                .exchange(contains("/v1/otlp/v1/traces"),
                        eq(HttpMethod.POST),
                        any(HttpEntity.class),
                        eq(byte[].class));

        ResponseEntity<byte[]> response = service.ingestTracesHttp(
                jsonPayload.getBytes(StandardCharsets.UTF_8), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.parseMediaType("application/x-protobuf"), response.getHeaders().getContentType());
        assertEquals(ExportTraceServiceResponse.getDefaultInstance(),
                ExportTraceServiceResponse.parseFrom(response.getBody()));
        verify(observabilitySignalIntakeGateway).recordOtlpTraceIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_000_000L),
                eq("1234567890abcdef1234567890abcdef"),
                eq("1234567890abcdef"),
                eq("wildcard-protobuf-fallback-trace"),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void tracesHttpProtobufClientWithWildcardAcceptKeepsProtobufResponse() throws Exception {
        ExportTraceServiceRequest request = ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .addScopeSpans(ScopeSpans.newBuilder()
                                .addSpans(Span.newBuilder()
                                        .setTraceId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef1234567890abcdef")))
                                        .setSpanId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef")))
                                        .setName("wildcard-accept-trace")
                                        .setStartTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setEndTimeUnixNano(1_710_000_001_000_000_000L)
                                        .build())
                                .build())
                        .build())
                .build();
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        requestHeaders.setAccept(List.of(MediaType.ALL));

        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        doReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                .when(restTemplate)
                .exchange(contains("/v1/otlp/v1/traces"),
                        eq(HttpMethod.POST),
                        any(HttpEntity.class),
                        eq(byte[].class));

        ResponseEntity<byte[]> response = service.ingestTracesHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.parseMediaType("application/x-protobuf"), response.getHeaders().getContentType());
        assertEquals(ExportTraceServiceResponse.getDefaultInstance(),
                ExportTraceServiceResponse.parseFrom(response.getBody()));
        verify(observabilitySignalIntakeGateway).recordOtlpTraceIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_000_000L),
                eq("1234567890abcdef1234567890abcdef"),
                eq("1234567890abcdef"),
                eq("wildcard-accept-trace"),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void tracesHttpReadModelFailureDoesNotFailAcceptedIngestionOrAudit() {
        ExportTraceServiceRequest request = ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeSpans(ScopeSpans.newBuilder()
                                .addSpans(Span.newBuilder()
                                        .setTraceId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef1234567890abcdef")))
                                        .setSpanId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef")))
                                        .setName("checkout-span")
                                        .setStartTimeUnixNano(1_710_000_000_000_000_000L)
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/traces"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));
        doThrow(new IllegalStateException("read model down"))
                .when(observabilitySignalIntakeGateway)
                .recordOtlpTraceIntake(
                        org.mockito.ArgumentMatchers.anyMap(),
                        org.mockito.ArgumentMatchers.anyLong(),
                        org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.anyMap());
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        ResponseEntity<byte[]> response = service.ingestTracesHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, auditService.recentEvents().size());
        OtlpIngestionAuditEvent event = auditService.recentEvents().getFirst();
        assertEquals("traces", event.signal());
        assertEquals("http", event.protocol());
        assertEquals("accepted", event.outcome());
        assertEquals("OK", event.statusCode());
        assertEquals(1L, event.signalItems());
    }

    @Test
    void tracesHttpProtobufClientPrefersHigherQualityProtobufAcceptOverJson() throws Exception {
        ExportTraceServiceRequest request = ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .addScopeSpans(ScopeSpans.newBuilder()
                                .addSpans(Span.newBuilder()
                                        .setTraceId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef1234567890abcdef")))
                                        .setSpanId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef")))
                                        .setName("weighted-accept-trace")
                                        .setStartTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setEndTimeUnixNano(1_710_000_001_000_000_000L)
                                        .build())
                                .build())
                        .build())
                .build();
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        requestHeaders.setAccept(List.of(
                MediaType.parseMediaType("application/json;q=0.1"),
                MediaType.parseMediaType("application/x-protobuf;q=1.0")));

        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        doReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                .when(restTemplate)
                .exchange(contains("/v1/otlp/v1/traces"),
                        eq(HttpMethod.POST),
                        any(HttpEntity.class),
                        eq(byte[].class));

        ResponseEntity<byte[]> response = service.ingestTracesHttp(request.toByteArray(), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.parseMediaType("application/x-protobuf"), response.getHeaders().getContentType());
        assertEquals(ExportTraceServiceResponse.getDefaultInstance(),
                ExportTraceServiceResponse.parseFrom(response.getBody()));
        verify(observabilitySignalIntakeGateway).recordOtlpTraceIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_000_000L),
                eq("1234567890abcdef1234567890abcdef"),
                eq("1234567890abcdef"),
                eq("weighted-accept-trace"),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void shouldCoerceNumericTraceAttributesToIntWhenProxyingTraceGrpc() throws Exception {
        ExportTraceServiceRequest request = ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("recommendation").build())
                                        .build())
                                .build())
                        .addScopeSpans(ScopeSpans.newBuilder()
                                .addSpans(Span.newBuilder()
                                        .setTraceId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef1234567890abcdef")))
                                        .setSpanId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef")))
                                        .setName("ListRecommendations")
                                        .setStartTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setEndTimeUnixNano(1_710_000_001_000_000_000L)
                                        .addAttributes(KeyValue.newBuilder()
                                                .setKey("net.peer.port")
                                                .setValue(AnyValue.newBuilder().setStringValue("9001").build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        doReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                .when(restTemplate)
                .exchange(contains("/v1/otlp/v1/traces"),
                        eq(HttpMethod.POST),
                        any(HttpEntity.class),
                        eq(byte[].class));

        service.ingestTracesGrpc(request);

        verify(restTemplate).exchange(contains("/v1/otlp/v1/traces"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.argThat((HttpEntity<byte[]> entity) -> {
                    try {
                        ExportTraceServiceRequest forwarded = ExportTraceServiceRequest.parseFrom(entity.getBody());
                        AnyValue forwardedPort = forwarded.getResourceSpans(0)
                                .getScopeSpans(0)
                                .getSpans(0)
                                .getAttributes(0)
                                .getValue();
                        return forwardedPort.getValueCase() == AnyValue.ValueCase.INT_VALUE
                                && forwardedPort.getIntValue() == 9001L;
                    } catch (Exception ex) {
                        return false;
                    }
                }),
                eq(byte[].class));
    }

    @Test
    void shouldAddGreptimeTraceModelHeadersWhenProxyingTraceGrpc() {
        ExportTraceServiceRequest request = ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .addScopeSpans(ScopeSpans.newBuilder()
                                .addSpans(Span.newBuilder()
                                        .setTraceId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef1234567890abcdef")))
                                        .setSpanId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef")))
                                        .setName("checkout")
                                        .setStartTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setEndTimeUnixNano(1_710_000_001_000_000_000L)
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        doReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                .when(restTemplate)
                .exchange(contains("/v1/otlp/v1/traces"),
                        eq(HttpMethod.POST),
                        any(HttpEntity.class),
                        eq(byte[].class));

        service.ingestTracesGrpc(request);

        verify(restTemplate).exchange(contains("/v1/otlp/v1/traces"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.argThat((HttpEntity<byte[]> entity) -> {
                    HttpHeaders headers = entity.getHeaders();
                    assertEquals("public", headers.getFirst("X-Greptime-DB-Name"));
                    assertEquals("hzb_traces", headers.getFirst(GREPTIME_TRACE_TABLE_NAME_HEADER));
                    assertEquals("greptime_trace_v1", headers.getFirst(GREPTIME_PIPELINE_NAME_HEADER));
                    assertEquals(MediaType.parseMediaType("application/x-protobuf"), headers.getContentType());
                    return true;
                }),
                eq(byte[].class));
    }

    @Test
    void shouldRedactSensitiveTraceAttributesBeforeForwardingAndReadModelIntake() throws Exception {
        ExportTraceServiceRequest request = ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("cloud.auth.token")
                                        .setValue(AnyValue.newBuilder().setStringValue("resource-token").build())
                                        .build())
                                .build())
                        .addScopeSpans(ScopeSpans.newBuilder()
                                .addSpans(Span.newBuilder()
                                        .setTraceId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef1234567890abcdef")))
                                        .setSpanId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef")))
                                        .setName("GET /callback token=abc123")
                                        .setStartTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setEndTimeUnixNano(1_710_000_001_000_000_000L)
                                        .setStatus(io.opentelemetry.proto.trace.v1.Status.newBuilder()
                                                .setCode(io.opentelemetry.proto.trace.v1.Status.StatusCode
                                                        .STATUS_CODE_ERROR)
                                                .setMessage("failed password=hunter2")
                                                .build())
                                        .addAttributes(KeyValue.newBuilder()
                                                .setKey("http.request.header.authorization")
                                                .setValue(AnyValue.newBuilder()
                                                        .setStringValue("Bearer live-token")
                                                        .build())
                                                .build())
                                        .addAttributes(KeyValue.newBuilder()
                                                .setKey("route")
                                                .setValue(AnyValue.newBuilder().setStringValue("/callback").build())
                                                .build())
                                        .addEvents(Span.Event.newBuilder()
                                                .setName("cache password=event-secret")
                                                .addAttributes(KeyValue.newBuilder()
                                                        .setKey("api_key")
                                                        .setValue(AnyValue.newBuilder()
                                                                .setStringValue("event-key")
                                                                .build())
                                                        .build())
                                                .addAttributes(KeyValue.newBuilder()
                                                        .setKey("message")
                                                        .setValue(AnyValue.newBuilder()
                                                                .setStringValue("authorization=Bearer event-token")
                                                                .build())
                                                        .build())
                                                .build())
                                        .addLinks(Span.Link.newBuilder()
                                                .setTraceId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                        .parseHex("fedcba0987654321fedcba0987654321")))
                                                .setSpanId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                        .parseHex("fedcba0987654321")))
                                                .addAttributes(KeyValue.newBuilder()
                                                        .setKey("client_secret")
                                                        .setValue(AnyValue.newBuilder()
                                                                .setStringValue("link-secret")
                                                                .build())
                                                        .build())
                                                .addAttributes(KeyValue.newBuilder()
                                                        .setKey("message")
                                                        .setValue(AnyValue.newBuilder()
                                                                .setStringValue("token=link-token")
                                                                .build())
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        doReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                .when(restTemplate)
                .exchange(contains("/v1/otlp/v1/traces"),
                        eq(HttpMethod.POST),
                        any(HttpEntity.class),
                        eq(byte[].class));

        service.ingestTracesGrpc(request);

        verify(restTemplate).exchange(contains("/v1/otlp/v1/traces"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.argThat((HttpEntity<byte[]> entity) -> {
                    try {
                        ExportTraceServiceRequest forwarded = ExportTraceServiceRequest.parseFrom(entity.getBody());
                        ResourceSpans resourceSpans = forwarded.getResourceSpans(0);
                        Span span = resourceSpans.getScopeSpans(0).getSpans(0);
                        return "[REDACTED]".equals(
                                resourceSpans.getResource().getAttributes(1).getValue().getStringValue())
                                && "GET /callback token=[REDACTED]".equals(span.getName())
                                && "failed password=[REDACTED]".equals(span.getStatus().getMessage())
                                && "[REDACTED]".equals(span.getAttributes(0).getValue().getStringValue())
                                && "/callback".equals(span.getAttributes(1).getValue().getStringValue())
                                && "cache password=[REDACTED]".equals(span.getEvents(0).getName())
                                && "[REDACTED]".equals(
                                        span.getEvents(0).getAttributes(0).getValue().getStringValue())
                                && "authorization=[REDACTED]".equals(
                                        span.getEvents(0).getAttributes(1).getValue().getStringValue())
                                && "[REDACTED]".equals(
                                        span.getLinks(0).getAttributes(0).getValue().getStringValue())
                                && "token=[REDACTED]".equals(
                                        span.getLinks(0).getAttributes(1).getValue().getStringValue())
                                && !forwarded.toString().contains("resource-token")
                                && !forwarded.toString().contains("live-token")
                                && !forwarded.toString().contains("abc123")
                                && !forwarded.toString().contains("hunter2")
                                && !forwarded.toString().contains("event-secret")
                                && !forwarded.toString().contains("event-key")
                                && !forwarded.toString().contains("event-token")
                                && !forwarded.toString().contains("link-secret")
                                && !forwarded.toString().contains("link-token");
                    } catch (Exception ex) {
                        return false;
                    }
                }),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway).recordOtlpTraceIntake(
                org.mockito.ArgumentMatchers.argThat(resource ->
                        "checkout".equals(resource.get("service.name"))
                                && "[REDACTED]".equals(resource.get("cloud.auth.token"))
                                && !resource.toString().contains("resource-token")),
                eq(1_710_000_000_000L),
                eq("1234567890abcdef1234567890abcdef"),
                eq("1234567890abcdef"),
                eq("GET /callback token=[REDACTED]"),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.argThat(attributes ->
                        "[REDACTED]".equals(attributes.get("http.request.header.authorization"))
                                && "/callback".equals(attributes.get("route"))
                                && !attributes.toString().contains("live-token")));
    }

    @Test
    void shouldEnrichTraceGrpcResourceCorrelationBeforeForwarding() throws Exception {
        ExportTraceServiceRequest request = ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("checkout").build())
                                        .build())
                                .build())
                        .addScopeSpans(ScopeSpans.newBuilder()
                                .addSpans(Span.newBuilder()
                                        .setTraceId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef1234567890abcdef")))
                                        .setSpanId(com.google.protobuf.ByteString.copyFrom(HexFormat.of()
                                                .parseHex("1234567890abcdef")))
                                        .setName("checkout")
                                        .setStartTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setEndTimeUnixNano(1_710_000_001_000_000_000L)
                                        .build())
                                .build())
                        .build())
                .build();
        ExportTraceServiceRequest enriched = request.toBuilder()
                .setResourceSpans(0, request.getResourceSpans(0).toBuilder()
                        .setResource(request.getResourceSpans(0).getResource().toBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("hertzbeat.entity_id")
                                        .setValue(AnyValue.newBuilder().setStringValue("entity-1").build())
                                        .build())
                                .build())
                        .build())
                .build();
        when(otlpCorrelationEnricher.enrichTraces(eq(request), eq(OtlpCorrelationContext.empty())))
                .thenReturn(enriched);
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        doReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                .when(restTemplate)
                .exchange(contains("/v1/otlp/v1/traces"),
                        eq(HttpMethod.POST),
                        any(HttpEntity.class),
                        eq(byte[].class));

        service.ingestTracesGrpc(request);

        verify(restTemplate).exchange(contains("/v1/otlp/v1/traces"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.argThat((HttpEntity<byte[]> entity) -> {
                    try {
                        ExportTraceServiceRequest forwarded = ExportTraceServiceRequest.parseFrom(entity.getBody());
                        return forwarded.getResourceSpans(0).getResource().getAttributesList().stream()
                                .anyMatch(attribute -> "hertzbeat.entity_id".equals(attribute.getKey())
                                        && "entity-1".equals(attribute.getValue().getStringValue()));
                    } catch (Exception ex) {
                        return false;
                    }
                }),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway).recordOtlpTraceIntake(
                org.mockito.ArgumentMatchers.argThat(attributes -> "entity-1".equals(attributes.get("hertzbeat.entity_id"))),
                eq(1_710_000_000_000L),
                eq("1234567890abcdef1234567890abcdef"),
                eq("1234567890abcdef"),
                eq("checkout"),
                eq("status_code_unset"),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void shouldCoerceNumericTraceAttributesToIntWhenProxyingTraceHttpJson() throws Exception {
        String jsonPayload = """
                {
                  "resourceSpans": [
                    {
                      "resource": {
                        "attributes": [
                          {
                            "key": "service.name",
                            "value": {
                              "stringValue": "recommendation"
                            }
                          }
                        ]
                      },
                      "scopeSpans": [
                        {
                          "spans": [
                            {
                              "traceId": "1234567890abcdef1234567890abcdef",
                              "spanId": "1234567890abcdef",
                              "name": "ListRecommendations",
                              "startTimeUnixNano": "1710000000000000000",
                              "endTimeUnixNano": "1710000000100000000",
                              "attributes": [
                                {
                                  "key": "net.peer.port",
                                  "value": {
                                    "stringValue": "9001"
                                  }
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.APPLICATION_JSON);
        requestHeaders.setAccept(List.of(MediaType.APPLICATION_JSON));
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        doReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                .when(restTemplate)
                .exchange(contains("/v1/otlp/v1/traces"),
                        eq(HttpMethod.POST),
                        any(HttpEntity.class),
                        eq(byte[].class));

        service.ingestTracesHttp(jsonPayload.getBytes(StandardCharsets.UTF_8), requestHeaders);

        verify(restTemplate).exchange(contains("/v1/otlp/v1/traces"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.argThat((HttpEntity<byte[]> entity) -> {
                    try {
                        ExportTraceServiceRequest forwarded = ExportTraceServiceRequest.parseFrom(entity.getBody());
                        AnyValue forwardedPort = forwarded.getResourceSpans(0)
                                .getScopeSpans(0)
                                .getSpans(0)
                                .getAttributes(0)
                                .getValue();
                        return forwardedPort.getValueCase() == AnyValue.ValueCase.INT_VALUE
                                && forwardedPort.getIntValue() == 9001L;
                    } catch (Exception ex) {
                        return false;
                    }
                }),
                eq(byte[].class));
    }

    @Test
    void shouldConvertJsonMetricPayloadToProtobufForHttpProxy() throws Exception {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder()
                                .addAttributes(KeyValue.newBuilder()
                                        .setKey("service.name")
                                        .setValue(AnyValue.newBuilder().setStringValue("local-otlp-service").build())
                                        .build())
                                .build())
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("local_otlp_metric")
                                        .setUnit("1")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .addAttributes(KeyValue.newBuilder()
                                                                .setKey("instance")
                                                                .setValue(AnyValue.newBuilder().setStringValue("e2e").build())
                                                                .build())
                                                        .setAsDouble(42.5)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        String jsonPayload = JsonFormat.printer().print(request);
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.APPLICATION_JSON);
        requestHeaders.setAccept(List.of(MediaType.APPLICATION_JSON));

        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(jsonPayload.getBytes(StandardCharsets.UTF_8), requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(MediaType.APPLICATION_JSON, response.getHeaders().getContentType());
        assertEquals("{}", new String(response.getBody(), StandardCharsets.UTF_8).replaceAll("\\s+", ""));
        verify(restTemplate).exchange(contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.argThat((HttpEntity<byte[]> entity) -> {
                    try {
                        assertEquals(MediaType.parseMediaType("application/x-protobuf"), entity.getHeaders().getContentType());
                        ExportMetricsServiceRequest forwarded = ExportMetricsServiceRequest.parseFrom(entity.getBody());
                        return forwarded.getResourceMetricsCount() == 1
                                && forwarded.getResourceMetrics(0).getScopeMetrics(0).getMetrics(0).getName()
                                .equals("local_otlp_metric");
                    } catch (Exception ex) {
                        return false;
                    }
                }),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway).recordOtlpMetricIntake(org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_000_000L), eq("local_otlp_metric"), eq("gauge"), eq("1"),
                eq(42.5), org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void shouldDecodeGzipCompressedTracePayloadForHttpIngress() throws Exception {
        ExportTraceServiceRequest request = ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .addScopeSpans(ScopeSpans.newBuilder()
                                .addSpans(Span.newBuilder()
                                        .setTraceId(com.google.protobuf.ByteString.copyFromUtf8("1234567890abcdef"))
                                        .setSpanId(com.google.protobuf.ByteString.copyFromUtf8("12345678"))
                                        .setName("gzip-trace")
                                        .setStartTimeUnixNano(1_710_000_000_000_000_000L)
                                        .setEndTimeUnixNano(1_710_000_001_000_000_000L)
                                        .build())
                                .build())
                        .build())
                .build();
        byte[] compressed = gzip(request.toByteArray());
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        requestHeaders.add(HttpHeaders.CONTENT_ENCODING, "gzip");
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        doReturn(new ResponseEntity<>(ExportTraceServiceResponse.getDefaultInstance().toByteArray(),
                headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK))
                .when(restTemplate)
                .exchange(contains("/v1/otlp/v1/traces"), eq(HttpMethod.POST), any(HttpEntity.class), eq(byte[].class));

        ResponseEntity<byte[]> response = service.ingestTracesHttp(compressed, requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(restTemplate).exchange(contains("/v1/otlp/v1/traces"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.argThat((HttpEntity<byte[]> entity) -> {
                    try {
                        ExportTraceServiceRequest forwarded = ExportTraceServiceRequest.parseFrom(entity.getBody());
                        return forwarded.getResourceSpans(0).getScopeSpans(0).getSpans(0).getName().equals("gzip-trace");
                    } catch (Exception ex) {
                        return false;
                    }
                }),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway).recordOtlpTraceIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_000_000L),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq("gzip-trace"),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void shouldDecodeGzipCompressedMetricPayloadForHttpIngress() throws Exception {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("gzip.metric")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(7.5)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        byte[] compressed = gzip(request.toByteArray());
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        requestHeaders.add(HttpHeaders.CONTENT_ENCODING, "gzip");
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(compressed, requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(restTemplate).exchange(contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.argThat((HttpEntity<byte[]> entity) -> {
                    try {
                        ExportMetricsServiceRequest forwarded = ExportMetricsServiceRequest.parseFrom(entity.getBody());
                        return forwarded.getResourceMetrics(0).getScopeMetrics(0).getMetrics(0).getName()
                                .equals("gzip.metric");
                    } catch (Exception ex) {
                        return false;
                    }
                }),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_000_000L),
                eq("gzip.metric"),
                eq("gauge"),
                eq(null),
                eq(7.5),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpGzipContentEncodingWithOptionalWhitespaceStillDecodesBeforeProxy() throws Exception {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("gzip.whitespace.metric")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(12.5)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        byte[] compressed = gzip(request.toByteArray());
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        requestHeaders.add(HttpHeaders.CONTENT_ENCODING, " gzip ");
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(compressed, requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(restTemplate).exchange(contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.argThat((HttpEntity<byte[]> entity) -> {
                    try {
                        ExportMetricsServiceRequest forwarded = ExportMetricsServiceRequest.parseFrom(entity.getBody());
                        return forwarded.getResourceMetrics(0).getScopeMetrics(0).getMetrics(0).getName()
                                .equals("gzip.whitespace.metric");
                    } catch (Exception ex) {
                        return false;
                    }
                }),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_000_000L),
                eq("gzip.whitespace.metric"),
                eq("gauge"),
                eq(null),
                eq(12.5),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpGzipContentEncodingWithBlankFirstValueStillDecodesBeforeProxy() throws Exception {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("gzip.multi-value.metric")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(18.5)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        byte[] compressed = gzip(request.toByteArray());
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        requestHeaders.add(HttpHeaders.CONTENT_ENCODING, " ");
        requestHeaders.add(HttpHeaders.CONTENT_ENCODING, "gzip");
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(compressed, requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(restTemplate).exchange(contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.argThat((HttpEntity<byte[]> entity) -> {
                    try {
                        ExportMetricsServiceRequest forwarded = ExportMetricsServiceRequest.parseFrom(entity.getBody());
                        return forwarded.getResourceMetrics(0).getScopeMetrics(0).getMetrics(0).getName()
                                .equals("gzip.multi-value.metric");
                    } catch (Exception ex) {
                        return false;
                    }
                }),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_000_000L),
                eq("gzip.multi-value.metric"),
                eq("gauge"),
                eq(null),
                eq(18.5),
                org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void metricsHttpGzipContentEncodingWithCommaSeparatedBlankValueStillDecodesBeforeProxy() throws Exception {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setName("gzip.comma.metric")
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setTimeUnixNano(1_710_000_000_000_000_000L)
                                                        .setAsDouble(21.5)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        byte[] compressed = gzip(request.toByteArray());
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        requestHeaders.add(HttpHeaders.CONTENT_ENCODING, " , gzip ");
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(true);
        when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000");
        when(greptimeProperties.database()).thenReturn("public");
        when(restTemplate.exchange(
                contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(byte[].class)))
                .thenReturn(new ResponseEntity<>(ExportMetricsServiceResponse.getDefaultInstance().toByteArray(),
                        headers(MediaType.parseMediaType("application/x-protobuf")), HttpStatus.OK));

        ResponseEntity<byte[]> response = service.ingestMetricsHttp(compressed, requestHeaders);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(restTemplate).exchange(contains("/v1/otlp/v1/metrics"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.argThat((HttpEntity<byte[]> entity) -> {
                    try {
                        ExportMetricsServiceRequest forwarded = ExportMetricsServiceRequest.parseFrom(entity.getBody());
                        return forwarded.getResourceMetrics(0).getScopeMetrics(0).getMetrics(0).getName()
                                .equals("gzip.comma.metric");
                    } catch (Exception ex) {
                        return false;
                    }
                }),
                eq(byte[].class));
        verify(observabilitySignalIntakeGateway).recordOtlpMetricIntake(
                org.mockito.ArgumentMatchers.anyMap(),
                eq(1_710_000_000_000L),
                eq("gzip.comma.metric"),
                eq("gauge"),
                eq(null),
                eq(21.5),
                org.mockito.ArgumentMatchers.anyMap());
    }

    private byte[] gzip(byte[] content) throws Exception {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        try (GZIPOutputStream gzipOutputStream = new GZIPOutputStream(outputStream)) {
            gzipOutputStream.write(content);
        }
        return outputStream.toByteArray();
    }

    private HttpHeaders headers(MediaType mediaType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(mediaType);
        return headers;
    }

    private HttpHeaders retryAfterHeaders(MediaType mediaType, String retryAfter) {
        HttpHeaders headers = headers(mediaType);
        headers.set(HttpHeaders.RETRY_AFTER, retryAfter);
        return headers;
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

    private Map<String, String> logResourceAttributes(ExportLogsServiceRequest request) {
        return request.getResourceLogs(0)
                .getResource()
                .getAttributesList()
                .stream()
                .filter(attribute -> attribute.hasValue()
                        && attribute.getValue().getValueCase() == AnyValue.ValueCase.STRING_VALUE)
                .collect(java.util.stream.Collectors.toMap(
                        KeyValue::getKey,
                        attribute -> attribute.getValue().getStringValue(),
                        (left, right) -> right));
    }

    private boolean logRequestRedacted(ExportLogsServiceRequest request) {
        try {
            ResourceLogs resourceLogs = request.getResourceLogs(0);
            ScopeLogs scopeLogs = resourceLogs.getScopeLogs(0);
            LogRecord logRecord = scopeLogs.getLogRecords(0);
            Map<String, String> resourceAttributes = stringAttributes(resourceLogs.getResource().getAttributesList());
            Map<String, String> scopeAttributes = stringAttributes(scopeLogs.getScope().getAttributesList());
            Map<String, String> logAttributes = stringAttributes(logRecord.getAttributesList());
            String rendered = request.toString();
            return "checkout".equals(resourceAttributes.get("service.name"))
                    && "[REDACTED]".equals(resourceAttributes.get("cloud.auth.token"))
                    && "[REDACTED]".equals(scopeAttributes.get("client_secret"))
                    && "failed login password=[REDACTED] token=[REDACTED]"
                            .equals(logRecord.getBody().getStringValue())
                    && "[REDACTED]".equals(logAttributes.get("http.request.header.authorization"))
                    && "token=[REDACTED]".equals(logAttributes.get("message"))
                    && !rendered.contains("resource-token")
                    && !rendered.contains("scope-secret")
                    && !rendered.contains("hunter2")
                    && !rendered.contains("abc123")
                    && !rendered.contains("live-token")
                    && !rendered.contains("nested-token");
        } catch (Exception ex) {
            return false;
        }
    }

    private Map<String, String> stringAttributes(List<KeyValue> attributes) {
        return attributes.stream()
                .filter(attribute -> attribute.hasValue()
                        && attribute.getValue().getValueCase() == AnyValue.ValueCase.STRING_VALUE)
                .collect(java.util.stream.Collectors.toMap(
                        KeyValue::getKey,
                        attribute -> attribute.getValue().getStringValue(),
                        (left, right) -> right));
    }
}
