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

package org.apache.hertzbeat.observability.ingestion.controller;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.common.observability.dto.binding.OtlpEntityBindingSummaryDto;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionGuideDto;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionOverviewDto;
import org.apache.hertzbeat.common.observability.dto.ingestion.OtlpIngestionRedSummaryDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsInventoryDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpRelatedMetricsDto;
import org.apache.hertzbeat.observability.ingestion.red.OtlpIngestionRedSummaryService;
import org.apache.hertzbeat.observability.ingestion.service.OtlpIngestionWorkspaceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class OtlpIngestionControllerTest {

    private MockMvc mockMvc;

    @Mock
    private OtlpIngestionWorkspaceService otlpIngestionWorkspaceService;

    @Mock
    private OtlpIngestionRedSummaryService otlpIngestionRedSummaryService;

    @BeforeEach
    void setUp() {
        OtlpIngestionController controller = new OtlpIngestionController(
                otlpIngestionWorkspaceService, otlpIngestionRedSummaryService);
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void shouldReturnWrappedOverviewPayload() throws Exception {
        OtlpIngestionOverviewDto overview = new OtlpIngestionOverviewDto(
                new OtlpIngestionOverviewDto.SignalOverview("metrics", true, 3, 1_710_000_000_000L, "OTLP", "metrics ready"),
                new OtlpIngestionOverviewDto.SignalOverview("logs", true, 5, 1_710_000_000_100L, "OTLP", "logs ready"),
                new OtlpIngestionOverviewDto.SignalOverview("traces", false, 0, null, "OTLP", "traces empty"),
                2,
                1_710_000_000_100L,
                1,
                4L,
                List.of(new OtlpIngestionOverviewDto.RecentSignalEvent("logs", "ERROR", "checkout failed", 1_710_000_000_100L))
        );
        overview.setReadinessChecks(List.of(
                new OtlpIngestionOverviewDto.ReadinessCheck(
                        "collector", "Collector cluster", "success", "1 / 1 online",
                        "Collector nodes can receive tasks.", 1_710_000_000_100L)
        ));
        when(otlpIngestionWorkspaceService.getOverview()).thenReturn(overview);

        mockMvc.perform(get("/api/ingestion/otlp/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.activeSignalCount").value(2))
                .andExpect(jsonPath("$.data.boundEntityCount").value(4))
                .andExpect(jsonPath("$.data.logs.totalCount").value(5))
                .andExpect(jsonPath("$.data.readinessChecks[0].key").value("collector"))
                .andExpect(jsonPath("$.data.readinessChecks[0].summary").value("1 / 1 online"));

        verify(otlpIngestionWorkspaceService).getOverview();
    }

    @Test
    void shouldForwardServletRequestWhenBuildingGuide() throws Exception {
        OtlpIngestionGuideDto guide = new OtlpIngestionGuideDto(
                "OTLP HTTP",
                "OTLP gRPC",
                "Authorization",
                "Bearer <api-token>",
                "demo.hertzbeat.apache.org:4317",
                List.of(new OtlpIngestionGuideDto.SignalGuide("logs", "http", "direct", "https://demo.hertzbeat.apache.org/api/otlp/v1/logs", "logs", null)),
                List.of(new OtlpIngestionGuideDto.Snippet("java-http", "http", "Java", "bash", "export OTEL_EXPORTER_OTLP_ENDPOINT=https://demo.hertzbeat.apache.org/api/otlp"))
        );
        when(otlpIngestionWorkspaceService.getGuide(argThat((HttpServletRequest request) ->
                "demo.hertzbeat.apache.org".equals(request.getHeader("X-Forwarded-Host"))))).thenReturn(guide);

        mockMvc.perform(get("/api/ingestion/otlp/guide")
                        .header("X-Forwarded-Host", "demo.hertzbeat.apache.org")
                        .header("X-Forwarded-Proto", "https"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.authHeaderExample").value("Bearer <api-token>"))
                .andExpect(jsonPath("$.data.grpcAuthorityExample").value("demo.hertzbeat.apache.org:4317"))
                .andExpect(jsonPath("$.data.signals[0].endpoint").value("https://demo.hertzbeat.apache.org/api/otlp/v1/logs"));

        verify(otlpIngestionWorkspaceService).getGuide(argThat((HttpServletRequest request) ->
                "demo.hertzbeat.apache.org".equals(request.getHeader("X-Forwarded-Host"))));
    }

    @Test
    void shouldReturnWrappedBindingSummaryPayload() throws Exception {
        OtlpEntityBindingSummaryDto summary = new OtlpEntityBindingSummaryDto(
                List.of("service.name"),
                List.of("checkout"),
                List.of(new OtlpEntityBindingSummaryDto.CanonicalIdentitySample("service.name", "checkout", "logs")),
                List.of(new OtlpEntityBindingSummaryDto.BoundEntity(1L, "service", "checkout", "Checkout",
                        "commerce", "service.name", "checkout", 2L)),
                List.of()
        );
        when(otlpIngestionWorkspaceService.getBindingSummary()).thenReturn(summary);

        mockMvc.perform(get("/api/ingestion/otlp/bindings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.canonicalIdentityKeys[0]").value("service.name"))
                .andExpect(jsonPath("$.data.recentBoundEntities[0].entityId").value(1))
                .andExpect(jsonPath("$.data.recentBoundEntities[0].primaryIdentityValue").value("checkout"));

        verify(otlpIngestionWorkspaceService).getBindingSummary();
    }

    @Test
    void shouldReturnWrappedIngestRedSummaryPayload() throws Exception {
        OtlpIngestionRedSummaryDto summary = new OtlpIngestionRedSummaryDto(
                "team-a",
                2L,
                2D,
                1L,
                0.5D,
                400L,
                6L,
                3L,
                4L,
                15L,
                18L,
                1_710_000_000_100L,
                List.of(new OtlpIngestionRedSummaryDto.SignalRedMetric(
                        "logs",
                        "http",
                        2L,
                        2D,
                        1L,
                        0.5D,
                        400L,
                        6L,
                        3L,
                        4L,
                        15L,
                        18L,
                        "RESOURCE_EXHAUSTED",
                        "quota exceeded",
                        1_710_000_000_100L
                ))
        );
        when(otlpIngestionRedSummaryService.getSummary(1_710_000_000_000L, 1_710_000_060_000L))
                .thenReturn(summary);

        mockMvc.perform(get("/api/ingestion/otlp/intake/red")
                        .param("start", "1710000000000")
                        .param("end", "1710000060000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.workspaceId").value("team-a"))
                .andExpect(jsonPath("$.data.requestCount").value(2))
                .andExpect(jsonPath("$.data.requestRatePerMinute").value(2D))
                .andExpect(jsonPath("$.data.errorCount").value(1))
                .andExpect(jsonPath("$.data.errorRate").value(0.5D))
                .andExpect(jsonPath("$.data.signalItems").value(6))
                .andExpect(jsonPath("$.data.averageSignalItems").value(3))
                .andExpect(jsonPath("$.data.maxSignalItems").value(4))
                .andExpect(jsonPath("$.data.averageDurationMillis").value(15))
                .andExpect(jsonPath("$.data.signals[0].signal").value("logs"))
                .andExpect(jsonPath("$.data.signals[0].protocol").value("http"))
                .andExpect(jsonPath("$.data.signals[0].requestRatePerMinute").value(2D))
                .andExpect(jsonPath("$.data.signals[0].signalItems").value(6))
                .andExpect(jsonPath("$.data.signals[0].latestStatusCode").value("RESOURCE_EXHAUSTED"));

        verify(otlpIngestionRedSummaryService).getSummary(1_710_000_000_000L, 1_710_000_060_000L);
    }

    @Test
    void shouldReturnWrappedMetricsConsolePayload() throws Exception {
        OtlpMetricsConsoleDto console = new OtlpMetricsConsoleDto(
                new OtlpMetricsConsoleDto.Context(42L, "service", "Checkout API", "checkout", "commerce", "prod",
                        "POST /checkout", 1000L, 2000L),
                "sum by (__name__) ({service_name=\"checkout\"})",
                "Greptime-promql",
                "promql",
                new DatasourceQueryData(
                        "otlp-metrics-console",
                        200,
                        null,
                        List.of(
                                new DatasourceQueryData.SchemaData(
                                        new DatasourceQueryData.MetricSchema(
                                                List.of(
                                                        new DatasourceQueryData.MetricField("__ts__", "time", null),
                                                        new DatasourceQueryData.MetricField("__value__", "number", null)
                                                ),
                                                java.util.Map.of("__name__", "http_server_requests_seconds_count"),
                                                java.util.Map.of()
                                        ),
                                        List.of(new Object[] {1000L, 12.0}, new Object[] {2000L, 14.0})
                                )
                        )
                ),
                new OtlpMetricsConsoleDto.Stats(1, 1, 2000L),
                null,
                null
        );
        when(otlpIngestionWorkspaceService.getMetricsConsole(42L, "service", 1000L, 2000L, "checkout", "commerce", "prod",
                null, "span.kind=\"server\"", null, null, "rate", "60", "1", "POST /checkout"))
                .thenReturn(console);

        mockMvc.perform(get("/api/ingestion/otlp/metrics/console")
                        .param("entityId", "42")
                        .param("entityType", "service")
                        .param("start", "1000")
                        .param("end", "2000")
                        .param("serviceName", "checkout")
                        .param("serviceNamespace", "commerce")
                        .param("environment", "prod")
                        .param("filter", "span.kind=\"server\"")
                        .param("temporalAggregation", "rate")
                        .param("step", "60")
                        .param("limit", "1")
                        .param("operationName", "POST /checkout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.context.entityId").value(42))
                .andExpect(jsonPath("$.data.context.entityType").value("service"))
                .andExpect(jsonPath("$.data.context.operationName").value("POST /checkout"))
                .andExpect(jsonPath("$.data.query").value("sum by (__name__) ({service_name=\"checkout\"})"))
                .andExpect(jsonPath("$.data.datasource").value("Greptime-promql"))
                .andExpect(jsonPath("$.data.stats.totalSeries").value(1))
                .andExpect(jsonPath("$.data.results.frames[0].schema.labels.__name__").value("http_server_requests_seconds_count"));

        verify(otlpIngestionWorkspaceService)
                .getMetricsConsole(42L, "service", 1000L, 2000L, "checkout", "commerce", "prod",
                        null, "span.kind=\"server\"", null, null, "rate", "60", "1", "POST /checkout");
    }

    @Test
    void shouldReturnWrappedMetricsInventoryPayload() throws Exception {
        OtlpMetricsInventoryDto inventory = new OtlpMetricsInventoryDto(
                new OtlpMetricsConsoleDto.Context(42L, "service", "Checkout API", "checkout", "commerce", "prod",
                        null, 1000L, 2000L),
                "promql-inventory",
                1,
                List.of(new OtlpMetricsInventoryDto.Item(
                        "http_server_duration",
                        "latency",
                        2,
                        2000L,
                        java.util.Map.of("__name__", "http_server_duration", "service_name", "checkout")
                ))
        );
        when(otlpIngestionWorkspaceService.getMetricsInventory(42L, "service", 1000L, 2000L, "checkout", "commerce", "prod", "20"))
                .thenReturn(inventory);

        mockMvc.perform(get("/api/ingestion/otlp/metrics/inventory")
                        .param("entityId", "42")
                        .param("entityType", "service")
                        .param("start", "1000")
                        .param("end", "2000")
                        .param("serviceName", "checkout")
                        .param("serviceNamespace", "commerce")
                        .param("environment", "prod")
                        .param("limit", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.context.entityId").value(42))
                .andExpect(jsonPath("$.data.source").value("promql-inventory"))
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.items[0].metricName").value("http_server_duration"))
                .andExpect(jsonPath("$.data.items[0].family").value("latency"))
                .andExpect(jsonPath("$.data.items[0].timeSeriesCount").value(2))
                .andExpect(jsonPath("$.data.items[0].labels.service_name").value("checkout"));

        verify(otlpIngestionWorkspaceService)
                .getMetricsInventory(42L, "service", 1000L, 2000L, "checkout", "commerce", "prod", "20");
    }

    @Test
    void shouldReturnWrappedRelatedMetricsPayload() throws Exception {
        OtlpRelatedMetricsDto related = new OtlpRelatedMetricsDto(
                new OtlpMetricsConsoleDto.Context(42L, "service", "Checkout API", "checkout", "commerce", "prod",
                        "POST /checkout", 1000L, 2000L),
                "k8s.pod.name=\"checkout-7d9\"",
                "POST /checkout",
                "backend-related-metrics",
                1,
                List.of(new OtlpRelatedMetricsDto.ResourceMatcher("k8s_pod_name", "=", "checkout-7d9")),
                List.of(new OtlpRelatedMetricsDto.Candidate(
                        "container.cpu.usage",
                        "pod",
                        "cpu",
                        "resource-filter",
                        List.of("k8s_pod_name"),
                        java.util.Map.of("k8s_pod_name", "checkout-7d9")
                ))
        );
        when(otlpIngestionWorkspaceService.getRelatedMetrics(42L, "service", 1000L, 2000L, "checkout", "commerce", "prod",
                "k8s.pod.name=\"checkout-7d9\"", "POST /checkout", "8")).thenReturn(related);

        mockMvc.perform(get("/api/ingestion/otlp/metrics/related")
                        .param("entityId", "42")
                        .param("entityType", "service")
                        .param("start", "1000")
                        .param("end", "2000")
                        .param("serviceName", "checkout")
                        .param("serviceNamespace", "commerce")
                        .param("environment", "prod")
                        .param("filter", "k8s.pod.name=\"checkout-7d9\"")
                        .param("operationName", "POST /checkout")
                        .param("limit", "8"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.context.entityId").value(42))
                .andExpect(jsonPath("$.data.context.entityType").value("service"))
                .andExpect(jsonPath("$.data.context.operationName").value("POST /checkout"))
                .andExpect(jsonPath("$.data.operationName").value("POST /checkout"))
                .andExpect(jsonPath("$.data.source").value("backend-related-metrics"))
                .andExpect(jsonPath("$.data.resourceMatchers[0].label").value("k8s_pod_name"))
                .andExpect(jsonPath("$.data.candidates[0].query").value("container.cpu.usage"))
                .andExpect(jsonPath("$.data.candidates[0].source").value("pod"));

        verify(otlpIngestionWorkspaceService)
                .getRelatedMetrics(42L, "service", 1000L, 2000L, "checkout", "commerce", "prod",
                        "k8s.pod.name=\"checkout-7d9\"", "POST /checkout", "8");
    }
}
