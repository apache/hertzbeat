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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import java.util.List;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.warehouse.store.realtime.memory.MemoryDataStorage;
import org.apache.hertzbeat.warehouse.store.realtime.memory.MemoryProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * Test case for {@link MemoryDataStorage}
 */
class MemoryDataStorageTest {

    @Mock
    private MemoryProperties memoryProperties;

    private MemoryDataStorage memoryDataStorage;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(memoryProperties.initSize()).thenReturn(null);
        memoryDataStorage = new MemoryDataStorage(memoryProperties);
    }

    @Test
    void testGetCurrentMetricsDataByMetric() {
        Long monitorId = 1L;
        String metric = "cpuUsage";
        try (CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .setId(monitorId)
                .setMetrics(metric)
                .setCode(CollectRep.Code.SUCCESS)
                .addField(CollectRep.Field.newBuilder().setName("usage").setType(0).build())
                .addValueRow(CollectRep.ValueRow.newBuilder().addColumn("42").build())
                .build()) {
            memoryDataStorage.saveData(metricsData);
        }

        CollectRep.MetricsData result = memoryDataStorage.getCurrentMetricsData(monitorId, metric);
        assertNotNull(result);
        assertEquals(metric, result.getMetrics());
        assertEquals("42", result.getValues().getFirst().getColumns(0));
    }

    @Test
    void testGetCurrentMetricsData() {
        Long monitorId = 1L;
        try (CollectRep.MetricsData metricsData1 = successData(monitorId, "cpuUsage", "10");
                CollectRep.MetricsData metricsData2 = successData(monitorId, "memoryUsage", "20")) {
            memoryDataStorage.saveData(metricsData1);
            memoryDataStorage.saveData(metricsData2);
        }

        List<CollectRep.MetricsData> result = memoryDataStorage.getCurrentMetricsData(monitorId);

        assertEquals(2, result.size());
        assertTrue(result.stream().anyMatch(data -> "cpuUsage".equals(data.getMetrics())));
        assertTrue(result.stream().anyMatch(data -> "memoryUsage".equals(data.getMetrics())));
    }

    @Test
    void testSaveDataFailure() {
        try (CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .setId(1L)
                .setMetrics("cpuUsage")
                .setCode(CollectRep.Code.FAIL)
                .build()) {
            memoryDataStorage.saveData(metricsData);
        }

        List<CollectRep.MetricsData> result = memoryDataStorage.getCurrentMetricsData(1L);
        assertTrue(result.isEmpty());
    }

    @Test
    void retainedCopySurvivesInputClose() {
        Long monitorId = 7L;
        String metric = "cpu";
        CollectRep.MetricsData input = successData(monitorId, metric, "55.5");
        memoryDataStorage.saveData(input);
        CollectRep.MetricsData retained = memoryDataStorage.getCurrentMetricsData(monitorId, metric);

        assertNotNull(retained);
        assertNotSame(input, retained);
        input.close();

        CollectRep.MetricsData afterClose = memoryDataStorage.getCurrentMetricsData(monitorId, metric);
        assertNotNull(afterClose);
        assertEquals("55.5", afterClose.getValues().getFirst().getColumns(0));
        assertEquals(1, afterClose.getFieldsCount());
    }

    @Test
    void replaceClosesPreviousRetainedCopy() {
        Long monitorId = 9L;
        String metric = "cpu";
        try (CollectRep.MetricsData first = successData(monitorId, metric, "1");
                CollectRep.MetricsData second = successData(monitorId, metric, "2")) {
            memoryDataStorage.saveData(first);
            CollectRep.MetricsData retainedFirst = memoryDataStorage.getCurrentMetricsData(monitorId, metric);
            assertNotNull(retainedFirst);
            memoryDataStorage.saveData(second);
        }

        CollectRep.MetricsData retained = memoryDataStorage.getCurrentMetricsData(monitorId, metric);
        assertNotNull(retained);
        assertEquals("2", retained.getValues().getFirst().getColumns(0));
        assertNull(memoryDataStorage.getCurrentMetricsData(monitorId, "missing"));
    }

    @Test
    void testDestroy() {
        try (CollectRep.MetricsData metricsData = successData(1L, "cpuUsage", "3")) {
            memoryDataStorage.saveData(metricsData);
        }
        memoryDataStorage.destroy();

        List<CollectRep.MetricsData> result = memoryDataStorage.getCurrentMetricsData(1L);
        assertTrue(result.isEmpty());
    }

    private static CollectRep.MetricsData successData(long monitorId, String metric, String value) {
        return CollectRep.MetricsData.newBuilder()
                .setId(monitorId)
                .setMetrics(metric)
                .setCode(CollectRep.Code.SUCCESS)
                .addField(CollectRep.Field.newBuilder().setName("usage").setType(0).build())
                .addValueRow(CollectRep.ValueRow.newBuilder().addColumn(value).build())
                .build();
    }
}
