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

package org.apache.hertzbeat.observability.metrics.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsInventoryDto;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.ingestion.service.OtlpIngestionWorkspaceService;
import org.apache.hertzbeat.observability.metrics.service.CollectorScopedMetricsQueryService;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CollectorScopedMetricsQueryServiceImplTest {

    @Mock
    private OtlpIngestionWorkspaceService workspaceService;

    private CollectorScopedMetricsQueryServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CollectorScopedMetricsQueryServiceImpl(workspaceService);
    }

    @Test
    void labelDiscoveryValidatesWindowAndPreservesTheFullSubmittedScope() {
        var request = new CollectorScopedMetricsQueryService.LabelsRequest("team-a", null, null,
                1000L, 2000L, "checkout", "commerce", "prod", "collector-a", "instance-a", "/orders",
                "duration_bucket", "http_route!=/private", "http_route", "100", null);
        service.labels(request);
        verify(workspaceService).getMetricLabels(request);
    }

    @Test
    void labelDiscoveryRejectsUnboundedAndCallerControlledWorkspaceBeforeRead() {
        assertThrows(org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException.class,
                () -> service.labels(new CollectorScopedMetricsQueryService.LabelsRequest("team-a", null, null,
                        null, 2000L, null, null, null, null, null, null, "metric", null, null, null, null)));
        assertThrows(org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException.class,
                () -> service.labels(new CollectorScopedMetricsQueryService.LabelsRequest("team-a", null, null,
                        1000L, 2000L, null, null, null, null, null, null, "metric",
                        "hertzbeat_workspace_id=other", null, null, null)));
        verifyNoInteractions(workspaceService);
    }

    @Test
    void scopesGeneratedMetricQueryThroughCanonicalCollectorLabel() {
        OtlpMetricsConsoleDto result = new OtlpMetricsConsoleDto();
        result.setContext(new OtlpMetricsConsoleDto.Context());
        when(workspaceService.getBoundedMetricsConsole(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod",
                "collector-a", null, null, "http_server_duration", "span_kind=server",
                null, "sum", "raw", "60", "32", null)).thenReturn(result);

        OtlpMetricsConsoleDto actual = service.query(request("collector-a", "http_server_duration"));

        assertEquals("collector-a", actual.getContext().getCollectorId());
    }

    @Test
    void acceptsOnlyBoundedRollupControlsWithoutChangingScope() {
        OtlpMetricsConsoleDto result = new OtlpMetricsConsoleDto();
        result.setContext(new OtlpMetricsConsoleDto.Context());
        when(workspaceService.getBoundedMetricsConsole(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod",
                "collector-a", null, null, "http_server_duration", "span_kind=server",
                null, "sum", "rollup_avg_300", "300", "32", null)).thenReturn(result);
        service.query(withControls(request("collector-a", "http_server_duration"), "sum", "rollup_avg_300", "300", "32"));
        verify(workspaceService).getBoundedMetricsConsole(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod",
                "collector-a", null, null, "http_server_duration", "span_kind=server",
                null, "sum", "rollup_avg_300", "300", "32", null);
        assertThrows(ObservabilityQueryRequestException.class,
                () -> service.query(withControls(request("collector-a", "http_server_duration"),
                        "sum", "rollup_avg_300", "60", "32")));
        for (String invalid : List.of("rollup_avg_0", "rollup_avg_86401", "rollup_predict_300", "rollup_avg_300)")) {
            assertThrows(ObservabilityQueryRequestException.class,
                    () -> service.query(withControls(request("collector-a", "http_server_duration"),
                            "sum", invalid, "60", "32")));
        }
    }

    @Test
    void derivesRollupStepWhenAbsentAndRejectsResolutionThatCannotBeHonored() {
        service.query(withControls(request("collector-a", "http_server_duration"),
                "sum", "rollup_avg_300", null, "32"));
        verify(workspaceService).getBoundedMetricsConsole(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod",
                "collector-a", null, null, "http_server_duration", "span_kind=server",
                null, "sum", "rollup_avg_300", "300", "32", null);
        var longWindow = withWindow(withControls(request("collector-a", "http_server_duration"),
                "sum", "rollup_avg_60", "60", "32"), 100L, 86_400_100L);
        assertThrows(ObservabilityQueryRequestException.class, () -> service.query(longWindow));
    }

    @Test
    void validatesBothNestedTimeStagesAndOuterResolution() {
        service.query(withControls(request("collector-a", "http_server_duration"),
                "sum", "nested_max_1800_after_avg_300", "1800", "32"));
        verify(workspaceService).getBoundedMetricsConsole(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod",
                "collector-a", null, null, "http_server_duration", "span_kind=server",
                null, "sum", "nested_max_1800_after_avg_300", "1800", "32", null);
        for (String invalid : List.of("nested_max_300_after_avg_300", "nested_max_60_after_avg_300",
                "nested_max_86401_after_avg_300", "nested_max_1800_after_avg_0")) {
            assertThrows(ObservabilityQueryRequestException.class,
                    () -> service.query(withControls(request("collector-a", "http_server_duration"),
                            "sum", invalid, "1800", "32")));
        }
        assertThrows(ObservabilityQueryRequestException.class,
                () -> service.query(withControls(request("collector-a", "http_server_duration"),
                        "sum", "nested_max_1800_after_avg_300", "300", "32")));
    }

    @Test
    void rejectsMissingOrCallerControlledWorkspaceBeforeMetricsRead() {
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> service.query(new CollectorScopedMetricsQueryService.Request(
                null, null, null, 100L, 200L, "checkout", "commerce", "prod", null,
                null, null, "http_server_duration", null, null, null, null, "60s", null, null)));
        assertThrows(TelemetryStorageUnavailableException.class, () -> service.inventory(
                new CollectorScopedMetricsQueryService.InventoryRequest(
                        null, null, null, 100L, 200L, "checkout", "commerce", "prod", null,
                        null, null, null, "20")));
        for (String workspaceKey : java.util.List.of(
                "workspace_id", "workspace.id", "hertzbeat.workspace_id",
                "hertzbeat_workspace_id")) {
            assertThrows(IllegalArgumentException.class,
                    () -> service.query(new CollectorScopedMetricsQueryService.Request(
                            "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod", null,
                            null, null, "http_server_duration", workspaceKey + "=team-b", null, null, null,
                            "60s", null, null)));
        }
        verifyNoInteractions(workspaceService);
    }

    @Test
    void scopesDefaultQueryAndPreservesExistingFilter() {
        assertThrows(ObservabilityQueryRequestException.class,
                () -> service.query(request("collector-east", null)));
        verifyNoInteractions(workspaceService);
    }

    @Test
    void scopesInstanceAndHttpRouteThroughCanonicalMetricLabels() {
        OtlpMetricsConsoleDto result = new OtlpMetricsConsoleDto();
        result.setContext(new OtlpMetricsConsoleDto.Context());
        when(workspaceService.getBoundedMetricsConsole(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod",
                "collector-a", "checkout-7d9", "/checkout", "http_server_duration", "span_kind=server",
                null, "sum", "raw", "60", "32", null)).thenReturn(result);

        OtlpMetricsConsoleDto actual = service.query(new CollectorScopedMetricsQueryService.Request(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod", "collector-a",
                "checkout-7d9", "/checkout", "http_server_duration", "span_kind=server",
                null, null, null, "60", null, null));

        assertEquals("checkout-7d9", actual.getContext().getInstance());
        assertEquals("/checkout", actual.getContext().getEndpoint());
    }

    @Test
    void rejectsNonRouteEndpointAndDuplicateDedicatedDimensions() {
        assertThrows(IllegalArgumentException.class, () -> service.query(new CollectorScopedMetricsQueryService.Request(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod", "collector-a",
                "checkout-7d9", "POST /checkout", null, null, null, null, null, "60s", null, null)));
        assertThrows(IllegalArgumentException.class, () -> service.query(new CollectorScopedMetricsQueryService.Request(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod", "collector-a",
                "checkout-7d9", "/checkout", null, "service_instance_id=other", null, null,
                null, "60s", null, null)));
    }

    @Test
    void blankCollectorKeepsLegacyRequestUnchanged() {
        OtlpMetricsConsoleDto result = new OtlpMetricsConsoleDto();
        result.setContext(new OtlpMetricsConsoleDto.Context());
        when(workspaceService.getBoundedMetricsConsole(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod",
                null, null, null, "http_server_duration", "span_kind=server",
                null, "sum", "raw", "60", "32", null)).thenReturn(result);

        OtlpMetricsConsoleDto actual = service.query(request(" ", "http_server_duration"));

        assertNull(actual.getContext().getCollectorId());
    }

    @Test
    void rejectsArbitraryPromqlInsteadOfDroppingCollectorScope() {
        ObservabilityQueryRequestException failure = assertThrows(
                ObservabilityQueryRequestException.class,
                () -> service.query(request("collector-a", "sum(rate(http_requests_total[5m]))")));

        assertEquals(ObservabilityQueryRequestException.ERROR_CODE, failure.getMessage());
        verifyNoInteractions(workspaceService);
    }

    @Test
    void requiresAnExactBoundedTimeWindowBeforeMetricsRead() {
        CollectorScopedMetricsQueryService.Request baseline = request("collector-a", "http_server_duration");
        for (CollectorScopedMetricsQueryService.Request invalid : List.of(
                withWindow(baseline, null, 200L),
                withWindow(baseline, 100L, null),
                withWindow(baseline, 0L, 100L),
                withWindow(baseline, 200L, 100L),
                withWindow(baseline, 100L, 100L),
                withWindow(baseline, 100L, 100L + Duration.ofDays(1).toMillis() + 1))) {
            ObservabilityQueryRequestException failure = assertThrows(
                    ObservabilityQueryRequestException.class, () -> service.query(invalid));
            assertEquals(ObservabilityQueryRequestException.ERROR_CODE, failure.getMessage());
        }
        verifyNoInteractions(workspaceService);
    }

    @Test
    void appliesServerOwnedSeriesAndPointBudgets() {
        OtlpMetricsConsoleDto result = new OtlpMetricsConsoleDto();
        result.setContext(new OtlpMetricsConsoleDto.Context());
        when(workspaceService.getBoundedMetricsConsole(
                "team-a", null, null, 1_000L, 86_401_000L, "checkout", "commerce", "prod",
                "collector-a", null, null, "http_server_duration", "span_kind=server",
                null, "sum", "raw", "73", "32", null)).thenReturn(result);

        service.query(new CollectorScopedMetricsQueryService.Request(
                "team-a", null, null, 1_000L, 86_401_000L, "checkout", "commerce", "prod",
                "collector-a", null, null, "http_server_duration", "span_kind=server",
                null, "SUM", "RAW", "1", "999", null));

        verify(workspaceService).getBoundedMetricsConsole(
                "team-a", null, null, 1_000L, 86_401_000L, "checkout", "commerce", "prod",
                "collector-a", null, null, "http_server_duration", "span_kind=server",
                null, "sum", "raw", "73", "32", null);
    }

    @Test
    void rejectsUnallowlistedMetricQueryControls() {
        CollectorScopedMetricsQueryService.Request baseline = request("collector-a", "http_server_duration");
        for (CollectorScopedMetricsQueryService.Request invalid : List.of(
                withControls(baseline, "sum) by (password) (", null, "60", "20"),
                withControls(baseline, "sum", "predict_linear", "60", "20"),
                withControls(baseline, "sum", "raw", "60ms", "20"),
                withControls(baseline, "sum", "raw", "60", "not-a-number"))) {
            assertThrows(ObservabilityQueryRequestException.class, () -> service.query(invalid));
        }
        verifyNoInteractions(workspaceService);
    }

    @Test
    void redactsSuccessfulBackendMessages() {
        Object[] row = {1_000L, 1.0};
        DatasourceQueryData.SchemaData frame = new DatasourceQueryData.SchemaData(
                new DatasourceQueryData.MetricSchema(List.of(), java.util.Map.of(), java.util.Map.of()),
                List.<Object[]>of(row));
        OtlpMetricsConsoleDto result = new OtlpMetricsConsoleDto(
                new OtlpMetricsConsoleDto.Context(), null, "Greptime-promql", "promql",
                new DatasourceQueryData("A", 200, "jdbc:greptime://private?password=secret", List.of(frame)),
                new OtlpMetricsConsoleDto.Stats(1, 1, 1_000L), null, "private successful diagnostic");
        when(workspaceService.getBoundedMetricsConsole(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod", "collector-a", null, null,
                "http_server_duration", "span_kind=server", null, "sum", "raw", "60", "32", null))
                .thenReturn(result);

        OtlpMetricsConsoleDto actual = service.query(request("collector-a", "http_server_duration"));

        assertNull(actual.getResults().getMsg());
        assertNull(actual.getErrorMessage());
    }

    @Test
    void redactsStorageDiagnosticsWhenTheResultPayloadIsAbsent() {
        OtlpMetricsConsoleDto result = new OtlpMetricsConsoleDto(
                new OtlpMetricsConsoleDto.Context(), null, null, "promql", null,
                new OtlpMetricsConsoleDto.Stats(0, 0, null), "load_failed",
                "jdbc:greptime://private?password=secret");
        when(workspaceService.getBoundedMetricsConsole(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod", "collector-a", null, null,
                "http_server_duration", "span_kind=server", null, "sum", "raw", "60", "32", null))
                .thenReturn(result);

        OtlpMetricsConsoleDto actual = service.query(request("collector-a", "http_server_duration"));

        assertNull(actual.getErrorMessage());
        assertNull(actual.getResults());
    }

    @Test
    void failsClosedWhenTheDatasourceViolatesTheSeriesOrPointBudget() {
        Object[] row = {1_000L, 1.0};
        DatasourceQueryData.SchemaData oversizedFrame = new DatasourceQueryData.SchemaData(
                new DatasourceQueryData.MetricSchema(List.of(), java.util.Map.of(), java.util.Map.of()),
                java.util.stream.IntStream.range(0, 1_201).mapToObj(ignored -> row).toList());
        OtlpMetricsConsoleDto result = new OtlpMetricsConsoleDto(
                new OtlpMetricsConsoleDto.Context(), null, "Greptime-promql", "promql",
                new DatasourceQueryData("A", 200, null, List.of(oversizedFrame)),
                new OtlpMetricsConsoleDto.Stats(1, 1, 1_000L), null, null);
        DatasourceQueryData.SchemaData boundedFrame = new DatasourceQueryData.SchemaData(
                oversizedFrame.getSchema(), List.<Object[]>of(row));
        OtlpMetricsConsoleDto oversizedSeries = new OtlpMetricsConsoleDto(
                new OtlpMetricsConsoleDto.Context(), null, "Greptime-promql", "promql",
                new DatasourceQueryData(
                        "A", 200, null,
                        java.util.stream.IntStream.range(0, 33).mapToObj(ignored -> boundedFrame).toList()),
                new OtlpMetricsConsoleDto.Stats(33, 33, 1_000L), null, null);
        when(workspaceService.getBoundedMetricsConsole(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod", "collector-a", null, null,
                "http_server_duration", "span_kind=server", null, "sum", "raw", "60", "32", null))
                .thenReturn(result, oversizedSeries);

        assertThrows(TelemetryStorageUnavailableException.class,
                () -> service.query(request("collector-a", "http_server_duration")));
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> service.query(request("collector-a", "http_server_duration")));
    }

    @Test
    void preservesHistogramBucketsWithinTheSharedPointBudget() {
        var frames = java.util.stream.IntStream.range(0, 35).mapToObj(bucket ->
                new DatasourceQueryData.SchemaData(
                        new DatasourceQueryData.MetricSchema(List.of(), java.util.Map.of("le", Integer.toString(bucket)),
                                java.util.Map.of()), List.<Object[]>of(new Object[] {1_000L, 1.0}))).toList();
        var result = new OtlpMetricsConsoleDto();
        result.setResults(new DatasourceQueryData("A", 200, null, frames));
        when(workspaceService.getBoundedMetricsConsole(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod", "collector-a", null, null,
                "duration_bucket", "span_kind=server", null, "sum", "raw", "60", "64", null))
                .thenReturn(result);
        assertEquals(frames, service.query(request("collector-a", "duration_bucket")).getResults().getFrames());
        var oversized = new DatasourceQueryData.SchemaData(frames.getFirst().getSchema(),
                java.util.stream.IntStream.range(0, 1_200).mapToObj(index -> new Object[] {1_000L, 1.0}).toList());
        result.getResults().setFrames(java.util.stream.IntStream.range(0, 35).mapToObj(index -> oversized).toList());
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> service.query(request("collector-a", "duration_bucket")));
        result.getResults().setFrames(java.util.stream.IntStream.range(0, 65).mapToObj(index -> frames.getFirst()).toList());
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> service.query(request("collector-a", "duration_bucket")));
    }

    @Test
    void rejectsInvalidOrDuplicateCollectorScope() {
        assertThrows(IllegalArgumentException.class, () ->
                service.query(request("collector-a\" or other=\"x", null)));
        assertThrows(IllegalArgumentException.class, () -> service.query(new CollectorScopedMetricsQueryService.Request(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod", "collector-a", null, null, null,
                "hertzbeat_collector_id=collector-b", null, null, null, "60s", null, null)));
        verifyNoInteractions(workspaceService);
    }

    @Test
    void validatesAndPassesDedicatedInventoryScopeThroughTheSharedBoundary() {
        OtlpMetricsInventoryDto result = new OtlpMetricsInventoryDto();
        result.setContext(new OtlpMetricsConsoleDto.Context());
        when(workspaceService.getMetricsInventory(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod",
                "collector-a", "checkout-01", "/checkout", "cpu", "20")).thenReturn(result);

        OtlpMetricsInventoryDto actual = service.inventory(
                new CollectorScopedMetricsQueryService.InventoryRequest(
                        "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod",
                        "collector-a", "checkout-01", "/checkout", "cpu", "20"));

        assertEquals("collector-a", actual.getContext().getCollectorId());
        assertEquals("checkout-01", actual.getContext().getInstance());
        assertEquals("/checkout", actual.getContext().getEndpoint());
        assertThrows(IllegalArgumentException.class, () -> service.inventory(
                new CollectorScopedMetricsQueryService.InventoryRequest(
                        "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod",
                        "collector-a\"bad", "checkout-01", "/checkout", null, "20")));
        assertThrows(IllegalArgumentException.class, () -> service.inventory(
                new CollectorScopedMetricsQueryService.InventoryRequest(
                        "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod",
                        "collector-a", "checkout-01", "POST /checkout", null, "20")));
    }

    private CollectorScopedMetricsQueryService.Request request(String collectorId, String query) {
        return new CollectorScopedMetricsQueryService.Request(
                "team-a", null, null, 100L, 200L, "checkout", "commerce", "prod", collectorId, null, null, query,
                "span_kind=server", null, null, null, "60", null, null);
    }

    private CollectorScopedMetricsQueryService.Request withWindow(
            CollectorScopedMetricsQueryService.Request request, Long start, Long end) {
        return new CollectorScopedMetricsQueryService.Request(
                request.workspaceId(), request.entityId(), request.entityType(), start, end, request.serviceName(),
                request.serviceNamespace(), request.environment(), request.collectorId(), request.instance(),
                request.endpoint(), request.query(), request.filter(), request.groupBy(), request.aggregation(),
                request.temporalAggregation(), request.step(), request.limit(), request.operationName());
    }

    private CollectorScopedMetricsQueryService.Request withControls(
            CollectorScopedMetricsQueryService.Request request, String aggregation, String temporalAggregation,
            String step, String limit) {
        return new CollectorScopedMetricsQueryService.Request(
                request.workspaceId(), request.entityId(), request.entityType(), request.start(), request.end(),
                request.serviceName(), request.serviceNamespace(), request.environment(), request.collectorId(),
                request.instance(), request.endpoint(), request.query(), request.filter(), request.groupBy(), aggregation,
                temporalAggregation, step, limit, request.operationName());
    }
}
