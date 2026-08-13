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

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.List;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.plugin.runner.PluginRunner;
import org.apache.hertzbeat.warehouse.WarehouseWorkerPool;
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
}
