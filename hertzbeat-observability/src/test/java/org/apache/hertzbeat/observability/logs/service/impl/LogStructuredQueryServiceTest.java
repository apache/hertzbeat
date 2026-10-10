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

package org.apache.hertzbeat.observability.logs.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.observability.logs.service.LogQueryService.FacetQuery;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.mockito.Mockito.verify;

class LogStructuredQueryServiceTest {
    private FacetQuery query(String expression) {
        return new FacetQuery("default", null, 1000L, 5000L, null, null, null, null, null,
                expression, null, null, null, "zone=local", null, false, false, "structured-v1");
    }

    @Test
    void structuredListPreservesTrustedOuterScopeAndFullCount() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        var row = LogEntry.builder().timeUnixNano(2000000000L).body("error")
                .resource(Map.of("service.name", "checkout", "zone", "local")).build();
        when(reader.queryStructuredLogs(any(), anyInt(), anyInt(), anyString())).thenReturn(List.of(row));
        when(reader.countStructuredLogs(any())).thenReturn(21L);
        var page = service.structuredList(query("service:checkout OR service:billing"), 1, 20, "newest");
        assertEquals(21, page.getTotalElements());
        assertEquals(1, page.getNumber());
        var captured = ArgumentCaptor.forClass(LogSearchQuery.class);
        verify(reader).queryStructuredLogs(captured.capture(), org.mockito.ArgumentMatchers.eq(20),
                org.mockito.ArgumentMatchers.eq(20), org.mockito.ArgumentMatchers.eq("newest"));
        assertEquals("default", captured.getValue().scope().workspaceId());
        assertEquals(Map.of("zone", "local"), captured.getValue().scope().resourceFilters());
        assertEquals(null, captured.getValue().scope().search());
    }

    @Test
    void malformedQueryNeverReachesAnyStructuredReader() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        var invalid = query("service:a OR");
        assertThrows(LogFilterQueryException.class, () -> service.structuredList(invalid, 0, 20, "newest"));
        assertThrows(LogFilterQueryException.class, () -> service.structuredOverview(invalid));
        assertThrows(LogFilterQueryException.class, () -> service.structuredTraceCoverage(invalid));
        assertThrows(LogFilterQueryException.class, () -> service.structuredTrend(invalid));
        assertThrows(LogFilterQueryException.class, () -> service.structuredGroups(invalid, "service", 20, "count-desc", 1));
        assertThrows(LogFilterQueryException.class, () -> service.facetFields(invalid));
        assertThrows(LogFilterQueryException.class, () -> service.facetValues(invalid, LogFacets.Field.parse("builtin:severityCategory"), 20));
        verifyNoInteractions(reader);
    }

    @Test
    void absentEntityReturnsTypedEmptyResultsWithoutReading() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        var absent = new FacetQuery("default", 7L, 1000L, 5000L, null, null, null, null, null,
                "*", null, null, null, null, null, false, false, "structured-v1");
        var page = service.structuredList(absent, 3, 20, "newest");
        assertEquals(3, page.getNumber());
        assertEquals(0, page.getTotalElements());
        assertEquals(0L, service.structuredOverview(absent).get("totalCount"));
        assertEquals(0L, service.structuredTraceCoverage(absent).get("withTrace"));
        verifyNoInteractions(reader);
    }

    @Test
    void groupLimitOrderingAndMinimumReachStorageBeforeSelection() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        when(reader.structuredLogGroups(any(), anyString(), anyInt(), anyString(), org.mockito.ArgumentMatchers.anyLong()))
                .thenReturn(Map.of("checkout", 2L));
        service.structuredGroups(query("*"), "service.name", 100, "count-asc", 2);
        verify(reader).structuredLogGroups(any(), org.mockito.ArgumentMatchers.eq("service.name"),
                org.mockito.ArgumentMatchers.eq(100), org.mockito.ArgumentMatchers.eq("count-asc"), org.mockito.ArgumentMatchers.eq(2L));
    }

    @Test
    void unsupportedReadersNeverFallBackToUnfilteredLists() {
        var reader = mock(HistoryDataReader.class, org.mockito.Mockito.CALLS_REAL_METHODS);
        var service = new LogQueryServiceImpl(List.of(reader));
        assertThrows(org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException.class,
                () -> service.structuredList(query("service:checkout"), 0, 20, "newest"));
        verify(reader).queryStructuredLogs(any(), org.mockito.ArgumentMatchers.eq(0),
                org.mockito.ArgumentMatchers.eq(20), org.mockito.ArgumentMatchers.eq("newest"));
        org.mockito.Mockito.verifyNoMoreInteractions(reader);
    }

    @Test
    void warehousePredicateIsNotReevaluatedAfterMapperEnrichment() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        var enriched = LogEntry.builder().timeUnixNano(2000000000L).body("request")
                .resource(Map.of("service.name", "derived-service", "zone", "local")).build();
        when(reader.queryStructuredLogs(any(), anyInt(), anyInt(), anyString())).thenReturn(List.of(enriched));
        when(reader.countStructuredLogs(any())).thenReturn(1L);
        assertEquals(1, service.structuredList(query("NOT resource.service.name:*"), 0, 20, "newest").getNumberOfElements());
    }

}
