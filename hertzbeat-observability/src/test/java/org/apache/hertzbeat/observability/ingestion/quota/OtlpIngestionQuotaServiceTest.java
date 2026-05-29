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

package org.apache.hertzbeat.observability.ingestion.quota;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
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
import io.opentelemetry.proto.trace.v1.ResourceSpans;
import io.opentelemetry.proto.trace.v1.ScopeSpans;
import io.opentelemetry.proto.trace.v1.Span;
import org.junit.jupiter.api.Test;

class OtlpIngestionQuotaServiceTest {

    @Test
    void allowsPayloadWithinLimitAndUnlimitedLimit() {
        assertDoesNotThrow(() -> new OtlpIngestionQuotaService(3L)
                .checkRequestBytes("metrics", "grpc", 3L));
        assertDoesNotThrow(() -> new OtlpIngestionQuotaService(0L)
                .checkRequestBytes("logs", "http", Long.MAX_VALUE));
        assertDoesNotThrow(() -> new OtlpIngestionQuotaService(-1L)
                .checkRequestBytes("traces", "grpc", Long.MAX_VALUE));
    }

    @Test
    void rejectsPayloadOverLimitWithResourceExhaustedStatus() {
        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> new OtlpIngestionQuotaService(2L).checkRequestBytes("metrics", "grpc", 3L));

