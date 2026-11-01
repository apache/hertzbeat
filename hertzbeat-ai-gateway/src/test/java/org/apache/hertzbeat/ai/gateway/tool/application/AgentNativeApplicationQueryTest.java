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

package org.apache.hertzbeat.ai.gateway.tool.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.manager.pojo.dto.AppCount;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.apache.hertzbeat.warehouse.service.DatasourceQueryService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

class AgentNativeApplicationQueryTest {
    @Test
    void summaryUsesAllNativeAppGroupsAndKeepsTransitionalCount() {
        var nativeService = mock(MonitorService.class);
        var service = new AgentMonitorSummaryToolService(nativeService);
        var app = new AppCount();
        app.setApp("website");
        app.setCategory("service");
        app.setSize(4);
        app.setAvailableSize(1);
        app.setUnAvailableSize(1);
        app.setUnManageSize(1);
        when(nativeService.getAllAppMonitorsCount()).thenReturn(List.of(app));
        var value = service.summary(0, 10);
        assertEquals(4L, value.get("reportedMonitorCount"));
        assertEquals(1L, ((Map<?, ?>) ((List<?>) value.get("apps")).getFirst()).get("otherSize"));
        assertEquals(false, value.get("undefinedAppTypesIncluded"));
    }

    @Test
    void invalidSummaryCountersNeverBecomeHealthyOrMatchingGlobalCounts() {
        var nativeService = mock(MonitorService.class);
        var service = new AgentMonitorSummaryToolService(nativeService);
        var app = new AppCount();
        app.setApp("test");
        app.setSize(1);
        app.setAvailableSize(2);
        when(nativeService.getAllAppMonitorsCount()).thenReturn(List.of(app));
        assertThrows(IllegalStateException.class, () -> service.summary(0, 10));
        assertThrows(IllegalArgumentException.class, () -> service.summary(0, 101));
    }

    @Test
    void nativePromqlQueryRequiresSupportedConfiguredExecutorAndBoundedWindow() {
        var nativeService = mock(DatasourceQueryService.class);
        var executor = mock(QueryExecutor.class);
        when(executor.getDatasource()).thenReturn("configured-promql");
        when(executor.support("promql")).thenReturn(true);
        var service = new AgentWarehouseQueryToolService(nativeService, List.of(executor));
        assertEquals(1, ((List<?>) service.catalog().get("datasources")).size());
        var query =
                new AgentWarehouseQueryToolService.RangeQuery(
                        "A",
                        "configured-promql",
                        "sum(rate(test_total[1m]))",
                        1700000000000L,
                        1700000600000L,
                        60,
                        5);
        when(nativeService.query(any()))
                .thenReturn(
                        List.of(
                                DatasourceQueryData.builder()
                                        .refId("A")
                                        .status(200)
                                        .frames(List.of())
                                        .build()));
        var result = service.query(List.of(query));
        assertEquals("native-warehouse-query.v1", result.get("queryVersion"));
        assertEquals(0, result.get("failedQueries"));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.query(
                                List.of(
                                        new AgentWarehouseQueryToolService.RangeQuery(
                                                "A",
                                                "not-configured",
                                                "up",
                                                1700000000000L,
                                                1700000001000L,
                                                60,
                                                5))));
    }

    @Test
    void sqlDuplicateRefsOrUnboundedQueriesNeverReachNativeExecutor() {
        var nativeService = mock(DatasourceQueryService.class);
        var sql = mock(QueryExecutor.class);
        when(sql.getDatasource()).thenReturn("sql");
        when(sql.support("promql")).thenReturn(false);
        var service = new AgentWarehouseQueryToolService(nativeService, List.of(sql));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.query(
                                List.of(
                                        new AgentWarehouseQueryToolService.RangeQuery(
                                                "A",
                                                "sql",
                                                "DROP TABLE metrics",
                                                0L,
                                                1000L,
                                                60,
                                                5))));
        assertThrows(IllegalArgumentException.class, () -> service.query(List.of()));
        verifyNoInteractions(nativeService);
    }

    @Test
    void nativeQueryErrorsRetainStatusWithoutLeakingBackendExceptionOrClaimingEmptyData() {
        var nativeService = mock(DatasourceQueryService.class);
        var executor = mock(QueryExecutor.class);
        when(executor.getDatasource()).thenReturn("promql");
        when(executor.support("promql")).thenReturn(true);
        var service = new AgentWarehouseQueryToolService(nativeService, List.of(executor));
        when(nativeService.query(any()))
                .thenReturn(
                        List.of(
                                DatasourceQueryData.builder()
                                        .refId("A")
                                        .status(503)
                                        .msg("http://user:secret@internal")
                                        .build()));
        var value =
                service.query(
                        List.of(
                                new AgentWarehouseQueryToolService.RangeQuery(
                                        "A",
                                        "promql",
                                        "up",
                                        1700000000000L,
                                        1700000001000L,
                                        60,
                                        5)));
        assertEquals(1, value.get("failedQueries"));
        org.junit.jupiter.api.Assertions.assertFalse(value.toString().contains("secret"));
    }
}
