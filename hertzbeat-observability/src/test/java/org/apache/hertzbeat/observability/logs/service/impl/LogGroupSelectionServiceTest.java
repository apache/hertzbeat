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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.observability.logs.service.LogQueryService.FacetQuery;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class LogGroupSelectionServiceTest {
    private static final String SELECTION = """
            {"version":1,"groups":[{"field":"attribute:proof.status","kind":"value","value":"2.0"}]}
            """;

    private FacetQuery query(String syntax, String selection) {
        return new FacetQuery("default", null, 1000L, 5000L, null, null, null, null, null,
                "a OR b", null, null, null, "zone=local", null, false, false, syntax, selection);
    }

    private List<Consumer<FacetQuery>> operations(LogQueryServiceImpl service) {
        return List.of(q -> service.structuredList(q, 0, 20, "newest"), service::structuredOverview,
                service::structuredTraceCoverage, service::structuredTrend,
                q -> service.structuredGroups(q, "service.name", 20, "count-desc", 1), service::facetFields,
                q -> service.facetValues(q, LogFacets.Field.parse("attribute:proof.status"), 20),
                q -> service.analysis(q, new LogAnalysis.Request(null, "groups", 20, "count-desc", 1)));
    }

    @Test
    void everyOutcomeRequiresCompleteSelectedReaderWithoutLegacyFallback() {
        var reads = new ArrayList<LogSearchQuery>();
        var reader = mock(HistoryDataReader.class, invocation -> {
            assertEquals(LogSearchQuery.class, invocation.getArguments()[0].getClass());
            reads.add(invocation.getArgument(0));
            throw new UnsupportedOperationException();
        });
        var service = new LogQueryServiceImpl(List.of(reader));
        for (var operation : operations(service)) {
            assertThrows(TelemetryStorageUnavailableException.class, () -> operation.accept(query(null, SELECTION)));
        }
        assertEquals(8, reads.size());
        for (var selected : reads) {
            assertEquals("default", selected.scope().workspaceId());
            assertEquals("a OR b", selected.scope().search());
            assertEquals(Map.of("zone", "local"), selected.scope().resourceFilters());
            assertEquals(new LogSearchExpression.And(List.of()), selected.expression());
            assertEquals("2.0", selected.selection().groups().getFirst().value());
        }
    }

    @Test
    void malformedSelectionNeverReadsEvenWhenEntityIsAbsent() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        var absent = new FacetQuery("default", 7L, 1000L, 5000L, null, null, null, null, null,
                null, null, null, null, null, null, false, false, null, "{}");
        for (var operation : operations(service)) {
            assertThrows(LogFilterQueryException.class, () -> operation.accept(query(null, "{}")));
            assertThrows(LogFilterQueryException.class, () -> operation.accept(absent));
        }
        verifyNoInteractions(reader);
    }

    @Test
    void selectedPaginationAndCountUseTheSameQueryWithoutEnrichedRowReevaluation() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        var row = LogEntry.builder().timeUnixNano(2000000000L).body("a OR b")
                .resource(Map.of("zone", "local")).attributes(Map.of("proof.status", 2)).build();
        when(reader.queryStructuredLogs(any(), anyInt(), anyInt(), anyString())).thenReturn(List.of(row));
        when(reader.countStructuredLogs(any())).thenReturn(21L);
        var page = service.structuredList(query(null, SELECTION), 1, 20, "newest");
        assertEquals(21, page.getTotalElements());
        assertEquals(1, page.getNumberOfElements());
        var captured = ArgumentCaptor.forClass(LogSearchQuery.class);
        verify(reader).queryStructuredLogs(captured.capture(), org.mockito.ArgumentMatchers.eq(20),
                org.mockito.ArgumentMatchers.eq(20), org.mockito.ArgumentMatchers.eq("newest"));
        verify(reader).countStructuredLogs(captured.getValue());
        assertEquals("2.0", captured.getValue().selection().groups().getFirst().value());
    }
}
