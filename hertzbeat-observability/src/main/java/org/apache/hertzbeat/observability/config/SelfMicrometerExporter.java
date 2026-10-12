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

package org.apache.hertzbeat.observability.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.metrics.v1.AggregationTemporality;
import io.opentelemetry.proto.metrics.v1.Metric;
import io.opentelemetry.proto.metrics.v1.NumberDataPoint;
import io.opentelemetry.proto.metrics.v1.ResourceMetrics;
import io.opentelemetry.proto.metrics.v1.ScopeMetrics;
import io.opentelemetry.proto.resource.v1.Resource;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Comparator;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.common.observability.gateway.SelfTelemetryProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

/** Bounded, real Micrometer gauge/counter sampling to the trusted self OTLP destination. */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class SelfMicrometerExporter {
    private final SelfTelemetryProperties self;
    private final GreptimeProperties greptime;
    private final ObjectProvider<MeterRegistry> registries;
    private final RestTemplate client;
    private volatile boolean exportFailed;
    private final long startNanos = TimeUnit.MILLISECONDS.toNanos(System.currentTimeMillis());
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(task -> {
        Thread thread = new Thread(task, "hertzbeat-self-metrics");
        thread.setDaemon(true);
        return thread;
    });

    public SelfMicrometerExporter(SelfTelemetryProperties self, GreptimeProperties greptime,
            ObjectProvider<MeterRegistry> registries, SelfTelemetryInitializer initializer) {
        this.self = self;
        this.greptime = greptime;
        this.registries = registries;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(5));
        client = new RestTemplate(factory);
    }

    @PostConstruct
    public void start() {
        if (self.isReady()) {
            scheduler.scheduleWithFixedDelay(this::sampleSafely, 30, 30, TimeUnit.SECONDS);
        }
    }

    private void sampleSafely() {
        try {
            exportOnce();
        } catch (RuntimeException failure) {
            // Never emit an instrumented request or recursive log for exporter failures.
            exportFailed = true;
        }
    }

    /** Exposed for isolated storage integration tests and explicit operational sampling. */
    public void exportOnce() {
        if (!self.isReady()) {
            return;
        }
        MeterRegistry registry = registries.orderedStream().findFirst().orElse(null);
        if (registry == null) {
            return;
        }
        ExportMetricsServiceRequest request = snapshot(registry, self.getWorkspaceId(), startNanos);
        if (request.getResourceMetrics(0).getScopeMetrics(0).getMetricsCount() == 0) {
            return;
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        headers.set("X-Greptime-DB-Name", self.getDatabase());
        headers.set("X-Greptime-OTLP-Metric-Promote-Resource-Attrs", "service.name;hertzbeat.workspace_id");
        if (StringUtils.hasText(greptime.username()) && StringUtils.hasText(greptime.password())) {
            headers.setBasicAuth(greptime.username(), greptime.password(), StandardCharsets.UTF_8);
        }
        client.postForEntity(greptime.httpEndpoint().replaceAll("/+$", "") + "/v1/otlp/v1/metrics",
                new HttpEntity<>(request.toByteArray(), headers), String.class);
        exportFailed = false;
    }

    /** Readiness distinguishes unavailable instrumentation from a valid empty result. */
    public String getStatus() {
        if (!self.isReady()) {
            return "NOT_READY";
        }
        if (registries.orderedStream().findFirst().isEmpty()) {
            return "REGISTRY_UNAVAILABLE";
        }
        return exportFailed ? "EXPORT_FAILED" : "READY";
    }

    /** Samples actual values without interpreting resource labels as authorization. */
    public static ExportMetricsServiceRequest snapshot(MeterRegistry registry, String workspace, long startNanos) {
        ScopeMetrics.Builder scope = ScopeMetrics.newBuilder();
        long now = TimeUnit.MILLISECONDS.toNanos(System.currentTimeMillis());
        registry.getMeters().stream().filter(meter -> meter instanceof Gauge || meter instanceof Counter)
                .sorted(Comparator.comparing(meter -> meter.getId().getName()))
                .limit(512).forEach(meter -> {
                    double value = meter instanceof Gauge gauge ? gauge.value() : ((Counter) meter).count();
                    if (!Double.isFinite(value)) {
                        return;
                    }
                    NumberDataPoint.Builder point = NumberDataPoint.newBuilder().setTimeUnixNano(now)
                            .setStartTimeUnixNano(startNanos).setAsDouble(value);
                    meter.getId().getTags().stream().filter(tag -> !tag.getKey().equals("hertzbeat.workspace_id")
                            && !tag.getKey().equals("hertzbeat_workspace_id") && !tag.getKey().equals("service.name")
                            && !tag.getKey().equals("service_name")).limit(30)
                            .forEach(tag -> point.addAttributes(attribute(tag.getKey(), tag.getValue())));
                    point.addAttributes(attribute("hertzbeat_workspace_id", workspace));
                    point.addAttributes(attribute("service_name", "HertzBeat"));
                    Metric.Builder metric = Metric.newBuilder().setName(meter.getId().getName())
                            .setDescription(meter.getId().getDescription() == null ? "" : meter.getId().getDescription())
                            .setUnit(meter.getId().getBaseUnit() == null ? "" : meter.getId().getBaseUnit());
                    if (meter instanceof Counter) {
                        metric.setSum(io.opentelemetry.proto.metrics.v1.Sum.newBuilder().setIsMonotonic(true)
                                .setAggregationTemporality(AggregationTemporality.AGGREGATION_TEMPORALITY_CUMULATIVE)
                                .addDataPoints(point));
                    } else {
                        metric.setGauge(io.opentelemetry.proto.metrics.v1.Gauge.newBuilder().addDataPoints(point));
                    }
                    scope.addMetrics(metric);
                });
        Resource resource = Resource.newBuilder().addAttributes(attribute("service.name", "HertzBeat"))
                .addAttributes(attribute("hertzbeat.workspace_id", workspace)).build();
        return ExportMetricsServiceRequest.newBuilder().addResourceMetrics(ResourceMetrics.newBuilder()
                .setResource(resource).addScopeMetrics(scope)).build();
    }

    private static KeyValue attribute(String key, String value) {
        return KeyValue.newBuilder().setKey(key).setValue(AnyValue.newBuilder().setStringValue(value)).build();
    }

    @PreDestroy
    public void close() {
        scheduler.shutdownNow();
    }
}
