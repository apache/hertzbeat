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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class SelfMicrometerExporterTest {
    @Test
    void samplesActualValuesAndForcesTrustedWorkspaceOverMeterTags() throws Exception {
        {
            SimpleMeterRegistry registry = new SimpleMeterRegistry();
            AtomicInteger value = new AtomicInteger(17);
            Gauge.builder("process.sample", value, AtomicInteger::doubleValue)
                    .tag("hertzbeat_workspace_id", "forged").tag("service_name", "forged").register(registry);
            Counter counter = registry.counter("requests.sample");
            counter.increment(29);
            var request = ExportMetricsServiceRequest.parseFrom(
                    SelfMicrometerExporter.snapshot(registry, "workspace-one", 123).toByteArray());
            var scope = request.getResourceMetrics(0).getScopeMetrics(0);
            assertEquals(2, scope.getMetricsCount());
            var gauge = scope.getMetrics(0).getGauge().getDataPoints(0);
            assertEquals(17, gauge.getAsDouble());
            assertTrue(gauge.getAttributesList().stream().anyMatch(attribute ->
                    attribute.getKey().equals("hertzbeat_workspace_id")
                            && attribute.getValue().getStringValue().equals("workspace-one")));
            assertTrue(gauge.getAttributesList().stream().noneMatch(attribute ->
                    attribute.getValue().getStringValue().equals("forged")));
            assertEquals(29, scope.getMetrics(1).getSum().getDataPoints(0).getAsDouble());
            assertTrue(scope.getMetrics(1).getSum().getIsMonotonic());
            value.set(42);
            assertEquals(42, SelfMicrometerExporter.snapshot(registry, "workspace-one", 123)
                    .getResourceMetrics(0).getScopeMetrics(0).getMetrics(0).getGauge().getDataPoints(0).getAsDouble());
        }
    }

    @Test
    void boundsSeriesAndSkipsNonFiniteMeasurements() {
        {
            SimpleMeterRegistry registry = new SimpleMeterRegistry();
            for (int index = 0; index < 600; index++) {
                registry.counter("metric." + index).increment();
            }
            assertEquals(512, SelfMicrometerExporter.snapshot(registry, "workspace-one", 123)
                    .getResourceMetrics(0).getScopeMetrics(0).getMetricsCount());
        }
        {
            SimpleMeterRegistry registry = new SimpleMeterRegistry();
            Gauge.builder("invalid", () -> Double.NaN).register(registry);
            assertEquals(0, SelfMicrometerExporter.snapshot(registry, "workspace-one", 123)
                    .getResourceMetrics(0).getScopeMetrics(0).getMetricsCount());
        }
    }
}
