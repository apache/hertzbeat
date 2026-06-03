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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.Message;
import com.google.protobuf.util.JsonFormat;
import io.grpc.StatusRuntimeException;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.ArrayValue;
import io.opentelemetry.proto.common.v1.InstrumentationScope;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.common.v1.KeyValueList;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse;
import io.opentelemetry.proto.logs.v1.LogRecord;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
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
import io.opentelemetry.proto.metrics.v1.Sum;
import io.opentelemetry.proto.metrics.v1.Summary;
import io.opentelemetry.proto.metrics.v1.SummaryDataPoint;
import io.opentelemetry.proto.trace.v1.ResourceSpans;
import io.opentelemetry.proto.trace.v1.ScopeSpans;
import io.opentelemetry.proto.trace.v1.Span;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.zip.GZIPInputStream;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.observability.gateway.ObservabilitySignalIntakeGateway;
import org.apache.hertzbeat.observability.ingestion.service.OtlpGrpcIngestionService;
import org.apache.hertzbeat.observability.ingestion.adapter.OtlpLogProtocolAdapter;
import org.apache.hertzbeat.observability.ingestion.audit.OtlpIngestionAuditService;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationContext;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationEnricher;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpEntityIdentityResolver;
import org.apache.hertzbeat.observability.ingestion.error.OtlpIngestionBackpressureHeaders;
import org.apache.hertzbeat.observability.ingestion.error.OtlpIngestionErrorResponseFactory;
import org.apache.hertzbeat.observability.ingestion.forwarder.GreptimeOtlpForwarder;
import org.apache.hertzbeat.observability.ingestion.governance.OtlpIngestionGovernanceService;
import org.apache.hertzbeat.observability.ingestion.quota.OtlpIngestionQuotaService;
import org.apache.hertzbeat.observability.ingestion.redaction.OtlpIngestionRedactionService;
import org.apache.hertzbeat.observability.ingestion.retry.OtlpIngestionRetryService;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.apache.hertzbeat.observability.ingestion.security.OtlpIngestionRequestContextResolver;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Unified OTLP ingestion implementation for HTTP and gRPC.
 */
@Slf4j
@Service
public class OtlpGrpcIngestionServiceImpl implements OtlpGrpcIngestionService {

