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

package org.apache.hertzbeat.warehouse.store.history.tsdb.doris;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockConstruction;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.warehouse.WarehouseWorkerPool;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedConstruction;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Tests for {@link DorisDataStorage}.
 */
@ExtendWith(MockitoExtension.class)
class DorisDataStorageTest {

    private static final long NANOS_PER_MILLISECOND = 1_000_000L;

    @Mock
    private WarehouseWorkerPool workerPool;

    @Test
    void queryLogsWithPaginationShouldContainLimitAndOffsetClauses() throws Exception {
        QueryStorageContext context = createQueryStorageContext(createProperties(false));
        when(context.queryPreparedStatement().executeQuery()).thenReturn(context.resultSet());
        when(context.resultSet().next()).thenReturn(false);

        context.storage().queryLogsByMultipleConditionsWithPagination(
                1000L, 2000L, null, null, null, null, null, 5, 20
        );

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(context.queryConnection()).prepareStatement(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();

        assertThat(sql).contains("ORDER BY time_unix_nano DESC");
        assertThat(sql).contains("LIMIT ?");
        assertThat(sql).contains("OFFSET ?");
    }

    @Test
    void queryLogsShouldBindAllConditionsWithConvertedTimeInOrder() throws Exception {
        QueryStorageContext context = createQueryStorageContext(createProperties(false));
        when(context.queryPreparedStatement().executeQuery()).thenReturn(context.resultSet());
        when(context.resultSet().next()).thenReturn(false);

        context.storage().queryLogsByMultipleConditions(
                1000L, 2000L, "trace-1", "span-1", 9, "INFO", "error"
        );

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(context.queryConnection()).prepareStatement(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();

        assertThat(sql).contains("WHERE");
        assertThat(sql).contains("time_unix_nano >= ?");
        assertThat(sql).contains("time_unix_nano <= ?");
        assertThat(sql).contains("trace_id = ?");
        assertThat(sql).contains("span_id = ?");
        assertThat(sql).contains("severity_number = ?");
        assertThat(sql).contains("severity_text = ?");
        assertThat(sql).contains("body LIKE ?");
        assertThat(sql).contains("ORDER BY time_unix_nano DESC");

        verify(context.queryPreparedStatement()).setObject(1, 1000L * NANOS_PER_MILLISECOND);
        verify(context.queryPreparedStatement()).setObject(2, 2000L * NANOS_PER_MILLISECOND);
        verify(context.queryPreparedStatement()).setObject(3, "trace-1");
        verify(context.queryPreparedStatement()).setObject(4, "span-1");
        verify(context.queryPreparedStatement()).setObject(5, 9);
        verify(context.queryPreparedStatement()).setObject(6, "INFO");
        verify(context.queryPreparedStatement()).setObject(7, "%error%");
    }

    @Test
    void queryLogsWithPaginationShouldNotAppendOffsetWhenOffsetIsZero() throws Exception {
        QueryStorageContext context = createQueryStorageContext(createProperties(false));
        when(context.queryPreparedStatement().executeQuery()).thenReturn(context.resultSet());
        when(context.resultSet().next()).thenReturn(false);

        context.storage().queryLogsByMultipleConditionsWithPagination(
                null, null, null, null, null, null, null, 0, 20
        );

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(context.queryConnection()).prepareStatement(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();

        assertThat(sql).contains("LIMIT ?");
        assertThat(sql).doesNotContain("OFFSET ?");
        verify(context.queryPreparedStatement()).setObject(1, 20);
    }

    @Test
    void countLogsShouldReturnCountAndBindConditions() throws Exception {
        QueryStorageContext context = createQueryStorageContext(createProperties(false));
        when(context.queryPreparedStatement().executeQuery()).thenReturn(context.resultSet());
        when(context.resultSet().next()).thenReturn(true);
        when(context.resultSet().getLong("count")).thenReturn(5L);

        long count = context.storage().countLogsByMultipleConditions(
                1000L, null, "trace-1", null, null, null, null
        );

        assertThat(count).isEqualTo(5L);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(context.queryConnection()).prepareStatement(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();

        assertThat(sql).contains("SELECT COUNT(*) AS count");
        assertThat(sql).contains("time_unix_nano >= ?");
        assertThat(sql).contains("trace_id = ?");
        verify(context.queryPreparedStatement()).setObject(1, 1000L * NANOS_PER_MILLISECOND);
        verify(context.queryPreparedStatement()).setObject(2, "trace-1");
    }

    @Test
    void batchDeleteLogsShouldFilterNullValuesAndExecuteDelete() throws Exception {
        QueryStorageContext context = createQueryStorageContext(createProperties(false));
        when(context.queryPreparedStatement().executeUpdate()).thenReturn(2);

        List<Long> timeUnixNanos = new ArrayList<>();
        timeUnixNanos.add(111L);
        timeUnixNanos.add(null);
        timeUnixNanos.add(333L);

        boolean deleted = context.storage().batchDeleteLogs(timeUnixNanos);

        assertThat(deleted).isTrue();

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(context.queryConnection()).prepareStatement(sqlCaptor.capture());
        assertThat(sqlCaptor.getValue()).contains("time_unix_nano IN (?,?)");
        verify(context.queryPreparedStatement()).setLong(1, 111L);
        verify(context.queryPreparedStatement()).setLong(2, 333L);
    }

    @Test
    void batchDeleteLogsShouldReturnFalseWhenAllValuesAreNull() throws Exception {
        DorisDataStorage storage = createStorageContext(createProperties(false));

        List<Long> timeUnixNanos = new ArrayList<>();
        timeUnixNanos.add(null);
        timeUnixNanos.add(null);

        boolean deleted = storage.batchDeleteLogs(timeUnixNanos);

        assertThat(deleted).isFalse();
    }

    @Test
    void queryLogsShouldMapJsonColumnsToLogEntryFields() throws Exception {
        QueryStorageContext context = createQueryStorageContext(createProperties(false));
        when(context.queryPreparedStatement().executeQuery()).thenReturn(context.resultSet());
        ResultSet resultSet = context.resultSet();

        when(resultSet.next()).thenReturn(true, false);
        when(resultSet.getLong("time_unix_nano")).thenReturn(111L);
        when(resultSet.getLong("observed_time_unix_nano")).thenReturn(222L);
        when(resultSet.getInt("severity_number")).thenReturn(9);
        when(resultSet.getString("severity_text")).thenReturn("INFO");
        when(resultSet.getString("body")).thenReturn("{\"message\":\"ok\"}");
        when(resultSet.getString("trace_id")).thenReturn("trace-1");
        when(resultSet.getString("span_id")).thenReturn("span-1");
        when(resultSet.getInt("trace_flags")).thenReturn(1);
        when(resultSet.getString("attributes")).thenReturn("{\"k\":\"v\"}");
        when(resultSet.getString("resource")).thenReturn("{\"service\":\"warehouse\"}");
        when(resultSet.getString("instrumentation_scope")).thenReturn("{\"name\":\"scope\",\"version\":\"1.0.0\"}");
        when(resultSet.getInt("dropped_attributes_count")).thenReturn(3);
        when(resultSet.wasNull()).thenReturn(false, false, false);

        List<LogEntry> entries = context.storage().queryLogsByMultipleConditions(
                null, null, null, null, null, null, null
        );

        assertThat(entries).hasSize(1);
        LogEntry entry = entries.get(0);
        assertThat(entry.getTimeUnixNano()).isEqualTo(111L);
        assertThat(entry.getObservedTimeUnixNano()).isEqualTo(222L);
        assertThat(entry.getSeverityNumber()).isEqualTo(9);
        assertThat(entry.getSeverityText()).isEqualTo("INFO");
        assertThat(entry.getTraceId()).isEqualTo("trace-1");
        assertThat(entry.getSpanId()).isEqualTo("span-1");
        assertThat(entry.getBody()).isInstanceOf(Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) entry.getBody();
        assertThat(body).containsEntry("message", "ok");
        assertThat(entry.getAttributes()).containsEntry("k", "v");
        assertThat(entry.getResource()).containsEntry("service", "warehouse");
        assertThat(entry.getInstrumentationScope()).isNotNull();
        assertThat(entry.getInstrumentationScope().getName()).isEqualTo("scope");
        assertThat(entry.getInstrumentationScope().getVersion()).isEqualTo("1.0.0");
    }

    private QueryStorageContext createQueryStorageContext(DorisProperties properties) {
        Connection initConnection = mock(Connection.class);
        Statement initStatement = mock(Statement.class);
        Connection tableConnection = mock(Connection.class);
        Statement tableStatement = mock(Statement.class);
        Connection queryConnection = mock(Connection.class);
        PreparedStatement queryPreparedStatement = mock(PreparedStatement.class);
        ResultSet resultSet = mock(ResultSet.class);
        AtomicInteger dataSourceConnectionCalls = new AtomicInteger(0);
        String baseUrl = properties.url();
        String username = properties.username();
        String password = properties.password();
        try {
            when(initConnection.createStatement()).thenReturn(initStatement);
            when(tableConnection.createStatement()).thenReturn(tableStatement);
            when(queryConnection.prepareStatement(anyString())).thenReturn(queryPreparedStatement);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        try (MockedStatic<DriverManager> driverManagerMock = mockStatic(DriverManager.class);
             MockedConstruction<HikariDataSource> hikariDataSourceMockedConstruction = mockConstruction(
                     HikariDataSource.class,
                     (mock, context) -> when(mock.getConnection()).thenAnswer(invocation -> {
                         int call = dataSourceConnectionCalls.getAndIncrement();
                         return call == 0 ? tableConnection : queryConnection;
                     }))) {
            driverManagerMock.when(() -> DriverManager.getConnection(baseUrl, username, password))
                    .thenReturn(initConnection);
            DorisDataStorage storage = new DorisDataStorage(properties, workerPool);
            return new QueryStorageContext(storage, queryConnection, queryPreparedStatement, resultSet);
        }
    }

    private DorisDataStorage createStorageContext(DorisProperties properties) {
        Connection initConnection = mock(Connection.class);
        Statement initStatement = mock(Statement.class);
        Connection tableConnection = mock(Connection.class);
        Statement tableStatement = mock(Statement.class);
        String baseUrl = properties.url();
        String username = properties.username();
        String password = properties.password();
        try {
            when(initConnection.createStatement()).thenReturn(initStatement);
            when(tableConnection.createStatement()).thenReturn(tableStatement);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        try (MockedStatic<DriverManager> driverManagerMock = mockStatic(DriverManager.class);
             MockedConstruction<HikariDataSource> hikariDataSourceMockedConstruction = mockConstruction(
                     HikariDataSource.class, (mock, context) -> when(mock.getConnection()).thenReturn(tableConnection))) {
            driverManagerMock.when(() -> DriverManager.getConnection(baseUrl, username, password))
                    .thenReturn(initConnection);
            return new DorisDataStorage(properties, workerPool);
        }
    }

    private DorisProperties createProperties(boolean enablePartition) {
        DorisProperties.TableConfig tableConfig = new DorisProperties.TableConfig(
                enablePartition, "HOUR", 2, 1, 12, 1, 4096
        );
        DorisProperties.PoolConfig poolConfig = new DorisProperties.PoolConfig(
                1, 2, 500, 0, 60_000
        );
        DorisProperties.WriteConfig writeConfig = new DorisProperties.WriteConfig(
                "jdbc", 1000, 5, false, DorisProperties.StreamLoadConfig.createDefault()
        );
        return new DorisProperties(
                true,
                "jdbc:mysql://127.0.0.1:9030/hertzbeat",
                "root",
                "123456",
                tableConfig,
                poolConfig,
                writeConfig
        );
    }

    private record QueryStorageContext(DorisDataStorage storage, Connection queryConnection,
                                       PreparedStatement queryPreparedStatement, ResultSet resultSet) {
    }
}
