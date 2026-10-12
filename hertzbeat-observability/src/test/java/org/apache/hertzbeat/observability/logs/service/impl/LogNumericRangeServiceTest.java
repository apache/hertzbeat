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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import java.util.List;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery;
import org.apache.hertzbeat.common.observability.dto.log.LogSort;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.logs.query.LogComparisonParser;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.observability.logs.service.LogQueryService.FacetQuery;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;

class LogNumericRangeServiceTest {
    private static final String RANGE = "{\"version\":1,\"field\":\"attribute:x\",\"min\":2,\"max\":6}";

    private FacetQuery query(String body, String range, Long entity) {
        return new FacetQuery("default", entity, 4000000L, 4005000L, null, null, null, null, null,
                body, null, null, null, "zone=local", null, false, false, null, null, range);
    }

    @Test
    void listCountReceivesTheSameCompleteScope() {
        var reader = mock(HistoryDataReader.class);
        org.mockito.Mockito.when(reader.queryStructuredLogs(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyInt(), org.mockito.ArgumentMatchers.anyInt(), org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(List.of());
        var service = new LogQueryServiceImpl(List.of(reader));
        service.structuredList(query("literal", RANGE, null), 0, 20, "newest");
        var captured = org.mockito.ArgumentCaptor.forClass(LogSearchQuery.class);
        org.mockito.Mockito.verify(reader).countStructuredLogs(captured.capture());
        assertEquals(2, captured.getValue().scope().numericRange().min());
        assertEquals("literal", captured.getValue().scope().search());
    }

    @Test
    void allTypedReadersRetainRangeAndLegacyBodyWithoutFallback() {
        var calls = new java.util.ArrayList<String>();
        var reader = mock(HistoryDataReader.class, invocation -> {
            if (invocation.getMethod().getDeclaringClass() == Object.class) { return null; }
            calls.add(invocation.getMethod().getName());
            Object input = invocation.getArgument(0);
            var scope = input instanceof LogSearchQuery q ? q.scope() : ((LogComparison.Source) input).scope();
            assertEquals("literal", scope.search());
            assertEquals("default", scope.workspaceId());
            assertEquals(2, scope.numericRange().min());
            assertEquals("local", scope.resourceFilters().get("zone"));
            throw new UnsupportedOperationException();
        });
        var service = new LogQueryServiceImpl(List.of(reader));
        var query = query("literal", RANGE, null);
        var request = new LogAnalysis.Request(null, "groups", 20, "count-desc", 1);
        List<Runnable> actions = List.of(() -> service.structuredList(query, 0, 20, "newest"),
                () -> service.structuredOverview(query), () -> service.structuredTraceCoverage(query),
                () -> service.structuredTrend(query), () -> service.structuredGroups(query, "service", 20, "count-desc", 1),
                () -> service.facetFields(query), () -> service.facetValues(query, LogFacets.Field.parse("attribute:x"), 20),
                () -> service.analysis(query, request),
                () -> service.sortedList(query, 0, 20, new LogSort(1, "attribute:x", "number", "desc")));
        for (Runnable action : actions) { assertThrows(TelemetryStorageUnavailableException.class, action::run); }
        assertEquals(9, calls.size());
    }

    @Test
    void invalidRangePrecedesMissingEntityAndComparisonLookup() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        var request = new LogAnalysis.Request(null, "groups", 20, "count-desc", 1);
        assertThrows(LogFilterQueryException.class, () -> service.analysis(query(null, "{}", 7L), request));
        var source = new LogComparisonParser.Query(null, null);
        assertThrows(LogFilterQueryException.class,
                () -> service.compare(query(null, "{}", 7L), request, List.of(source, source), null));
        verifyNoInteractions(reader);
    }

    @Test
    void shiftedComparisonRetainsRangeOnBothSources() {
        var reader = mock(HistoryDataReader.class, invocation -> {
            var first = (LogComparison.Source) invocation.getArgument(0);
            var second = (LogComparison.Source) invocation.getArgument(1);
            assertEquals(first.scope().numericRange(), second.scope().numericRange());
            assertEquals(2, second.scope().numericRange().min());
            assertEquals(400000L, second.scope().start());
            throw new UnsupportedOperationException();
        });
        var service = new LogQueryServiceImpl(List.of(reader));
        var request = new LogAnalysis.Request(null, "groups", 20, "count-desc", 1);
        assertThrows(TelemetryStorageUnavailableException.class, () -> service.compare(query(null, RANGE, null), request,
                List.of(new LogComparisonParser.Query(null, "literal"), new LogComparisonParser.Query(null, "literal", 3600000L)), null));
    }
}
