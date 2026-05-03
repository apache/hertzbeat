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
import com.google.rpc.Status;
import io.grpc.StatusRuntimeException;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse;
import io.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint;
import io.opentelemetry.proto.metrics.v1.HistogramDataPoint;
import io.opentelemetry.proto.metrics.v1.Metric;
import io.opentelemetry.proto.metrics.v1.NumberDataPoint;
import io.opentelemetry.proto.metrics.v1.ResourceMetrics;
import io.opentelemetry.proto.metrics.v1.ScopeMetrics;
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
import java.util.zip.GZIPInputStream;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.observability.gateway.ObservabilitySignalIntakeGateway;
import org.apache.hertzbeat.observability.ingestion.service.OtlpGrpcIngestionService;
import org.apache.hertzbeat.observability.ingestion.adapter.OtlpLogProtocolAdapter;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationContext;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationEnricher;
import org.apache.hertzbeat.observability.ingestion.forwarder.GreptimeOtlpForwarder;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Unified OTLP ingestion implementation for HTTP and gRPC.
 */
@Slf4j
@Service
public class OtlpGrpcIngestionServiceImpl implements OtlpGrpcIngestionService {

    private static final String CONTENT_TYPE_PROTOBUF = "application/x-protobuf";
    private static final String CONTENT_ENCODING = "Content-Encoding";
    private static final String CONTENT_ENCODING_GZIP = "gzip";
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
    private static final String DEFAULT_METRIC_PROMOTED_RESOURCE_ATTRS = String.join(";",
            "service.name",
            "service.namespace",
            "deployment.environment.name",
            "service.instance.id",
            "host.name",
            "host.id",
            "k8s.cluster.name",
            "k8s.namespace.name",
            "k8s.node.name",
            "k8s.pod.name",
            "k8s.container.name"
    );
    private static final Set<String> OTLP_HEX_ID_FIELDS = Set.of("traceId", "spanId", "parentSpanId");
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
    private final ObservabilitySignalIntakeGateway observabilitySignalIntakeGateway;

    public OtlpGrpcIngestionServiceImpl(RestTemplate restTemplate,
                                        ObjectProvider<GreptimeProperties> greptimePropertiesProvider,
                                        OtlpLogProtocolAdapter otlpLogProtocolAdapter,
                                        GreptimeOtlpForwarder greptimeOtlpForwarder,
                                        OtlpCorrelationEnricher otlpCorrelationEnricher,
                                        @Qualifier("telemetryIntakeServiceImpl")
                                        ObservabilitySignalIntakeGateway observabilitySignalIntakeGateway) {
        this.restTemplate = restTemplate;
        this.greptimePropertiesProvider = greptimePropertiesProvider;
        this.otlpLogProtocolAdapter = otlpLogProtocolAdapter;
        this.greptimeOtlpForwarder = greptimeOtlpForwarder;
        this.otlpCorrelationEnricher = otlpCorrelationEnricher;
        this.observabilitySignalIntakeGateway = observabilitySignalIntakeGateway;
    }

    @Override
    public ResponseEntity<byte[]> ingestMetricsHttp(byte[] content, HttpHeaders requestHeaders) {
        MediaType contentType = requestHeaders.getContentType();
        try {
            ExportMetricsServiceRequest request = decodeMetricsRequest(content, contentType, requestHeaders);
            ResponseEntity<byte[]> response = proxySignalHttp(content, requestHeaders, "/v1/otlp/v1/metrics", false);
            if (response.getStatusCode().is2xxSuccessful()) {
                recordMetricIntake(request);
            }
            return response;
        } catch (StatusRuntimeException ex) {
            HttpStatus status = switch (ex.getStatus().getCode()) {
                case INVALID_ARGUMENT -> HttpStatus.BAD_REQUEST;
                case UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
                default -> HttpStatus.INTERNAL_SERVER_ERROR;
            };
            return errorResponse(contentType, status, ex.getStatus().getDescription());
        }
    }

