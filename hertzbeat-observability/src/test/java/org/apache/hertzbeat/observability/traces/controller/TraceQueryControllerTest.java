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
                1L, 100L, 200L, "trace-1", true, "checkout", "commerce", "prod", 2, 50, true))
                .thenReturn(new PageImpl<>(List.of(item), PageRequest.of(2, 50), 1));

        mockMvc.perform(get("/api/traces/list")
                        .param("entityId", "1")
                        .param("start", "100")
                        .param("end", "200")
                        .param("traceId", "trace-1")
                        .param("errorOnly", "true")
                        .param("serviceName", "checkout")
                        .param("serviceNamespace", "commerce")
                        .param("environment", "prod")
                        .param("hideInternal", "true")
                        .param("pageIndex", "2")
                        .param("pageSize", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.content[0].traceId").value("trace-1"))
                .andExpect(jsonPath("$.data.content[0].serviceName").value("checkout"));

        verify(entityTraceQueryService).queryTraceList(
                1L, 100L, 200L, "trace-1", true, "checkout", "commerce", "prod", 2, 50, true);
    }

    @Test
    void shouldForwardHideInternalFilterToTraceOverviewQuery() throws Exception {
        TraceOverviewDto overview = new TraceOverviewDto(2, 1, 1_710_000_000_000L, true);
        when(entityTraceQueryService.getTraceOverview(
                9L, 100L, 200L, "trace-9", false, "payments", "core", "stage", true))
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
                        .param("hideInternal", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.totalTraceCount").value(2))
                .andExpect(jsonPath("$.data.errorTraceCount").value(1))
                .andExpect(jsonPath("$.data.hasActiveTrace").value(true));

        verify(entityTraceQueryService).getTraceOverview(
                9L, 100L, 200L, "trace-9", false, "payments", "core", "stage", true);
    }
}
