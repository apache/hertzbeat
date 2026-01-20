/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.greptime.GreptimeDB;
import io.greptime.models.Err;
import io.greptime.models.Result;
import io.greptime.models.Table;
import io.greptime.models.WriteOk;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.arrow.ArrowCell;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.PromQlQueryContent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

/**
 * Test case for {@link GreptimeDbDataStorage}
 */
@ExtendWith(MockitoExtension.class)
class GreptimeDbDataStorageTest {

    @Mock
    private GreptimeProperties greptimeProperties;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private GreptimeSqlQueryExecutor greptimeSqlQueryExecutor;

    @Mock
    private GreptimeDB greptimeDb;

    private GreptimeDbDataStorage greptimeDbDataStorage;

    @BeforeEach
    void setUp() {
        lenient().when(greptimeProperties.grpcEndpoints()).thenReturn("127.0.0.1:4001");
        lenient().when(greptimeProperties.database()).thenReturn("hertzbeat");
        lenient().when(greptimeProperties.username()).thenReturn("username");
        lenient().when(greptimeProperties.password()).thenReturn("password");
        lenient().when(greptimeProperties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
    }

    @Test
    void testConstructor() {
        // Test constructor with null properties
        assertThrows(IllegalArgumentException.class, () -> new GreptimeDbDataStorage(null, restTemplate, greptimeSqlQueryExecutor));

        // Test successful constructor initialization
        try (MockedStatic<GreptimeDB> mockedStatic = mockStatic(GreptimeDB.class)) {
            mockedStatic.when(() -> GreptimeDB.create(any())).thenReturn(greptimeDb);
            GreptimeDbDataStorage storage = new GreptimeDbDataStorage(greptimeProperties, restTemplate, greptimeSqlQueryExecutor);
            assertNotNull(storage);
            assertTrue(storage.isServerAvailable());
        }

        // Test constructor when GreptimeDB.create throws an exception
        try (MockedStatic<GreptimeDB> mockedStatic = mockStatic(GreptimeDB.class)) {
            mockedStatic.when(() -> GreptimeDB.create(any())).thenThrow(new RuntimeException("Connection failed"));
            GreptimeDbDataStorage storage = new GreptimeDbDataStorage(greptimeProperties, restTemplate, greptimeSqlQueryExecutor);
            assertNotNull(storage);
            assertFalse(storage.isServerAvailable());
        }
    }

    @Test
    void testSaveData() {
        try (MockedStatic<GreptimeDB> mockedStatic = mockStatic(GreptimeDB.class)) {
            mockedStatic.when(() -> GreptimeDB.create(any())).thenReturn(greptimeDb);

            // Mock the write result
            @SuppressWarnings("unchecked")
            Result<WriteOk, Err> mockResult = mock(Result.class);
            when(mockResult.isOk()).thenReturn(true);
            CompletableFuture<Result<WriteOk, Err>> mockFuture = CompletableFuture.completedFuture(mockResult);
            when(greptimeDb.write(any(Table.class))).thenReturn(mockFuture);

            greptimeDbDataStorage = new GreptimeDbDataStorage(greptimeProperties, restTemplate, greptimeSqlQueryExecutor);

            // Test with valid metrics data
            CollectRep.MetricsData metricsData = createMockMetricsData(true);
            greptimeDbDataStorage.saveData(metricsData);
            verify(greptimeDb, times(1)).write(any(Table.class));

            // Test with failure code
            CollectRep.MetricsData failMetricsData = mock(CollectRep.MetricsData.class);
            when(failMetricsData.getCode()).thenReturn(CollectRep.Code.FAIL);
            greptimeDbDataStorage.saveData(failMetricsData);
            // Verify write was not called again
            verify(greptimeDb, times(1)).write(any(Table.class));

            // Test with empty values
            CollectRep.MetricsData emptyMetricsData = createMockMetricsData(false);
            greptimeDbDataStorage.saveData(emptyMetricsData);
            // Verify write was not called again
            verify(greptimeDb, times(1)).write(any(Table.class));
        }
    }

    @Test
    void testGetHistoryMetricData() {
        greptimeDbDataStorage = new GreptimeDbDataStorage(greptimeProperties, restTemplate, greptimeSqlQueryExecutor);

        PromQlQueryContent content = createMockPromQlQueryContent();
        ResponseEntity<PromQlQueryContent> responseEntity = new ResponseEntity<>(content, HttpStatus.OK);

        when(restTemplate.exchange(any(), eq(HttpMethod.GET), any(HttpEntity.class), eq(PromQlQueryContent.class)))
                .thenReturn(responseEntity);

        Map<String, List<Value>> result = greptimeDbDataStorage.getHistoryMetricData("127.0.0.1:8080", "test_monitor", "test_app", "test_metrics", "test_metric", "6h");

        assertNotNull(result);
        assertFalse(result.isEmpty());
        // Verify that the mapping logic correctly extracted the value
        assertEquals("85.5", result.values().iterator().next().get(0).getOrigin());
    }

    @Test
    void testSaveLogData() {
        try (MockedStatic<GreptimeDB> mockedStatic = mockStatic(GreptimeDB.class)) {
            mockedStatic.when(() -> GreptimeDB.create(any())).thenReturn(greptimeDb);

            // Mock the write result
            @SuppressWarnings("unchecked")
            Result<WriteOk, Err> mockResult = mock(Result.class);
            when(mockResult.isOk()).thenReturn(true);
            CompletableFuture<Result<WriteOk, Err>> mockFuture = CompletableFuture.completedFuture(mockResult);
            when(greptimeDb.write(any(Table.class))).thenReturn(mockFuture);

            greptimeDbDataStorage = new GreptimeDbDataStorage(greptimeProperties, restTemplate, greptimeSqlQueryExecutor);

            LogEntry logEntry = createMockLogEntry();
            greptimeDbDataStorage.saveLogData(logEntry);

            verify(greptimeDb, times(1)).write(any(Table.class));
        }
    }

    @Test
    void testQueryAndCountLogs() {
        try (MockedStatic<GreptimeDB> mockedStatic = mockStatic(GreptimeDB.class)) {
            mockedStatic.when(() -> GreptimeDB.create(any())).thenReturn(greptimeDb);
            greptimeDbDataStorage = new GreptimeDbDataStorage(greptimeProperties, restTemplate, greptimeSqlQueryExecutor);
            List<Map<String, Object>> mockLogRows = createMockLogRows();
            when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(mockLogRows);

            // Test basic query
            List<LogEntry> result = greptimeDbDataStorage.queryLogsByMultipleConditions(
                    System.currentTimeMillis() - 3600000, System.currentTimeMillis(), "trace123", "span456", 1, "INFO"
            );
            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals("trace123", result.get(0).getTraceId());

            // Test count query
            List<Map<String, Object>> mockCountResult = List.of(Map.of("count", 5L));
            when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(mockCountResult);
            long count = greptimeDbDataStorage.countLogsByMultipleConditions(
                    System.currentTimeMillis() - 3600000, System.currentTimeMillis(), null, null, null, null
            );
            assertEquals(5L, count);

            // Test count query with executor error
            when(greptimeSqlQueryExecutor.execute(anyString())).thenThrow(new RuntimeException("Database error"));
            long errorCount = greptimeDbDataStorage.countLogsByMultipleConditions(System.currentTimeMillis() - 3600000, System.currentTimeMillis(), null, null, null, null);
            assertEquals(0L, errorCount);
        }
    }

    @Test
    void testQueryLogsWithPagination() {
        try (MockedStatic<GreptimeDB> mockedStatic = mockStatic(GreptimeDB.class)) {
            mockedStatic.when(() -> GreptimeDB.create(any())).thenReturn(greptimeDb);
            greptimeDbDataStorage = new GreptimeDbDataStorage(greptimeProperties, restTemplate, greptimeSqlQueryExecutor);
            when(greptimeSqlQueryExecutor.execute(anyString())).thenReturn(createMockLogRows());

            ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);

            greptimeDbDataStorage.queryLogsByMultipleConditionsWithPagination(
                    System.currentTimeMillis() - 3600000, System.currentTimeMillis(),
                    null, null, null, null, 1, 10
            );

            verify(greptimeSqlQueryExecutor).execute(sqlCaptor.capture());
            String capturedSql = sqlCaptor.getValue();

            assertTrue(capturedSql.toLowerCase().contains("limit 10"));
            assertTrue(capturedSql.toLowerCase().contains("offset 1"));
        }
    }