    @Override
    public ResponseEntity<byte[]> ingestTracesHttp(byte[] content, HttpHeaders requestHeaders) {
        MediaType contentType = requestHeaders.getContentType();
        OtlpCorrelationContext correlationContext = OtlpCorrelationContext.empty();
        try {
            ExportTraceServiceRequest request = normalizeAndEnrichTraceRequest(
                    decodeTraceRequest(content, contentType, requestHeaders), correlationContext);
            ResponseEntity<byte[]> response = proxySignalHttp(
                    content, requestHeaders, "/v1/otlp/v1/traces", true, correlationContext);
            if (response.getStatusCode().is2xxSuccessful()) {
                recordTraceIntake(request);
            }
            return response;
        } catch (StatusRuntimeException ex) {
            HttpStatus status = switch (ex.getStatus().getCode()) {
                case INVALID_ARGUMENT -> HttpStatus.BAD_REQUEST;
                case UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
                default -> HttpStatus.INTERNAL_SERVER_ERROR;
            };
            return errorResponse(contentType, status, ex.getStatus().getDescription());
        }
    }

    @Override
    public ExportMetricsServiceResponse ingestMetricsGrpc(ExportMetricsServiceRequest request) {
        byte[] response = proxySignalBinary(request.toByteArray(), "/v1/otlp/v1/metrics", false);
        recordMetricIntake(request);
        try {
            return response.length == 0 ? ExportMetricsServiceResponse.getDefaultInstance()
                    : ExportMetricsServiceResponse.parseFrom(response);
        } catch (InvalidProtocolBufferException e) {
            throw io.grpc.Status.INTERNAL.withDescription("OTLP metrics response is malformed.").withCause(e)
                    .asRuntimeException();
        }
    }

    @Override
    public ExportLogsServiceResponse ingestLogsGrpc(ExportLogsServiceRequest request) {
        try {
            ExportLogsServiceRequest enrichedRequest = otlpCorrelationEnricher.enrichLogs(
                    request, OtlpCorrelationContext.empty());
            byte[] response = greptimeOtlpForwarder.forwardLogsGrpc(enrichedRequest);
            otlpLogProtocolAdapter.publishRealtimeSignals(enrichedRequest);
            return response.length == 0 ? ExportLogsServiceResponse.getDefaultInstance()
                    : ExportLogsServiceResponse.parseFrom(response);
        } catch (StatusRuntimeException ex) {
            throw ex;
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INTERNAL.withDescription("OTLP logs response is malformed.").withCause(ex)
                    .asRuntimeException();
        } catch (IllegalArgumentException ex) {
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription(defaultErrorMessage(ex)).withCause(ex)
                    .asRuntimeException();
        } catch (Exception ex) {
            throw io.grpc.Status.INTERNAL.withDescription(defaultErrorMessage(ex)).withCause(ex)
                    .asRuntimeException();
        }
    }

    @Override
    public ExportTraceServiceResponse ingestTracesGrpc(ExportTraceServiceRequest request) {
        ExportTraceServiceRequest enrichedRequest = normalizeAndEnrichTraceRequest(
                request, OtlpCorrelationContext.empty());
        byte[] response = proxySignalBinary(enrichedRequest.toByteArray(), "/v1/otlp/v1/traces", true);
        recordTraceIntake(enrichedRequest);
        try {
            return response.length == 0 ? ExportTraceServiceResponse.getDefaultInstance()
                    : ExportTraceServiceResponse.parseFrom(response);
        } catch (InvalidProtocolBufferException e) {
            throw io.grpc.Status.INTERNAL.withDescription("OTLP trace response is malformed.").withCause(e)
                    .asRuntimeException();
        }
    }

    @Override
    public List<String> getGrpcSupportedSignals() {
        return List.of("metrics", "logs", "traces");
    }

    private ExportMetricsServiceRequest decodeMetricsRequest(byte[] content, MediaType contentType, HttpHeaders headers) {
        try {
            byte[] normalizedContent = maybeDecompress(content, headers);
            if (contentType != null && MediaType.APPLICATION_JSON.includes(contentType)) {
                ExportMetricsServiceRequest.Builder builder = ExportMetricsServiceRequest.newBuilder();
                JsonFormat.parser().ignoringUnknownFields()
                        .merge(normalizeOtlpJson(new String(normalizedContent, StandardCharsets.UTF_8)), builder);
                return builder.build();
            }
            return ExportMetricsServiceRequest.parseFrom(normalizedContent);
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription("Malformed OTLP metrics payload.")
                    .withCause(ex).asRuntimeException();
        }
    }

