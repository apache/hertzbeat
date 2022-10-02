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

package com.usthe.warehouse.store;

import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.queue.CommonDataQueue;
import com.usthe.warehouse.WarehouseProperties;
import com.usthe.warehouse.WarehouseWorkerPool;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * redis存储采集实时数据
 * @author tom
 * @date 2021/11/25 10:26
 */
@Configuration
@AutoConfigureAfter(value = {WarehouseProperties.class})
@ConditionalOnProperty(prefix = "warehouse.store.memory",
        name = "enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class MemoryDataStorage implements DisposableBean {

    private Map<String, CollectRep.MetricsData> metricsDataMap;
    private WarehouseWorkerPool workerPool;
    private CommonDataQueue commonDataQueue;

    public MemoryDataStorage(WarehouseWorkerPool workerPool, CommonDataQueue commonDataQueue) {
        metricsDataMap = new ConcurrentHashMap<>(1024);
        this.workerPool = workerPool;
        this.commonDataQueue = commonDataQueue;
        startStorageData();
    }

    public CollectRep.MetricsData getCurrentMetricsData(@NonNull Long monitorId, @NonNull String metric) {
        String hashKey = monitorId + metric;
        return metricsDataMap.get(hashKey);
    }

    private void startStorageData() {
        Runnable runnable = () -> {
            Thread.currentThread().setName("warehouse-memory-data-storage");
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    CollectRep.MetricsData metricsData = commonDataQueue.pollRealTimeStorageMetricsData();
                    if (metricsData != null) {
                        saveData(metricsData);
                    }
                } catch (InterruptedException e) {
                    log.error(e.getMessage());
                }
            }
        };
        workerPool.executeJob(runnable);
    }

    private void saveData(CollectRep.MetricsData metricsData) {
        String hashKey = metricsData.getId() + metricsData.getMetrics();
        if (metricsData.getValuesList().isEmpty()) {
            log.debug("[warehouse memory] redis flush metrics data {} is null, ignore.", hashKey);
            return;
        }
        metricsDataMap.put(hashKey, metricsData);
    }

    @Override
    public void destroy() throws Exception {
        if (metricsDataMap != null) {
            metricsDataMap.clear();
        }
    }
}
