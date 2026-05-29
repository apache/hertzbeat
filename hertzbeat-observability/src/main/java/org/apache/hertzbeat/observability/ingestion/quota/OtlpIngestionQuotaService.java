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

import io.grpc.Status;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
import io.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint;
import io.opentelemetry.proto.metrics.v1.HistogramDataPoint;
import io.opentelemetry.proto.metrics.v1.Metric;
import io.opentelemetry.proto.metrics.v1.NumberDataPoint;
import io.opentelemetry.proto.metrics.v1.ResourceMetrics;
import io.opentelemetry.proto.metrics.v1.ScopeMetrics;
import io.opentelemetry.proto.trace.v1.ResourceSpans;
import io.opentelemetry.proto.trace.v1.ScopeSpans;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryUsage;
import java.util.List;
import java.util.function.DoubleSupplier;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Shared OTLP ingest quota and backpressure guard.
 */
@Service
public class OtlpIngestionQuotaService {

    private final long maxRequestBytes;

    private final long maxSignalItems;

    private final double maxHeapUsageRatio;

    private final DoubleSupplier heapUsageRatioSupplier;

    @Autowired
    public OtlpIngestionQuotaService(
            @Value("${hertzbeat.otlp.ingestion.max-request-bytes:10485760}") long maxRequestBytes,
            @Value("${hertzbeat.otlp.ingestion.max-signal-items:100000}") long maxSignalItems,
            @Value("${hertzbeat.otlp.ingestion.max-heap-usage-ratio:0.95}") double maxHeapUsageRatio) {
        this(maxRequestBytes, maxSignalItems, maxHeapUsageRatio,
                OtlpIngestionQuotaService::currentJvmHeapUsageRatio);
    }

    public OtlpIngestionQuotaService(long maxRequestBytes) {
        this(maxRequestBytes, Long.MAX_VALUE);
    }

    public OtlpIngestionQuotaService(long maxRequestBytes, long maxSignalItems) {
        this(maxRequestBytes, maxSignalItems, 0D, () -> 0D);
    }

    public OtlpIngestionQuotaService(long maxRequestBytes, long maxSignalItems, double maxHeapUsageRatio,
                                     DoubleSupplier heapUsageRatioSupplier) {
        this.maxRequestBytes = maxRequestBytes;
        this.maxSignalItems = maxSignalItems;
        this.maxHeapUsageRatio = maxHeapUsageRatio;
        this.heapUsageRatioSupplier = heapUsageRatioSupplier;
    }

    public void checkRequestBytes(String signal, String protocol, long requestBytes) {
        if (maxRequestBytes > 0 && Math.max(requestBytes, 0L) > maxRequestBytes) {
            throw Status.RESOURCE_EXHAUSTED
                    .withDescription("OTLP " + dimension(signal) + " " + dimension(protocol)
                            + " payload exceeds " + maxRequestBytes + " bytes.")
                    .asRuntimeException();
        }
        checkMemoryPressure(signal, protocol);
    }

    public void checkMetricItems(String protocol, ExportMetricsServiceRequest request) {
        checkSignalItems("metrics", protocol, countMetricItems(request));
    }

    public void checkMetricItems(String protocol, long signalItems) {
        checkSignalItems("metrics", protocol, signalItems);
    }

    public void checkTraceItems(String protocol, ExportTraceServiceRequest request) {
        checkSignalItems("traces", protocol, countTraceItems(request));
    }

    public void checkTraceItems(String protocol, long signalItems) {
        checkSignalItems("traces", protocol, signalItems);
    }

    public void checkLogItems(String protocol, ExportLogsServiceRequest request) {
        checkSignalItems("logs", protocol, countLogItems(request));
    }

    public void checkLogItems(String protocol, long signalItems) {
        checkSignalItems("logs", protocol, signalItems);
    }

    private void checkSignalItems(String signal, String protocol, long signalItems) {
        if (maxSignalItems <= 0 || Math.max(signalItems, 0L) <= maxSignalItems) {
            checkMemoryPressure(signal, protocol);
            return;
        }
        throw Status.RESOURCE_EXHAUSTED
                .withDescription("OTLP " + dimension(signal) + " " + dimension(protocol)
                        + " batch exceeds " + maxSignalItems + " signal items.")
                .asRuntimeException();
    }