    private static final String CONTENT_TYPE_PROTOBUF = "application/x-protobuf";
    private static final MediaType MEDIA_TYPE_PROTOBUF = MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF);
    private static final MediaType MEDIA_TYPE_PROTOBUF_ALT = MediaType.parseMediaType("application/protobuf");
    private static final String CONTENT_ENCODING = "Content-Encoding";
    private static final String CONTENT_ENCODING_GZIP = "gzip";
    private static final int GZIP_DECOMPRESSION_BUFFER_BYTES = 8192;
    private static final String GREPTIME_DB_NAME_HEADER = "X-Greptime-DB-Name";
    private static final String GREPTIME_OTLP_METRIC_PROMOTE_ALL_RESOURCE_ATTRS_HEADER =
            "X-Greptime-OTLP-Metric-Promote-All-Resource-Attrs";
    private static final String GREPTIME_OTLP_METRIC_PROMOTE_RESOURCE_ATTRS_HEADER =
            "X-Greptime-OTLP-Metric-Promote-Resource-Attrs";
    private static final String GREPTIME_OTLP_METRIC_PROMOTE_SCOPE_ATTRS_HEADER =
            "X-Greptime-OTLP-Metric-Promote-Scope-Attrs";
    private static final String GREPTIME_TRACE_TABLE_NAME_HEADER = "X-Greptime-Trace-Table-Name";
    private static final String GREPTIME_PIPELINE_NAME_HEADER = "X-Greptime-Pipeline-Name";
    private static final String DEFAULT_GREPTIME_DB_NAME = "public";
    private static final String DEFAULT_TRACES_TABLE_NAME = "hzb_traces";
    private static final String DEFAULT_TRACE_PIPELINE = "greptime_trace_v1";
    private static final String DEFAULT_METRIC_PROMOTED_RESOURCE_ATTRS =
            String.join(";", OtlpResourceSemanticAttributes.GREPTIME_METRIC_PROMOTED_RESOURCE_KEYS);
    private static final Set<String> OTLP_HEX_ID_FIELDS = Set.of("traceId", "spanId", "parentSpanId");
    private static final int OTLP_TRACE_ID_BYTES = 16;
    private static final int OTLP_SPAN_ID_BYTES = 8;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final String OTLP_METRIC_COMPATIBILITY = "otlp.metric.compatibility";
    private static final String OTLP_METRIC_COMPATIBILITY_REASON = "otlp.metric.compatibility.reason";
    private static final String OTLP_METRIC_GREPTIME_COMPATIBILITY = "otlp.metric.greptime.compatibility";
    private static final String OTLP_METRIC_GREPTIME_REASON = "otlp.metric.greptime.reason";
    private static final String OTLP_METRIC_FACADE_COMPATIBILITY = "otlp.metric.facade.compatibility";
    private static final String OTLP_METRIC_FACADE_REASON = "otlp.metric.facade.reason";
    private static final String OTLP_METRIC_AGGREGATION_TEMPORALITY = "otlp.metric.aggregation_temporality";
    private static final String OTLP_METRIC_MONOTONIC = "otlp.metric.monotonic";
    private static final String OTLP_METRIC_START_TIME_MILLIS = "otlp.metric.start_time_unix_millis";
    private static final String OTLP_METRIC_END_TIME_MILLIS = "otlp.metric.end_time_unix_millis";
    private static final String OTLP_METRIC_DATA_POINT_COUNT = "otlp.metric.data_point_count";
    private static final String OTLP_METRIC_HISTOGRAM_BUCKET_COUNTS = "otlp.metric.histogram.bucket_counts";
    private static final String OTLP_METRIC_HISTOGRAM_EXPLICIT_BOUNDS = "otlp.metric.histogram.explicit_bounds";
    private static final String OTLP_METRIC_HISTOGRAM_COUNT = "otlp.metric.histogram.count";
    private static final String OTLP_METRIC_HISTOGRAM_SUM = "otlp.metric.histogram.sum";
    private static final String OTLP_METRIC_SUMMARY_COUNT = "otlp.metric.summary.count";
    private static final String OTLP_METRIC_SUMMARY_SUM = "otlp.metric.summary.sum";
    private static final String OTLP_METRIC_SUMMARY_QUANTILES = "otlp.metric.summary.quantiles";
    private static final String OTLP_METRIC_EXP_SCALE = "otlp.metric.exponential_histogram.scale";
    private static final String OTLP_METRIC_EXP_ZERO_COUNT = "otlp.metric.exponential_histogram.zero_count";
    private static final String OTLP_METRIC_EXP_ZERO_THRESHOLD = "otlp.metric.exponential_histogram.zero_threshold";
    private static final String OTLP_METRIC_EXP_POSITIVE = "otlp.metric.exponential_histogram.positive";
    private static final String OTLP_METRIC_EXP_NEGATIVE = "otlp.metric.exponential_histogram.negative";
    private static final Set<String> TRACE_NUMERIC_ATTRIBUTE_KEYS = Set.of(
            "net.peer.port",
            "net.host.port",
            "network.peer.port",
            "network.local.port",
            "server.port",
            "client.port",
            "http.status_code",
            "http.response.status_code",
            "rpc.grpc.status_code"
    );

    private final RestTemplate restTemplate;
    private final ObjectProvider<GreptimeProperties> greptimePropertiesProvider;
    private final OtlpLogProtocolAdapter otlpLogProtocolAdapter;
    private final GreptimeOtlpForwarder greptimeOtlpForwarder;
    private final OtlpCorrelationEnricher otlpCorrelationEnricher;
    private final OtlpIngestionErrorResponseFactory errorResponseFactory;
    private final OtlpIngestionRequestContextResolver requestContextResolver;
    private final OtlpIngestionAuditService auditService;
    private final OtlpIngestionGovernanceService governanceService;
    private final OtlpIngestionQuotaService quotaService;
    private final ObservabilitySignalIntakeGateway observabilitySignalIntakeGateway;
    private final OtlpEntityIdentityResolver otlpEntityIdentityResolver;
    private final OtlpIngestionRedactionService redactionService = new OtlpIngestionRedactionService();
    private final OtlpIngestionRetryService retryService;

    public OtlpGrpcIngestionServiceImpl(RestTemplate restTemplate,
                                        ObjectProvider<GreptimeProperties> greptimePropertiesProvider,
                                        OtlpLogProtocolAdapter otlpLogProtocolAdapter,
                                        GreptimeOtlpForwarder greptimeOtlpForwarder,
                                        OtlpCorrelationEnricher otlpCorrelationEnricher,
                                        OtlpIngestionErrorResponseFactory errorResponseFactory,
                                        OtlpIngestionRequestContextResolver requestContextResolver,
                                        OtlpIngestionAuditService auditService,
                                        OtlpIngestionGovernanceService governanceService,
                                        OtlpIngestionQuotaService quotaService,
                                        @Qualifier("telemetryIntakeServiceImpl")
                                        ObservabilitySignalIntakeGateway observabilitySignalIntakeGateway,
                                        OtlpEntityIdentityResolver otlpEntityIdentityResolver) {
        this(restTemplate, greptimePropertiesProvider, otlpLogProtocolAdapter, greptimeOtlpForwarder,
                otlpCorrelationEnricher, errorResponseFactory, requestContextResolver, auditService, governanceService,
                quotaService, observabilitySignalIntakeGateway, otlpEntityIdentityResolver,
                new OtlpIngestionRetryService());
    }

    @Autowired
    public OtlpGrpcIngestionServiceImpl(RestTemplate restTemplate,
                                        ObjectProvider<GreptimeProperties> greptimePropertiesProvider,
                                        OtlpLogProtocolAdapter otlpLogProtocolAdapter,
                                        GreptimeOtlpForwarder greptimeOtlpForwarder,
                                        OtlpCorrelationEnricher otlpCorrelationEnricher,
                                        OtlpIngestionErrorResponseFactory errorResponseFactory,
                                        OtlpIngestionRequestContextResolver requestContextResolver,
                                        OtlpIngestionAuditService auditService,
                                        OtlpIngestionGovernanceService governanceService,
                                        OtlpIngestionQuotaService quotaService,
                                        @Qualifier("telemetryIntakeServiceImpl")
                                        ObservabilitySignalIntakeGateway observabilitySignalIntakeGateway,
                                        OtlpEntityIdentityResolver otlpEntityIdentityResolver,
                                        OtlpIngestionRetryService retryService) {
        this.restTemplate = restTemplate;
        this.greptimePropertiesProvider = greptimePropertiesProvider;
        this.otlpLogProtocolAdapter = otlpLogProtocolAdapter;
        this.greptimeOtlpForwarder = greptimeOtlpForwarder;
        this.otlpCorrelationEnricher = otlpCorrelationEnricher;
        this.errorResponseFactory = errorResponseFactory;
        this.requestContextResolver = requestContextResolver;
        this.auditService = auditService;
        this.governanceService = governanceService;
        this.quotaService = quotaService;
        this.observabilitySignalIntakeGateway = observabilitySignalIntakeGateway;
        this.otlpEntityIdentityResolver = otlpEntityIdentityResolver;
        this.retryService = retryService == null ? new OtlpIngestionRetryService() : retryService;
    }

    @Override
    public ResponseEntity<byte[]> ingestMetricsHttp(byte[] content, HttpHeaders requestHeaders) {
        long startedAtNanos = System.nanoTime();
        HttpHeaders safeRequestHeaders = safeHeaders(requestHeaders);
        byte[] safeContent = safeContent(content);
        MediaType contentType = safeRequestHeaders.getContentType();
        OtlpCorrelationContext correlationContext = requestContextResolver.currentCorrelationContext();
        long requestBytes = requestBytes(content);
        Long signalItems = null;
        try {
            quotaService.checkRequestBytes("metrics", "http", requestBytes);
            byte[] normalizedContent = normalizeHttpContentForQuota("metrics", "http", safeContent, safeRequestHeaders);
            ExportMetricsServiceRequest request = normalizeAndEnrichMetricRequest(
                    decodeMetricsRequest(normalizedContent, contentType), correlationContext);
            signalItems = quotaService.countMetricItems(request);
            quotaService.checkMetricItems("http", signalItems);
            OtlpIngestionGovernanceService.Decision governanceDecision =
                    governanceService.evaluateMetrics("http", request);
            if (governanceDecision.dropped()) {
                auditService.recordDropped("metrics", "http", correlationContext, requestBytes, signalItems,
                        governanceDecision.reason(), durationMillis(startedAtNanos));
                return emptySignalHttpSuccess(contentType, safeRequestHeaders.getAccept(), false);
            }
            ResponseEntity<byte[]> response = proxySignalHttp(
                    safeContent, safeRequestHeaders, "/v1/otlp/v1/metrics", false, correlationContext);
            if (response.getStatusCode().is2xxSuccessful()) {
                recordMetricIntake(request);
                auditService.recordAccepted("metrics", "http", correlationContext, requestBytes, signalItems,
                        durationMillis(startedAtNanos));
            }
            return response;
        } catch (StatusRuntimeException ex) {
            auditService.recordRejected("metrics", "http", correlationContext, requestBytes, ex, signalItems,
                    durationMillis(startedAtNanos));
            return errorResponseFactory.httpErrorResponse(contentType, safeRequestHeaders.getAccept(), ex);
        }
    }

    @Override
    public ResponseEntity<byte[]> ingestLogsHttp(byte[] content, HttpHeaders requestHeaders) {
        long startedAtNanos = System.nanoTime();
        HttpHeaders safeRequestHeaders = safeHeaders(requestHeaders);
        byte[] safeContent = safeContent(content);
        MediaType contentType = safeRequestHeaders.getContentType();
        OtlpCorrelationContext correlationContext = requestContextResolver.currentCorrelationContext();
        long requestBytes = requestBytes(content);
        Long signalItems = null;
        try {
            quotaService.checkRequestBytes("logs", "http", requestBytes);
            byte[] normalizedContent = normalizeHttpContentForQuota("logs", "http", safeContent, safeRequestHeaders);
            HttpHeaders normalizedHeaders = withoutContentEncoding(safeRequestHeaders);
            byte[] enrichedContent = otlpCorrelationEnricher.enrichLogsHttp(
                    normalizedContent, normalizedHeaders, correlationContext);
            ExportLogsServiceRequest enrichedRequest = ExportLogsServiceRequest.parseFrom(enrichedContent);
            ExportLogsServiceRequest resolvedRequest = otlpEntityIdentityResolver.enrichLogs(
                    enrichedRequest, correlationContext.workspaceId());
            ExportLogsServiceRequest redactedRequest = redactLogRequest(resolvedRequest);
            byte[] redactedContent = redactedRequest.toByteArray();
            signalItems = quotaService.countLogItems(redactedRequest);
            quotaService.checkLogItems("http", signalItems);
            OtlpIngestionGovernanceService.Decision governanceDecision =
                    governanceService.evaluateLogs("http", redactedRequest);
            if (governanceDecision.dropped()) {
                auditService.recordDropped("logs", "http", correlationContext, requestBytes, signalItems,
                        governanceDecision.reason(), durationMillis(startedAtNanos));
                return emptyLogsHttpSuccess(contentType, safeRequestHeaders.getAccept());
            }
            ResponseEntity<byte[]> forwardResponse = greptimeOtlpForwarder.forwardLogsProtobuf(redactedContent);
            if (forwardResponse == null) {
                throw io.grpc.Status.UNAVAILABLE.withDescription("OTLP backend returned no response.")
                        .asRuntimeException();
            }
            if (!forwardResponse.getStatusCode().is2xxSuccessful()) {
                throw backendStatusException(forwardResponse.getStatusCode(), forwardResponse.getHeaders());
            }
            ResponseEntity<byte[]> successResponse =
                    logsHttpSuccess(contentType, safeRequestHeaders.getAccept(), forwardResponse.getBody());
            publishRealtimeSignalsBestEffort(redactedRequest);
            auditService.recordAccepted("logs", "http", correlationContext, requestBytes, signalItems,
                    durationMillis(startedAtNanos));
            return successResponse;
        } catch (StatusRuntimeException ex) {
            auditService.recordRejected("logs", "http", correlationContext, requestBytes, ex, signalItems,
                    durationMillis(startedAtNanos));
            return errorResponseFactory.httpErrorResponse(contentType, safeRequestHeaders.getAccept(), ex);
        } catch (IllegalArgumentException ex) {
            auditService.recordRejected("logs", "http", correlationContext, requestBytes,
                    io.grpc.Status.Code.INVALID_ARGUMENT, defaultErrorMessage(ex), signalItems,
                    durationMillis(startedAtNanos));
            return errorResponseFactory.httpErrorResponse(
                    contentType, safeRequestHeaders.getAccept(), HttpStatus.BAD_REQUEST, defaultErrorMessage(ex));
        } catch (InvalidProtocolBufferException ex) {
            auditService.recordRejected("logs", "http", correlationContext, requestBytes,
                    io.grpc.Status.Code.INVALID_ARGUMENT, "Malformed OTLP logs payload.", signalItems,
                    durationMillis(startedAtNanos));
            return errorResponseFactory.httpErrorResponse(
                    contentType, safeRequestHeaders.getAccept(), HttpStatus.BAD_REQUEST,
                    "Malformed OTLP logs payload.");
        } catch (Exception ex) {
            log.error("Unexpected error ingesting OTLP HTTP logs: {}", ex.getMessage(), ex);
            auditService.recordRejected("logs", "http", correlationContext, requestBytes,
                    io.grpc.Status.Code.INTERNAL, defaultErrorMessage(ex), signalItems,
                    durationMillis(startedAtNanos));
            return errorResponseFactory.httpErrorResponse(
                    contentType, safeRequestHeaders.getAccept(), HttpStatus.INTERNAL_SERVER_ERROR,
                    defaultErrorMessage(ex));
        }
    }

    @Override
    public ResponseEntity<byte[]> ingestTracesHttp(byte[] content, HttpHeaders requestHeaders) {
        long startedAtNanos = System.nanoTime();
        HttpHeaders safeRequestHeaders = safeHeaders(requestHeaders);
        byte[] safeContent = safeContent(content);
        MediaType contentType = safeRequestHeaders.getContentType();
        OtlpCorrelationContext correlationContext = requestContextResolver.currentCorrelationContext();
        long requestBytes = requestBytes(content);
        Long signalItems = null;
        try {
            quotaService.checkRequestBytes("traces", "http", requestBytes);
            byte[] normalizedContent = normalizeHttpContentForQuota("traces", "http", safeContent, safeRequestHeaders);
            ExportTraceServiceRequest request = normalizeAndEnrichTraceRequest(
                    decodeTraceRequest(normalizedContent, contentType), correlationContext);
            signalItems = quotaService.countTraceItems(request);
            quotaService.checkTraceItems("http", signalItems);
            OtlpIngestionGovernanceService.Decision governanceDecision =
                    governanceService.evaluateTraces("http", request);
            if (governanceDecision.dropped()) {
                auditService.recordDropped("traces", "http", correlationContext, requestBytes, signalItems,
                        governanceDecision.reason(), durationMillis(startedAtNanos));
                return emptySignalHttpSuccess(contentType, safeRequestHeaders.getAccept(), true);
            }
            ResponseEntity<byte[]> response = proxySignalHttp(
                    safeContent, safeRequestHeaders, "/v1/otlp/v1/traces", true, correlationContext);
            if (response.getStatusCode().is2xxSuccessful()) {
                recordTraceIntake(request);
                auditService.recordAccepted("traces", "http", correlationContext, requestBytes, signalItems,
                        durationMillis(startedAtNanos));
            }
            return response;
        } catch (StatusRuntimeException ex) {
            auditService.recordRejected("traces", "http", correlationContext, requestBytes, ex, signalItems,
                    durationMillis(startedAtNanos));
            return errorResponseFactory.httpErrorResponse(contentType, safeRequestHeaders.getAccept(), ex);
        }
    }

    @Override
    public ExportMetricsServiceResponse ingestMetricsGrpc(ExportMetricsServiceRequest request) {
        long startedAtNanos = System.nanoTime();
        OtlpCorrelationContext correlationContext = requestContextResolver.currentCorrelationContext();
        long requestBytes = requestBytes(request);
        Long signalItems = null;
        try {
            quotaService.checkRequestBytes("metrics", "grpc", requestBytes);
            ExportMetricsServiceRequest redactedRequest = normalizeAndEnrichMetricRequest(request, correlationContext);
            signalItems = quotaService.countMetricItems(redactedRequest);
            quotaService.checkMetricItems("grpc", signalItems);
            OtlpIngestionGovernanceService.Decision governanceDecision =
                    governanceService.evaluateMetrics("grpc", redactedRequest);
            if (governanceDecision.dropped()) {
                auditService.recordDropped("metrics", "grpc", correlationContext, requestBytes, signalItems,
                        governanceDecision.reason(), durationMillis(startedAtNanos));
                return ExportMetricsServiceResponse.getDefaultInstance();
            }
            byte[] response = proxySignalBinary(redactedRequest.toByteArray(), "/v1/otlp/v1/metrics", false,
                    correlationContext);
            ExportMetricsServiceResponse parsedResponse = response.length == 0
                    ? ExportMetricsServiceResponse.getDefaultInstance()
                    : ExportMetricsServiceResponse.parseFrom(response);
            recordMetricIntake(redactedRequest);
            auditService.recordAccepted("metrics", "grpc", correlationContext, requestBytes, signalItems,
                    durationMillis(startedAtNanos));
            return parsedResponse;
        } catch (StatusRuntimeException ex) {
            auditService.recordRejected("metrics", "grpc", correlationContext, requestBytes, ex, signalItems,
                    durationMillis(startedAtNanos));
            throw ex;
        } catch (InvalidProtocolBufferException e) {
            auditService.recordRejected("metrics", "grpc", correlationContext, requestBytes,
                    io.grpc.Status.Code.INTERNAL, "OTLP metrics response is malformed.", signalItems,
                    durationMillis(startedAtNanos));
            throw io.grpc.Status.INTERNAL.withDescription("OTLP metrics response is malformed.").withCause(e)
                    .asRuntimeException();
        }
    }

    @Override
    public ExportLogsServiceResponse ingestLogsGrpc(ExportLogsServiceRequest request) {
        long startedAtNanos = System.nanoTime();
        OtlpCorrelationContext correlationContext = requestContextResolver.currentCorrelationContext();
        long requestBytes = requestBytes(request);
        Long signalItems = null;
        try {
            quotaService.checkRequestBytes("logs", "grpc", requestBytes);
            ExportLogsServiceRequest enrichedRequest = otlpCorrelationEnricher.enrichLogs(
                    request, correlationContext);
            ExportLogsServiceRequest resolvedRequest = otlpEntityIdentityResolver.enrichLogs(
                    enrichedRequest, correlationContext.workspaceId());
            ExportLogsServiceRequest redactedRequest = redactLogRequest(resolvedRequest);
            signalItems = quotaService.countLogItems(redactedRequest);
            quotaService.checkLogItems("grpc", signalItems);
            OtlpIngestionGovernanceService.Decision governanceDecision =
                    governanceService.evaluateLogs("grpc", redactedRequest);
            if (governanceDecision.dropped()) {
                auditService.recordDropped("logs", "grpc", correlationContext, requestBytes, signalItems,
                        governanceDecision.reason(), durationMillis(startedAtNanos));
                return ExportLogsServiceResponse.getDefaultInstance();
            }
            byte[] response = greptimeOtlpForwarder.forwardLogsGrpc(redactedRequest);
            if (response == null) {
                throw io.grpc.Status.UNAVAILABLE.withDescription("OTLP backend returned no response.")
                        .asRuntimeException();
            }
            ExportLogsServiceResponse parsedResponse = response.length == 0
                    ? ExportLogsServiceResponse.getDefaultInstance()
                    : ExportLogsServiceResponse.parseFrom(response);
            publishRealtimeSignalsBestEffort(redactedRequest);
            auditService.recordAccepted("logs", "grpc", correlationContext, requestBytes, signalItems,
                    durationMillis(startedAtNanos));
            return parsedResponse;
        } catch (StatusRuntimeException ex) {
            auditService.recordRejected("logs", "grpc", correlationContext, requestBytes, ex, signalItems,
                    durationMillis(startedAtNanos));
            throw ex;
        } catch (InvalidProtocolBufferException ex) {
            auditService.recordRejected("logs", "grpc", correlationContext, requestBytes,
                    io.grpc.Status.Code.INTERNAL, "OTLP logs response is malformed.", signalItems,
                    durationMillis(startedAtNanos));
            throw io.grpc.Status.INTERNAL.withDescription("OTLP logs response is malformed.").withCause(ex)
                    .asRuntimeException();
        } catch (IllegalArgumentException ex) {
            auditService.recordRejected("logs", "grpc", correlationContext, requestBytes,
                    io.grpc.Status.Code.INVALID_ARGUMENT, defaultErrorMessage(ex), signalItems,
                    durationMillis(startedAtNanos));
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription(defaultErrorMessage(ex)).withCause(ex)
                    .asRuntimeException();
        } catch (Exception ex) {
            auditService.recordRejected("logs", "grpc", correlationContext, requestBytes,
                    io.grpc.Status.Code.INTERNAL, defaultErrorMessage(ex), signalItems,
                    durationMillis(startedAtNanos));
            throw io.grpc.Status.INTERNAL.withDescription(defaultErrorMessage(ex)).withCause(ex)
                    .asRuntimeException();
        }
    }

    @Override
    public ExportTraceServiceResponse ingestTracesGrpc(ExportTraceServiceRequest request) {
        long startedAtNanos = System.nanoTime();
        OtlpCorrelationContext correlationContext = requestContextResolver.currentCorrelationContext();
        long requestBytes = requestBytes(request);
        Long signalItems = null;
        try {
            quotaService.checkRequestBytes("traces", "grpc", requestBytes);
            ExportTraceServiceRequest enrichedRequest = normalizeAndEnrichTraceRequest(request, correlationContext);
            signalItems = quotaService.countTraceItems(enrichedRequest);
            quotaService.checkTraceItems("grpc", signalItems);
            OtlpIngestionGovernanceService.Decision governanceDecision =
                    governanceService.evaluateTraces("grpc", enrichedRequest);
            if (governanceDecision.dropped()) {
                auditService.recordDropped("traces", "grpc", correlationContext, requestBytes, signalItems,
                        governanceDecision.reason(), durationMillis(startedAtNanos));
                return ExportTraceServiceResponse.getDefaultInstance();
            }
            byte[] response = proxySignalBinary(
                    enrichedRequest.toByteArray(), "/v1/otlp/v1/traces", true, correlationContext);
            ExportTraceServiceResponse parsedResponse = response.length == 0
                    ? ExportTraceServiceResponse.getDefaultInstance()
                    : ExportTraceServiceResponse.parseFrom(response);
            recordTraceIntake(enrichedRequest);
            auditService.recordAccepted("traces", "grpc", correlationContext, requestBytes, signalItems,
                    durationMillis(startedAtNanos));
            return parsedResponse;
        } catch (StatusRuntimeException ex) {
            auditService.recordRejected("traces", "grpc", correlationContext, requestBytes, ex, signalItems,
                    durationMillis(startedAtNanos));
            throw ex;
        } catch (InvalidProtocolBufferException e) {
            auditService.recordRejected("traces", "grpc", correlationContext, requestBytes,
                    io.grpc.Status.Code.INTERNAL, "OTLP trace response is malformed.", signalItems,
                    durationMillis(startedAtNanos));
            throw io.grpc.Status.INTERNAL.withDescription("OTLP trace response is malformed.").withCause(e)
                    .asRuntimeException();
        }
    }

    @Override
    public List<String> getGrpcSupportedSignals() {
        return List.of("metrics", "logs", "traces");
    }

    private ResponseEntity<byte[]> emptyLogsHttpSuccess(MediaType requestContentType, List<MediaType> acceptTypes) {
        return logsHttpSuccess(requestContentType, acceptTypes,
                ExportLogsServiceResponse.getDefaultInstance().toByteArray());
    }

    private ResponseEntity<byte[]> logsHttpSuccess(MediaType requestContentType, List<MediaType> acceptTypes,
                                                   byte[] upstreamBody) {
        MediaType responseContentType = resolveResponseContentType(requestContentType, acceptTypes);
        byte[] protobufBody = upstreamBody == null || upstreamBody.length == 0
                ? ExportLogsServiceResponse.getDefaultInstance().toByteArray()
                : upstreamBody;
        ExportLogsServiceResponse parsedResponse = parseLogsResponseBody(protobufBody);
        if (MediaType.APPLICATION_JSON.includes(responseContentType)) {
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(normalizeLogsResponseBodyForClient(parsedResponse));
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF))
                .body(protobufBody);
    }

    private ExportLogsServiceResponse parseLogsResponseBody(byte[] upstreamBody) {
        byte[] safeBody = upstreamBody == null ? new byte[0] : upstreamBody;
        try {
            return safeBody.length == 0
                    ? ExportLogsServiceResponse.getDefaultInstance()
                    : ExportLogsServiceResponse.parseFrom(safeBody);
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INTERNAL.withDescription("OTLP logs response is malformed.").withCause(ex)
                    .asRuntimeException();
        }
    }

    private byte[] normalizeLogsResponseBodyForClient(ExportLogsServiceResponse response) {
        try {
            return JsonFormat.printer().print(response).getBytes(StandardCharsets.UTF_8);
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INTERNAL.withDescription("OTLP logs response is malformed.").withCause(ex)
                    .asRuntimeException();
        }
    }

    private ExportMetricsServiceRequest decodeMetricsRequest(byte[] content, MediaType contentType) {
        try {
            if (contentType != null && MediaType.APPLICATION_JSON.includes(contentType)) {
                ExportMetricsServiceRequest.Builder builder = ExportMetricsServiceRequest.newBuilder();
                JsonFormat.parser().ignoringUnknownFields()
                        .merge(normalizeOtlpJson(new String(content, StandardCharsets.UTF_8)), builder);
                return builder.build();
            }
            return ExportMetricsServiceRequest.parseFrom(content);
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription("Malformed OTLP metrics payload.")
                    .withCause(ex).asRuntimeException();
        }
    }

    private ExportTraceServiceRequest decodeTraceRequest(byte[] content, MediaType contentType) {
        try {
            if (contentType != null && MediaType.APPLICATION_JSON.includes(contentType)) {
                ExportTraceServiceRequest.Builder builder = ExportTraceServiceRequest.newBuilder();
                JsonFormat.parser().ignoringUnknownFields()
                        .merge(normalizeOtlpJson(new String(content, StandardCharsets.UTF_8)), builder);
                return builder.build();
            }
            return ExportTraceServiceRequest.parseFrom(content);
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription("Malformed OTLP trace payload.")
                    .withCause(ex).asRuntimeException();
        }
    }

    private byte[] normalizeHttpContentForQuota(String signal, String protocol, byte[] content, HttpHeaders headers) {
        if (!isGzipEncoded(headers)) {
            return content;
        }
        return decompressGzip(content, signal, protocol);
    }

    private HttpHeaders safeHeaders(HttpHeaders headers) {
        return headers == null ? new HttpHeaders() : headers;
    }

    private byte[] safeContent(byte[] content) {
        return content == null ? new byte[0] : content;
    }

    private HttpHeaders withoutContentEncoding(HttpHeaders headers) {
        HttpHeaders normalizedHeaders = new HttpHeaders();
        if (headers != null) {
            normalizedHeaders.putAll(headers);
            normalizedHeaders.remove(CONTENT_ENCODING);
            normalizedHeaders.remove(HttpHeaders.CONTENT_ENCODING);
        }
        return normalizedHeaders;
    }

    private boolean isGzipEncoded(HttpHeaders headers) {
        List<String> contentEncodings = headers == null ? null : headers.get(CONTENT_ENCODING);
        return contentEncodings != null && contentEncodings.stream().anyMatch(this::isGzipContentEncoding);
    }

    private byte[] maybeDecompress(byte[] content, HttpHeaders headers) {
        if (content == null || content.length == 0 || headers == null) {
            return content;
        }
        if (!isGzipEncoded(headers)) {
            return content;
        }
        return decompressGzip(content, null, null);
    }

    private boolean isGzipContentEncoding(String contentEncoding) {
        String[] encodings = StringUtils.split(contentEncoding, ',');
        if (encodings == null || encodings.length == 0) {
            return false;
        }
        for (String encoding : encodings) {
            if (StringUtils.equalsIgnoreCase(StringUtils.trimToEmpty(encoding), CONTENT_ENCODING_GZIP)) {
                return true;
            }
        }
        return false;
    }

    private byte[] decompressGzip(byte[] content, String signal, String protocol) {
        if (content == null || content.length == 0) {
            return content;
        }
        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(content);
             GZIPInputStream gzipInputStream = new GZIPInputStream(inputStream);
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[GZIP_DECOMPRESSION_BUFFER_BYTES];
            int read;
            while ((read = gzipInputStream.read(buffer)) != -1) {
                if (signal != null && protocol != null) {
                    quotaService.checkRequestBytes(signal, protocol, (long) outputStream.size() + read);
                }
                outputStream.write(buffer, 0, read);
            }
            return outputStream.toByteArray();
        } catch (StatusRuntimeException ex) {
            throw ex;
        } catch (Exception ex) {
            String description = StringUtils.isNotBlank(signal) && StringUtils.isNotBlank(protocol)
                    ? "Malformed gzip-compressed OTLP " + signal + " " + protocol + " payload."
                    : "Malformed gzip-compressed OTLP payload.";
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription(description)
                    .withCause(ex).asRuntimeException();
        }
    }

    private void recordMetricIntake(ExportMetricsServiceRequest request) {
        if (request == null) {
            return;
        }
        for (ResourceMetrics resourceMetrics : request.getResourceMetricsList()) {
            Map<String, String> resourceAttributes = requestContextResolver.withWorkspaceResourceAttributes(
                    toStringMap(resourceMetrics.getResource().getAttributesList()));
            for (ScopeMetrics scopeMetrics : resourceMetrics.getScopeMetricsList()) {
                for (Metric metric : scopeMetrics.getMetricsList()) {
                    List<MetricObservation> observations = extractMetricObservations(metric);
                    for (MetricObservation observation : observations) {
                        try {
                            observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                                    resourceAttributes,
                                    observation.observedAt(),
                                    StringUtils.trimToNull(metric.getName()),
                                    observation.metricType(),
                                    StringUtils.trimToNull(metric.getUnit()),
                                    observation.value(),
                                    observation.attributes()
                            );
                        } catch (RuntimeException ex) {
                            log.warn("Failed to record OTLP metric intake read model for metric {}: {}",
                                    StringUtils.trimToNull(metric.getName()), ex.toString());
                        }
                    }
                }
            }
        }
    }

    private void recordTraceIntake(ExportTraceServiceRequest request) {
        if (request == null) {
            return;
        }
        for (ResourceSpans resourceSpans : request.getResourceSpansList()) {
            Map<String, String> resourceAttributes = requestContextResolver.withWorkspaceResourceAttributes(
                    toStringMap(resourceSpans.getResource().getAttributesList()));
            for (ScopeSpans scopeSpans : resourceSpans.getScopeSpansList()) {
                for (Span span : scopeSpans.getSpansList()) {
                    if (!hasValidTraceIdentifiers(span)) {
                        continue;
                    }
                    String traceId = HexFormat.of().formatHex(span.getTraceId().toByteArray());
                    String spanId = HexFormat.of().formatHex(span.getSpanId().toByteArray());
                    try {
                        observabilitySignalIntakeGateway.recordOtlpTraceIntake(
                                resourceAttributes,
                                nanosToMillis(span.getStartTimeUnixNano()),
                                traceId,
                                spanId,
                                StringUtils.trimToNull(span.getName()),
                                span.getStatus().getCode().name().toLowerCase(Locale.ROOT),
                                toStringMap(span.getAttributesList())
                        );
                    } catch (RuntimeException ex) {
                        log.warn("Failed to record OTLP trace intake read model for trace {} span {}: {}",
                                traceId, spanId, ex.toString());
                    }
                }
            }
        }
    }

    private boolean hasValidTraceIdentifiers(Span span) {
        return span != null
                && span.getTraceId().size() == OTLP_TRACE_ID_BYTES
                && span.getSpanId().size() == OTLP_SPAN_ID_BYTES
                && !isAllZero(span.getTraceId().toByteArray())
                && !isAllZero(span.getSpanId().toByteArray());
    }

    private boolean isAllZero(byte[] value) {
        if (value == null || value.length == 0) {
            return true;
        }
        for (byte item : value) {
            if (item != 0) {
                return false;
            }
        }
        return true;
    }

    private void publishRealtimeSignalsBestEffort(ExportLogsServiceRequest request) {
        try {
            otlpLogProtocolAdapter.publishRealtimeSignals(request);
        } catch (RuntimeException ex) {
            log.warn("Failed to publish OTLP log realtime signals: {}", ex.toString());
        }
    }

    private ResponseEntity<byte[]> proxySignalHttp(byte[] content, HttpHeaders requestHeaders, String path,
                                                   boolean traceSignal) {
        return proxySignalHttp(
                content, requestHeaders, path, traceSignal, requestContextResolver.currentCorrelationContext());
    }

    private ResponseEntity<byte[]> proxySignalHttp(byte[] content, HttpHeaders requestHeaders, String path,
                                                   boolean traceSignal, OtlpCorrelationContext correlationContext) {
        MediaType contentType = requestHeaders.getContentType();
        byte[] responseBody = proxySignalInternal(content, path, traceSignal, contentType,
                requestHeaders.getAccept(), requestHeaders, correlationContext);
        return ResponseEntity.ok()
                .contentType(resolveResponseContentType(contentType, requestHeaders.getAccept()))
                .body(responseBody);
    }

    private ResponseEntity<byte[]> emptySignalHttpSuccess(MediaType requestContentType, List<MediaType> acceptTypes,
                                                         boolean traceSignal) {
        MediaType responseContentType = resolveResponseContentType(requestContentType, acceptTypes);
        byte[] responseBody = emptySignalResponseBody(responseContentType, traceSignal);
        return ResponseEntity.ok()
                .contentType(responseContentType)
                .body(responseBody);
    }

    private byte[] emptySignalResponseBody(MediaType responseContentType, boolean traceSignal) {
        byte[] protobufBody = traceSignal
                ? ExportTraceServiceResponse.getDefaultInstance().toByteArray()
                : ExportMetricsServiceResponse.getDefaultInstance().toByteArray();
        if (responseContentType != null && MediaType.APPLICATION_JSON.includes(responseContentType)) {
            return normalizeResponseBodyForClient(protobufBody, traceSignal);
        }
        return protobufBody;
    }

    private byte[] proxySignalBinary(byte[] content, String path, boolean traceSignal) {
        return proxySignalBinary(content, path, traceSignal, requestContextResolver.currentCorrelationContext());
    }

    private byte[] proxySignalBinary(byte[] content, String path, boolean traceSignal,
                                     OtlpCorrelationContext correlationContext) {
        return proxySignalInternal(content, path, traceSignal,
                MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF),
                List.of(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF)),
                null,
                correlationContext);
    }

    private byte[] proxySignalInternal(byte[] content, String path, boolean traceSignal,
                                       MediaType contentType, List<MediaType> acceptTypes,
                                       HttpHeaders requestHeaders, OtlpCorrelationContext correlationContext) {
        GreptimeProperties greptimeProperties = greptimePropertiesOrUnavailable();
        if (greptimeProperties == null || !greptimeProperties.enabled()
                || !StringUtils.isNotBlank(greptimeProperties.httpEndpoint())) {
            throw io.grpc.Status.UNAVAILABLE.withDescription("OTLP backend is not configured.")
                    .asRuntimeException();
        }
        try {
            boolean clientExpectsJson = acceptsJson(contentType, acceptTypes);
            byte[] upstreamContent = normalizeRequestBodyForUpstream(
                    content, contentType, traceSignal, requestHeaders, correlationContext);
            HttpHeaders upstreamHeaders = new HttpHeaders();
            upstreamHeaders.setContentType(resolveUpstreamContentType(contentType));
            if (clientExpectsJson) {
                upstreamHeaders.setAccept(List.of(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF)));
            } else {
                List<MediaType> upstreamAcceptTypes = resolveUpstreamAcceptTypes(acceptTypes);
                if (!upstreamAcceptTypes.isEmpty()) {
                    upstreamHeaders.setAccept(upstreamAcceptTypes);
                }
            }
            upstreamHeaders.set(GREPTIME_DB_NAME_HEADER, database(greptimeProperties.database()));
            if (traceSignal) {
                upstreamHeaders.set(GREPTIME_TRACE_TABLE_NAME_HEADER, DEFAULT_TRACES_TABLE_NAME);
                upstreamHeaders.set(GREPTIME_PIPELINE_NAME_HEADER, DEFAULT_TRACE_PIPELINE);
            } else {
                // Follow Greptime's Prom-compatible OTLP metrics best practice:
                // keep only the resource attrs that the workspace actually filters on,
                // instead of promoting every attribute into high-cardinality tag columns.
                upstreamHeaders.set(GREPTIME_OTLP_METRIC_PROMOTE_ALL_RESOURCE_ATTRS_HEADER, "false");
                upstreamHeaders.set(GREPTIME_OTLP_METRIC_PROMOTE_RESOURCE_ATTRS_HEADER,
                        DEFAULT_METRIC_PROMOTED_RESOURCE_ATTRS);
                upstreamHeaders.set(GREPTIME_OTLP_METRIC_PROMOTE_SCOPE_ATTRS_HEADER, "false");
            }
            addAuthenticationHeader(upstreamHeaders, greptimeProperties);

            ResponseEntity<byte[]> response = retryService.execute(() -> restTemplate.exchange(
                    endpoint(greptimeProperties.httpEndpoint(), path),
                    HttpMethod.POST,
                    new HttpEntity<>(upstreamContent, upstreamHeaders),
                    byte[].class
            ), retryableResponse -> retryableResponse == null
                    || retryService.isRetryableStatus(retryableResponse.getStatusCode()));
            if (response == null) {
                throw io.grpc.Status.UNAVAILABLE.withDescription("OTLP backend returned no response.")
                        .asRuntimeException();
            }
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw backendStatusException(response.getStatusCode(), response.getHeaders());
            }
            byte[] responseBody = response.getBody() == null ? new byte[0] : response.getBody();
            validateSignalResponseBody(responseBody, traceSignal);
            if (!clientExpectsJson) {
                return responseBody;
            }
            return normalizeResponseBodyForClient(responseBody, traceSignal);
        } catch (HttpStatusCodeException ex) {
            log.error("Failed to proxy OTLP signal {}: {}", traceSignal ? "traces" : "metrics", ex.getMessage(), ex);
            throw backendStatusException(ex.getStatusCode(), ex.getResponseHeaders());
        } catch (RestClientException ex) {
            log.error("Failed to proxy OTLP signal {}: {}", traceSignal ? "traces" : "metrics", ex.getMessage(), ex);
            throw io.grpc.Status.UNAVAILABLE.withDescription(defaultErrorMessage(ex)).withCause(ex)
                    .asRuntimeException();
        }
    }

    private GreptimeProperties greptimePropertiesOrUnavailable() {
        try {
            return greptimePropertiesProvider.getIfAvailable();
        } catch (RuntimeException ex) {
            log.warn("Failed to resolve Greptime OTLP backend properties: {}", ex.toString());
            throw io.grpc.Status.UNAVAILABLE.withDescription("OTLP backend is not configured.")
                    .withCause(ex)
                    .asRuntimeException();
        }
    }

    private byte[] normalizeRequestBodyForUpstream(byte[] content, MediaType contentType, boolean traceSignal,
                                                   HttpHeaders requestHeaders,
                                                   OtlpCorrelationContext correlationContext) {
        byte[] normalizedContent = maybeDecompress(content, requestHeaders);
        if (contentType == null || !MediaType.APPLICATION_JSON.includes(contentType)) {
            try {
                if (!traceSignal) {
                    return normalizeAndEnrichMetricRequest(
                            ExportMetricsServiceRequest.parseFrom(normalizedContent), correlationContext).toByteArray();
                }
                return normalizeAndEnrichTraceRequest(
                        ExportTraceServiceRequest.parseFrom(normalizedContent), correlationContext).toByteArray();
            } catch (InvalidProtocolBufferException ex) {
                throw io.grpc.Status.INVALID_ARGUMENT.withDescription(
                                traceSignal ? "Malformed OTLP trace payload." : "Malformed OTLP metrics payload.")
                        .withCause(ex).asRuntimeException();
            }
        }
        try {
            if (traceSignal) {
                ExportTraceServiceRequest.Builder builder = ExportTraceServiceRequest.newBuilder();
                JsonFormat.parser().ignoringUnknownFields()
                        .merge(normalizeOtlpJson(new String(normalizedContent, StandardCharsets.UTF_8)), builder);
                return normalizeAndEnrichTraceRequest(builder.build(), correlationContext).toByteArray();
            }
            ExportMetricsServiceRequest.Builder builder = ExportMetricsServiceRequest.newBuilder();
            JsonFormat.parser().ignoringUnknownFields()
                    .merge(normalizeOtlpJson(new String(normalizedContent, StandardCharsets.UTF_8)), builder);
            return normalizeAndEnrichMetricRequest(builder.build(), correlationContext).toByteArray();
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription("Malformed OTLP JSON request.")
                    .withCause(ex).asRuntimeException();
        }
    }

    private ExportMetricsServiceRequest normalizeAndEnrichMetricRequest(ExportMetricsServiceRequest request,
                                                                        OtlpCorrelationContext correlationContext) {
        OtlpCorrelationContext safeContext = correlationContext == null
                ? OtlpCorrelationContext.empty()
                : correlationContext;
        ExportMetricsServiceRequest resolved =
                otlpEntityIdentityResolver.enrichMetrics(request, safeContext.workspaceId());
        return redactMetricRequest(otlpCorrelationEnricher.enrichMetrics(resolved, safeContext));
    }

    private ExportTraceServiceRequest normalizeAndEnrichTraceRequest(ExportTraceServiceRequest request,
                                                                     OtlpCorrelationContext correlationContext) {
        OtlpCorrelationContext safeContext = correlationContext == null
                ? OtlpCorrelationContext.empty()
                : correlationContext;
        ExportTraceServiceRequest normalized = normalizeTraceRequest(request);
        ExportTraceServiceRequest resolved =
                otlpEntityIdentityResolver.enrichTraces(normalized, safeContext.workspaceId());
        return redactTraceRequest(otlpCorrelationEnricher.enrichTraces(resolved, safeContext));
    }

    private ExportMetricsServiceRequest redactMetricRequest(ExportMetricsServiceRequest request) {
        if (request == null || request.getResourceMetricsCount() == 0) {
            return request;
        }
        ExportMetricsServiceRequest.Builder requestBuilder = request.toBuilder().clearResourceMetrics();
        for (ResourceMetrics resourceMetrics : request.getResourceMetricsList()) {
            ResourceMetrics.Builder resourceBuilder = resourceMetrics.toBuilder().clearScopeMetrics()
                    .setResource(resourceMetrics.getResource().toBuilder().clearAttributes()
                            .addAllAttributes(redactAttributes(resourceMetrics.getResource().getAttributesList()))
                            .build());
            for (ScopeMetrics scopeMetrics : resourceMetrics.getScopeMetricsList()) {
                ScopeMetrics.Builder scopeBuilder = scopeMetrics.toBuilder().clearMetrics()
                        .setScope(redactInstrumentationScope(scopeMetrics.getScope()));
                for (Metric metric : scopeMetrics.getMetricsList()) {
                    scopeBuilder.addMetrics(redactMetric(metric));
                }
                resourceBuilder.addScopeMetrics(scopeBuilder.build());
            }
            requestBuilder.addResourceMetrics(resourceBuilder.build());
        }
        return requestBuilder.build();
    }

    private Metric redactMetric(Metric metric) {
        if (metric == null) {
            return null;
        }
        Metric.Builder metricBuilder = metric.toBuilder();
        if (metric.hasGauge()) {
            Gauge.Builder builder = metric.getGauge().toBuilder().clearDataPoints();
            for (NumberDataPoint dataPoint : metric.getGauge().getDataPointsList()) {
                builder.addDataPoints(redactNumberDataPoint(dataPoint));
            }
            metricBuilder.setGauge(builder.build());
        }
        if (metric.hasSum()) {
            Sum.Builder builder = metric.getSum().toBuilder().clearDataPoints();
            for (NumberDataPoint dataPoint : metric.getSum().getDataPointsList()) {
                builder.addDataPoints(redactNumberDataPoint(dataPoint));
            }
            metricBuilder.setSum(builder.build());
        }
        if (metric.hasHistogram()) {
            Histogram.Builder builder = metric.getHistogram().toBuilder().clearDataPoints();
            for (HistogramDataPoint dataPoint : metric.getHistogram().getDataPointsList()) {
                builder.addDataPoints(redactHistogramDataPoint(dataPoint));
            }
            metricBuilder.setHistogram(builder.build());
        }
        if (metric.hasExponentialHistogram()) {
            ExponentialHistogram.Builder builder = metric.getExponentialHistogram().toBuilder().clearDataPoints();
            for (ExponentialHistogramDataPoint dataPoint : metric.getExponentialHistogram().getDataPointsList()) {
                builder.addDataPoints(redactExponentialHistogramDataPoint(dataPoint));
            }
            metricBuilder.setExponentialHistogram(builder.build());
        }
        if (metric.hasSummary()) {
            Summary.Builder builder = metric.getSummary().toBuilder().clearDataPoints();
            for (SummaryDataPoint dataPoint : metric.getSummary().getDataPointsList()) {
                builder.addDataPoints(redactSummaryDataPoint(dataPoint));
            }
            metricBuilder.setSummary(builder.build());
        }
        return metricBuilder.build();
    }

    private NumberDataPoint redactNumberDataPoint(NumberDataPoint dataPoint) {
        NumberDataPoint.Builder builder = dataPoint.toBuilder()
                .clearAttributes()
                .clearExemplars()
                .addAllAttributes(redactAttributes(dataPoint.getAttributesList()));
        for (Exemplar exemplar : dataPoint.getExemplarsList()) {
            builder.addExemplars(redactExemplar(exemplar));
        }
        return builder.build();
    }

    private HistogramDataPoint redactHistogramDataPoint(HistogramDataPoint dataPoint) {
        HistogramDataPoint.Builder builder = dataPoint.toBuilder()
                .clearAttributes()
                .clearExemplars()
                .addAllAttributes(redactAttributes(dataPoint.getAttributesList()));
        for (Exemplar exemplar : dataPoint.getExemplarsList()) {
            builder.addExemplars(redactExemplar(exemplar));
        }
        return builder.build();
    }

    private ExponentialHistogramDataPoint redactExponentialHistogramDataPoint(
            ExponentialHistogramDataPoint dataPoint) {
        ExponentialHistogramDataPoint.Builder builder = dataPoint.toBuilder()
                .clearAttributes()
                .clearExemplars()
                .addAllAttributes(redactAttributes(dataPoint.getAttributesList()));
        for (Exemplar exemplar : dataPoint.getExemplarsList()) {
            builder.addExemplars(redactExemplar(exemplar));
        }
        return builder.build();
    }

    private SummaryDataPoint redactSummaryDataPoint(SummaryDataPoint dataPoint) {
        return dataPoint.toBuilder().clearAttributes()
                .addAllAttributes(redactAttributes(dataPoint.getAttributesList()))
                .build();
    }

    private Exemplar redactExemplar(Exemplar exemplar) {
        if (exemplar == null) {
            return null;
        }
        return exemplar.toBuilder()
                .clearFilteredAttributes()
                .addAllFilteredAttributes(redactAttributes(exemplar.getFilteredAttributesList()))
                .build();
    }

    private ExportLogsServiceRequest redactLogRequest(ExportLogsServiceRequest request) {
        if (request == null || request.getResourceLogsCount() == 0) {
            return request;
        }
        ExportLogsServiceRequest.Builder requestBuilder = request.toBuilder().clearResourceLogs();
        for (ResourceLogs resourceLogs : request.getResourceLogsList()) {
            ResourceLogs.Builder resourceBuilder = resourceLogs.toBuilder().clearScopeLogs()
                    .setResource(resourceLogs.getResource().toBuilder().clearAttributes()
                            .addAllAttributes(redactAttributes(resourceLogs.getResource().getAttributesList()))
                            .build());
            for (ScopeLogs scopeLogs : resourceLogs.getScopeLogsList()) {
                ScopeLogs.Builder scopeBuilder = scopeLogs.toBuilder().clearLogRecords()
                        .setScope(redactInstrumentationScope(scopeLogs.getScope()));
                for (LogRecord logRecord : scopeLogs.getLogRecordsList()) {
                    scopeBuilder.addLogRecords(redactLogRecord(logRecord));
                }
                resourceBuilder.addScopeLogs(scopeBuilder.build());
            }
            requestBuilder.addResourceLogs(resourceBuilder.build());
        }
        return requestBuilder.build();
    }

    private LogRecord redactLogRecord(LogRecord logRecord) {
        if (logRecord == null) {
            return null;
        }
        return logRecord.toBuilder()
                .setBody(redactAnyValue(logRecord.getBody()))
                .clearAttributes()
                .addAllAttributes(redactAttributes(logRecord.getAttributesList()))
                .build();
    }

    private ExportTraceServiceRequest redactTraceRequest(ExportTraceServiceRequest request) {
        if (request == null || request.getResourceSpansCount() == 0) {
            return request;
        }
        ExportTraceServiceRequest.Builder requestBuilder = request.toBuilder().clearResourceSpans();
        for (ResourceSpans resourceSpans : request.getResourceSpansList()) {
            ResourceSpans.Builder resourceBuilder = resourceSpans.toBuilder().clearScopeSpans()
                    .setResource(resourceSpans.getResource().toBuilder().clearAttributes()
                            .addAllAttributes(redactAttributes(resourceSpans.getResource().getAttributesList()))
                            .build());
            for (ScopeSpans scopeSpans : resourceSpans.getScopeSpansList()) {
                ScopeSpans.Builder scopeBuilder = scopeSpans.toBuilder().clearSpans()
                        .setScope(redactInstrumentationScope(scopeSpans.getScope()));
                for (Span span : scopeSpans.getSpansList()) {
                    scopeBuilder.addSpans(redactSpan(span));
                }
                resourceBuilder.addScopeSpans(scopeBuilder.build());
            }
            requestBuilder.addResourceSpans(resourceBuilder.build());
        }
        return requestBuilder.build();
    }

    private Span redactSpan(Span span) {
        if (span == null) {
            return null;
        }
        Span.Builder spanBuilder = span.toBuilder()
                .setName(redactionService.redactText(span.getName()))
                .clearAttributes()
                .clearEvents()
                .clearLinks();
        spanBuilder.addAllAttributes(redactAttributes(span.getAttributesList()));
        if (span.hasStatus()) {
            spanBuilder.setStatus(redactSpanStatus(span.getStatus()));
        }
        for (Span.Event event : span.getEventsList()) {
            spanBuilder.addEvents(redactSpanEvent(event));
        }
        for (Span.Link link : span.getLinksList()) {
            spanBuilder.addLinks(redactSpanLink(link));
        }
        return spanBuilder.build();
    }

    private io.opentelemetry.proto.trace.v1.Status redactSpanStatus(
            io.opentelemetry.proto.trace.v1.Status status) {
        if (status == null) {
            return null;
        }
        return status.toBuilder()
                .setMessage(redactionService.redactText(status.getMessage()))
                .build();
    }

    private Span.Event redactSpanEvent(Span.Event event) {
        if (event == null) {
            return null;
        }
        return event.toBuilder()
                .setName(redactionService.redactText(event.getName()))
                .clearAttributes()
                .addAllAttributes(redactAttributes(event.getAttributesList()))
                .build();
    }

    private Span.Link redactSpanLink(Span.Link link) {
        if (link == null) {
            return null;
        }
        return link.toBuilder()
                .clearAttributes()
                .addAllAttributes(redactAttributes(link.getAttributesList()))
                .build();
    }

    private InstrumentationScope redactInstrumentationScope(InstrumentationScope scope) {
        if (scope == null || scope.getAttributesCount() == 0) {
            return scope;
        }
        return scope.toBuilder().clearAttributes()
                .addAllAttributes(redactAttributes(scope.getAttributesList()))
                .build();
    }

    private List<KeyValue> redactAttributes(List<KeyValue> attributes) {
        if (attributes == null || attributes.isEmpty()) {
            return List.of();
        }
        List<KeyValue> redacted = new ArrayList<>(attributes.size());
        for (KeyValue attribute : attributes) {
            redacted.add(redactAttribute(attribute));
        }
        return redacted;
    }

    private KeyValue redactAttribute(KeyValue attribute) {
        if (attribute == null || !StringUtils.isNotBlank(attribute.getKey())) {
            return attribute;
        }
        if (redactionService.isSensitiveKey(attribute.getKey())) {
            return attribute.toBuilder().setValue(redactedAnyValue()).build();
        }
        if (!attribute.hasValue()) {
            return attribute;
        }
        return attribute.toBuilder().setValue(redactAnyValue(attribute.getValue())).build();
    }

    private AnyValue redactAnyValue(AnyValue value) {
        if (value == null) {
            return null;
        }
        return switch (value.getValueCase()) {
            case STRING_VALUE -> value.toBuilder()
                    .setStringValue(redactionService.redactText(value.getStringValue()))
                    .build();
            case ARRAY_VALUE -> value.toBuilder()
                    .setArrayValue(redactArrayValue(value.getArrayValue()))
                    .build();
            case KVLIST_VALUE -> value.toBuilder()
                    .setKvlistValue(redactKeyValueList(value.getKvlistValue()))
                    .build();
            default -> value;
        };
    }

    private ArrayValue redactArrayValue(ArrayValue value) {
        ArrayValue.Builder builder = value.toBuilder().clearValues();
        for (AnyValue item : value.getValuesList()) {
            builder.addValues(redactAnyValue(item));
        }
        return builder.build();
    }

    private KeyValueList redactKeyValueList(KeyValueList value) {
        KeyValueList.Builder builder = value.toBuilder().clearValues();
        for (KeyValue item : value.getValuesList()) {
            builder.addValues(redactAttribute(item));
        }
        return builder.build();
    }

    private AnyValue redactedAnyValue() {
        return AnyValue.newBuilder().setStringValue(OtlpIngestionRedactionService.REDACTED).build();
    }

    private MediaType resolveUpstreamContentType(MediaType contentType) {
        if (contentType == null) {
            return MEDIA_TYPE_PROTOBUF;
        }
        if (MediaType.APPLICATION_JSON.includes(contentType) || isExplicitProtobufMediaType(contentType)) {
            return MEDIA_TYPE_PROTOBUF;
        }
        return contentType;
    }

    private List<MediaType> resolveUpstreamAcceptTypes(List<MediaType> acceptTypes) {
        if (acceptTypes == null || acceptTypes.isEmpty()) {
            return List.of();
        }
        return acceptTypes.stream()
                .map(this::resolveUpstreamAcceptType)
                .toList();
    }

    private MediaType resolveUpstreamAcceptType(MediaType acceptType) {
        if (isExplicitProtobufMediaType(acceptType)) {
            return new MediaType(MEDIA_TYPE_PROTOBUF.getType(), MEDIA_TYPE_PROTOBUF.getSubtype(),
                    acceptType.getParameters());
        }
        return acceptType;
    }

    private boolean acceptsJson(MediaType requestContentType, List<MediaType> acceptTypes) {
        return prefersJsonResponse(requestContentType, acceptTypes);
    }

    private byte[] normalizeResponseBodyForClient(byte[] upstreamBody, boolean traceSignal) {
        try {
            return JsonFormat.printer().print(parseSignalResponse(upstreamBody, traceSignal))
                    .getBytes(StandardCharsets.UTF_8);
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INTERNAL.withDescription(signalResponseMalformedReason(traceSignal))
                    .withCause(ex).asRuntimeException();
        }
    }

    private void validateSignalResponseBody(byte[] upstreamBody, boolean traceSignal) {
        parseSignalResponse(upstreamBody, traceSignal);
    }

    private Message parseSignalResponse(byte[] upstreamBody, boolean traceSignal) {
        byte[] safeBody = upstreamBody == null ? new byte[0] : upstreamBody;
        try {
            if (traceSignal) {
                return safeBody.length == 0
                        ? ExportTraceServiceResponse.getDefaultInstance()
                        : ExportTraceServiceResponse.parseFrom(safeBody);
            }
            return safeBody.length == 0
                    ? ExportMetricsServiceResponse.getDefaultInstance()
                    : ExportMetricsServiceResponse.parseFrom(safeBody);
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INTERNAL.withDescription(signalResponseMalformedReason(traceSignal))
                    .withCause(ex).asRuntimeException();
        }
    }

    private String signalResponseMalformedReason(boolean traceSignal) {
        return traceSignal ? "OTLP trace response is malformed." : "OTLP metrics response is malformed.";
    }

    private void addAuthenticationHeader(HttpHeaders headers, GreptimeProperties greptimeProperties) {
        String username = StringUtils.trimToNull(greptimeProperties.username());
        String password = StringUtils.trimToNull(greptimeProperties.password());
        if (username == null || password == null) {
            return;
        }
        String credentials = username + ":" + password;
        String encodedCredentials = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + encodedCredentials);
    }

    private String endpoint(String baseEndpoint, String path) {
        return StringUtils.stripEnd(StringUtils.trim(baseEndpoint), "/") + path;
    }

    private StatusRuntimeException backendStatusException(HttpStatusCode statusCode) {
        return backendStatusException(statusCode, null);
    }

    private StatusRuntimeException backendStatusException(HttpStatusCode statusCode, HttpHeaders responseHeaders) {
        io.grpc.Status status = backendGrpcStatus(statusCode);
        return OtlpIngestionBackpressureHeaders.statusRuntimeException(
                status, "OTLP backend returned " + statusCode, responseHeaders);
    }

    private io.grpc.Status backendGrpcStatus(HttpStatusCode statusCode) {
        if (statusCode == null) {
            return io.grpc.Status.UNAVAILABLE;
        }
        if (statusCode.value() == HttpStatus.UNAUTHORIZED.value()) {
            return io.grpc.Status.UNAUTHENTICATED;
        }
        if (statusCode.value() == HttpStatus.FORBIDDEN.value()) {
            return io.grpc.Status.PERMISSION_DENIED;
        }
        if (statusCode.value() == HttpStatus.BAD_REQUEST.value()) {
            return io.grpc.Status.INVALID_ARGUMENT;
        }
        if (statusCode.value() == HttpStatus.NOT_ACCEPTABLE.value()) {
            return io.grpc.Status.INVALID_ARGUMENT;
        }
        if (statusCode.value() == HttpStatus.UNSUPPORTED_MEDIA_TYPE.value()) {
            return io.grpc.Status.INVALID_ARGUMENT;
        }
        if (statusCode.value() == HttpStatus.UNPROCESSABLE_ENTITY.value()) {
            return io.grpc.Status.INVALID_ARGUMENT;
        }
        if (statusCode.value() == HttpStatus.NOT_FOUND.value()) {
            return io.grpc.Status.NOT_FOUND;
        }
        if (statusCode.value() == HttpStatus.CONFLICT.value()) {
            return io.grpc.Status.ABORTED;
        }
        if (statusCode.value() == HttpStatus.LOCKED.value()) {
            return io.grpc.Status.ABORTED;
        }
        if (statusCode.value() == HttpStatus.PRECONDITION_FAILED.value()) {
            return io.grpc.Status.FAILED_PRECONDITION;
        }
        if (statusCode.value() == HttpStatus.PRECONDITION_REQUIRED.value()) {
            return io.grpc.Status.FAILED_PRECONDITION;
        }
        if (statusCode.value() == HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE.value()) {
            return io.grpc.Status.OUT_OF_RANGE;
        }
        if (statusCode.value() == HttpStatus.METHOD_NOT_ALLOWED.value()) {
            return io.grpc.Status.UNIMPLEMENTED;
        }
        if (statusCode.value() == HttpStatus.NOT_IMPLEMENTED.value()) {
            return io.grpc.Status.UNIMPLEMENTED;
        }
        if (statusCode.value() == HttpStatus.PAYLOAD_TOO_LARGE.value()) {
            return io.grpc.Status.RESOURCE_EXHAUSTED;
        }
        if (statusCode.value() == HttpStatus.REQUEST_HEADER_FIELDS_TOO_LARGE.value()) {
            return io.grpc.Status.RESOURCE_EXHAUSTED;
        }
        if (statusCode.value() == HttpStatus.INSUFFICIENT_STORAGE.value()) {
            return io.grpc.Status.RESOURCE_EXHAUSTED;
        }
        if (statusCode.value() == HttpStatus.TOO_MANY_REQUESTS.value()) {
            return io.grpc.Status.RESOURCE_EXHAUSTED;
        }
        if (statusCode.value() == HttpStatus.TOO_EARLY.value()) {
            return io.grpc.Status.UNAVAILABLE;
        }
        if (statusCode.value() == HttpStatus.REQUEST_TIMEOUT.value()
                || statusCode.value() == HttpStatus.GATEWAY_TIMEOUT.value()) {
            return io.grpc.Status.DEADLINE_EXCEEDED;
        }
        if (statusCode.value() == HttpStatus.BAD_GATEWAY.value()
                || statusCode.value() == HttpStatus.SERVICE_UNAVAILABLE.value()) {
            return io.grpc.Status.UNAVAILABLE;
        }
        if (statusCode.is4xxClientError()) {
            return io.grpc.Status.INTERNAL;
        }
        if (statusCode.is5xxServerError()) {
            return io.grpc.Status.INTERNAL;
        }
        return io.grpc.Status.UNAVAILABLE;
    }

    private String database(String configuredDatabase) {
        return StringUtils.defaultIfBlank(StringUtils.trim(configuredDatabase), DEFAULT_GREPTIME_DB_NAME);
    }

    private MediaType resolveResponseContentType(MediaType requestContentType, List<MediaType> acceptTypes) {
        return prefersJsonResponse(requestContentType, acceptTypes)
                ? MediaType.APPLICATION_JSON
                : MEDIA_TYPE_PROTOBUF;
    }

    private boolean prefersJsonResponse(MediaType requestContentType, List<MediaType> acceptTypes) {
        double jsonQuality = negotiatedQuality(acceptTypes, true);
        double protobufQuality = negotiatedQuality(acceptTypes, false);
        if (jsonQuality >= 0 || protobufQuality >= 0) {
            double acceptableJsonQuality = Math.max(jsonQuality, 0.0d);
            double acceptableProtobufQuality = Math.max(protobufQuality, 0.0d);
            if (Double.compare(acceptableJsonQuality, acceptableProtobufQuality) == 0) {
                return acceptableJsonQuality > 0 && isExplicitJsonMediaType(requestContentType);
            }
            return acceptableJsonQuality > acceptableProtobufQuality;
        }
        return isExplicitJsonMediaType(requestContentType);
    }

    private double negotiatedQuality(List<MediaType> acceptTypes, boolean json) {
        if (acceptTypes == null || acceptTypes.isEmpty()) {
            return -1.0d;
        }
        double explicitQuality = acceptTypes.stream()
                .filter(json ? this::isExplicitJsonMediaType : this::isExplicitProtobufMediaType)
                .mapToDouble(MediaType::getQualityValue)
                .max()
                .orElse(-1.0d);
        if (explicitQuality >= 0) {
            return explicitQuality;
        }
        return acceptTypes.stream()
                .filter(json ? this::isJsonWildcardMediaType : this::isProtobufWildcardMediaType)
                .mapToDouble(MediaType::getQualityValue)
                .max()
                .orElse(-1.0d);
    }

    private boolean isJsonWildcardMediaType(MediaType mediaType) {
        return mediaType != null
                && !isExplicitJsonMediaType(mediaType)
                && mediaType.includes(MediaType.APPLICATION_JSON);
    }

    private boolean isProtobufWildcardMediaType(MediaType mediaType) {
        return mediaType != null
                && !isExplicitProtobufMediaType(mediaType)
                && (mediaType.includes(MEDIA_TYPE_PROTOBUF) || mediaType.includes(MEDIA_TYPE_PROTOBUF_ALT));
    }

    private boolean isExplicitJsonMediaType(MediaType mediaType) {
        if (mediaType == null || mediaType.isWildcardType() || mediaType.isWildcardSubtype()) {
            return false;
        }
        return "application".equalsIgnoreCase(mediaType.getType())
                && ("json".equalsIgnoreCase(mediaType.getSubtype())
                || mediaType.getSubtype().toLowerCase(Locale.ROOT).endsWith("+json"));
    }

    private boolean isExplicitProtobufMediaType(MediaType mediaType) {
        if (mediaType == null || mediaType.isWildcardType() || mediaType.isWildcardSubtype()) {
            return false;
        }
        return "application".equalsIgnoreCase(mediaType.getType())
                && ("x-protobuf".equalsIgnoreCase(mediaType.getSubtype())
                || "protobuf".equalsIgnoreCase(mediaType.getSubtype()));
    }

    private String defaultErrorMessage(Exception ex) {
        return StringUtils.defaultIfBlank(ex.getMessage(), "OTLP signal ingestion failed.");
    }

    private long requestBytes(byte[] content) {
        return content == null ? 0L : content.length;
    }

    private long requestBytes(Message request) {
        return request == null ? 0L : request.getSerializedSize();
    }

    private long durationMillis(long startedAtNanos) {
        return Math.max(0L, TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAtNanos));
    }

    private String normalizeOtlpJson(String content) throws InvalidProtocolBufferException {
        try {
            JsonNode root = OBJECT_MAPPER.readTree(content);
            normalizeOtlpHexEncodedIds(root);
            return OBJECT_MAPPER.writeValueAsString(root);
        } catch (Exception ex) {
            throw new InvalidProtocolBufferException("Failed to normalize OTLP JSON: " + ex.getMessage());
        }
    }

    private ExportTraceServiceRequest normalizeTraceRequest(ExportTraceServiceRequest request) {
        if (request == null || request.getResourceSpansCount() == 0) {
            return request;
        }
        ExportTraceServiceRequest.Builder requestBuilder = request.toBuilder().clearResourceSpans();
        for (ResourceSpans resourceSpans : request.getResourceSpansList()) {
            ResourceSpans.Builder resourceBuilder = resourceSpans.toBuilder().clearScopeSpans();
            for (ScopeSpans scopeSpans : resourceSpans.getScopeSpansList()) {
                ScopeSpans.Builder scopeBuilder = scopeSpans.toBuilder().clearSpans();
                for (Span span : scopeSpans.getSpansList()) {
                    scopeBuilder.addSpans(normalizeTraceSpan(span));
                }
                resourceBuilder.addScopeSpans(scopeBuilder.build());
            }
            requestBuilder.addResourceSpans(resourceBuilder.build());
        }
        return requestBuilder.build();
    }

    private Span normalizeTraceSpan(Span span) {
        if (span == null || span.getAttributesCount() == 0) {
            return span;
        }
        Span.Builder spanBuilder = span.toBuilder().clearAttributes();
        for (KeyValue attribute : span.getAttributesList()) {
            spanBuilder.addAttributes(normalizeTraceAttribute(attribute));
        }
        return spanBuilder.build();
    }

    private KeyValue normalizeTraceAttribute(KeyValue attribute) {
        if (attribute == null || !StringUtils.isNotBlank(attribute.getKey()) || !attribute.hasValue()) {
            return attribute;
        }
        if (!shouldCoerceTraceAttributeToInt(attribute.getKey())) {
            return attribute;
        }
        AnyValue value = attribute.getValue();
        if (value.getValueCase() != AnyValue.ValueCase.STRING_VALUE) {
            return attribute;
        }
        String normalized = StringUtils.trimToNull(value.getStringValue());
        if (normalized == null || !normalized.matches("-?\\d+")) {
            return attribute;
        }
        try {
            long parsed = Long.parseLong(normalized);
            return attribute.toBuilder()
                    .setValue(AnyValue.newBuilder().setIntValue(parsed).build())
                    .build();
        } catch (NumberFormatException ex) {
            return attribute;
        }
    }

    private boolean shouldCoerceTraceAttributeToInt(String key) {
        if (!StringUtils.isNotBlank(key)) {
            return false;
        }
        return TRACE_NUMERIC_ATTRIBUTE_KEYS.contains(key) || StringUtils.endsWith(key, ".port");
    }

    private List<MetricObservation> extractMetricObservations(Metric metric) {
        if (metric == null) {
            return List.of();
        }
        if (metric.hasGauge()) {
            List<MetricObservation> observations = new ArrayList<>(metric.getGauge().getDataPointsCount());
            for (NumberDataPoint dataPoint : metric.getGauge().getDataPointsList()) {
                observations.add(fromNumberDataPoint("gauge", dataPoint, metric.getGauge().getDataPointsCount(), null, null));
            }
            return observations;
        }
        if (metric.hasSum()) {
            List<MetricObservation> observations = new ArrayList<>(metric.getSum().getDataPointsCount());
            for (NumberDataPoint dataPoint : metric.getSum().getDataPointsList()) {
                observations.add(fromNumberDataPoint(
                        "sum",
                        dataPoint,
                        metric.getSum().getDataPointsCount(),
                        metric.getSum().getAggregationTemporality().name(),
                        String.valueOf(metric.getSum().getIsMonotonic())
                ));
            }
            return observations;
        }
        if (metric.hasHistogram()) {
            List<MetricObservation> observations = new ArrayList<>(metric.getHistogram().getDataPointsCount());
            for (HistogramDataPoint dataPoint : metric.getHistogram().getDataPointsList()) {
                observations.add(fromHistogramDataPoint(
                        "histogram",
                        dataPoint,
                        metric.getHistogram().getDataPointsCount(),
                        metric.getHistogram().getAggregationTemporality().name()
                ));
            }
            return observations;
        }
        if (metric.hasExponentialHistogram()) {
            List<MetricObservation> observations = new ArrayList<>(metric.getExponentialHistogram().getDataPointsCount());
            for (ExponentialHistogramDataPoint dataPoint : metric.getExponentialHistogram().getDataPointsList()) {
                observations.add(fromExponentialHistogramDataPoint(
                        "exponential_histogram",
                        dataPoint,
                        metric.getExponentialHistogram().getDataPointsCount(),
                        metric.getExponentialHistogram().getAggregationTemporality().name()
                ));
            }
            return observations;
        }
        if (metric.hasSummary()) {
            List<MetricObservation> observations = new ArrayList<>(metric.getSummary().getDataPointsCount());
            for (SummaryDataPoint dataPoint : metric.getSummary().getDataPointsList()) {
                observations.add(fromSummaryDataPoint("summary", dataPoint, metric.getSummary().getDataPointsCount()));
            }
            return observations;
        }
        return List.of(new MetricObservation("metric", null, null, baseMetricMetadata("unsupported", "unsupported",
                "unsupported", OtlpIngestionMessages.get("observability.otlp.metric.compatibility.unknown-type"))));
    }

    private MetricObservation fromNumberDataPoint(String metricType,
                                                  NumberDataPoint point,
                                                  int dataPointCount,
                                                  String aggregationTemporality,
                                                  String monotonic) {
        Double value = switch (point.getValueCase()) {
            case AS_DOUBLE -> point.getAsDouble();
            case AS_INT -> (double) point.getAsInt();
            case VALUE_NOT_SET -> null;
        };
        Map<String, String> metadata = baseMetricMetadata("supported", "supported", "supported", null);
        appendMetricTimeRange(metadata, point.getStartTimeUnixNano(), point.getTimeUnixNano());
        metadata.put(OTLP_METRIC_DATA_POINT_COUNT, String.valueOf(dataPointCount));
        putIfHasText(metadata, OTLP_METRIC_AGGREGATION_TEMPORALITY, aggregationTemporality);
        putIfHasText(metadata, OTLP_METRIC_MONOTONIC, monotonic);
        return new MetricObservation(metricType, nanosToMillis(point.getTimeUnixNano()), value,
                mergeMetricAttributes(toStringMap(point.getAttributesList()), metadata));
    }

    private MetricObservation fromHistogramDataPoint(String metricType,
                                                     HistogramDataPoint point,
                                                     int dataPointCount,
                                                     String aggregationTemporality) {
        Double value = point.hasSum() ? point.getSum() : (double) point.getCount();
        Map<String, String> metadata = baseMetricMetadata(
                "partial",
                "supported",
                "partial",
                OtlpIngestionMessages.get("observability.otlp.metric.compatibility.histogram.reason")
        );
        appendMetricTimeRange(metadata, point.getStartTimeUnixNano(), point.getTimeUnixNano());
        metadata.put(OTLP_METRIC_DATA_POINT_COUNT, String.valueOf(dataPointCount));
        putIfHasText(metadata, OTLP_METRIC_AGGREGATION_TEMPORALITY, aggregationTemporality);
        metadata.put(OTLP_METRIC_HISTOGRAM_COUNT, String.valueOf(point.getCount()));
        if (point.hasSum()) {
            metadata.put(OTLP_METRIC_HISTOGRAM_SUM, String.valueOf(point.getSum()));
        }
        if (!point.getExplicitBoundsList().isEmpty()) {
            metadata.put(OTLP_METRIC_HISTOGRAM_EXPLICIT_BOUNDS, toJson(point.getExplicitBoundsList()));
        }
        if (!point.getBucketCountsList().isEmpty()) {
            metadata.put(OTLP_METRIC_HISTOGRAM_BUCKET_COUNTS, toJson(point.getBucketCountsList()));
        }
        return new MetricObservation(metricType, nanosToMillis(point.getTimeUnixNano()), value,
                mergeMetricAttributes(toStringMap(point.getAttributesList()), metadata));
    }

    private MetricObservation fromExponentialHistogramDataPoint(String metricType,
                                                                ExponentialHistogramDataPoint point,
                                                                int dataPointCount,
                                                                String aggregationTemporality) {
        Double value = point.hasSum() ? point.getSum() : (double) point.getCount();
        Map<String, String> metadata = baseMetricMetadata(
                "unsupported",
                "unsupported",
                "partial",
                OtlpIngestionMessages.get("observability.otlp.metric.compatibility.exponential-histogram.reason")
        );
        appendMetricTimeRange(metadata, point.getStartTimeUnixNano(), point.getTimeUnixNano());
        metadata.put(OTLP_METRIC_DATA_POINT_COUNT, String.valueOf(dataPointCount));
        putIfHasText(metadata, OTLP_METRIC_AGGREGATION_TEMPORALITY, aggregationTemporality);
        metadata.put(OTLP_METRIC_EXP_SCALE, String.valueOf(point.getScale()));
        metadata.put(OTLP_METRIC_EXP_ZERO_COUNT, String.valueOf(point.getZeroCount()));
        metadata.put(OTLP_METRIC_EXP_ZERO_THRESHOLD, String.valueOf(point.getZeroThreshold()));
        if (point.hasSum()) {
            metadata.put(OTLP_METRIC_HISTOGRAM_SUM, String.valueOf(point.getSum()));
        }
        if (point.hasPositive()) {
            metadata.put(OTLP_METRIC_EXP_POSITIVE, toJson(Map.of(
                    "offset", point.getPositive().getOffset(),
                    "bucketCounts", point.getPositive().getBucketCountsList()
            )));
        }
        if (point.hasNegative()) {
            metadata.put(OTLP_METRIC_EXP_NEGATIVE, toJson(Map.of(
                    "offset", point.getNegative().getOffset(),
                    "bucketCounts", point.getNegative().getBucketCountsList()
            )));
        }
        return new MetricObservation(metricType, nanosToMillis(point.getTimeUnixNano()), value,
                mergeMetricAttributes(toStringMap(point.getAttributesList()), metadata));
    }

    private MetricObservation fromSummaryDataPoint(String metricType, SummaryDataPoint point, int dataPointCount) {
        Map<String, String> metadata = baseMetricMetadata(
                "partial",
                "partial",
                "partial",
                OtlpIngestionMessages.get("observability.otlp.metric.compatibility.summary.reason")
        );
        appendMetricTimeRange(metadata, point.getStartTimeUnixNano(), point.getTimeUnixNano());
        metadata.put(OTLP_METRIC_DATA_POINT_COUNT, String.valueOf(dataPointCount));
        metadata.put(OTLP_METRIC_SUMMARY_COUNT, String.valueOf(point.getCount()));
        metadata.put(OTLP_METRIC_SUMMARY_SUM, String.valueOf(point.getSum()));
        if (!point.getQuantileValuesList().isEmpty()) {
            List<Map<String, Double>> quantiles = new ArrayList<>(point.getQuantileValuesCount());
            for (SummaryDataPoint.ValueAtQuantile valueAtQuantile : point.getQuantileValuesList()) {
                quantiles.add(Map.of(
                        "quantile", valueAtQuantile.getQuantile(),
                        "value", valueAtQuantile.getValue()
                ));
            }
            metadata.put(OTLP_METRIC_SUMMARY_QUANTILES, toJson(quantiles));
        }
        return new MetricObservation(metricType, nanosToMillis(point.getTimeUnixNano()), point.getSum(),
                mergeMetricAttributes(toStringMap(point.getAttributesList()), metadata));
    }

    private Long nanosToMillis(long value) {
        return value <= 0 ? null : value / 1_000_000L;
    }

    private Map<String, String> toStringMap(List<KeyValue> attributes) {
        if (attributes == null || attributes.isEmpty()) {
            return Map.of();
        }
        Map<String, String> values = new LinkedHashMap<>();
        for (KeyValue attribute : attributes) {
            if (attribute == null || !StringUtils.isNotBlank(attribute.getKey())) {
                continue;
            }
            String value = anyValueToString(attribute.getValue());
            if (StringUtils.isNotBlank(value)) {
                values.put(attribute.getKey(), value);
            }
        }
        return values;
    }

    private String anyValueToString(AnyValue value) {
        if (value == null) {
            return null;
        }
        return switch (value.getValueCase()) {
            case STRING_VALUE -> StringUtils.trimToNull(value.getStringValue());
            case BOOL_VALUE -> String.valueOf(value.getBoolValue());
            case INT_VALUE -> String.valueOf(value.getIntValue());
            case DOUBLE_VALUE -> String.valueOf(value.getDoubleValue());
            case BYTES_VALUE -> HexFormat.of().formatHex(value.getBytesValue().toByteArray());
            default -> null;
        };
    }

    private Map<String, String> mergeMetricAttributes(Map<String, String> pointAttributes, Map<String, String> metadata) {
        Map<String, String> merged = new LinkedHashMap<>();
        if (pointAttributes != null && !pointAttributes.isEmpty()) {
            merged.putAll(pointAttributes);
        }
        if (metadata != null && !metadata.isEmpty()) {
            merged.putAll(metadata);
        }
        return merged;
    }

    private Map<String, String> baseMetricMetadata(String compatibility,
                                                   String greptimeCompatibility,
                                                   String facadeCompatibility,
                                                   String overallReason) {
        Map<String, String> metadata = new LinkedHashMap<>();
        metadata.put(OTLP_METRIC_COMPATIBILITY, compatibility);
        metadata.put(OTLP_METRIC_GREPTIME_COMPATIBILITY, greptimeCompatibility);
        metadata.put(OTLP_METRIC_FACADE_COMPATIBILITY, facadeCompatibility);
        if (StringUtils.isNotBlank(overallReason)) {
            metadata.put(OTLP_METRIC_COMPATIBILITY_REASON, overallReason);
        }
        if ("supported".equals(greptimeCompatibility)) {
            metadata.put(OTLP_METRIC_GREPTIME_REASON,
                    OtlpIngestionMessages.get("observability.otlp.metric.greptime.reason.supported"));
        } else if ("partial".equals(greptimeCompatibility)) {
            metadata.put(OTLP_METRIC_GREPTIME_REASON,
                    OtlpIngestionMessages.get("observability.otlp.metric.greptime.reason.partial"));
        } else {
            metadata.put(OTLP_METRIC_GREPTIME_REASON,
                    OtlpIngestionMessages.get("observability.otlp.metric.greptime.reason.unsupported"));
        }
        if ("supported".equals(facadeCompatibility)) {
            metadata.put(OTLP_METRIC_FACADE_REASON,
                    OtlpIngestionMessages.get("observability.otlp.metric.facade.reason.supported"));
        } else if ("partial".equals(facadeCompatibility)) {
            metadata.put(OTLP_METRIC_FACADE_REASON,
                    OtlpIngestionMessages.get("observability.otlp.metric.facade.reason.partial"));
        } else {
            metadata.put(OTLP_METRIC_FACADE_REASON,
                    OtlpIngestionMessages.get("observability.otlp.metric.facade.reason.unsupported"));
        }
        return metadata;
    }

    private void appendMetricTimeRange(Map<String, String> metadata, long startTimeUnixNano, long endTimeUnixNano) {
        Long startTime = nanosToMillis(startTimeUnixNano);
        Long endTime = nanosToMillis(endTimeUnixNano);
        if (startTime != null) {
            metadata.put(OTLP_METRIC_START_TIME_MILLIS, String.valueOf(startTime));
        }
        if (endTime != null) {
            metadata.put(OTLP_METRIC_END_TIME_MILLIS, String.valueOf(endTime));
        }
    }

    private void putIfHasText(Map<String, String> target, String key, String value) {
        if (StringUtils.isNotBlank(value)) {
            target.put(key, value);
        }
    }

    private String toJson(Object value) {
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (Exception ex) {
            return String.valueOf(value);
        }
    }

    private record MetricObservation(String metricType, Long observedAt, Double value, Map<String, String> attributes) {
    }

    private void normalizeOtlpHexEncodedIds(JsonNode node) {
        if (node == null) {
            return;
        }
        if (node.isObject()) {
            ObjectNode objectNode = (ObjectNode) node;
            objectNode.fieldNames().forEachRemaining(fieldName -> {
                JsonNode child = objectNode.get(fieldName);
                if (OTLP_HEX_ID_FIELDS.contains(fieldName) && child != null && child.isTextual()) {
                    String normalized = tryConvertHexToBase64(child.asText());
                    if (normalized != null) {
                        objectNode.put(fieldName, normalized);
                    }
                } else {
                    normalizeOtlpHexEncodedIds(child);
                }
            });
            return;
        }
        if (node.isArray()) {
            node.forEach(this::normalizeOtlpHexEncodedIds);
        }
    }

    private String tryConvertHexToBase64(String value) {
        if (StringUtils.isBlank(value) || (value.length() & 1) != 0) {
            return null;
        }
        for (int i = 0; i < value.length(); i++) {
            if (Character.digit(value.charAt(i), 16) < 0) {
                return null;
            }
        }
        try {
            return Base64.getEncoder().encodeToString(HexFormat.of().parseHex(value));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
