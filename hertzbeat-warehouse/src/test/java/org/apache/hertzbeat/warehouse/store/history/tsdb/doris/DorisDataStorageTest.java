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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.zaxxer.hikari.HikariDataSource;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.warehouse.WarehouseWorkerPool;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * Tests for {@link DorisDataStorage}.
 */
class DorisDataStorageTest {

    private static final long NANOS_PER_MILLISECOND = 1_000_000L;

    @Test
    void buildCreateTableSqlShouldContainExpectedMetricKeysAndProperties() throws Exception {
        DorisDataStorage storage = createStorage(createProperties(true));

        String createTableSql = invokePrivateStringMethod(storage, "buildCreateTableSql");

        assertThat(createTableSql).contains("DUPLICATE KEY(instance, app, metrics, metric, record_time)");
        assertThat(createTableSql).contains("PARTITION BY RANGE(record_time)");
        assertThat(createTableSql).contains("DISTRIBUTED BY HASH(instance, app, metrics) BUCKETS 12");
        assertThat(createTableSql).contains("\"dynamic_partition.enable\" = \"true\"");
        assertThat(createTableSql).contains("\"dynamic_partition.time_unit\" = \"HOUR\"");
        assertThat(createTableSql).contains("\"dynamic_partition.history_partition_num\" = \"2\"");
        assertThat(createTableSql).contains("\"bloom_filter_columns\" = \"instance,app,metrics,metric\"");
    }

    @Test
    void buildCreateLogTableSqlShouldContainExpectedLogKeysAndProperties() throws Exception {
        DorisDataStorage storage = createStorage(createProperties(false));

        String createLogTableSql = invokePrivateStringMethod(storage, "buildCreateLogTableSql");

        assertThat(createLogTableSql).contains("DUPLICATE KEY(time_unix_nano, trace_id, span_id, event_time)");
        assertThat(createLogTableSql).contains("DISTRIBUTED BY HASH(time_unix_nano) BUCKETS 12");
        assertThat(createLogTableSql).contains("\"replication_num\" = \"1\"");
        assertThat(createLogTableSql).contains("\"bloom_filter_columns\" = \"trace_id,span_id,severity_number,severity_text\"");
        assertThat(createLogTableSql).doesNotContain("\"dynamic_partition.enable\" = \"true\"");
    }

    @Test
    void appendLogWhereClauseShouldAssembleAllConditionsInOrder() throws Exception {
        DorisDataStorage storage = createStorage(createProperties(false));

        StringBuilder sql = new StringBuilder("SELECT * FROM hertzbeat.hzb_log");
        List<Object> params = new ArrayList<>();
        invokeAppendLogWhereClause(storage, sql, params,
                1000L, 2000L, "trace-1", "span-1", 9, "INFO", "error");

        assertThat(sql.toString()).contains(" WHERE ");
        assertThat(sql.toString()).contains("time_unix_nano >= ?");
        assertThat(sql.toString()).contains("time_unix_nano <= ?");
        assertThat(sql.toString()).contains("trace_id = ?");
        assertThat(sql.toString()).contains("span_id = ?");
        assertThat(sql.toString()).contains("severity_number = ?");
        assertThat(sql.toString()).contains("severity_text = ?");
        assertThat(sql.toString()).contains("body LIKE ?");
        assertThat(params).containsExactly(
                1000L * NANOS_PER_MILLISECOND,
                2000L * NANOS_PER_MILLISECOND,
                "trace-1",
                "span-1",
                9,
                "INFO",
                "%error%"
        );
    }

    @Test
    void queryLogsWithPaginationShouldContainLimitAndOffsetClauses() throws Exception {
        DorisDataStorage storage = createStorage(createProperties(false));
        HikariDataSource dataSource = mock(HikariDataSource.class);
        Connection connection = mock(Connection.class);
        PreparedStatement preparedStatement = mock(PreparedStatement.class);
        ResultSet resultSet = mock(ResultSet.class);

        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(preparedStatement);
        when(preparedStatement.executeQuery()).thenReturn(resultSet);
        when(resultSet.next()).thenReturn(false);

        setPrivateField(storage, "dataSource", dataSource);

        storage.queryLogsByMultipleConditionsWithPagination(
                1000L, 2000L, null, null, null, null, null, 5, 20
        );

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(connection).prepareStatement(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();

        assertThat(sql).contains("ORDER BY time_unix_nano DESC");
        assertThat(sql).contains("LIMIT ?");
        assertThat(sql).contains("OFFSET ?");
    }

    private DorisDataStorage createStorage(DorisProperties properties) {
        WarehouseWorkerPool workerPool = mock(WarehouseWorkerPool.class);
        return new DorisDataStorage(properties, workerPool);
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
                "jdbc:mysql://127.0.0.1:1/hertzbeat?connectTimeout=200&socketTimeout=200",
                "root",
                "123456",
                tableConfig,
                poolConfig,
                writeConfig
        );
    }

    private String invokePrivateStringMethod(Object target, String methodName) throws Exception {
        Method method = target.getClass().getDeclaredMethod(methodName);
        method.setAccessible(true);
        return (String) method.invoke(target);
    }

    private void invokeAppendLogWhereClause(DorisDataStorage storage, StringBuilder sql, List<Object> params,
                                            Long startTime, Long endTime, String traceId, String spanId,
                                            Integer severityNumber, String severityText, String searchContent)
            throws Exception {
        Method method = DorisDataStorage.class.getDeclaredMethod(
                "appendLogWhereClause",
                StringBuilder.class, List.class, Long.class, Long.class,
                String.class, String.class, Integer.class, String.class, String.class
        );
        method.setAccessible(true);
        method.invoke(storage, sql, params, startTime, endTime, traceId, spanId, severityNumber, severityText, searchContent);
    }

    private void setPrivateField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
