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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import java.util.List;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.warehouse.store.realtime.memory.MemoryDataStorage;
import org.apache.hertzbeat.warehouse.store.realtime.memory.MemoryProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * Test case for {@link MemoryDataStorage}
 */

class MemoryDataStorageTest {

    @Mock
    private MemoryProperties memoryProperties;

    @InjectMocks
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
        CollectRep.MetricsData metricsData = mock(CollectRep.MetricsData.class);

        memoryDataStorage.saveData(metricsData);

        CollectRep.MetricsData result = memoryDataStorage.getCurrentMetricsData(monitorId, metric);

        assertNull(result);
    }

    @Test
    void testGetCurrentMetricsData() {

        Long monitorId = 1L;
        CollectRep.MetricsData metricsData1 = mock(CollectRep.MetricsData.class);
        CollectRep.MetricsData metricsData2 = mock(CollectRep.MetricsData.class);

        when(metricsData1.getId()).thenReturn(monitorId);
        when(metricsData1.getMetrics()).thenReturn("cpuUsage");
        when(metricsData1.getCode()).thenReturn(CollectRep.Code.SUCCESS);

        when(metricsData2.getId()).thenReturn(monitorId);
        when(metricsData2.getMetrics()).thenReturn("memoryUsage");
        when(metricsData2.getCode()).thenReturn(CollectRep.Code.SUCCESS);

        memoryDataStorage.saveData(metricsData1);
        memoryDataStorage.saveData(metricsData2);

        List<CollectRep.MetricsData> result = memoryDataStorage.getCurrentMetricsData(monitorId);

        assertEquals(2, result.size());
        assertTrue(result.contains(metricsData1));
        assertTrue(result.contains(metricsData2));
    }

    @Test
    void testSaveDataFailure() {

        CollectRep.MetricsData metricsData = mock(CollectRep.MetricsData.class);
        when(metricsData.getCode()).thenReturn(CollectRep.Code.FAIL);

        memoryDataStorage.saveData(metricsData);

        List<CollectRep.MetricsData> result = memoryDataStorage.getCurrentMetricsData(metricsData.getId());
        assertTrue(result.isEmpty());
    }

    @Test
    void testDestroy() {

        CollectRep.MetricsData metricsData = mock(CollectRep.MetricsData.class);
        when(metricsData.getId()).thenReturn(1L);
        when(metricsData.getMetrics()).thenReturn("cpuUsage");
        when(metricsData.getCode()).thenReturn(CollectRep.Code.SUCCESS);

        memoryDataStorage.saveData(metricsData);
        memoryDataStorage.destroy();

        List<CollectRep.MetricsData> result = memoryDataStorage.getCurrentMetricsData(1L);
        assertTrue(result.isEmpty());
    }

}
