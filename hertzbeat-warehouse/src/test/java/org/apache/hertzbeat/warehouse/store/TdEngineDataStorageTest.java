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

package org.apache.hertzbeat.warehouse.store;

import com.zaxxer.hikari.HikariDataSource;
import org.apache.arrow.vector.types.pojo.ArrowType;
import org.apache.arrow.vector.types.pojo.Field;
import org.apache.arrow.vector.types.pojo.FieldType;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.arrow.ArrowCell;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.warehouse.store.history.tsdb.tdengine.TdEngineDataStorage;
import org.apache.hertzbeat.warehouse.store.history.tsdb.tdengine.TdEngineProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.sql.Connection;
import java.sql.Statement;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link TdEngineDataStorage}
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TdEngineDataStorageTest {

    @Mock
    private TdEngineProperties tdEngineProperties;

    @Mock
    private HikariDataSource mockHikariDataSource;

    @Mock
    private Connection mockConnection;

    @Mock
    private Statement mockStatement;

    private TdEngineDataStorage tdEngineDataStorage;

    @BeforeEach
    void setUp() throws Exception {
        when(tdEngineProperties.enabled()).thenReturn(true);
        when(tdEngineProperties.url()).thenReturn("jdbc:TAOS-RS://localhost:6041/demo");
        when(tdEngineProperties.username()).thenReturn("root");
        when(tdEngineProperties.password()).thenReturn("root");
        when(tdEngineProperties.tableStrColumnDefineMaxLength()).thenReturn(200);
        when(mockHikariDataSource.getConnection()).thenReturn(mockConnection);
        when(mockConnection.createStatement()).thenReturn(mockStatement);
    }

    @Test
    void isServerAvailable() {
    }

    @Test
    void testSaveData() throws Exception {
        tdEngineDataStorage = new TdEngineDataStorage(tdEngineProperties);
        setPrivateField(tdEngineDataStorage, "hikariDataSource", mockHikariDataSource);
        setParentPrivateField(tdEngineDataStorage, "serverAvailable", true);

        CollectRep.MetricsData metricsData = generateMockedMetricsData();
        tdEngineDataStorage.saveData(metricsData);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(mockStatement, atLeastOnce()).execute(sqlCaptor.capture());

        String executedSql = sqlCaptor.getValue();

        // Verify SQL structure
        assertNotNull(executedSql);
        assertTrue(executedSql.startsWith("INSERT INTO"), "SQL should start with INSERT INTO");
        assertTrue(executedSql.contains("USING"), "SQL should contain USING clause");
        assertTrue(executedSql.contains("TAGS"), "SQL should contain TAGS clause");
        assertTrue(executedSql.contains("VALUES"), "SQL should contain VALUES clause");

        // Verify table name format: app_metrics_instance_v2
        assertTrue(executedSql.contains("app_cpu_test-%server-01_v2"), "Should contain correct table name");
        // Verify super table name format: app_metrics_super_v2
        assertTrue(executedSql.contains("app_cpu_super_v2"), "Should contain correct super table name");
        // Verify tags format: test-%server-01
        assertTrue(executedSql.contains("TAGS ('test-%server-01')"), "Should contain correct super table name");
        // Verify VALUES clause structure (timestamp + data values)
        assertTrue(executedSql.matches(".*VALUES\\s+\\(\\d+.*68\\.7\\)"), "Should contain timestamp and value 68.7");
    }

    @Test
    void destroy() {
    }

    @Test
    void getHistoryMetricData() {
    }

    @Test
    void getHistoryIntervalMetricData() {
    }

    /**
     * Helper method to set private field using reflection
     */
    private void setPrivateField(Object target, String fieldName, Object value) throws Exception {
        java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    /**
     * Helper method to set private field from parent class using reflection
     */
    private void setParentPrivateField(Object target, String fieldName, Object value) throws Exception {
        java.lang.reflect.Field field = target.getClass().getSuperclass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    public static CollectRep.MetricsData generateMockedMetricsData() {
        CollectRep.MetricsData mockMetricsData = Mockito.mock(CollectRep.MetricsData.class);

        when(mockMetricsData.getId()).thenReturn(0L);
        when(mockMetricsData.getMetrics()).thenReturn("cpu");
        when(mockMetricsData.getTime()).thenReturn(System.currentTimeMillis());
        when(mockMetricsData.getCode()).thenReturn(CollectRep.Code.SUCCESS);
        when(mockMetricsData.getApp()).thenReturn("app");
        when(mockMetricsData.getInstance()).thenReturn("test-%server-01");

        CollectRep.ValueRow mockValueRow = Mockito.mock(CollectRep.ValueRow.class);
        List<String> columnValues = List.of("test-%server-01", "68.7");
        when(mockValueRow.getColumnsList()).thenReturn(columnValues);
        when(mockValueRow.getColumns(0)).thenReturn("test-%server-01");
        when(mockValueRow.getColumns(1)).thenReturn("68.7");
        List<CollectRep.ValueRow> mockValueRowsList = List.of(mockValueRow);
        when(mockMetricsData.getValues()).thenReturn(mockValueRowsList);

        CollectRep.Field instanceField = Mockito.mock(CollectRep.Field.class);
        when(instanceField.getName()).thenReturn("instance");
        CollectRep.Field usageField = Mockito.mock(CollectRep.Field.class);
        when(usageField.getName()).thenReturn("usage");
        CollectRep.Field systemField = Mockito.mock(CollectRep.Field.class);
        when(systemField.getName()).thenReturn("system");
        List<CollectRep.Field> mockFields = List.of(instanceField, usageField, systemField);
        when(mockMetricsData.getFields()).thenReturn(mockFields);

        ArrowType instanceArrowType = new ArrowType.Utf8();
        FieldType instanceFieldType = new FieldType(true, instanceArrowType, null, null);
        Field instanceArrowField = new Field("instance", instanceFieldType, null);
        ArrowCell instanceCell = Mockito.mock(ArrowCell.class);
        when(instanceCell.getField()).thenReturn(instanceArrowField);
        when(instanceCell.getValue()).thenReturn("test-%server-01");
        when(instanceCell.getMetadataAsBoolean(MetricDataConstants.LABEL)).thenReturn(true);
        when(instanceCell.getMetadataAsByte(MetricDataConstants.TYPE)).thenReturn(CommonConstants.TYPE_STRING);

        ArrowType usageArrowType = new ArrowType.Utf8();
        FieldType usageFieldType = new FieldType(true, usageArrowType, null, null);
        Field usageArrowField = new Field("usage", usageFieldType, null);
        ArrowCell usageCell = Mockito.mock(ArrowCell.class);
        when(usageCell.getField()).thenReturn(usageArrowField);
        when(usageCell.getValue()).thenReturn("68.7");
        when(usageCell.getMetadataAsBoolean(MetricDataConstants.LABEL)).thenReturn(false);
        when(usageCell.getMetadataAsByte(MetricDataConstants.TYPE)).thenReturn(CommonConstants.TYPE_NUMBER);
        List<ArrowCell> mockCells = List.of(instanceCell, usageCell);

        // Create Arrow Field list for RowWrapper
        List<org.apache.arrow.vector.types.pojo.Field> arrowFields = List.of(instanceArrowField, usageArrowField);

        RowWrapper mockRowWrapper = Mockito.mock(RowWrapper.class);
        when(mockRowWrapper.hasNextRow()).thenReturn(true).thenReturn(false);
        when(mockRowWrapper.nextRow()).thenReturn(mockRowWrapper);
        when(mockRowWrapper.cellStream()).thenAnswer(invocation -> mockCells.stream());
        when(mockRowWrapper.getFieldList()).thenReturn(arrowFields);
        when(mockMetricsData.readRow()).thenReturn(mockRowWrapper);
        return mockMetricsData;
    }

}
