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

package org.apache.hertzbeat.observability.traces.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceOverviewDto;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class TraceQueryControllerTest {

    private MockMvc mockMvc;

    @Mock
    private EntityTraceQueryService entityTraceQueryService;

    @BeforeEach
    void setUp() {
        TraceQueryController controller = new TraceQueryController(entityTraceQueryService);
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void shouldForwardHideInternalFilterToTraceListQuery() throws Exception {
        TraceListItemDto item = new TraceListItemDto(
                "trace-1",
                "span-root",
                "checkout",
                "commerce",
                "GET /checkout",
                2_000_000L,
                "STATUS_CODE_OK",
                1_710_000_000_000L,
                0,
                Map.of("service.name", "checkout")
        );
        when(entityTraceQueryService.queryTraceList(
                1L, 100L, 200L, "trace-1", true, "checkout", "commerce", "prod",
                "service.version=1.2.3 and hertzbeat.entity_id=\"1\" and hertzbeat.entity_type=\"service\"", "GET /checkout",
                100L, 500L, 2, 50, true, null, "http.route CONTAINS checkout"))
                .thenReturn(new PageImpl<>(List.of(item), PageRequest.of(2, 50), 1));

        mockMvc.perform(get("/api/traces/list")
                        .param("entityId", "1")
                        .param("start", "100")
                        .param("end", "200")
                        .param("traceId", "trace-1")
                        .param("entityType", "service")
                        .param("errorOnly", "true")
                        .param("serviceName", "checkout")
                        .param("serviceNamespace", "commerce")
                        .param("environment", "prod")
                        .param("resourceFilter", "service.version=1.2.3")
                        .param("attributeFilter", "http.route CONTAINS checkout")
                        .param("operationName", "GET /checkout")
                        .param("minDurationMs", "100")
                        .param("maxDurationMs", "500")
                        .param("hideInternal", "true")
                        .param("pageIndex", "2")
                        .param("pageSize", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.content[0].traceId").value("trace-1"))
                .andExpect(jsonPath("$.data.content[0].serviceName").value("checkout"));

        verify(entityTraceQueryService).queryTraceList(
                1L, 100L, 200L, "trace-1", true, "checkout", "commerce", "prod",
                "service.version=1.2.3 and hertzbeat.entity_id=\"1\" and hertzbeat.entity_type=\"service\"", "GET /checkout",
                100L, 500L, 2, 50, true, null, "http.route CONTAINS checkout");
    }

    @Test
    void shouldForwardSpanScopeToTraceListQuery() throws Exception {
        TraceListItemDto item = new TraceListItemDto(
                "trace-entry",
                "span-entry",
                "checkout",
                "commerce",
                "POST /checkout",
                2_000_000L,
                "STATUS_CODE_OK",
                1_710_000_000_000L,
                0,
                Map.of("service.name", "checkout")
        );
        when(entityTraceQueryService.queryTraceList(
                null, 100L, 200L, null, false, "checkout", null, "prod",
                null, "POST /checkout", 100L, 500L, 0, 20, null, "entrypoint", null))
                .thenReturn(new PageImpl<>(List.of(item), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/traces/list")
                        .param("start", "100")
                        .param("end", "200")
                        .param("errorOnly", "false")
                        .param("serviceName", "checkout")
                        .param("environment", "prod")
                        .param("operationName", "POST /checkout")
                        .param("minDurationMs", "100")
                        .param("maxDurationMs", "500")
                        .param("spanScope", "entrypoint"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.content[0].traceId").value("trace-entry"));

        verify(entityTraceQueryService).queryTraceList(
                null, 100L, 200L, null, false, "checkout", null, "prod",
                null, "POST /checkout", 100L, 500L, 0, 20, null, "entrypoint", null);
    }

    @Test
    void shouldForwardHideInternalFilterToTraceOverviewQuery() throws Exception {
        TraceOverviewDto overview = new TraceOverviewDto(2, 1, 1_710_000_000_000L, true);
        when(entityTraceQueryService.getTraceOverview(
                9L, 100L, 200L, "trace-9", false, "payments", "core", "stage",
                "service.version=2.0.0 and hertzbeat.entity_id=\"9\"", "POST /pay", 200L, 900L, true, null, null))
                .thenReturn(overview);

        mockMvc.perform(get("/api/traces/stats/overview")
                        .param("entityId", "9")
                        .param("start", "100")
                        .param("end", "200")
                        .param("traceId", "trace-9")
                        .param("errorOnly", "false")
                        .param("serviceName", "payments")
                        .param("serviceNamespace", "core")
                        .param("environment", "stage")
                        .param("resourceFilter", "service.version=2.0.0")
                        .param("operationName", "POST /pay")
                        .param("minDurationMs", "200")
                        .param("maxDurationMs", "900")
                        .param("hideInternal", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.totalTraceCount").value(2))
                .andExpect(jsonPath("$.data.errorTraceCount").value(1))
                .andExpect(jsonPath("$.data.hasActiveTrace").value(true));

        verify(entityTraceQueryService).getTraceOverview(
                9L, 100L, 200L, "trace-9", false, "payments", "core", "stage",
                "service.version=2.0.0 and hertzbeat.entity_id=\"9\"", "POST /pay", 200L, 900L, true, null, null);
    }

    @Test
    void shouldForwardSpanScopeToTraceOverviewQuery() throws Exception {
        TraceOverviewDto overview = new TraceOverviewDto(3, 0, 1_710_000_000_000L, true);
        when(entityTraceQueryService.getTraceOverview(
                null, 100L, 200L, null, false, "checkout", null, "prod",
                null, "POST /checkout", 100L, 500L, null, "entrypoint", null))
                .thenReturn(overview);

        mockMvc.perform(get("/api/traces/stats/overview")
                        .param("start", "100")
                        .param("end", "200")
                        .param("errorOnly", "false")
                        .param("serviceName", "checkout")
                        .param("environment", "prod")
                        .param("operationName", "POST /checkout")
                        .param("minDurationMs", "100")
                        .param("maxDurationMs", "500")
                        .param("spanScope", "entrypoint"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.totalTraceCount").value(3));

        verify(entityTraceQueryService).getTraceOverview(
                null, 100L, 200L, null, false, "checkout", null, "prod",
                null, "POST /checkout", 100L, 500L, null, "entrypoint", null);
    }

    @Test
    void shouldForwardTraceGroupByStatsFiltersToService() throws Exception {
        Map<String, Object> result = Map.of(
                "groupBy", "resource:service.version",
                "groups", List.of(Map.of(
                        "value", "1.2.3",
                        "traceCount", 12L,
                        "errorTraceCount", 2L,
                        "latencyAvgMs", 84.5d,
                        "latencyP95Ms", 210.0d
                ))
        );
        when(entityTraceQueryService.getTraceGroupByStats(
                3L, 100L, 200L, "trace-3", true, "checkout", "commerce", "prod",
                "host.name=checkout-1 and hertzbeat.entity_id=\"3\"", "GET /checkout", 100L, 500L,
                "resource:service.version", 7, "latency-p95-desc", 5, true, "entrypoint", null))
                .thenReturn(result);

        mockMvc.perform(get("/api/traces/stats/group-by")
                        .param("entityId", "3")
                        .param("start", "100")
                        .param("end", "200")
                        .param("traceId", "trace-3")
                        .param("errorOnly", "true")
                        .param("serviceName", "checkout")
                        .param("serviceNamespace", "commerce")
                        .param("environment", "prod")
                        .param("resourceFilter", "host.name=checkout-1")
                        .param("operationName", "GET /checkout")
                        .param("minDurationMs", "100")
                        .param("maxDurationMs", "500")
                        .param("groupBy", "resource:service.version")
                        .param("limit", "7")
                        .param("orderBy", "latency-p95-desc")
                        .param("minCount", "5")
                        .param("spanScope", "entrypoint")
                        .param("hideInternal", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.groupBy").value("resource:service.version"))
                .andExpect(jsonPath("$.data.groups[0].value").value("1.2.3"))
                .andExpect(jsonPath("$.data.groups[0].traceCount").value(12))
                .andExpect(jsonPath("$.data.groups[0].errorTraceCount").value(2))
                .andExpect(jsonPath("$.data.groups[0].latencyAvgMs").value(84.5))
                .andExpect(jsonPath("$.data.groups[0].latencyP95Ms").value(210.0));

        verify(entityTraceQueryService).getTraceGroupByStats(
                3L, 100L, 200L, "trace-3", true, "checkout", "commerce", "prod",
                "host.name=checkout-1 and hertzbeat.entity_id=\"3\"", "GET /checkout", 100L, 500L,
                "resource:service.version", 7, "latency-p95-desc", 5, true, "entrypoint", null);
    }
}
