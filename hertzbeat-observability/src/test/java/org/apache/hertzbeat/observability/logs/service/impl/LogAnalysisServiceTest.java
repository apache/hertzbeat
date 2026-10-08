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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.observability.logs.service.LogQueryService.FacetQuery;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class LogAnalysisServiceTest {
    private static final LogAnalysis.Request REQUEST = new LogAnalysis.Request(null, "groups", 20, "count-desc", 1);

    @Test
    void throughputMetadataSurvivesEmptyServiceAndComparison() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        var request = new LogAnalysis.Request(null, "timeseries", 20, "measure-desc", 1,
                new LogAnalysis.Measure("sum", "attribute:bytes"), null, 1000L, null, "throughput");
        assertEquals("throughput", service.analysis(query(7L, "*"), request).transform());
        var source = new org.apache.hertzbeat.observability.logs.query.LogComparisonParser.Query(null, null);
        var scope = new FacetQuery("default", 7L, 1000L, 5000L, null, null, null, null, null,
                null, null, null, null, null, null, false, false, null);
        assertEquals("throughput", service.compare(scope, request, List.of(source, source), null).analysis().transform());
        verifyNoInteractions(reader);
    }

    @Test
    void oldCountJsonStaysAbsentAndExtrasCannotFallBackToPrimaryOnly() {
        var old = new LogQueryServiceImpl(List.of()).analysis(query(7L, "*"), REQUEST);
        var json = org.apache.hertzbeat.common.util.JsonUtil.fromJson(org.apache.hertzbeat.common.util.JsonUtil.toJson(old), Map.class);
        org.junit.jupiter.api.Assertions.assertFalse(json.containsKey("additionalMeasures"));
        var reader = mock(HistoryDataReader.class, org.mockito.Mockito.CALLS_REAL_METHODS);
        var request = new LogAnalysis.Request(null, "groups", 20, "count-desc", 1, null, null, null,
                List.of(new LogAnalysis.Measure("avg", "attribute:duration")));
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> new LogQueryServiceImpl(List.of(reader)).analysis(query(null, "*"), request));
        verify(reader).logAnalysis(org.mockito.ArgumentMatchers.any(org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery.class),
                org.mockito.ArgumentMatchers.eq(request), anyLong());
    }

    @Test
    void additionalMeasureMetadataSurvivesBothEmptyEntityPaths() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        var extras = List.of(new LogAnalysis.Measure("avg", "attribute:duration"), new LogAnalysis.Measure("unique", "attribute:user"));
        var request = new LogAnalysis.Request(null, "groups", 20, "count-desc", 1, null, null, null, extras);
        var result = service.analysis(query(7L, "*"), request);
        assertEquals(extras, result.additionalMeasures());
        assertEquals(List.of(), result.groups());
        var source = new org.apache.hertzbeat.observability.logs.query.LogComparisonParser.Query(null, null);
        var comparisonQuery = new FacetQuery("default", 7L, 1000L, 5000L, null, null, null, null, null,
                null, null, null, null, null, null, false, false, null);
        var comparison = service.compare(comparisonQuery, request, List.of(source, source), null);
        assertEquals(extras, comparison.analysis().additionalMeasures());
        assertEquals(List.of(), comparison.groups());
        verifyNoInteractions(reader);
    }

    @Test
    void explicitIntervalChecksEmptyEntityAndBothReadPathsBeforeReader() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        var request = new LogAnalysis.Request(null, "timeseries", 20, "count-desc", 1, null, null, 1000L);
        var query = new FacetQuery("default", 7L, 1000L, 61000L, null, null, null, null, null,
                null, null, null, null, null, null, false, false, null);
        assertThrows(org.apache.hertzbeat.observability.logs.service.LogAnalysisIntervalTooSmallException.class,
                () -> service.analysis(query, request));
        var source = new org.apache.hertzbeat.observability.logs.query.LogComparisonParser.Query(null, null);
        assertThrows(org.apache.hertzbeat.observability.logs.service.LogAnalysisIntervalTooSmallException.class,
                () -> service.compare(query, request, List.of(source, source), null));
        var valid = service.analysis(query(7L, "*"), request);
        assertEquals(1000L, valid.intervalMs());
        assertEquals(List.of(), valid.groups());
        verifyNoInteractions(reader);
    }

    @Test
    void trustedScopeIsOutsideStructuredExpression() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        when(reader.logAnalysis(any(), any(), anyLong())).thenReturn(new LogAnalysis.Result(
                new LogFacets.Window(1000, 5000), null, "groups", 20, "count-desc", 1, 0, false, null, List.of()));
        service.analysis(query(null, "service:one OR service:two"), REQUEST);
        var scope = ArgumentCaptor.forClass(org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery.class);
        verify(reader).logAnalysis(scope.capture(), any(), anyLong());
        assertEquals("default", scope.getValue().scope().workspaceId());
        assertEquals(Map.of("zone", "local"), scope.getValue().scope().resourceFilters());
        assertEquals(null, scope.getValue().scope().search());
    }

    @Test
    void noReaderAndUnsupportedReaderAreUnavailable() {
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> new LogQueryServiceImpl(List.of()).analysis(query(null, "*"), REQUEST));
        var reader = mock(HistoryDataReader.class, org.mockito.Mockito.CALLS_REAL_METHODS);
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> new LogQueryServiceImpl(List.of(reader)).analysis(query(null, "*"), REQUEST));
    }

    @Test
    void absentEntityIsEmptyAndInvalidSyntaxNeverReads() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        assertEquals(0, service.analysis(query(7L, "*"), REQUEST).matchingTotal());
        assertThrows(LogFilterQueryException.class, () -> service.analysis(query(null, "service:a OR"), REQUEST));
        verifyNoInteractions(reader);
    }

    @Test
    void measuredEmptyEntityPreservesRequestedMeasureAndOrderWithoutReads() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        var measure = new LogAnalysis.Measure("avg", "attribute:duration");
        var request = new LogAnalysis.Request(null, "timeseries", 20, "measure-asc", 1, measure);
        var result = service.analysis(query(7L, "*"), request);
        assertEquals(measure, result.measure());
        assertEquals("measure-asc", result.order());
        assertEquals(0, result.matchingTotal());
        assertEquals(List.of(), result.groups());
        verifyNoInteractions(reader);
    }

    @Test
    void measuredRequestReachesCompleteReaderWithoutCountFallback() {
        var reader = mock(HistoryDataReader.class, org.mockito.Mockito.CALLS_REAL_METHODS);
        var service = new LogQueryServiceImpl(List.of(reader));
        var request = new LogAnalysis.Request(null, "groups", 20, "measure-desc", 1,
                new LogAnalysis.Measure("unique", "attribute:user.id"));
        assertThrows(TelemetryStorageUnavailableException.class, () -> service.analysis(query(null, "*"), request));
        verify(reader).logAnalysis(org.mockito.ArgumentMatchers.any(org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery.class),
                org.mockito.ArgumentMatchers.eq(request), anyLong());
    }

    @Test
    void groupedEmptyEntityPreservesMetadataWithoutReader() {
        var reader = mock(HistoryDataReader.class);
        var grouping = new LogAnalysis.Grouping(1, List.of(new LogAnalysis.Dimension("attribute:x", 5),
                new LogAnalysis.Dimension("attribute:y", 4)));
        var request = new LogAnalysis.Request(null, "timeseries", 20, "count-desc", 1, null, grouping);
        var result = new LogQueryServiceImpl(List.of(reader)).analysis(query(7L, "*"), request);
        assertEquals(grouping, result.grouping());
        assertEquals(20, result.limit());
        assertEquals(List.of(), result.groups());
        verifyNoInteractions(reader);
    }

    @Test
    void groupedRequestCannotFallBackToUngroupedReader() {
        var reader = mock(HistoryDataReader.class, org.mockito.Mockito.CALLS_REAL_METHODS);
        var grouping = new LogAnalysis.Grouping(1, List.of(new LogAnalysis.Dimension("attribute:x", 5),
                new LogAnalysis.Dimension("attribute:y", 4)));
        var request = new LogAnalysis.Request(null, "groups", 20, "count-desc", 1, null, grouping);
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> new LogQueryServiceImpl(List.of(reader)).analysis(query(null, "*"), request));
        verify(reader).logAnalysis(org.mockito.ArgumentMatchers.any(org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery.class),
                org.mockito.ArgumentMatchers.eq(request), anyLong());
    }

    private static FacetQuery query(Long entity, String search) {
        return new FacetQuery("default", entity, 1000L, 5000L, null, null, null, null, null,
                search, null, null, null, "zone=local", null, false, false, "structured-v1");
    }
}
