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

package org.apache.hertzbeat.collector.runtime.otel;

import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.resource.v1.Resource;
import io.opentelemetry.proto.trace.v1.Span;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Predicate;
import java.util.stream.Stream;

final class OtelInteropCaptureAssertions {

    private OtelInteropCaptureAssertions() {
    }

    static boolean hasMetric(
            OtelRuntimeTestSupport.OtlpCapture capture,
            Map<String, String> expectedResource,
            String metricName) {
        return capture.bodies("metrics").stream().flatMap(body -> {
            try {
                return ExportMetricsServiceRequest.parseFrom(body).getResourceMetricsList().stream();
            } catch (Exception ignored) {
                return Stream.empty();
            }
        }).filter(metrics -> hasResource(metrics.getResource(), expectedResource))
                .flatMap(metrics -> metrics.getScopeMetricsList().stream())
                .flatMap(scope -> scope.getMetricsList().stream())
                .anyMatch(metric -> metricName.equals(metric.getName()));
    }

    static boolean hasSpan(
            OtelRuntimeTestSupport.OtlpCapture capture,
            Map<String, String> expectedResource,
            Predicate<Span> predicate) {
        return capture.bodies("traces").stream().flatMap(body -> {
            try {
                return ExportTraceServiceRequest.parseFrom(body).getResourceSpansList().stream();
            } catch (Exception ignored) {
                return Stream.empty();
            }
        }).filter(spans -> hasResource(spans.getResource(), expectedResource))
                .flatMap(spans -> spans.getScopeSpansList().stream())
                .flatMap(scope -> scope.getSpansList().stream())
                .anyMatch(predicate);
    }

    static boolean hasLog(
            OtelRuntimeTestSupport.OtlpCapture capture,
            Map<String, String> expectedResource,
            String bodyMarker) {
        return capture.bodies("logs").stream().flatMap(body -> {
            try {
                return ExportLogsServiceRequest.parseFrom(body).getResourceLogsList().stream();
            } catch (Exception ignored) {
                return Stream.empty();
            }
        }).filter(logs -> hasResource(logs.getResource(), expectedResource))
                .flatMap(logs -> logs.getScopeLogsList().stream())
                .flatMap(scope -> scope.getLogRecordsList().stream())
                .anyMatch(log -> log.getBody().hasStringValue()
                        && log.getBody().getStringValue().contains(bodyMarker));
    }

    private static boolean hasResource(Resource resource, Map<String, String> expected) {
        Map<String, String> actual = new HashMap<>();
        for (KeyValue attribute : resource.getAttributesList()) {
            if (attribute.getValue().hasStringValue()) {
                actual.put(attribute.getKey(), attribute.getValue().getStringValue());
            }
        }
        return expected.entrySet().stream()
                .allMatch(entry -> entry.getValue().equals(actual.get(entry.getKey())));
    }
}