        assertEquals(Status.Code.RESOURCE_EXHAUSTED, Status.fromThrowable(exception).getCode());
        assertEquals("OTLP metrics grpc payload exceeds 2 bytes.", Status.fromThrowable(exception).getDescription());
    }

    @Test
    void allowsSignalItemsWithinLimitAndUnlimitedLimit() {
        assertDoesNotThrow(() -> new OtlpIngestionQuotaService(Long.MAX_VALUE, 2L)
                .checkMetricItems("grpc", metricsRequestWithDataPoints(2)));
        assertDoesNotThrow(() -> new OtlpIngestionQuotaService(Long.MAX_VALUE, 0L)
                .checkTraceItems("http", tracesRequestWithSpans(3)));
        assertDoesNotThrow(() -> new OtlpIngestionQuotaService(Long.MAX_VALUE, -1L)
                .checkLogItems("grpc", logsRequestWithRecords(3)));
    }

    @Test
    void rejectsSignalItemsOverLimitWithResourceExhaustedStatus() {
        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> new OtlpIngestionQuotaService(Long.MAX_VALUE, 1L)
                        .checkLogItems("http", logsRequestWithRecords(2)));

        assertEquals(Status.Code.RESOURCE_EXHAUSTED, Status.fromThrowable(exception).getCode());
        assertEquals("OTLP logs http batch exceeds 1 signal items.",
                Status.fromThrowable(exception).getDescription());
    }

    @Test
    void countsTraceSpanEventsAndLinksForBatchBackpressure() {
        ExportTraceServiceRequest request = ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .addScopeSpans(ScopeSpans.newBuilder()
                                .addSpans(Span.newBuilder()
                                        .setName("checkout")
                                        .addEvents(Span.Event.newBuilder().setName("event-a").build())
                                        .addEvents(Span.Event.newBuilder().setName("event-b").build())
                                        .addLinks(Span.Link.newBuilder().build())
                                        .addLinks(Span.Link.newBuilder().build())
                                        .build())
                                .build())
                        .build())
                .build();
        OtlpIngestionQuotaService quotaService = new OtlpIngestionQuotaService(Long.MAX_VALUE, 4L);

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> quotaService.checkTraceItems("grpc", request));

        assertEquals(5L, quotaService.countTraceItems(request));
        assertEquals(Status.Code.RESOURCE_EXHAUSTED, Status.fromThrowable(exception).getCode());
        assertEquals("OTLP traces grpc batch exceeds 4 signal items.",
                Status.fromThrowable(exception).getDescription());
    }

    @Test
    void countsMetricExemplarsForBatchBackpressure() {
        ExportMetricsServiceRequest request = ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder()
                                        .setGauge(Gauge.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setAsDouble(1D)
                                                        .addExemplars(Exemplar.newBuilder().setAsDouble(1D).build())
                                                        .addExemplars(Exemplar.newBuilder().setAsDouble(2D).build())
                                                        .build())
                                                .build())
                                        .build())
                                .addMetrics(Metric.newBuilder()
                                        .setSum(Sum.newBuilder()
                                                .addDataPoints(NumberDataPoint.newBuilder()
                                                        .setAsDouble(2D)
                                                        .addExemplars(Exemplar.newBuilder().setAsDouble(3D).build())
                                                        .build())
                                                .build())
                                        .build())
                                .addMetrics(Metric.newBuilder()
                                        .setHistogram(Histogram.newBuilder()
                                                .addDataPoints(HistogramDataPoint.newBuilder()
                                                        .addExemplars(Exemplar.newBuilder().setAsDouble(4D).build())
                                                        .build())
                                                .build())
                                        .build())
                                .addMetrics(Metric.newBuilder()
                                        .setExponentialHistogram(ExponentialHistogram.newBuilder()
                                                .addDataPoints(ExponentialHistogramDataPoint.newBuilder()
                                                        .addExemplars(Exemplar.newBuilder().setAsDouble(5D).build())
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build();
        OtlpIngestionQuotaService quotaService = new OtlpIngestionQuotaService(Long.MAX_VALUE, 8L);

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> quotaService.checkMetricItems("grpc", request));

        assertEquals(9L, quotaService.countMetricItems(request));
        assertEquals(Status.Code.RESOURCE_EXHAUSTED, Status.fromThrowable(exception).getCode());
        assertEquals("OTLP metrics grpc batch exceeds 8 signal items.",
                Status.fromThrowable(exception).getDescription());
    }

    @Test
    void allowsSignalItemsWhenHeapPressureIsBelowLimitOrDisabled() {
        assertDoesNotThrow(() -> new OtlpIngestionQuotaService(Long.MAX_VALUE, Long.MAX_VALUE, 0.75D, () -> 0.74D)
                .checkMetricItems("grpc", metricsRequestWithDataPoints(1)));
        assertDoesNotThrow(() -> new OtlpIngestionQuotaService(Long.MAX_VALUE, Long.MAX_VALUE, 0D, () -> 0.99D)
                .checkTraceItems("http", tracesRequestWithSpans(1)));
    }

    @Test
    void ignoresInvalidHeapPressureLimitInsteadOfPausingIngest() {
        assertDoesNotThrow(() -> new OtlpIngestionQuotaService(
                Long.MAX_VALUE, Long.MAX_VALUE, Double.NaN, () -> 0.99D)
                .checkLogItems("http", logsRequestWithRecords(1)));
    }

    @Test
    void rejectsSignalItemsWhenHeapPressureMeetsLimitWithResourceExhaustedStatus() {
        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> new OtlpIngestionQuotaService(Long.MAX_VALUE, Long.MAX_VALUE, 0.75D, () -> 0.76D)
                        .checkMetricItems("grpc", metricsRequestWithDataPoints(1)));

        assertEquals(Status.Code.RESOURCE_EXHAUSTED, Status.fromThrowable(exception).getCode());
        assertEquals("OTLP metrics grpc ingestion paused because heap usage is 76% (limit 75%).",
                Status.fromThrowable(exception).getDescription());
    }

    @Test
    void rejectsRequestBytesWhenHeapPressureMeetsLimitBeforePayloadDecoding() {
        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> new OtlpIngestionQuotaService(Long.MAX_VALUE, Long.MAX_VALUE, 0.75D, () -> 0.80D)
                        .checkRequestBytes("logs", "http", 512L));

        assertEquals(Status.Code.RESOURCE_EXHAUSTED, Status.fromThrowable(exception).getCode());
        assertEquals("OTLP logs http ingestion paused because heap usage is 80% (limit 75%).",
                Status.fromThrowable(exception).getDescription());
    }

    private ExportMetricsServiceRequest metricsRequestWithDataPoints(int count) {
        Gauge.Builder gauge = Gauge.newBuilder();
        for (int index = 0; index < count; index++) {
            gauge.addDataPoints(NumberDataPoint.newBuilder().setAsDouble(index).build());
        }
        return ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder().setGauge(gauge).build())
                                .build())
                        .build())
                .build();
    }

    private ExportTraceServiceRequest tracesRequestWithSpans(int count) {
        ScopeSpans.Builder scopeSpans = ScopeSpans.newBuilder();
        for (int index = 0; index < count; index++) {
            scopeSpans.addSpans(Span.newBuilder().setName("span-" + index).build());
        }
        return ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder().addScopeSpans(scopeSpans).build())
                .build();
    }

    private ExportLogsServiceRequest logsRequestWithRecords(int count) {
        ScopeLogs.Builder scopeLogs = ScopeLogs.newBuilder();
        for (int index = 0; index < count; index++) {
            scopeLogs.addLogRecords(LogRecord.newBuilder().build());
        }
        return ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder().addScopeLogs(scopeLogs).build())
                .build();
    }
}
