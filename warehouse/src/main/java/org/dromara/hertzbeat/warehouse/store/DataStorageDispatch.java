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

package org.dromara.hertzbeat.warehouse.store;

import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.queue.CommonDataQueue;
import org.dromara.hertzbeat.warehouse.WarehouseWorkerPool;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * dispatch storage metrics data
 *
 * @author tom
 *
 */
@Slf4j
@Component
public class DataStorageDispatch {

    private final CommonDataQueue commonDataQueue;
    private final WarehouseWorkerPool workerPool;
    private final List<AbstractHistoryDataStorage> historyDataStorages;
    private final List<AbstractRealTimeDataStorage> realTimeDataStorages;

    public DataStorageDispatch(CommonDataQueue commonDataQueue,
                               WarehouseWorkerPool workerPool,
                               List<AbstractHistoryDataStorage> historyDataStorages,
                               List<AbstractRealTimeDataStorage> realTimeDataStorages) {
        this.commonDataQueue = commonDataQueue;
        this.workerPool = workerPool;
        this.historyDataStorages = historyDataStorages;
        this.realTimeDataStorages = realTimeDataStorages;
        startStoragePersistentData();
        startStorageRealTimeData();
    }

    private void startStorageRealTimeData() {
        Runnable runnable = () -> {
            Thread.currentThread().setName("warehouse-realtime-data-storage");
            if (realTimeDataStorages != null && realTimeDataStorages.size() > 1) {
                realTimeDataStorages.removeIf(item -> item instanceof RealTimeMemoryDataStorage);
            }
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    CollectRep.MetricsData metricsData = commonDataQueue.pollMetricsDataToRealTimeStorage();
                    if (metricsData != null && realTimeDataStorages != null) {
                        for (AbstractRealTimeDataStorage realTimeDataStorage : realTimeDataStorages) {
                            realTimeDataStorage.saveData(metricsData);
                        }
                    }
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                }
            }
        };
        workerPool.executeJob(runnable);
    }

    protected void startStoragePersistentData() {
        Runnable runnable = () -> {
            Thread.currentThread().setName("warehouse-persistent-data-storage");
            if (historyDataStorages != null && historyDataStorages.size() > 1) {
                historyDataStorages.removeIf(item -> item instanceof HistoryJpaDatabaseDataStorage);
            }
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    CollectRep.MetricsData metricsData = commonDataQueue.pollMetricsDataToPersistentStorage();
                    if (metricsData != null && historyDataStorages != null) {
                        for (AbstractHistoryDataStorage historyDataStorage : historyDataStorages) {
                            historyDataStorage.saveData(metricsData);
                        }
                    }
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                }
            }
        };
        workerPool.executeJob(runnable);
    }


}
