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

package org.apache.hertzbeat.observability.ingestion.governance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
import io.opentelemetry.proto.metrics.v1.Metric;
import io.opentelemetry.proto.metrics.v1.ResourceMetrics;
import io.opentelemetry.proto.metrics.v1.ScopeMetrics;
import io.opentelemetry.proto.resource.v1.Resource;
import io.opentelemetry.proto.trace.v1.ResourceSpans;
import io.opentelemetry.proto.trace.v1.ScopeSpans;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link OtlpIngestionGovernanceService}.
 */
class OtlpIngestionGovernanceServiceTest {

    @Test
    void defaultsToAllowingEverySignalWhenNoDropPolicyConfigured() {
        OtlpIngestionGovernanceService governanceService = new OtlpIngestionGovernanceService("");

        assertFalse(governanceService.evaluateMetrics("grpc", metricsRequest("checkout")).dropped());
        assertFalse(governanceService.evaluateLogs("http", logsRequest("checkout")).dropped());
        assertFalse(governanceService.evaluateTraces("grpc", tracesRequest("checkout")).dropped());
    }

    @Test
    void dropsSignalsByConfiguredServiceNameWithDeterministicReason() {
        OtlpIngestionGovernanceService governanceService = new OtlpIngestionGovernanceService("checkout,payments");

        OtlpIngestionGovernanceService.Decision decision =
                governanceService.evaluateMetrics("grpc", metricsRequest("checkout"));

        assertTrue(decision.dropped());
        assertEquals("OTLP metrics grpc dropped by governance policy: service.name=checkout", decision.reason());
    }

    private ExportMetricsServiceRequest metricsRequest(String serviceName) {
        return ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(resource(serviceName))
                        .addScopeMetrics(ScopeMetrics.newBuilder()
                                .addMetrics(Metric.newBuilder().setName("requests").build())
                                .build())
                        .build())
                .build();
    }

    private ExportLogsServiceRequest logsRequest(String serviceName) {
        return ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .setResource(resource(serviceName))
                        .addScopeLogs(ScopeLogs.newBuilder().build())
                        .build())
                .build();
    }

    private ExportTraceServiceRequest tracesRequest(String serviceName) {
        return ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .setResource(resource(serviceName))
                        .addScopeSpans(ScopeSpans.newBuilder().build())
                        .build())
                .build();
    }

    private Resource resource(String serviceName) {
        return Resource.newBuilder()
                .addAttributes(KeyValue.newBuilder()
                        .setKey("service.name")
                        .setValue(AnyValue.newBuilder().setStringValue(serviceName).build())
                        .build())
                .build();
    }
}
