/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.plugin.runner.PluginRunner;
import org.apache.hertzbeat.warehouse.WarehouseWorkerPool;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataWriter;
import org.apache.hertzbeat.warehouse.store.metadata.MonitorAvailability;
import org.apache.hertzbeat.warehouse.store.metadata.MonitorStatusMetadataWriter;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataWriter;
import org.junit.jupiter.api.Test;

class DataStorageDispatchStatusTest {

    @Test
    void firstAvailabilityResultCanReplacePendingStatus() {
        MonitorStatusMetadataWriter statusWriter = mock(MonitorStatusMetadataWriter.class);
        DataStorageDispatch dispatch = new DataStorageDispatch(
                mock(CommonDataQueue.class),
                mock(WarehouseWorkerPool.class),
                statusWriter,
                List.of(),
                mock(RealTimeDataWriter.class),
                mock(PluginRunner.class));
        CollectRep.MetricsData firstResult = CollectRep.MetricsData.newBuilder()
                .setId(42L)
                .setPriority(0)
                .setCode(CollectRep.Code.SUCCESS)
                .build();

        dispatch.calculateMonitorStatus(firstResult);

        verify(statusWriter).updateAvailability(42L, MonitorAvailability.UP);
    }

    @Test
    void publishesExecutionSummaryWithoutRetainingMetricRows() {
        HistoryDataWriter eventWriter = mock(HistoryDataWriter.class);
        when(eventWriter.supportsCollectionExecutionEvents()).thenReturn(true);
        DataStorageDispatch dispatch = new DataStorageDispatch(
                mock(CommonDataQueue.class),
                mock(WarehouseWorkerPool.class),
                mock(MonitorStatusMetadataWriter.class),
                List.of(eventWriter),
                mock(RealTimeDataWriter.class),
                mock(PluginRunner.class));
        CollectRep.MetricsData result = CollectRep.MetricsData.newBuilder()
                .setId(42L)
                .setApp("linux")
                .setMetrics("cpu")
                .setTime(1_700L)
                .setCode(CollectRep.Code.SUCCESS)
                .build();

        dispatch.persistMetricsData(result);

        BoundedCollectionExecutionEventBuffer.Stats stats = dispatch.collectionExecutionEventStats();
        assertEquals(1L, stats.accepted());
        assertEquals(0L, stats.rejected());
        assertEquals(1, stats.queued());
    }

    @Test
    void eventPublicationFailureDoesNotInterruptPrimaryPersistence() {
        HistoryDataWriter eventWriter = mock(HistoryDataWriter.class);
        MonitorStatusMetadataWriter statusWriter = mock(MonitorStatusMetadataWriter.class);
        RealTimeDataWriter realTimeDataWriter = mock(RealTimeDataWriter.class);
        CollectRep.MetricsData result = mock(CollectRep.MetricsData.class);
        when(eventWriter.supportsCollectionExecutionEvents()).thenReturn(true);
        when(result.getId()).thenReturn(42L);
        when(result.getCode()).thenReturn(CollectRep.Code.SUCCESS);
        when(result.getMetadataValue(anyString())).thenThrow(new IllegalStateException("broken metadata"));
        DataStorageDispatch dispatch = new DataStorageDispatch(
                mock(CommonDataQueue.class),
                mock(WarehouseWorkerPool.class),
                statusWriter,
                List.of(eventWriter),
                realTimeDataWriter,
                mock(PluginRunner.class));

        dispatch.persistMetricsData(result);

        verify(statusWriter).updateAvailability(42L, MonitorAvailability.UP);
        verify(eventWriter).saveData(result);
        verify(realTimeDataWriter).saveData(result);
    }
}
