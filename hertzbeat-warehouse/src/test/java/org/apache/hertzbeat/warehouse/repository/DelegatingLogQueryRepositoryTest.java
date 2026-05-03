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

package org.apache.hertzbeat.warehouse.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

@ExtendWith(MockitoExtension.class)
class DelegatingLogQueryRepositoryTest {

    @Mock
    private ObjectProvider<HistoryDataReader> historyDataReaderProvider;

    @Mock
    private HistoryDataReader firstReader;

    @Mock
    private HistoryDataReader secondReader;

    @Test
    void queryRecentLogsFallsBackToLaterReader() {
        LogEntry logEntry = LogEntry.builder().body("checkout failed").build();
        when(historyDataReaderProvider.orderedStream()).thenAnswer(invocation -> Stream.of(firstReader, secondReader));
        when(firstReader.queryLogsByMultipleConditionsWithPagination(anyLong(), anyLong(),
                eq(null), eq(null), eq(null), eq(null), eq(null), eq(0), eq(20)))
                .thenThrow(new UnsupportedOperationException("unsupported"));
        when(secondReader.queryLogsByMultipleConditionsWithPagination(anyLong(), anyLong(),
                eq(null), eq(null), eq(null), eq(null), eq(null), eq(0), eq(20)))
                .thenReturn(List.of(logEntry));

        LogQueryRepository repository = new DelegatingLogQueryRepository(historyDataReaderProvider);

        List<LogEntry> logs = repository.queryRecentLogs(1000L, 2000L, 20);

        assertEquals(1, logs.size());
        assertSame(logEntry, logs.getFirst());
    }

    @Test
    void queryLogsPassesTraceAndSpanFilters() {
        when(historyDataReaderProvider.orderedStream()).thenAnswer(invocation -> Stream.of(firstReader));
        when(firstReader.queryLogsByMultipleConditionsWithPagination(anyLong(), anyLong(),
                eq("trace-1"), eq("span-1"), eq(null), eq(null), eq(null), eq(0), eq(5)))
                .thenReturn(List.of(LogEntry.builder().traceId("trace-1").spanId("span-1").build()));

        LogQueryRepository repository = new DelegatingLogQueryRepository(historyDataReaderProvider);

        List<LogEntry> logs = repository.queryLogs(1000L, 2000L, "trace-1", "span-1", 5);

        assertEquals(1, logs.size());
        assertEquals("trace-1", logs.getFirst().getTraceId());
        assertEquals("span-1", logs.getFirst().getSpanId());
    }

    @Test
    void countRecentLogsUsesFirstPositiveCount() {
        when(historyDataReaderProvider.orderedStream()).thenAnswer(invocation -> Stream.of(firstReader, secondReader));
        when(firstReader.countLogsByMultipleConditions(anyLong(), anyLong(),
                eq(null), eq(null), eq(null), eq(null), eq(null)))
                .thenThrow(new UnsupportedOperationException("unsupported"));
        when(secondReader.countLogsByMultipleConditions(anyLong(), anyLong(),
                eq(null), eq(null), eq(null), eq(null), eq(null)))
                .thenReturn(9L);

        LogQueryRepository repository = new DelegatingLogQueryRepository(historyDataReaderProvider);

        long count = repository.countRecentLogs(1000L, 2000L);

        assertEquals(9L, count);
    }

    @Test
    void queryRecentLogsReturnsEmptyListWhenNoReaderHasLogs() {
        when(historyDataReaderProvider.orderedStream()).thenAnswer(invocation -> Stream.of(firstReader));
        when(firstReader.queryLogsByMultipleConditionsWithPagination(anyLong(), anyLong(),
                eq(null), eq(null), eq(null), eq(null), eq(null), eq(0), eq(10)))
                .thenReturn(List.of());

        LogQueryRepository repository = new DelegatingLogQueryRepository(historyDataReaderProvider);

        assertTrue(repository.queryRecentLogs(1000L, 2000L, 10).isEmpty());
    }
}