    @Test
    void testBatchDeleteLogsWithValidList() {
        try (MockedStatic<GreptimeDB> mockedStatic = mockStatic(GreptimeDB.class)) {
            mockedStatic.when(() -> GreptimeDB.create(any())).thenReturn(greptimeDb);
            greptimeDbDataStorage = new GreptimeDbDataStorage(greptimeProperties, restTemplate, greptimeSqlQueryExecutor);

            // Test with valid list
            boolean result = greptimeDbDataStorage.batchDeleteLogs(List.of(1L, 2L));
            assertTrue(result);
            verify(greptimeSqlQueryExecutor, times(1)).execute(anyString());
        }
    }

    @Test
    void testBatchDeleteLogsWithEmptyList() {
        try (MockedStatic<GreptimeDB> mockedStatic = mockStatic(GreptimeDB.class)) {
            mockedStatic.when(() -> GreptimeDB.create(any())).thenReturn(greptimeDb);
            greptimeDbDataStorage = new GreptimeDbDataStorage(greptimeProperties, restTemplate, greptimeSqlQueryExecutor);

            // Test with empty list
            boolean emptyResult = greptimeDbDataStorage.batchDeleteLogs(Collections.emptyList());
            assertFalse(emptyResult);
            verify(greptimeSqlQueryExecutor, never()).execute(anyString());
        }
    }

    @Test
    void testBatchDeleteLogsWithNullList() {
        try (MockedStatic<GreptimeDB> mockedStatic = mockStatic(GreptimeDB.class)) {
            mockedStatic.when(() -> GreptimeDB.create(any())).thenReturn(greptimeDb);
            greptimeDbDataStorage = new GreptimeDbDataStorage(greptimeProperties, restTemplate, greptimeSqlQueryExecutor);

            // Test with null list
            boolean nullResult = greptimeDbDataStorage.batchDeleteLogs(null);
            assertFalse(nullResult);
            verify(greptimeSqlQueryExecutor, never()).execute(anyString());
        }
    }

