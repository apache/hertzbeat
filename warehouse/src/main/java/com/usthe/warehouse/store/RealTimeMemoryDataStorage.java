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
import com.usthe.warehouse.WarehouseWorkerPool;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 存储采集实时数据 - memory
 * @author tom
 * @date 2021/11/25 10:26
 */
@Primary
@Component
@ConditionalOnProperty(prefix = "warehouse.store.memory",
        name = "enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class RealTimeMemoryDataStorage extends AbstractRealTimeDataStorage {

    private final Map<String, CollectRep.MetricsData> metricsDataMap;

    public RealTimeMemoryDataStorage(WarehouseWorkerPool workerPool, CommonDataQueue commonDataQueue) {
        super(workerPool, commonDataQueue);
        metricsDataMap = new ConcurrentHashMap<>(1024);
        super.startStorageData("warehouse-memory-data-storage");
    }

    @Override
    public CollectRep.MetricsData getCurrentMetricsData(@NonNull Long monitorId, @NonNull String metric) {
        String hashKey = monitorId + metric;
        return metricsDataMap.get(hashKey);
    }

    @Override
    public void saveData(CollectRep.MetricsData metricsData) {
        String hashKey = metricsData.getId() + metricsData.getMetrics();
        if (metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return;
        }
        if (metricsData.getValuesList().isEmpty()) {
            log.info("[warehouse memory] memory flush metrics data {} is null, ignore.", metricsData.getId());
            return;
        }
        metricsDataMap.put(hashKey, metricsData);
    }

    @Override
    public void destroy() {
        if (metricsDataMap != null) {
            metricsDataMap.clear();
        }
    }
}
