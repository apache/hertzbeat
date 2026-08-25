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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
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
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.WarehouseWorkerPool;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedConstruction;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Exact workspace predicate contracts for scoped Doris log reads.
 */
@ExtendWith(MockitoExtension.class)
class DorisWorkspacePredicateIntegrityTest {

    private static final String WILDCARD_WORKSPACE = "team_%\\ops";
    private static final String WORKSPACE_SELECTOR = "COALESCE("
            + "NULLIF(TRIM(GET_JSON_STRING(resource, '$.\"hertzbeat.workspace_id\"')), ''), "
            + "NULLIF(TRIM(GET_JSON_STRING(resource, '$.\"hertzbeat_workspace_id\"')), ''), "
            + "NULLIF(TRIM(GET_JSON_STRING(resource, '$.\"workspace.id\"')), ''), "
            + "NULLIF(TRIM(GET_JSON_STRING(resource, '$.\"workspace_id\"')), ''), "
            + "'default') = ?";

    @Mock
    private WarehouseWorkerPool workerPool;

    @Test
    void scopedPagedRowsUseExactTopLevelWorkspacePrecedenceAndLiteralValue() throws Exception {
        QueryContext context = createQueryContext();
        when(context.statement().executeQuery()).thenReturn(context.resultSet());
        when(context.resultSet().next()).thenReturn(false);

        context.storage().queryLogsByMultipleConditionsWithPagination(
                null, null, null, null, null, null, null, 0, 20,
                Set.of(), false, "  " + WILDCARD_WORKSPACE + "  ", null, null, null);

        String sql = capturedSql(context);
        assertExactTopLevelSelector(sql);
        verify(context.statement()).setObject(1, WILDCARD_WORKSPACE);
        verify(context.statement()).setObject(2, 20);
    }

    @Test
    void scopedCountUsesExactTopLevelPrecedenceAndWhitespaceMissingDefault() throws Exception {
        QueryContext context = createQueryContext();
        when(context.statement().executeQuery()).thenReturn(context.resultSet());
        when(context.resultSet().next()).thenReturn(true, false);
        when(context.resultSet().getLong("count")).thenReturn(0L);
        when(context.resultSet().wasNull()).thenReturn(false);

        assertThat(context.storage().countLogsByMultipleConditions(
                null, null, null, null, null, null, null,
                Set.of(), false, "default", null, null, null)).isZero();

        assertExactTopLevelSelector(capturedSql(context));
        verify(context.statement()).setObject(1, "default");
    }

    @Test
    void scopedCountWithoutResultRowIsUnavailable() throws Exception {
        QueryContext context = createQueryContext();
        when(context.statement().executeQuery()).thenReturn(context.resultSet());
        when(context.resultSet().next()).thenReturn(false);

        assertThrows(TelemetryStorageUnavailableException.class,
                () -> count(context.storage(), "team-a"));
    }

    @Test
    void scopedCountWithSqlNullIsUnavailable() throws Exception {
        QueryContext context = createQueryContext();
        when(context.statement().executeQuery()).thenReturn(context.resultSet());
        when(context.resultSet().next()).thenReturn(true);
        when(context.resultSet().getLong("count")).thenReturn(0L);
        lenient().when(context.resultSet().wasNull()).thenReturn(true);

        assertThrows(TelemetryStorageUnavailableException.class,
                () -> count(context.storage(), "team-a"));
    }

    @Test
    void scopedCountWithNegativeValueIsUnavailable() throws Exception {
        QueryContext context = createQueryContext();
        when(context.statement().executeQuery()).thenReturn(context.resultSet());
        when(context.resultSet().next()).thenReturn(true, false);
        when(context.resultSet().getLong("count")).thenReturn(-1L);
        when(context.resultSet().wasNull()).thenReturn(false);

        assertThrows(TelemetryStorageUnavailableException.class,
                () -> count(context.storage(), "team-a"));
    }

    @Test
    void legacyCountWithoutResultRowRemainsZero() throws Exception {
        QueryContext context = createQueryContext();
        when(context.statement().executeQuery()).thenReturn(context.resultSet());
        when(context.resultSet().next()).thenReturn(false);

        assertThat(count(context.storage(), null)).isZero();
    }

