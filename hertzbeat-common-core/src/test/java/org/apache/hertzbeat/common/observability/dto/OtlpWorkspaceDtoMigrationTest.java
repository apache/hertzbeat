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
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.common.observability.dto.binding.OtlpEntityBindingSummaryDto;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryIdentitySnapshot;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionGuideDto;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionOverviewDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsInventoryDto;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogQueryHint;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OtlpWorkspaceDtoMigrationTest {

    @Test
    void shouldExposeOtlpWorkspaceDtosFromCommonObservabilityPackages() {
        OtlpIngestionGuideDto guide = new OtlpIngestionGuideDto(
                "HTTP",
                "gRPC",
                "Authorization",
                "Bearer token",
                "demo-authority",
                List.of(new OtlpIngestionGuideDto.SignalGuide("logs", "http", "direct", "/api/otlp/v1/logs", "logs", null)),
                List.of(new OtlpIngestionGuideDto.Snippet("collector-http", "http", "Collector", "yaml", "receivers: {}"))
        );
        OtlpIngestionOverviewDto overview = new OtlpIngestionOverviewDto(
                new OtlpIngestionOverviewDto.SignalOverview("metrics", true, 3L, 1L, "OTLP", "metrics ready"),
                new OtlpIngestionOverviewDto.SignalOverview("logs", true, 4L, 2L, "OTLP", "logs ready"),
                new OtlpIngestionOverviewDto.SignalOverview("traces", false, 0L, null, "OTLP", "trace empty"),
                2,
                2L,
                1,
                3L,
                List.of(new OtlpIngestionOverviewDto.RecentSignalEvent("logs", "error", "checkout failed", 2L))
        );
        OtlpMetricsConsoleDto console = new OtlpMetricsConsoleDto(
                new OtlpMetricsConsoleDto.Context(1L, "service", "checkout", "checkout", "commerce", "prod",
                        null, 1000L, 2000L),
                "sum(rate(http_requests_total[5m]))",
                "greptime",
                "promql",
                new DatasourceQueryData(),
                new OtlpMetricsConsoleDto.Stats(1, 1, 2000L),
                null,
                null
        );
        OtlpMetricsInventoryDto inventory = new OtlpMetricsInventoryDto(
                console.getContext(),
                "promql-inventory",
                1,
                List.of(new OtlpMetricsInventoryDto.Item(
                        "http_server_duration",
                        "latency",
                        2,
                        2000L,
                        Map.of("__name__", "http_server_duration", "service_name", "checkout")
                ))
        );
        OtlpEntityBindingSummaryDto bindingSummary = new OtlpEntityBindingSummaryDto(
                List.of("service.name"),
                List.of("checkout"),
                List.of(new OtlpEntityBindingSummaryDto.CanonicalIdentitySample("service.name", "checkout", "logs")),
                List.of(new OtlpEntityBindingSummaryDto.BoundEntity(1L, "service", "checkout", "Checkout",
                        "commerce", "service.name", "checkout", 2L)),
                List.of(new OtlpEntityBindingSummaryDto.UnboundEntityCandidate(
                        "billing", "service", "commerce", "prod", "service.name", "billing",
                        List.of("metrics"), Map.of("service.name", "billing"), 2000L))
        );
        TelemetryIdentitySnapshot identitySnapshot = new TelemetryIdentitySnapshot(
                "otlp",
                "metrics",
                Map.of("service.name", "checkout"),
                "checkout",
                "commerce",
                "prod",
                "instance-1",
                "host-1",
                1000L
        );
        EntityTraceQueryHintDto traceQueryHint = new EntityTraceQueryHintDto(
                "trace-hint",
                Map.of("service.name", "checkout"),
                List.of("checkout"),
                "trace-id",
                "span-id",
                "checkout",
                "commerce",
                "prod",
                1000L,
                2000L
        );
        EntityTraceSummaryDto traceSummary = new EntityTraceSummaryDto(3, 1, 2000L, true, "trace-id");
        EntityLogQueryHint logQueryHint = new EntityLogQueryHint(
                "log-hint",
                Map.of("service.name", "checkout"),
                List.of("error"),
                "trace-id",
                "span-id",
                "checkout",
                "commerce",
                "prod",
                1000L,
                2000L
        );
        EntityLogSummaryInfo logSummary = new EntityLogSummaryInfo(1, "trace", "error", Map.of("service.name", "checkout"),
                List.of("error"), "error");

        assertEquals("HTTP", guide.getHttpProtocolLabel());
        assertEquals(2, overview.getActiveSignalCount());
        assertEquals("greptime", console.getDatasource());
        assertEquals("http_server_duration", inventory.getItems().getFirst().getMetricName());
        assertEquals("checkout", bindingSummary.getRecentServices().getFirst());
        assertEquals("checkout", identitySnapshot.getServiceName());
        assertEquals("trace-id", traceQueryHint.getTraceId());
        assertEquals("trace-id", traceSummary.getLatestTraceId());
        assertEquals("trace-id", logQueryHint.getTraceId());
        assertEquals("trace", logSummary.getPreferredQueryType());
    }
}
