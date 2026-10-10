/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.observability.logs.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.logs.query.LogComparisonParser;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.observability.logs.service.LogQueryService.FacetQuery;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class LogComparisonServiceTest {
    private static final LogAnalysis.Request ANALYSIS = new LogAnalysis.Request(null, "groups", 20, "count-desc", 1);
    private static final List<LogComparisonParser.Query> SOURCES = List.of(new LogComparisonParser.Query(null, "literal OR text"),
            new LogComparisonParser.Query("structured-v1", "status:ERROR"));

    @Test
    void shiftedSourceUsesDerivedTrustedScopeAndEmptyMetadata() {
        for (long offset : new long[] {3600000, 86400000, 604800000}) {
            var reader = mock(HistoryDataReader.class);
            var service = new LogQueryServiceImpl(List.of(reader));
            var sources = List.of(SOURCES.getFirst(), new LogComparisonParser.Query("structured-v1", "status:ERROR", offset));
            service.compare(shiftQuery(null), ANALYSIS, sources, null);
            var a = ArgumentCaptor.forClass(LogComparison.Source.class);
            var b = ArgumentCaptor.forClass(LogComparison.Source.class);
            verify(reader).logComparison(a.capture(), b.capture(), eq(ANALYSIS), anyLong(), eq(null), eq(offset));
            LogComparison.validateShiftedSources(a.getValue(), b.getValue(), offset);
            assertEquals(700000000L - offset, b.getValue().scope().start());
            assertEquals(Map.of("zone", "local"), b.getValue().scope().resourceFilters());
            var empty = service.compare(shiftQuery(7L), ANALYSIS, sources, null);
            assertEquals(offset, empty.timeShiftMs());
            assertEquals(700004000L - offset, empty.shiftedWindow().end());
            assertEquals(List.of(), empty.groups());
            verifyNoMoreInteractions(reader);
        }
    }

    @Test
    void invalidShiftRejectsDirectCallsBeforeEmptyLookupOrReaderFallback() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        assertThrows(IllegalArgumentException.class, () -> service.compare(query(7L), ANALYSIS,
                List.of(SOURCES.getFirst(), new LogComparisonParser.Query(null, null, 3600000L)), null));
        assertThrows(IllegalArgumentException.class, () -> service.compare(shiftQuery(7L), ANALYSIS,
                List.of(new LogComparisonParser.Query(null, null, 3600000L), SOURCES.getLast()), null));
        verifyNoInteractions(reader);
    }

    private static FacetQuery shiftQuery(Long entity) {
        return new FacetQuery("default", entity, 700000000L, 700004000L, null, null, null, null, null,
                null, null, null, null, "zone=local", null, false, false);
    }

    @Test
    void bothSourcesShareTrustedScopeAndMakeOneCompleteRead() {
        var reader = mock(HistoryDataReader.class);
        new LogQueryServiceImpl(List.of(reader)).compare(query(null), ANALYSIS, SOURCES, "100*b/a");
        var a = ArgumentCaptor.forClass(LogComparison.Source.class);
        var b = ArgumentCaptor.forClass(LogComparison.Source.class);
        verify(reader).logComparison(a.capture(), b.capture(), eq(ANALYSIS), anyLong(), eq("100*b/a"));
        assertEquals("literal OR text", a.getValue().scope().search());
        assertEquals(null, b.getValue().scope().search());
        assertEquals("default", a.getValue().scope().workspaceId());
        assertEquals(a.getValue().scope().resourceFilters(), b.getValue().scope().resourceFilters());
        assertEquals(Map.of("zone", "local"), a.getValue().scope().resourceFilters());
        verifyNoMoreInteractions(reader);
    }

    @Test
    void emptyEntityIsHonestAndInvalidSecondSourceStillRejects() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        var result = service.compare(query(7L), ANALYSIS, SOURCES, "b/a");
        assertEquals(0, result.matchingA());
        assertEquals(0, result.matchingB());
        assertEquals(ANALYSIS, result.analysis());
        assertThrows(LogFilterQueryException.class, () -> service.compare(query(7L), ANALYSIS,
                List.of(SOURCES.getFirst(), new LogComparisonParser.Query("structured-v1", "status:ERROR OR")), null));
        verifyNoInteractions(reader);
    }

    @Test
    void unsupportedReaderCannotFallBackToTwoSingleQueryResults() {
        var reader = mock(HistoryDataReader.class, org.mockito.Mockito.CALLS_REAL_METHODS);
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> new LogQueryServiceImpl(List.of(reader)).compare(query(null), ANALYSIS, SOURCES, null));
        verify(reader).logComparison(any(), any(), eq(ANALYSIS), anyLong(), eq(null));
        verifyNoMoreInteractions(reader);
    }

    private static FacetQuery query(Long entity) {
        return new FacetQuery("default", entity, 1000L, 5000L, null, null, null, null, null,
                null, null, null, null, "zone=local", null, false, false);
    }
}
