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
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import com.google.common.collect.Lists;
import java.util.List;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.warehouse.store.realtime.redis.RedisDataStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;

/**
 * Test case for {@link RedisDataStorage}
 */
class RedisDataStorageTest {
    @Mock
    private RedisDataStorage redisDataStorage;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testGetCurrentMetricsData() {
        Long monitorId = 1L;
        String metric = "testMetric";
        CollectRep.MetricsData expectedMetricsData = CollectRep.MetricsData.newBuilder().setMetrics(metric).setId(monitorId).build();
        Mockito.doReturn(expectedMetricsData).when(redisDataStorage).getCurrentMetricsData(monitorId, metric);

        CollectRep.MetricsData actualMetricsData = redisDataStorage.getCurrentMetricsData(monitorId, metric);

        assertNotNull(actualMetricsData);
        assertEquals(expectedMetricsData, actualMetricsData);

        verify(redisDataStorage, times(1)).getCurrentMetricsData(monitorId, metric);
    }

    @Test
    void testGetCurrentMetricsDataByMonitorId() {
        Long monitorId = 1L;
        String metric = "testMetric";
        CollectRep.MetricsData expectedMetricsData = CollectRep.MetricsData.newBuilder().setMetrics(metric).setId(monitorId).build();
        Mockito.doReturn(Lists.newArrayList(expectedMetricsData)).when(redisDataStorage).getCurrentMetricsData(monitorId);

        List<CollectRep.MetricsData> actualMetricsData = redisDataStorage.getCurrentMetricsData(monitorId);

        assertNotNull(actualMetricsData);
        assertEquals(expectedMetricsData, actualMetricsData.get(0));

        verify(redisDataStorage, times(1)).getCurrentMetricsData(monitorId);
    }

    @Test
    void testSaveData() {
        long monitorId = 1L;
        String metric = "testMetric";
        CollectRep.MetricsData expectedMetricsData = CollectRep.MetricsData.newBuilder().setMetrics(metric).setId(monitorId).build();
        redisDataStorage.saveData(expectedMetricsData);

        verify(redisDataStorage, times(1)).saveData(expectedMetricsData);
    }
}
