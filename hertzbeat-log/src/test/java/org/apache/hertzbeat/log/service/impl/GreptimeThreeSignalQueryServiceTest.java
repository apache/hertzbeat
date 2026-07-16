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

package org.apache.hertzbeat.log.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

/** Unit tests for Greptime-backed entity-free queries. */
@ExtendWith(MockitoExtension.class)
class GreptimeThreeSignalQueryServiceTest {

    @Mock
    private GreptimeSqlQueryExecutor sqlQueryExecutor;

    @Mock
    private RestTemplate restTemplate;

    private GreptimeThreeSignalQueryService service;

    @BeforeEach
    void setUp() {
        service = new GreptimeThreeSignalQueryService(
                new GreptimeProperties(true, "127.0.0.1:4001", "http://127.0.0.1:4000",
                        "public", "greptime", "secret"),
                sqlQueryExecutor,
                restTemplate);
    }

    @Test
    void shouldBuildResourceScopedPromqlWithoutEntityLabels() {
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(Map.of("data", Map.of("result", List.of()))));

        service.queryMetrics("http_server_duration", 1000L, 2000L, "checkout", "payments", "prod",
                "http.method=GET", "service_name", "sum", 60, "GET /cart");

        ArgumentCaptor<URI> uri = ArgumentCaptor.forClass(URI.class);
        ArgumentCaptor<HttpEntity<?>> request = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(uri.capture(), eq(HttpMethod.GET), request.capture(), eq(Map.class));
        assertThat(uri.getValue().toString())
                .contains("service_name", "checkout", "service_namespace", "payments")
                .contains("deployment_environment_name", "prod")
                .doesNotContain("entityId", "entityType", "hertzbeat_entity");
        assertThat(request.getValue().getHeaders().getFirst("Authorization")).startsWith("Basic ");
    }

    @Test
    void shouldAllowMetricsQueryWithoutAggregation() {
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(Map.of("data", Map.of("result", List.of()))));

        var result = service.queryMetrics("http_server_duration", 1000L, 2000L, null, null, null,
                null, null, null, 60, null);

        assertThat(result.query()).isEqualTo("http_server_duration");
    }

    @Test
    void shouldPreserveAdvancedPromql() {
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(Map.of("data", Map.of("result", List.of()))));

        var result = service.queryMetrics("sum by (service_name) (rate(http_requests_total[5m]))",
                1000L, 2000L, null, null, null, null, null, null, 60, null);

        assertThat(result.query()).isEqualTo("sum by (service_name) (rate(http_requests_total[5m]))");
    }

    @Test
    void shouldExposeInvalidPromqlAsBadRequest() {
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(Map.of("status", "error", "error", "invalid parameter query")));

        assertThatThrownBy(() -> service.queryMetrics("sum(", 1000L, 2000L, null, null, null,
                null, null, null, 60, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid PromQL query");
    }

    @Test
    void shouldBuildTraceSqlWithoutEntityOrWorkspacePredicates() {
        when(sqlQueryExecutor.execute(any())).thenReturn(List.of());

        service.queryTraces(1000L, 2000L, "trace-1", true, "checkout", "payments", "prod",
                "GET /cart", 1L, 100L, 0, 20);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(sqlQueryExecutor).execute(sql.capture());
        assertThat(sql.getValue())
                .contains("trace_id = 'trace-1'", "service_name = 'checkout'",
                        "\"resource_attributes.service.namespace\"", "\"resource_attributes.deployment.environment.name\"",
                        "CASE WHEN parent_span_id IS NULL OR parent_span_id = '' THEN service_name END",
                        "CASE WHEN parent_span_id IS NULL OR parent_span_id = '' THEN span_name END",
                        "duration_nano >= 1000000", "duration_nano <= 100000000")
                .doesNotContainIgnoringCase("entity")
                .doesNotContainIgnoringCase("workspace");
    }

    @Test
    void shouldRejectInvalidQueryRangesBeforeAccessingStorage() {
        assertThatThrownBy(() -> service.queryMetrics("up", 2000L, 1000L, null, null, null,
                null, null, null, 30, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Query start time must not exceed end time");
        assertThatThrownBy(() -> service.queryTraces(1000L, 2000L, null, false, null, null, null,
                null, 20L, 10L, 0, 20))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Minimum trace duration must not exceed maximum duration");

        verifyNoInteractions(restTemplate, sqlQueryExecutor);
    }

    @Test
    void shouldBuildTraceDurationFromTheFullSpanCoverage() {
        Map<String, Object> root = new java.util.HashMap<>(spanRow("trace-1", "root", "", 1000L, 1_000_000_000L));
        root.put("span_events", "[{\"name\":\"retry.scheduled\",\"time\":\"2026-07-11T00:00:00Z\","
                + "\"attributes\":{\"retry.attempt\":1}}]");
        Map<String, Object> child = spanRow("trace-1", "child", "root", 1800L, 400_000_000L);
        when(sqlQueryExecutor.execute(any())).thenReturn(List.of(root, child));

        var detail = service.traceDetail("trace-1");

        assertThat(detail.summary().durationNanos()).isEqualTo(1_200_000_000L);
        assertThat(detail.spans()).hasSize(2);
        assertThat(detail.spans().getFirst().spanEvents()).singleElement().satisfies(event -> {
            assertThat(event.name()).isEqualTo("retry.scheduled");
            assertThat(event.attributes()).containsEntry("retry.attempt", 1);
        });
    }

    private Map<String, Object> spanRow(String traceId, String spanId, String parentSpanId,
                                        long timestamp, long durationNanos) {
        return Map.ofEntries(
                Map.entry("trace_id", traceId),
                Map.entry("span_id", spanId),
                Map.entry("parent_span_id", parentSpanId),
                Map.entry("span_name", "GET /cart"),
                Map.entry("service_name", "checkout"),
                Map.entry("span_status_code", "STATUS_CODE_OK"),
                Map.entry("span_kind", "SPAN_KIND_SERVER"),
                Map.entry("span_status_message", ""),
                Map.entry("duration_nano", durationNanos),
                Map.entry("timestamp", timestamp),
                Map.entry("span_events", "[]"));
    }
}
