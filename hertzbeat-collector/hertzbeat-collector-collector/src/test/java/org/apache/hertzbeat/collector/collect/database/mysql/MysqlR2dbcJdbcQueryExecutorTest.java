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

package org.apache.hertzbeat.collector.collect.database.mysql;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.collector.collect.database.query.JdbcQueryRowSet;
import org.apache.hertzbeat.collector.mysql.r2dbc.MysqlQueryExecutor;
import org.apache.hertzbeat.collector.mysql.r2dbc.QueryResult;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.JdbcProtocol;
import org.junit.jupiter.api.Test;

class MysqlR2dbcJdbcQueryExecutorTest {

    @Test
    void shouldAutoRouteToR2dbcOnlyWhenMysqlJdbcDriverIsAbsent() {
        MysqlCollectorProperties properties = new MysqlCollectorProperties();
        MysqlJdbcDriverAvailability driverAvailability = mock(MysqlJdbcDriverAvailability.class);
        when(driverAvailability.hasMysqlJdbcDriver()).thenReturn(false);
        MysqlR2dbcJdbcQueryExecutor executor = new MysqlR2dbcJdbcQueryExecutor(
                properties, mock(MysqlQueryExecutor.class), driverAvailability);

        assertTrue(executor.supports(metrics("mysql", "columns")));
        assertTrue(executor.supports(metrics("mariadb", "columns")));
        assertTrue(executor.supports(metrics("mysql", "multiRow")));
        assertFalse(executor.supports(metrics("mysql", "runScript")));
        assertFalse(executor.supports(metrics("postgresql", "columns")));
    }

    @Test
    void shouldPreferJdbcWhenMysqlJdbcDriverIsPresentInAutoMode() {
        MysqlCollectorProperties properties = new MysqlCollectorProperties();
        MysqlJdbcDriverAvailability driverAvailability = mock(MysqlJdbcDriverAvailability.class);
        when(driverAvailability.hasMysqlJdbcDriver()).thenReturn(true);
        MysqlR2dbcJdbcQueryExecutor executor = new MysqlR2dbcJdbcQueryExecutor(
                properties, mock(MysqlQueryExecutor.class), driverAvailability);

        assertFalse(executor.supports(metrics("mysql", "columns")));
    }

    @Test
    void shouldHonorExplicitQueryEngineOverrides() {
        MysqlCollectorProperties properties = new MysqlCollectorProperties();
        MysqlJdbcDriverAvailability driverAvailability = mock(MysqlJdbcDriverAvailability.class);
        when(driverAvailability.hasMysqlJdbcDriver()).thenReturn(true);
        MysqlR2dbcJdbcQueryExecutor executor = new MysqlR2dbcJdbcQueryExecutor(
                properties, mock(MysqlQueryExecutor.class), driverAvailability);

        properties.setQueryEngine(MysqlCollectorProperties.QueryEngine.R2DBC);
        assertTrue(executor.supports(metrics("mysql", "columns")));

        properties.setQueryEngine(MysqlCollectorProperties.QueryEngine.JDBC);
        assertFalse(executor.supports(metrics("mysql", "columns")));
    }

    @Test
    void shouldExposeQueryResultsAsJdbcStyleRowSet() throws Exception {
        MysqlCollectorProperties properties = new MysqlCollectorProperties();
        properties.setQueryEngine(MysqlCollectorProperties.QueryEngine.R2DBC);
        MysqlQueryExecutor mysqlQueryExecutor = mock(MysqlQueryExecutor.class);
        when(mysqlQueryExecutor.execute(anyString(), any()))
                .thenReturn(QueryResult.builder()
                        .columns(List.of("Variable_name", "Value"))
                        .rows(List.of(
                                List.of("Threads_connected", "5"),
                                List.of("Uptime", "10")))
                        .elapsedMs(11)
                        .rowCount(2)
                        .build());
        MysqlR2dbcJdbcQueryExecutor executor = new MysqlR2dbcJdbcQueryExecutor(
                properties, mysqlQueryExecutor, mock(MysqlJdbcDriverAvailability.class));

        try (JdbcQueryRowSet rowSet = executor.executeQuery(metrics("mysql", "columns"), 6000, 1000)) {
            assertTrue(rowSet.next());
            assertEquals("Threads_connected", rowSet.getString(1));
            assertEquals("5", rowSet.getString(2));
            assertEquals("5", rowSet.getString("value"));

            assertTrue(rowSet.next());
            assertEquals("Uptime", rowSet.getString("variable_name"));
            assertEquals("10", rowSet.getString(2));
            assertFalse(rowSet.next());
        }
    }

    @Test
    void shouldFailFastWhenR2dbcQueryReturnsError() {
        MysqlCollectorProperties properties = new MysqlCollectorProperties();
        properties.setQueryEngine(MysqlCollectorProperties.QueryEngine.R2DBC);
        MysqlQueryExecutor mysqlQueryExecutor = mock(MysqlQueryExecutor.class);
        when(mysqlQueryExecutor.execute(anyString(), any()))
                .thenReturn(QueryResult.builder().error("query timeout").build());
        MysqlR2dbcJdbcQueryExecutor executor = new MysqlR2dbcJdbcQueryExecutor(
                properties, mysqlQueryExecutor, mock(MysqlJdbcDriverAvailability.class));

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> executor.executeQuery(metrics("mysql", "columns"), 6000, 1000));
        assertTrue(exception.getMessage().contains("query timeout"));
    }

    private Metrics metrics(String platform, String queryType) {
        JdbcProtocol jdbcProtocol = JdbcProtocol.builder()
                .host("127.0.0.1")
                .port("3306")
                .platform(platform)
                .database("hzb")
                .username("test")
                .password("test123")
                .queryType(queryType)
                .sql("SHOW GLOBAL STATUS")
                .timeout("6000")
                .build();
        Metrics metrics = new Metrics();
        metrics.setProtocol("jdbc");
        metrics.setName("status");
        metrics.setJdbc(jdbcProtocol);
        return metrics;
    }
}
