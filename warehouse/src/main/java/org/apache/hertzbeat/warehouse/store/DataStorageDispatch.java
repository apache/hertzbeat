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

import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.warehouse.WarehouseWorkerPool;
import org.apache.hertzbeat.warehouse.store.history.HistoryDataWriter;
import org.apache.hertzbeat.warehouse.store.history.jpa.JpaDatabaseDataStorage;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataWriter;
import org.apache.hertzbeat.warehouse.store.realtime.memory.MemoryDataStorage;
import org.springframework.stereotype.Component;

/**
 * dispatch storage metrics data
 */
@Slf4j
@Component
public class DataStorageDispatch {

    private final CommonDataQueue commonDataQueue;
    private final WarehouseWorkerPool workerPool;
    private final List<HistoryDataWriter> historyDataWriters;
    private final List<RealTimeDataWriter> realTimeDataWriters;

    public DataStorageDispatch(CommonDataQueue commonDataQueue,
                               WarehouseWorkerPool workerPool,
                               List<HistoryDataWriter> historyDataWriters,
                               List<RealTimeDataWriter> realTimeDataWriters) {
        this.commonDataQueue = commonDataQueue;
        this.workerPool = workerPool;
        this.historyDataWriters = historyDataWriters;
        this.realTimeDataWriters = realTimeDataWriters;
        startPersistentDataStorage();
        startRealTimeDataStorage();
    }

    private void startRealTimeDataStorage() {
        if (realTimeDataWriters == null || realTimeDataWriters.isEmpty()) {
            log.info("no real time data storage start");
            return;
        }
        if (realTimeDataWriters.size() > 1) {
            realTimeDataWriters.removeIf(MemoryDataStorage.class::isInstance);
        }
        Runnable runnable = () -> {
            Thread.currentThread().setName("warehouse-realtime-data-storage");
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    CollectRep.MetricsData metricsData = commonDataQueue.pollMetricsDataToRealTimeStorage();
                    if (metricsData == null) {
                        continue;
                    }
                    for (RealTimeDataWriter realTimeDataWriter : realTimeDataWriters) {
                        realTimeDataWriter.saveData(metricsData);
                    }
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                }
            }
        };
        workerPool.executeJob(runnable);
    }

    protected void startPersistentDataStorage() {
        if (historyDataWriters == null || historyDataWriters.isEmpty()) {
            log.info("no history data storage start");
            return;
        }
        if (historyDataWriters.size() > 1) {
            historyDataWriters.removeIf(JpaDatabaseDataStorage.class::isInstance);
        }
        Runnable runnable = () -> {
            Thread.currentThread().setName("warehouse-persistent-data-storage");
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    CollectRep.MetricsData metricsData = commonDataQueue.pollMetricsDataToPersistentStorage();
                    if (metricsData == null) {
                        continue;
                    }
                    for (HistoryDataWriter historyDataWriter : historyDataWriters) {
                        historyDataWriter.saveData(metricsData);
                    }
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                }
            }
        };
        workerPool.executeJob(runnable);
    }


}
