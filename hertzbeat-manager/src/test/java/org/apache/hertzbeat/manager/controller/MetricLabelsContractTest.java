/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.List;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.manager.support.GlobalExceptionHandler;
import org.apache.hertzbeat.observability.ingestion.controller.OtlpIngestionController;
import org.apache.hertzbeat.observability.ingestion.service.impl.OtlpIngestionWorkspaceServiceImpl;
import org.apache.hertzbeat.observability.metrics.inventory.MetricInventoryRepository;
import org.apache.hertzbeat.observability.metrics.service.impl.CollectorScopedMetricsQueryServiceImpl;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class MetricLabelsContractTest {
    private MetricInventoryRepository repository;
    private MockMvc mvc;
    private org.apache.hertzbeat.warehouse.repository.MetricQueryRepository metrics;

    @BeforeEach
    void setUp() {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        repository = mock(MetricInventoryRepository.class);
        metrics = mock(org.apache.hertzbeat.warehouse.repository.MetricQueryRepository.class);
        var workspace = new OtlpIngestionWorkspaceServiceImpl(null, null, null, null, null, metrics,
                List.of(repository), List.of(), List.of(), List.of());
        var controller = new OtlpIngestionController(workspace, null,
                new CollectorScopedMetricsQueryServiceImpl(workspace),
                new ObservabilityQueryAdmissionService(8, 8, 8, 4, 8, Duration.ofMillis(100)));
        mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @AfterEach
    void clean() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void upstreamInvalidQueryIs400WhileStorageFailureRemainsUnavailable() throws Exception {
        when(metrics.hasPromqlExecutor()).thenReturn(true);
        when(metrics.queryPromqlRange(anyString(), anyString(), anyLong(), anyLong(), anyString(), anyInt()))
                .thenReturn(new org.apache.hertzbeat.warehouse.repository.MetricQueryRepository.PromqlRangeQueryResult(
                        "Greptime-promql", null, "promql_query_invalid"))
                .thenReturn(new org.apache.hertzbeat.warehouse.repository.MetricQueryRepository.PromqlRangeQueryResult(
                        "Greptime-promql", null, "promql_query_failed"));
        var path = "/api/ingestion/otlp/metrics/console";
        mvc.perform(get(path).param("start", "1000").param("end", "2000").param("query", "metric")
                        .param("filter", "proof_literal=~\"[\""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.msg").value("observability_query_context_invalid"));
        mvc.perform(get(path).param("start", "1000").param("end", "2000").param("query", "metric"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.emptyStateReason").value("load_failed"));
    }

    @Test
    void preservesCanonicalTupleAndOtherFiltersThroughTheActualController() throws Exception {
        when(repository.findLabels(anyString(), any(), anyLong(), anyLong(), any(), anyInt()))
                .thenReturn(new MetricInventoryRepository.Labels("ready", false, List.of("http_route")));
        mvc.perform(get("/api/ingestion/otlp/metrics/labels").param("start", "1000").param("end", "2000")
                        .param("query", "duration_bucket").param("serviceName", "checkout")
                        .param("serviceNamespace", "commerce").param("environment", "prod")
                        .param("filter", "service_name=other,http_route!=/private"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.items[0]").value("http_route"));
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<String>> matchers = ArgumentCaptor.forClass(List.class);
        verify(repository).findLabels(org.mockito.ArgumentMatchers.eq("duration_bucket"), matchers.capture(),
                org.mockito.ArgumentMatchers.eq(1000L), org.mockito.ArgumentMatchers.eq(2000L),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(100));
        assertTrue(matchers.getValue().contains("hertzbeat_workspace_id=\"team-a\""));
        assertTrue(matchers.getValue().contains("service_namespace=\"commerce\""));
        assertTrue(matchers.getValue().contains("deployment_environment_name=\"prod\""));
        assertTrue(matchers.getValue().contains("http_route!=\"/private\""));
        assertEquals(1, matchers.getValue().stream().filter(value -> value.startsWith("service_name=")).count());
    }

    @Test
    void invalidParametersRemain400WithTheActualGlobalAdvice() throws Exception {
        for (String[] invalid : List.of(new String[]{"start", "no-number"}, new String[]{"end", "500"},
                new String[]{"query", "sum(metric)"}, new String[]{"filter", "not a valid clause"},
                new String[]{"filter", "hertzbeat_workspace_id=other"}, new String[]{"label", "x';drop"},
                new String[]{"entityId", "not-id"}, new String[]{"limit", "101"})) {
            var request = get("/api/ingestion/otlp/metrics/labels")
                    .param("start", "1000").param("end", "2000").param("query", "metric");
            // Set exactly one submitted value for the rejected parameter.
            request.with(servlet -> {
                servlet.setParameter(invalid[0], invalid[1]);
                return servlet;
            });
            mvc.perform(request).andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/ingestion/otlp/metrics/labels").param("query", "metric"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(repository);
    }

    @Test
    void operationFallbackScopeDoesNotProduceBroaderSuggestions() throws Exception {
        mvc.perform(get("/api/ingestion/otlp/metrics/labels").param("start", "1000").param("end", "2000")
                        .param("query", "metric").param("operationName", "GET /orders"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.state").value("unavailable"));
        verifyNoInteractions(repository);
    }
}
