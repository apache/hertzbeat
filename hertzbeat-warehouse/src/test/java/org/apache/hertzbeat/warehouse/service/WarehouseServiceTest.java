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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.Collections;
import java.util.List;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.warehouse.service.impl.WarehouseServiceImpl;
import org.apache.hertzbeat.warehouse.store.realtime.AbstractRealTimeDataStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * test case for {@link WarehouseServiceImpl}
 */

@ExtendWith(SpringExtension.class)
class WarehouseServiceTest {

    @Mock
    private AbstractRealTimeDataStorage realTimeDataStorage;

    @InjectMocks
    private WarehouseServiceImpl warehouseService;

    @BeforeEach
    void setUp() {

        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testQueryMonitorMetricsData() {

        Long monitorId = 1L;
        List<CollectRep.MetricsData> expectedData = Collections.emptyList();

        when(realTimeDataStorage.isServerAvailable()).thenReturn(true);
        when(realTimeDataStorage.getCurrentMetricsData(monitorId)).thenReturn(expectedData);

        List<CollectRep.MetricsData> result = warehouseService.queryMonitorMetricsData(monitorId);

        assertEquals(expectedData, result);
        verify(realTimeDataStorage, never()).isServerAvailable();
    }

    @Test
    void testQueryMonitorMetricsDataNotAvailable() {

        Long monitorId = 1L;

        when(realTimeDataStorage.isServerAvailable()).thenReturn(false);

        List<CollectRep.MetricsData> result = warehouseService.queryMonitorMetricsData(monitorId);

        assertTrue(result.isEmpty());
        verify(realTimeDataStorage, never()).getCurrentMetricsData(anyLong());
    }
}