    private void checkMemoryPressure(String signal, String protocol) {
        if (!isValidHeapPressureLimit()) {
            return;
        }
        double heapUsageRatio = currentHeapUsageRatio();
        if (heapUsageRatio < maxHeapUsageRatio) {
            return;
        }
        throw Status.RESOURCE_EXHAUSTED
                .withDescription("OTLP " + dimension(signal) + " " + dimension(protocol)
                        + " ingestion paused because heap usage is " + percent(heapUsageRatio)
                        + "% (limit " + percent(maxHeapUsageRatio) + "%).")
                .asRuntimeException();
    }

    private boolean isValidHeapPressureLimit() {
        return !Double.isNaN(maxHeapUsageRatio)
                && !Double.isInfinite(maxHeapUsageRatio)
                && maxHeapUsageRatio > 0D
                && maxHeapUsageRatio <= 1D;
    }

    public long countMetricItems(ExportMetricsServiceRequest request) {
        if (request == null) {
            return 0L;
        }
        long count = 0L;
        for (ResourceMetrics resourceMetrics : request.getResourceMetricsList()) {
            for (ScopeMetrics scopeMetrics : resourceMetrics.getScopeMetricsList()) {
                for (Metric metric : scopeMetrics.getMetricsList()) {
                    count += countMetricDataPoints(metric);
                }
            }
        }
        return count;
    }

    private long countMetricDataPoints(Metric metric) {
        if (metric == null) {
            return 0L;
        }
        if (metric.hasGauge()) {
            return countNumberDataPoints(metric.getGauge().getDataPointsList());
        }
        if (metric.hasSum()) {
            return countNumberDataPoints(metric.getSum().getDataPointsList());
        }
        if (metric.hasHistogram()) {
            return countHistogramDataPoints(metric.getHistogram().getDataPointsList());
        }
        if (metric.hasExponentialHistogram()) {
            return countExponentialHistogramDataPoints(metric.getExponentialHistogram()
                    .getDataPointsList());
        }
        if (metric.hasSummary()) {
            return metric.getSummary().getDataPointsCount();
        }
        return 1L;
    }

    private long countNumberDataPoints(List<NumberDataPoint> dataPoints) {
        long count = 0L;
        for (NumberDataPoint dataPoint : dataPoints) {
            count += 1L + dataPoint.getExemplarsCount();
        }
        return count;
    }

    private long countHistogramDataPoints(List<HistogramDataPoint> dataPoints) {
        long count = 0L;
        for (HistogramDataPoint dataPoint : dataPoints) {
            count += 1L + dataPoint.getExemplarsCount();
        }
        return count;
    }

    private long countExponentialHistogramDataPoints(List<ExponentialHistogramDataPoint> dataPoints) {
        long count = 0L;
        for (ExponentialHistogramDataPoint dataPoint : dataPoints) {
            count += 1L + dataPoint.getExemplarsCount();
        }
        return count;
    }

    public long countTraceItems(ExportTraceServiceRequest request) {
        if (request == null) {
            return 0L;
        }
        long count = 0L;
        for (ResourceSpans resourceSpans : request.getResourceSpansList()) {
            for (ScopeSpans scopeSpans : resourceSpans.getScopeSpansList()) {
                for (var span : scopeSpans.getSpansList()) {
                    count += 1L + span.getEventsCount() + span.getLinksCount();
                }
            }
        }
        return count;
    }

    public long countLogItems(ExportLogsServiceRequest request) {
        if (request == null) {
            return 0L;
        }
        long count = 0L;
        for (ResourceLogs resourceLogs : request.getResourceLogsList()) {
            for (ScopeLogs scopeLogs : resourceLogs.getScopeLogsList()) {
                count += scopeLogs.getLogRecordsCount();
            }
        }
        return count;
    }

    private String dimension(String value) {
        return StringUtils.defaultIfBlank(StringUtils.trimToNull(value), "signal");
    }

    private double currentHeapUsageRatio() {
        if (heapUsageRatioSupplier == null) {
            return 0D;
        }
        try {
            double heapUsageRatio = heapUsageRatioSupplier.getAsDouble();
            if (Double.isNaN(heapUsageRatio) || Double.isInfinite(heapUsageRatio) || heapUsageRatio < 0D) {
                return 0D;
            }
            return Math.min(heapUsageRatio, 1D);
        } catch (RuntimeException ex) {
            return 0D;
        }
    }

    private long percent(double ratio) {
        return Math.round(Math.max(0D, ratio) * 100D);
    }

    private static double currentJvmHeapUsageRatio() {
        MemoryUsage heapMemoryUsage = ManagementFactory.getMemoryMXBean().getHeapMemoryUsage();
        long max = heapMemoryUsage.getMax();
        long used = heapMemoryUsage.getUsed();
        if (max <= 0L || used <= 0L) {
            return 0D;
        }
        return (double) used / max;
    }
}
