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

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.contract.AgentQueryPurpose;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorToolService;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.junit.jupiter.api.Test;

class AgentMonitorQuerySemanticsTest {
    @Test
    void countPreservesAllFiltersAndUsesTheExactPageTotalRatherThanTheSample() {
        var monitors = mock(MonitorService.class);
        var ids = List.of(42L, 43L, 44L, 45L, 46L, 47L);
        when(monitors.getMonitors(ids, "mysql", "prod", (byte) 1, "gmtCreate", "desc", 0, 1, "env:prod"))
                .thenReturn(new PageImpl<>(List.of(Monitor.builder().id(42L).name("prod-demo").app("mysql").instance("prod-host")
                                .labels(Map.of("env", "prod")).status((byte) 1).build()),
                        PageRequest.of(0, 1), 6));
        var result = service(monitors).queryMonitors(ids, "mysql", "up", "prod", "env:prod",
                null, null, 17, 100, true, AgentQueryPurpose.COUNT);
        assertEquals(6L, result.get("totalElements"));
        assertEquals(1, ((List<?>) result.get("content")).size());
        Map<?, ?> meta = (Map<?, ?>) result.get("queryMetadata");
        assertEquals("MATCHING_FILTERS", meta.get("totalScope"));
        assertEquals("CURRENT_TOOL_ACCESS", meta.get("authorizationScope"));
        assertEquals("NOT_REQUESTED", meta.get("statusCountsScope"));
        assertEquals(Map.of("ids", ids, "app", "mysql", "status", "up", "search", "prod", "labels", "env:prod"), meta.get("filters"));
        verify(monitors).getMonitors(ids, "mysql", "prod", (byte) 1, "gmtCreate", "desc", 0, 1, "env:prod");
    }

    @Test
    void statusAggregatesUseIdsAndTheSelectedStatusInsteadOfBroadeningThePopulation() {
        var monitors = mock(MonitorService.class);
        var ids = List.of(42L, 43L, 44L, 45L, 46L, 47L);
        when(monitors.getMonitors(eq(ids), eq("mysql"), eq("prod"), eq((byte) 1), any(), any(), eq(0), anyInt(), eq("env:prod")))
                .thenReturn(new PageImpl<>(List.of(Monitor.builder().id(42L).name("prod-demo").app("mysql").instance("prod-host")
                                .labels(Map.of("env", "prod")).status((byte) 1).build()), PageRequest.of(0, 1), 6));
        var result = service(monitors).queryMonitors(ids, "mysql", "up", "prod", "env:prod",
                null, null, 0, 1, false, AgentQueryPurpose.STATUS_COUNTS);
        assertEquals(Map.of("up", 6L, "down", 0L, "paused", 0L, "unreachable", 0L), result.get("status"));
        verify(monitors).getMonitors(ids, "mysql", "prod", (byte) 1, "id", "asc", 0, 1, "env:prod");
        assertEquals("MATCHING_FILTERS", ((Map<?, ?>) result.get("queryMetadata")).get("statusCountsScope"));
    }

    @Test
    void historicalMonitorCountsAreExplicitlyUnsupportedWithoutRunningAnUnrelatedSnapshotQuery() {
        var monitors = mock(MonitorService.class);
        var result = service(monitors).queryMonitors(null, null, null, null, null,
                null, null, 0, 1, false, AgentQueryPurpose.TIME_RANGE);
        assertEquals("unsupported_time_range", result.get("state"));
        verifyNoInteractions(monitors);
    }

    @Test
    void nativeToolCallbackAcceptsTypedPurposeAndReturnsMatchingMetadata() {
        var monitors = mock(MonitorService.class);
        when(monitors.getMonitors(any(), any(), any(), any(), any(), any(), anyInt(), anyInt(), any()))
                .thenReturn(new PageImpl<>(List.of(Monitor.builder().id(42L).name("prod-demo").app("mysql").instance("prod-host")
                                .labels(Map.of("env", "prod")).status((byte) 1).build()),
                        PageRequest.of(0, 1), 6));
        var method = java.util.Arrays.stream(AgentMonitorToolService.class.getMethods())
                .filter(candidate -> candidate.getName().equals("queryMonitors") && candidate.getParameterCount() == 11)
                .findFirst().orElseThrow();
        var definition = org.springframework.ai.tool.support.ToolDefinitions.from(method);
        org.junit.jupiter.api.Assertions.assertTrue(definition.inputSchema().contains("COUNT"));
        org.junit.jupiter.api.Assertions.assertTrue(definition.inputSchema().contains("purpose"));
        var callback = org.springframework.ai.tool.method.MethodToolCallback.builder().toolObject(service(monitors))
                .toolMethod(method).toolDefinition(definition).build();
        var result = org.apache.hertzbeat.common.util.JsonUtil.fromJson(callback.call("{\"purpose\":\"COUNT\"}"));
        assertEquals("COUNT", result.path("queryMetadata").path("purpose").asText());
        assertEquals(6, result.path("totalElements").asInt());
    }

    private AgentMonitorToolService service(MonitorService monitors) {
        return new AgentMonitorToolService(monitors, mock(AppService.class), mock(CollectorMonitorBindDao.class));
    }
}
