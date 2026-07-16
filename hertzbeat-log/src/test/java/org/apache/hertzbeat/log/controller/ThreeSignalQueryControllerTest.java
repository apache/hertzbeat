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

package org.apache.hertzbeat.log.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.dto.observability.OtlpMetricsConsole;
import org.apache.hertzbeat.common.entity.dto.observability.OtlpMetricsInventory;
import org.apache.hertzbeat.common.entity.dto.observability.SignalPage;
import org.apache.hertzbeat.common.entity.dto.observability.TraceDetail;
import org.apache.hertzbeat.common.entity.dto.observability.TraceListItem;
import org.apache.hertzbeat.common.entity.dto.observability.TraceOverview;
import org.apache.hertzbeat.common.entity.dto.observability.TraceSpanNode;
import org.apache.hertzbeat.log.service.ThreeSignalQueryService;
import org.apache.hertzbeat.log.service.SignalWorkloadGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Tests the entity-free public query contract. */
@ExtendWith(MockitoExtension.class)
class ThreeSignalQueryControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ThreeSignalQueryService queryService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new ThreeSignalQueryController(queryService, new SignalWorkloadGuard())).build();
    }

    @Test
    void shouldQueryMetricsWithoutEntityContext() throws Exception {
        when(queryService.queryMetrics("http_server_duration", 1000L, 2000L, "checkout", "payments",
                "prod", null, null, null, 60, null))
                .thenReturn(new OtlpMetricsConsole("http_server_duration", 1000L, 2000L, 60, List.of()));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/ingestion/otlp/metrics/console")
                        .param("query", "http_server_duration")
                        .param("start", "1000")
                        .param("end", "2000")
                        .param("serviceName", "checkout")
                        .param("serviceNamespace", "payments")
                        .param("environment", "prod")
                        .param("step", "60"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.query").value("http_server_duration"))
                .andExpect(jsonPath("$.data.series").isArray());
    }

    @Test
    void shouldExposeMetricInventory() throws Exception {
        when(queryService.metricInventory(1000L, 2000L, "checkout", "payments", "prod", 50))
                .thenReturn(new OtlpMetricsInventory(List.of("http_server_duration")));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/ingestion/otlp/metrics/inventory")
                        .param("start", "1000")
                        .param("end", "2000")
                        .param("serviceName", "checkout")
                        .param("serviceNamespace", "payments")
                        .param("environment", "prod")
                        .param("limit", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.metricNames[0]").value("http_server_duration"));
    }

    @Test
    void shouldQueryTraceListAndDetail() throws Exception {
        TraceListItem item = new TraceListItem("trace-1", "span-1", "checkout", "payments", "GET /cart",
                10_000_000L, "ERROR", 1000L, 1, Map.of("deployment.environment.name", "prod"));
        when(queryService.queryTraces(1000L, 2000L, "trace-1", true, "checkout", "payments", "prod",
                "GET /cart", 1L, 100L, 0, 20))
                .thenReturn(new SignalPage<>(List.of(item), 0, 20, 1));
        TraceSpanNode span = new TraceSpanNode("trace-1", "span-1", "", "GET /cart", "checkout", "ERROR",
                "SERVER", "failed", 10_000_000L, 1000L, Map.of(), Map.of(), List.of());
        when(queryService.traceDetail("trace-1")).thenReturn(new TraceDetail(item, List.of(span)));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/traces/list")
                        .param("start", "1000")
                        .param("end", "2000")
                        .param("traceId", "trace-1")
                        .param("errorOnly", "true")
                        .param("serviceName", "checkout")
                        .param("serviceNamespace", "payments")
                        .param("environment", "prod")
                        .param("operationName", "GET /cart")
                        .param("minDurationMs", "1")
                        .param("maxDurationMs", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].traceId").value("trace-1"));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/traces/trace-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.spans[0].spanId").value("span-1"));
    }

    @Test
    void shouldExposeTraceOverview() throws Exception {
        when(queryService.traceOverview(1000L, 2000L, "trace-1", true, "checkout", "payments", "prod",
                "GET /cart", 1L, 100L))
                .thenReturn(new TraceOverview(4, 1, 0.25, 12.5, 24.0));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/traces/stats/overview")
                        .param("start", "1000")
                        .param("end", "2000")
                        .param("traceId", "trace-1")
                        .param("errorOnly", "true")
                        .param("serviceName", "checkout")
                        .param("serviceNamespace", "payments")
                        .param("environment", "prod")
                        .param("operationName", "GET /cart")
                        .param("minDurationMs", "1")
                        .param("maxDurationMs", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(4))
                .andExpect(jsonPath("$.data.errorRate").value(0.25));
    }
}
