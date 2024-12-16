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

package org.apache.hertzbeat.warehouse.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.HashMap;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.warehouse.service.impl.MetricsDataServiceImpl;
import org.apache.hertzbeat.warehouse.store.history.HistoryDataReader;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;


/**
 * Test case for {@link MetricsDataService}
 */

@ExtendWith(MockitoExtension.class)
public class MetricsDataServiceTest {

    @InjectMocks
    private MetricsDataServiceImpl metricsDataService;

    @Mock
    private RealTimeDataReader realTimeDataReader;

    @Mock
    private HistoryDataReader historyDataReader;

    @BeforeEach
    public void setUp() {
        metricsDataService = new MetricsDataServiceImpl(realTimeDataReader, Optional.of(historyDataReader));
    }

    @Test
    public void testGetWarehouseStorageServerStatus() {
        when(historyDataReader.isServerAvailable()).thenReturn(false);
        assertFalse(metricsDataService.getWarehouseStorageServerStatus());

        when(historyDataReader.isServerAvailable()).thenReturn(true);
        assertTrue(metricsDataService.getWarehouseStorageServerStatus());
    }

    @Test
    public void testGetMetricsData() {
        Long monitorId = 1L;
        String metrics = "disk";

        when(realTimeDataReader.isServerAvailable()).thenReturn(false);
        assertThrows(CommonException.class, () -> metricsDataService.getMetricsData(monitorId, metrics), "real time store not available");


        when(realTimeDataReader.isServerAvailable()).thenReturn(true);
        when(realTimeDataReader.getCurrentMetricsData(eq(monitorId), eq(metrics))).thenReturn(null);
        assertNull(metricsDataService.getMetricsData(monitorId, metrics));

        CollectRep.MetricsData storageData = CollectRep.MetricsData.newBuilder()
                .setId(monitorId)
                .setMetrics(metrics)
                .build();
        when(realTimeDataReader.isServerAvailable()).thenReturn(true);
        when(realTimeDataReader.getCurrentMetricsData(eq(monitorId), eq(metrics))).thenReturn(storageData);
        assertNotNull(metricsDataService.getMetricsData(monitorId, metrics));
    }

    @Test
    public void testGetMetricHistoryData() {
        Long monitorId = 1L;
        String app = "linux";
        String metrics = "disk";
        String metric = "used";
        String label = "label";
        String history = "6h";
        Boolean intervalFalse = false;
        Boolean intervalTrue = true;

        when(historyDataReader.getHistoryMetricData(eq(monitorId), eq(app), eq(metrics), eq(metric), eq(label), eq(history))).thenReturn(new HashMap<>());
        assertNotNull(metricsDataService.getMetricHistoryData(monitorId, app, metrics, metric, label, history, intervalFalse));
        verify(historyDataReader, times(1)).getHistoryMetricData(eq(monitorId), eq(app), eq(metrics), eq(metric), eq(label), eq(history));

        when(historyDataReader.getHistoryIntervalMetricData(eq(monitorId), eq(app), eq(metrics), eq(metric), eq(label), eq(history))).thenReturn(new HashMap<>());
        assertNotNull(metricsDataService.getMetricHistoryData(monitorId, app, metrics, metric, label, history, intervalTrue));
        verify(historyDataReader, times(1)).getHistoryIntervalMetricData(eq(monitorId), eq(app), eq(metrics), eq(metric), eq(label), eq(history));
    }
}
