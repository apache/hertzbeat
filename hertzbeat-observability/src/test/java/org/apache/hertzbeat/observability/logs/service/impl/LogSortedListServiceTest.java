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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import java.util.List;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogSort;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.logs.service.LogQueryService.FacetQuery;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class LogSortedListServiceTest {
    private static final LogSort SORT = new LogSort(1, "attribute:duration", "number", "desc");

    @Test
    void structuredSelectionPreservesOuterTrustedFilters() {
        var reader = mock(HistoryDataReader.class);
        when(reader.querySortedLogs(any(), eq(0), eq(20), eq(SORT))).thenReturn(List.of());
        var query = new FacetQuery("default", null, 1000L, 5000L, null, null, null, null, null,
                "@duration:2 OR @duration:10", "checkout", null, null, "zone=local", null, false, false, "structured-v1",
                "{\"version\":1,\"groups\":[{\"field\":\"attribute:kind\",\"kind\":\"value\",\"value\":\"server\"}]}");
        new LogQueryServiceImpl(List.of(reader)).sortedList(query, 0, 20, SORT);
        var source = ArgumentCaptor.forClass(LogComparison.Source.class);
        verify(reader).querySortedLogs(source.capture(), eq(0), eq(20), eq(SORT));
        assertEquals(null, source.getValue().scope().search());
        assertEquals("checkout", source.getValue().scope().serviceName());
        assertEquals("local", source.getValue().scope().resourceFilters().get("zone"));
        assertEquals("server", source.getValue().selection().groups().getFirst().value());
        org.junit.jupiter.api.Assertions.assertInstanceOf(
                org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Or.class, source.getValue().expression());
    }

    @Test
    void completeReaderKeepsLegacyBodyScopeAndGlobalCount() {
        var reader = mock(HistoryDataReader.class);
        when(reader.querySortedLogs(any(), eq(20), eq(20), eq(SORT))).thenReturn(List.of());
        when(reader.countSortedLogs(any())).thenReturn(0L);
        var result = new LogQueryServiceImpl(List.of(reader)).sortedList(query(null), 1, 20, SORT);
        var source = ArgumentCaptor.forClass(LogComparison.Source.class);
        verify(reader).querySortedLogs(source.capture(), eq(20), eq(20), eq(SORT));
        verify(reader).countSortedLogs(source.getValue());
        assertEquals("literal OR text", source.getValue().scope().search());
        assertEquals("default", source.getValue().scope().workspaceId());
        assertEquals(1, result.getNumber());
        verifyNoMoreInteractions(reader);
    }

    @Test
    void invalidDescriptorDoesNotHideBehindEmptyEntityAndOldReaderDoesNotFallback() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        assertThrows(IllegalArgumentException.class, () -> service.sortedList(query(7L), 0, 20, null));
        var empty = service.sortedList(query(7L), 2, 20, SORT);
        assertEquals(2, empty.getNumber());
        verifyNoInteractions(reader);
        var unsupported = mock(HistoryDataReader.class, org.mockito.Mockito.CALLS_REAL_METHODS);
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> new LogQueryServiceImpl(List.of(unsupported)).sortedList(query(null), 0, 20, SORT));
        verify(unsupported).querySortedLogs(any(), eq(0), eq(20), eq(SORT));
        verifyNoMoreInteractions(unsupported);
    }

    private static FacetQuery query(Long entity) {
        return new FacetQuery("default", entity, 1000L, 5000L, null, null, null, null, null,
                "literal OR text", null, null, null, null, null, false, false);
    }
}
