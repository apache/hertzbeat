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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.protobuf.util.JsonFormat;
import io.grpc.StatusRuntimeException;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse;
import io.opentelemetry.proto.metrics.v1.AggregationTemporality;
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
import java.util.HexFormat;
import java.util.List;
import java.util.zip.GZIPOutputStream;
import org.apache.hertzbeat.common.observability.gateway.ObservabilitySignalIntakeGateway;
import org.apache.hertzbeat.observability.ingestion.adapter.OtlpLogProtocolAdapter;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationContext;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationEnricher;
import org.apache.hertzbeat.observability.ingestion.forwarder.GreptimeOtlpForwarder;
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

    private OtlpGrpcIngestionServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new OtlpGrpcIngestionServiceImpl(restTemplate, greptimePropertiesProvider, otlpLogProtocolAdapter,
                greptimeOtlpForwarder, otlpCorrelationEnricher, observabilitySignalIntakeGateway);
        org.mockito.Mockito.lenient()
                .when(otlpCorrelationEnricher.enrichTraces(any(ExportTraceServiceRequest.class),
                        any(OtlpCorrelationContext.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
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
                    return promotedAttrs.contains("service.name")
                            && promotedAttrs.contains("service.namespace")
                            && promotedAttrs.contains("deployment.environment.name")
                            && promotedAttrs.contains("service.instance.id");
                }),
                eq(byte[].class)
        );
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
}