    @Test
    void testDestroy() {
        try (MockedStatic<GreptimeDB> mockedStatic = mockStatic(GreptimeDB.class)) {
            mockedStatic.when(() -> GreptimeDB.create(any())).thenReturn(greptimeDb);
            greptimeDbDataStorage = new GreptimeDbDataStorage(greptimeProperties, restTemplate, greptimeSqlQueryExecutor);

            greptimeDbDataStorage.destroy();

            verify(greptimeDb, times(1)).shutdownGracefully();
        }
    }

    private CollectRep.MetricsData createMockMetricsData(boolean hasValues) {
        CollectRep.MetricsData mockMetricsData = mock(CollectRep.MetricsData.class);
        lenient().when(mockMetricsData.getCode()).thenReturn(CollectRep.Code.SUCCESS);
        lenient().when(mockMetricsData.getMetrics()).thenReturn("cpu");
        lenient().when(mockMetricsData.getId()).thenReturn(1L);

        if (!hasValues) {
            lenient().when(mockMetricsData.getValues()).thenReturn(Collections.emptyList());
            return mockMetricsData;
        }

        // Only create detailed mocks when hasValues = true
        // Mock fields
        CollectRep.Field mockField1 = mock(CollectRep.Field.class);
        lenient().when(mockField1.getName()).thenReturn("usage");
        lenient().when(mockField1.getLabel()).thenReturn(false);
        lenient().when(mockField1.getType()).thenReturn((int) CommonConstants.TYPE_NUMBER);

        CollectRep.Field mockField2 = mock(CollectRep.Field.class);
        lenient().when(mockField2.getName()).thenReturn("instance");
        lenient().when(mockField2.getLabel()).thenReturn(true);
        lenient().when(mockField2.getType()).thenReturn((int) CommonConstants.TYPE_STRING);

        lenient().when(mockMetricsData.getFields()).thenReturn(List.of(mockField1, mockField2));

        // Create ValueRow mock
        CollectRep.ValueRow mockValueRow = mock(CollectRep.ValueRow.class);
        lenient().when(mockValueRow.getColumnsList()).thenReturn(List.of("server1", "85.5"));

        lenient().when(mockMetricsData.getValues()).thenReturn(List.of(mockValueRow));

        // Mock RowWrapper for readRow()
        RowWrapper mockRowWrapper = mock(RowWrapper.class);
        lenient().when(mockRowWrapper.hasNextRow()).thenReturn(true, false);
        lenient().when(mockRowWrapper.nextRow()).thenReturn(mockRowWrapper);

        // Mock cell stream
        ArrowCell mockCell1 = mock(ArrowCell.class);
        lenient().when(mockCell1.getValue()).thenReturn("85.5");
        lenient().when(mockCell1.getMetadataAsBoolean(any())).thenReturn(false);
        lenient().when(mockCell1.getMetadataAsByte(any())).thenReturn(CommonConstants.TYPE_NUMBER);

        ArrowCell mockCell2 = mock(ArrowCell.class);
        lenient().when(mockCell2.getValue()).thenReturn("server1");
        lenient().when(mockCell2.getMetadataAsBoolean(any())).thenReturn(true);
        lenient().when(mockCell2.getMetadataAsByte(any())).thenReturn(CommonConstants.TYPE_STRING);

        lenient().when(mockRowWrapper.cellStream()).thenReturn(java.util.stream.Stream.of(mockCell1, mockCell2));
        lenient().when(mockMetricsData.readRow()).thenReturn(mockRowWrapper);

        return mockMetricsData;
    }

    private PromQlQueryContent createMockPromQlQueryContent() {
        PromQlQueryContent content = new PromQlQueryContent();
        PromQlQueryContent.ContentData data = new PromQlQueryContent.ContentData();
        PromQlQueryContent.ContentData.Content result = new PromQlQueryContent.ContentData.Content();

        Map<String, String> metric = new HashMap<>();
        metric.put("__name__", "cpu");
        metric.put("instance", "1");
        result.setMetric(metric);

        List<Object[]> values = new ArrayList<>();
        values.add(new Object[]{System.currentTimeMillis() / 1000.0, "85.5"});
        result.setValues(values);

        data.setResult(List.of(result));
        content.setData(data);

        return content;
    }

    private LogEntry createMockLogEntry() {
        return LogEntry.builder()
                .timeUnixNano(System.nanoTime())
                .severityText("INFO")
                .body("Test log message")
                .traceId("trace123")
                .spanId("span456")
                .build();
    }

    private List<Map<String, Object>> createMockLogRows() {
        Map<String, Object> row = new HashMap<>();
        row.put("time_unix_nano", System.nanoTime());
        row.put("severity_text", "INFO");
        row.put("body", "\"Test log message\"");
        row.put("trace_id", "trace123");
        row.put("span_id", "span456");

        return List.of(row);
    }
}