    @Test
    void legacyCountWithSqlNullRemainsZero() throws Exception {
        QueryContext context = createQueryContext();
        when(context.statement().executeQuery()).thenReturn(context.resultSet());
        when(context.resultSet().next()).thenReturn(true);
        when(context.resultSet().getLong("count")).thenReturn(0L);
        lenient().when(context.resultSet().wasNull()).thenReturn(true);

        assertThat(count(context.storage(), null)).isZero();
    }

    @Test
    void legacyNegativeCountRemainsForgiving() throws Exception {
        QueryContext context = createQueryContext();
        when(context.statement().executeQuery()).thenReturn(context.resultSet());
        when(context.resultSet().next()).thenReturn(true);
        when(context.resultSet().getLong("count")).thenReturn(-1L);

        assertThat(count(context.storage(), null)).isEqualTo(-1L);
    }

    private void assertExactTopLevelSelector(String sql) {
        assertThat(normalizeSql(sql))
                .contains(WORKSPACE_SELECTOR)
                .doesNotContain("resource LIKE ? ESCAPE")
                .doesNotContain("resource NOT LIKE ? ESCAPE");
    }

    private String capturedSql(QueryContext context) throws Exception {
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(context.connection()).prepareStatement(sql.capture());
        return sql.getValue();
    }

    private String normalizeSql(String sql) {
        return sql.replaceAll("\\s+", " ").trim();
    }

    private long count(DorisDataStorage storage, String workspaceId) {
        return storage.countLogsByMultipleConditions(
                null, null, null, null, null, null, null,
                Set.of(), false, workspaceId, null, null, null);
    }

    private QueryContext createQueryContext() {
        DorisProperties properties = createProperties();
        Connection initConnection = mock(Connection.class);
        Statement initStatement = mock(Statement.class);
        Connection tableConnection = mock(Connection.class);
        Statement tableStatement = mock(Statement.class);
        Connection queryConnection = mock(Connection.class);
        PreparedStatement queryStatement = mock(PreparedStatement.class);
        ResultSet resultSet = mock(ResultSet.class);
        AtomicInteger dataSourceConnectionCalls = new AtomicInteger();
        try {
            when(initConnection.createStatement()).thenReturn(initStatement);
            when(tableConnection.createStatement()).thenReturn(tableStatement);
            when(queryConnection.prepareStatement(anyString())).thenReturn(queryStatement);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }

        try (MockedStatic<DriverManager> driverManager = mockStatic(DriverManager.class);
             MockedConstruction<HikariDataSource> dataSources = mockConstruction(
                     HikariDataSource.class,
                     (dataSource, context) -> when(dataSource.getConnection()).thenAnswer(invocation -> {
                         int call = dataSourceConnectionCalls.getAndIncrement();
                         return call == 0 ? tableConnection : queryConnection;
                     }))) {
            driverManager.when(() -> DriverManager.getConnection(
                    properties.url(), properties.username(), properties.password()))
                    .thenReturn(initConnection);
            DorisDataStorage storage = new DorisDataStorage(properties, workerPool);
            return new QueryContext(storage, queryConnection, queryStatement, resultSet);
        }
    }

    private DorisProperties createProperties() {
        DorisProperties.TableConfig table = new DorisProperties.TableConfig(
                false, "HOUR", 2, 1, 12, 1, 4096);
        DorisProperties.PoolConfig pool = new DorisProperties.PoolConfig(
                1, 2, 500, 0, 60_000);
        DorisProperties.WriteConfig write = new DorisProperties.WriteConfig(
                "jdbc", 1000, 5, false, DorisProperties.StreamLoadConfig.createDefault());
        return new DorisProperties(
                true, "jdbc:mysql://127.0.0.1:9030/hertzbeat", "root", "123456", table, pool, write);
    }

    private record QueryContext(DorisDataStorage storage, Connection connection,
                                PreparedStatement statement, ResultSet resultSet) {
    }
}