    private ExportTraceServiceRequest decodeTraceRequest(byte[] content, MediaType contentType, HttpHeaders headers) {
        try {
            byte[] normalizedContent = maybeDecompress(content, headers);
            if (contentType != null && MediaType.APPLICATION_JSON.includes(contentType)) {
                ExportTraceServiceRequest.Builder builder = ExportTraceServiceRequest.newBuilder();
                JsonFormat.parser().ignoringUnknownFields()
                        .merge(normalizeOtlpJson(new String(normalizedContent, StandardCharsets.UTF_8)), builder);
                return builder.build();
            }
            return ExportTraceServiceRequest.parseFrom(normalizedContent);
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription("Malformed OTLP trace payload.")
                    .withCause(ex).asRuntimeException();
        }
    }

    private byte[] maybeDecompress(byte[] content, HttpHeaders headers) {
        if (content == null || content.length == 0 || headers == null) {
            return content;
        }
        String contentEncoding = headers.getFirst(CONTENT_ENCODING);
        if (!StringUtils.equalsIgnoreCase(contentEncoding, CONTENT_ENCODING_GZIP)) {
            return content;
        }
        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(content);
             GZIPInputStream gzipInputStream = new GZIPInputStream(inputStream);
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            gzipInputStream.transferTo(outputStream);
            return outputStream.toByteArray();
        } catch (Exception ex) {
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription("Malformed gzip-compressed OTLP payload.")
                    .withCause(ex).asRuntimeException();
        }
    }

    private void recordMetricIntake(ExportMetricsServiceRequest request) {
        if (request == null) {
            return;
        }
        for (ResourceMetrics resourceMetrics : request.getResourceMetricsList()) {
            Map<String, String> resourceAttributes = toStringMap(resourceMetrics.getResource().getAttributesList());
            for (ScopeMetrics scopeMetrics : resourceMetrics.getScopeMetricsList()) {
                for (Metric metric : scopeMetrics.getMetricsList()) {
                    List<MetricObservation> observations = extractMetricObservations(metric);
                    for (MetricObservation observation : observations) {
                        observabilitySignalIntakeGateway.recordOtlpMetricIntake(
                                resourceAttributes,
                                observation.observedAt(),
                                StringUtils.trimToNull(metric.getName()),
                                observation.metricType(),
                                StringUtils.trimToNull(metric.getUnit()),
                                observation.value(),
                                observation.attributes()
                        );
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
            Map<String, String> resourceAttributes = toStringMap(resourceSpans.getResource().getAttributesList());
            for (ScopeSpans scopeSpans : resourceSpans.getScopeSpansList()) {
                for (Span span : scopeSpans.getSpansList()) {
                    observabilitySignalIntakeGateway.recordOtlpTraceIntake(
                            resourceAttributes,
                            nanosToMillis(span.getStartTimeUnixNano()),
                            HexFormat.of().formatHex(span.getTraceId().toByteArray()),
                            HexFormat.of().formatHex(span.getSpanId().toByteArray()),
                            StringUtils.trimToNull(span.getName()),
                            span.getStatus().getCode().name().toLowerCase(Locale.ROOT),
                            toStringMap(span.getAttributesList())
                    );
                }
            }
        }
    }

    private ResponseEntity<byte[]> proxySignalHttp(byte[] content, HttpHeaders requestHeaders, String path,
                                                   boolean traceSignal) {
        return proxySignalHttp(content, requestHeaders, path, traceSignal, OtlpCorrelationContext.empty());
    }

    private ResponseEntity<byte[]> proxySignalHttp(byte[] content, HttpHeaders requestHeaders, String path,
                                                   boolean traceSignal, OtlpCorrelationContext correlationContext) {
        MediaType contentType = requestHeaders.getContentType();
        try {
            byte[] responseBody = proxySignalInternal(content, path, traceSignal, contentType,
                    requestHeaders.getAccept(), requestHeaders, correlationContext);
            return ResponseEntity.ok()
                    .contentType(resolveResponseContentType(contentType, requestHeaders.getAccept()))
                    .body(responseBody);
        } catch (StatusRuntimeException ex) {
            HttpStatus status = switch (ex.getStatus().getCode()) {
                case INVALID_ARGUMENT -> HttpStatus.BAD_REQUEST;
                case UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
                default -> HttpStatus.INTERNAL_SERVER_ERROR;
            };
            return errorResponse(contentType, status, ex.getStatus().getDescription());
        }
    }

    private byte[] proxySignalBinary(byte[] content, String path, boolean traceSignal) {
        return proxySignalInternal(content, path, traceSignal,
                MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF),
                List.of(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF)),
                null,
                OtlpCorrelationContext.empty());
    }

    private byte[] proxySignalInternal(byte[] content, String path, boolean traceSignal,
                                       MediaType contentType, List<MediaType> acceptTypes,
                                       HttpHeaders requestHeaders, OtlpCorrelationContext correlationContext) {
        GreptimeProperties greptimeProperties = greptimePropertiesProvider.getIfAvailable();
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
            if (contentType != null) {
                upstreamHeaders.setContentType(resolveUpstreamContentType(contentType));
            }
            if (clientExpectsJson) {
                upstreamHeaders.setAccept(List.of(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF)));
            } else if (acceptTypes != null && !acceptTypes.isEmpty()) {
                upstreamHeaders.setAccept(acceptTypes);
            }
            upstreamHeaders.set(GREPTIME_DB_NAME_HEADER,
                    StringUtils.defaultIfBlank(greptimeProperties.database(), DEFAULT_GREPTIME_DB_NAME));
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

            ResponseEntity<byte[]> response = restTemplate.exchange(
                    greptimeProperties.httpEndpoint() + path,
                    HttpMethod.POST,
                    new HttpEntity<>(upstreamContent, upstreamHeaders),
                    byte[].class
            );
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw io.grpc.Status.UNAVAILABLE.withDescription("OTLP backend returned " + response.getStatusCode())
                        .asRuntimeException();
            }
            byte[] responseBody = response.getBody() == null ? new byte[0] : response.getBody();
            if (!clientExpectsJson) {
                return responseBody;
            }
            return normalizeResponseBodyForClient(responseBody, traceSignal);
        } catch (RestClientException ex) {
            log.error("Failed to proxy OTLP signal {}: {}", traceSignal ? "traces" : "metrics", ex.getMessage(), ex);
            throw io.grpc.Status.UNAVAILABLE.withDescription(defaultErrorMessage(ex)).withCause(ex)
                    .asRuntimeException();
        }
    }

    private byte[] normalizeRequestBodyForUpstream(byte[] content, MediaType contentType, boolean traceSignal,
                                                   HttpHeaders requestHeaders,
                                                   OtlpCorrelationContext correlationContext) {
        byte[] normalizedContent = maybeDecompress(content, requestHeaders);
        if (contentType == null || !MediaType.APPLICATION_JSON.includes(contentType)) {
            if (!traceSignal) {
                return normalizedContent;
            }
            try {
                return normalizeAndEnrichTraceRequest(
                        ExportTraceServiceRequest.parseFrom(normalizedContent), correlationContext).toByteArray();
            } catch (InvalidProtocolBufferException ex) {
                throw io.grpc.Status.INVALID_ARGUMENT.withDescription("Malformed OTLP trace payload.")
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
            return builder.build().toByteArray();
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INVALID_ARGUMENT.withDescription("Malformed OTLP JSON request.")
                    .withCause(ex).asRuntimeException();
        }
    }

    private ExportTraceServiceRequest normalizeAndEnrichTraceRequest(ExportTraceServiceRequest request,
                                                                     OtlpCorrelationContext correlationContext) {
        ExportTraceServiceRequest normalized = normalizeTraceRequest(request);
        return otlpCorrelationEnricher.enrichTraces(normalized, correlationContext);
    }

    private MediaType resolveUpstreamContentType(MediaType contentType) {
        if (MediaType.APPLICATION_JSON.includes(contentType)) {
            return MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF);
        }
        return contentType;
    }

    private boolean acceptsJson(MediaType requestContentType, List<MediaType> acceptTypes) {
        if (acceptTypes != null && acceptTypes.stream().anyMatch(mediaType -> mediaType.includes(MediaType.APPLICATION_JSON))) {
            return true;
        }
        return requestContentType != null && MediaType.APPLICATION_JSON.includes(requestContentType);
    }

    private byte[] normalizeResponseBodyForClient(byte[] upstreamBody, boolean traceSignal) {
        try {
            Message response;
            if (traceSignal) {
                response = upstreamBody.length == 0
                        ? ExportTraceServiceResponse.getDefaultInstance()
                        : ExportTraceServiceResponse.parseFrom(upstreamBody);
            } else {
                response = upstreamBody.length == 0
                        ? ExportMetricsServiceResponse.getDefaultInstance()
                        : ExportMetricsServiceResponse.parseFrom(upstreamBody);
            }
            return JsonFormat.printer().print(response).getBytes(StandardCharsets.UTF_8);
        } catch (InvalidProtocolBufferException ex) {
            throw io.grpc.Status.INTERNAL.withDescription("OTLP backend response is malformed.")
                    .withCause(ex).asRuntimeException();
        }
    }

    private void addAuthenticationHeader(HttpHeaders headers, GreptimeProperties greptimeProperties) {
        if (StringUtils.isBlank(greptimeProperties.username()) || StringUtils.isBlank(greptimeProperties.password())) {
            return;
        }
        String credentials = greptimeProperties.username() + ":" + greptimeProperties.password();
        String encodedCredentials = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + encodedCredentials);
    }

    private MediaType resolveResponseContentType(MediaType requestContentType, List<MediaType> acceptTypes) {
        if (acceptTypes != null && acceptTypes.stream().anyMatch(mediaType -> mediaType.includes(MediaType.APPLICATION_JSON))) {
            return MediaType.APPLICATION_JSON;
        }
        if (requestContentType != null && MediaType.APPLICATION_JSON.includes(requestContentType)) {
            return MediaType.APPLICATION_JSON;
        }
        return MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF);
    }

    private ResponseEntity<byte[]> errorResponse(MediaType contentType, HttpStatus status, String message) {
        String errorMessage = StringUtils.defaultIfBlank(message, "OTLP signal ingestion failed.");
        if (contentType != null && MediaType.APPLICATION_JSON.includes(contentType)) {
            return ResponseEntity.status(status)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(toJsonErrorResponse(errorMessage));
        }
        return ResponseEntity.status(status)
                .contentType(MediaType.parseMediaType(CONTENT_TYPE_PROTOBUF))
                .body(toBinaryErrorResponse(errorMessage));
    }

    private byte[] toBinaryErrorResponse(String message) {
        return Status.newBuilder().setMessage(message).build().toByteArray();
    }

    private byte[] toJsonErrorResponse(String message) {
        try {
            return JsonFormat.printer().print(Status.newBuilder().setMessage(message).build())
                    .getBytes(StandardCharsets.UTF_8);
        } catch (InvalidProtocolBufferException e) {
            return ("{\"message\":\"" + message + "\"}").getBytes(StandardCharsets.UTF_8);
        }
    }

    private String defaultErrorMessage(Exception ex) {
        return StringUtils.defaultIfBlank(ex.getMessage(), "OTLP signal ingestion failed.");
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
                "unsupported", "未知 OTLP metric 类型，当前未被 HertzBeat facade 识别。")));
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
                "Histogram 指标已写入 Greptime，但 HertzBeat 当前 facade 仅保留代表值与 bucket/bounds 元信息，未提供完整 histogram 查询语义。"
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
                "Greptime 当前 OTLP metrics 数据模型不支持 ExponentialHistogram；HertzBeat 仅保留代表值与兼容性元信息。"
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
                "Summary quantiles 语义受 Greptime 数据模型与当前 HertzBeat facade 限制，当前仅保留 summary/quantiles 元信息。"
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
            metadata.put(OTLP_METRIC_GREPTIME_REASON, "Greptime 当前 OTLP metrics 数据模型支持该类型。");
        } else if ("partial".equals(greptimeCompatibility)) {
            metadata.put(OTLP_METRIC_GREPTIME_REASON, "Greptime 当前 OTLP metrics 数据模型仅部分保留该类型语义。");
        } else {
            metadata.put(OTLP_METRIC_GREPTIME_REASON, "Greptime 当前 OTLP metrics 数据模型不支持该类型。");
        }
        if ("supported".equals(facadeCompatibility)) {
            metadata.put(OTLP_METRIC_FACADE_REASON, "HertzBeat 当前 facade 可直接消费该类型。");
        } else if ("partial".equals(facadeCompatibility)) {
            metadata.put(OTLP_METRIC_FACADE_REASON, "HertzBeat 当前 facade 仅保留代表值与兼容元信息。");
        } else {
            metadata.put(OTLP_METRIC_FACADE_REASON, "HertzBeat 当前 facade 不支持该类型。");
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
