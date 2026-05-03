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

package org.apache.hertzbeat.common.observability.dto;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryBindingResult;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryIdentitySnapshot;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffInfo;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsInfo;
import org.apache.hertzbeat.common.observability.dto.metrics.MetricCorrelationHint;
import org.apache.hertzbeat.common.observability.model.CodeNavigationHint;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class EvidenceDtoMigrationTest {

    @Test
    void shouldExposeEvidenceAndHandoffDtosFromCommonObservabilityPackages() {
        TelemetryIdentitySnapshot identitySnapshot = new TelemetryIdentitySnapshot(
                "otlp", "metrics", Map.of("service.name", "checkout"), "checkout", "commerce", "prod",
                "instance-1", "host-1", 1000L
        );
        TelemetryBindingResult bindingResult = new TelemetryBindingResult(
                1L, "service", "checkout", true, "otlp", 1, List.of("service.name"), "service.name", "checkout"
        );
        MetricCorrelationHint correlationHint = new MetricCorrelationHint(
                1L, "trace-1", "span-1", "checkout", "commerce", "prod", 1000L, 2000L,
                "severity:error", "trace_id='trace-1'", "service_name='checkout'"
        );
        CodeNavigationHint codeNavigationHint = new CodeNavigationHint(
                "https://repo.example/checkout", "github", "/src/CheckoutController.java",
                "CheckoutController.java", "owner"
        );

        MetricEvidence metricEvidence = new MetricEvidence(
                "otlp", "metrics", 1L, identitySnapshot, 1000L, "healthy", "cpu.usage",
                bindingResult, correlationHint, codeNavigationHint, "cpu_usage", "CPU Usage", "gauge",
                "%", 42.0, Map.of("host.name", "host-1"), "monitor", "otel"
        );
        LogEvidence logEvidence = new LogEvidence(
                "otlp", "logs", 1L, identitySnapshot, 1000L, "error", "checkout failed",
                bindingResult, codeNavigationHint, "checkout failed", "ERROR", "trace-1", "span-1",
                Map.of("service.name", "checkout"), List.of("checkout failed")
        );
        TraceEvidence traceEvidence = new TraceEvidence(
                "otlp", "traces", 1L, identitySnapshot, 1000L, "error", "trace-1",
                bindingResult, codeNavigationHint, "trace-1", "span-1", "checkout", "commerce",
                "error", 3, 1200L, Map.of("service.name", "checkout")
        );

        EntityResponseHandoffInfo traceHandoff = new EntityResponseHandoffInfo(
                "trace-1", "open", "critical", "checkout", "trace content", "trace-1", "span-1",
                "checkout", "commerce", "ERROR", "trace_id='trace-1'", "platform", "checkout-system",
                "prod", 1000L, 2000L, "otlp", "trace", codeNavigationHint, "/entities/1", "返回实体"
        );
        EntityResponseHandoffsInfo handoffsInfo = new EntityResponseHandoffsInfo(
                null, null, null, traceHandoff, null, null
        );

        assertEquals("cpu_usage", metricEvidence.getMetricName());
        assertEquals("trace-1", logEvidence.getTraceId());
        assertEquals("checkout", traceEvidence.getServiceName());
        assertEquals("trace-1", handoffsInfo.getTraces().getTraceId());
    }
}
