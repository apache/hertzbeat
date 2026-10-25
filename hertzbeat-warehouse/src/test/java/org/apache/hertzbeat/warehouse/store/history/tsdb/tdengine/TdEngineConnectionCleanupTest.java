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

package org.apache.hertzbeat.warehouse.store.history.tsdb.tdengine;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.List;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/** Fault-injected JDBC cleanup only; constructors and real connections are never called. */
class TdEngineConnectionCleanupTest {
    private TdEngineDataStorage storage;
    private HikariDataSource dataSource;

    @BeforeEach
    void setUp() {
        storage = mock(TdEngineDataStorage.class, CALLS_REAL_METHODS);
        dataSource = mock(HikariDataSource.class);
        ReflectionTestUtils.setField(storage, "hikariDataSource", dataSource);
        ReflectionTestUtils.setField(storage, "serverAvailable", true);
        ReflectionTestUtils.setField(storage, "tableStrColumnDefineMaxLength", 128);
    }

    @Test
    void writeConnectionFailureDoesNotEscapeAsAssertionError() throws Exception {
        assertTrue(TdEngineDataStorage.class.desiredAssertionStatus(), "run with assertions enabled as Surefire does");
        when(dataSource.getConnection()).thenThrow(new SQLException("fixture connection unavailable"));
        CollectRep.MetricsData data = mock(CollectRep.MetricsData.class);
        when(data.getCode()).thenReturn(CollectRep.Code.SUCCESS);
        when(data.getValues()).thenReturn(List.of(mock(CollectRep.ValueRow.class)));
        when(data.getInstance()).thenReturn("fixture");
        when(data.getApp()).thenReturn("linux");
        when(data.getMetrics()).thenReturn("cpu");
        when(data.readRow()).thenReturn(mock(RowWrapper.class));
        assertDoesNotThrow(() -> storage.saveData(data));
        verify(dataSource).getConnection();
    }

    @Test
    void intervalDiscoveryConnectionFailureReturnsEmptyMap() throws Exception {
        when(dataSource.getConnection()).thenThrow(new SQLException("fixture connection unavailable"));
        assertTrue(assertDoesNotThrow(() -> storage.getHistoryIntervalMetricData("fixture", "linux", "cpu", "usage", "6h")).isEmpty());
    }

    @Test
    void intervalValueConnectionFailurePreservesDiscoveredInstance() throws Exception {
        Connection connection = mock(Connection.class);
        Statement statement = mock(Statement.class);
        ResultSet instances = mock(ResultSet.class);
        when(dataSource.getConnection()).thenReturn(connection).thenThrow(new SQLException("fixture second connection unavailable"));
        when(connection.createStatement()).thenReturn(statement);
        when(statement.executeQuery(org.mockito.ArgumentMatchers.anyString())).thenReturn(instances);
        when(instances.next()).thenReturn(true, false);
        when(instances.getString(1)).thenReturn("fixture-labels");
        var result = assertDoesNotThrow(() -> storage.getHistoryIntervalMetricData("fixture", "linux", "cpu", "usage", "6h"));
        assertEquals(List.of(), result.get("fixture-labels"));
        verify(connection).close();
    }

    @Test
    void normalHistoryReadStillReturnsValuesAndClosesConnection() throws Exception {
        Connection connection = mock(Connection.class);
        Statement statement = mock(Statement.class);
        ResultSet rows = mock(ResultSet.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.createStatement()).thenReturn(statement);
        when(statement.executeQuery(org.mockito.ArgumentMatchers.anyString())).thenReturn(rows);
        when(rows.next()).thenReturn(true, false);
        when(rows.getTimestamp(1)).thenReturn(new Timestamp(1700000000000L));
        when(rows.getString(2)).thenReturn("fixture-labels");
        when(rows.getDouble(3)).thenReturn(3.5);
        var result = storage.getHistoryMetricData("fixture", "linux", "cpu", "usage", "6h");
        assertEquals("3.5", result.get("fixture-labels").getFirst().getOrigin());
        verify(rows).close();
        verify(connection).close();
    }
}
