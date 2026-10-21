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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.plugin.runner.PluginRunner;
import org.apache.hertzbeat.warehouse.WarehouseWorkerPool;
import org.apache.hertzbeat.warehouse.store.metadata.MonitorStatusMetadataWriter;
import org.apache.hertzbeat.warehouse.store.realtime.memory.MemoryDataStorage;
import org.apache.hertzbeat.warehouse.store.realtime.memory.MemoryProperties;
import org.junit.jupiter.api.Test;

class MemoryDataStorageOwnershipTest {

    @Test
    void realtimeReadSurvivesDispatchClose() {
        MemoryDataStorage memoryDataStorage = new MemoryDataStorage(mock(MemoryProperties.class));
        DataStorageDispatch dispatch = new DataStorageDispatch(
                mock(CommonDataQueue.class),
                mock(WarehouseWorkerPool.class),
                mock(MonitorStatusMetadataWriter.class),
                List.of(),
                memoryDataStorage,
                mock(PluginRunner.class));

        CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .setId(42L)
                .setApp("linux")
                .setMetrics("cpu")
                .setCode(CollectRep.Code.SUCCESS)
                .addField(CollectRep.Field.newBuilder().setName("usage").setType(0).build())
                .addValueRow(CollectRep.ValueRow.newBuilder().addColumn("77").build())
                .build();

        try (metricsData) {
            dispatch.persistMetricsData(metricsData);
        }

        try (CollectRep.MetricsData retained = memoryDataStorage.getCurrentMetricsData(42L, "cpu")) {
            assertNotNull(retained);
            assertEquals("77", retained.getValues().getFirst().getColumns(0));
            assertEquals(1, retained.getFieldsCount());
        }
        memoryDataStorage.destroy();
    }

    @Test
    void failedCollectDoesNotReplaceRealtimeData() {
        MemoryProperties properties = mock(MemoryProperties.class);
        when(properties.initSize()).thenReturn(null);
        MemoryDataStorage memoryDataStorage = new MemoryDataStorage(properties);
        DataStorageDispatch dispatch = new DataStorageDispatch(
                mock(CommonDataQueue.class),
                mock(WarehouseWorkerPool.class),
                mock(MonitorStatusMetadataWriter.class),
                List.of(),
                memoryDataStorage,
                mock(PluginRunner.class));

        try (CollectRep.MetricsData success = CollectRep.MetricsData.newBuilder()
                .setId(42L)
                .setMetrics("cpu")
                .setCode(CollectRep.Code.SUCCESS)
                .addField(CollectRep.Field.newBuilder().setName("usage").setType(0).build())
                .addValueRow(CollectRep.ValueRow.newBuilder().addColumn("10").build())
                .build()) {
            dispatch.persistMetricsData(success);
        }

        try (CollectRep.MetricsData failure = CollectRep.MetricsData.newBuilder()
                .setId(42L)
                .setMetrics("cpu")
                .setCode(CollectRep.Code.UN_CONNECTABLE)
                .build()) {
            dispatch.persistMetricsData(failure);
        }

        try (CollectRep.MetricsData retained = memoryDataStorage.getCurrentMetricsData(42L, "cpu")) {
            assertNotNull(retained);
            assertEquals("10", retained.getValues().getFirst().getColumns(0));
        }
        memoryDataStorage.destroy();
    }

    /**
     * Detail readers (MetricsDataServiceImpl) hold the reference from getCurrentMetricsData
     * while building a response. Replacement must close only the previous cache entry, not
     * the reader-owned snapshot.
     */
    @Test
    void detailReaderSnapshotSurvivesReplacement() {
        MemoryProperties properties = mock(MemoryProperties.class);
        when(properties.initSize()).thenReturn(null);
        MemoryDataStorage memoryDataStorage = new MemoryDataStorage(properties);

        try (CollectRep.MetricsData first = CollectRep.MetricsData.newBuilder()
                .setId(42L)
                .setMetrics("cpu")
                .setCode(CollectRep.Code.SUCCESS)
                .addField(CollectRep.Field.newBuilder().setName("usage").setType(0).build())
                .addValueRow(CollectRep.ValueRow.newBuilder().addColumn("77").build())
                .build()) {
            memoryDataStorage.saveData(first);
        }

        CollectRep.MetricsData heldByDetailReader = memoryDataStorage.getCurrentMetricsData(42L, "cpu");
        assertNotNull(heldByDetailReader);
        assertEquals(1, heldByDetailReader.getFieldsCount());
        assertEquals("77", heldByDetailReader.getValues().getFirst().getColumns(0));

        try (CollectRep.MetricsData second = CollectRep.MetricsData.newBuilder()
                .setId(42L)
                .setMetrics("cpu")
                .setCode(CollectRep.Code.SUCCESS)
                .addField(CollectRep.Field.newBuilder().setName("usage").setType(0).build())
                .addValueRow(CollectRep.ValueRow.newBuilder().addColumn("88").build())
                .build()) {
            memoryDataStorage.saveData(second);
        }

        try (heldByDetailReader) {
            assertEquals(1, heldByDetailReader.getFieldsCount(),
                    "reader-owned snapshot must survive cache replacement");
            assertEquals("77", heldByDetailReader.getValues().getFirst().getColumns(0));
        }

        try (CollectRep.MetricsData current = memoryDataStorage.getCurrentMetricsData(42L, "cpu")) {
            assertNotNull(current);
            assertNotSame(heldByDetailReader, current);
            assertEquals("88", current.getValues().getFirst().getColumns(0));
        }
        memoryDataStorage.destroy();
    }
}
