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

package org.apache.hertzbeat.warehouse.store.realtime.memory;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.warehouse.store.realtime.AbstractRealTimeDataStorage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

/**
 * Store and collect real-time data - memory.
 *
 * <p>Ownership / lifetime contract for Arrow {@link CollectRep.MetricsData}:
 * <ul>
 *   <li>{@link #saveData} retains an independent copy in the cache. The caller (dispatch)
 *       still owns the input instance and may close it after {@code saveData} returns.</li>
 *   <li>On replace, the previous <em>cached</em> instance is closed immediately. That close
 *       must not affect in-flight readers.</li>
 *   <li>{@link #getCurrentMetricsData} returns a reader-owned snapshot (deep copy). Callers
 *       such as monitor-detail builders must {@link CollectRep.MetricsData#close()} the
 *       returned instance when finished. Holding a snapshot across a later {@code saveData}
 *       replacement is safe.</li>
 * </ul>
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.real-time.memory", name = "enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class MemoryDataStorage extends AbstractRealTimeDataStorage {

    /**
     * monitorId -> metricsName -> data
     */
    private final Map<Long, Map<String, CollectRep.MetricsData>> monitorMetricsDataMap;
    private static final Integer DEFAULT_INIT_SIZE = 16;
    private static final Integer METRICS_SIZE = 8;

    public MemoryDataStorage(MemoryProperties memoryProperties) {
        int initSize = DEFAULT_INIT_SIZE;
        if (memoryProperties != null
                && memoryProperties.initSize() != null) {
            initSize = memoryProperties.initSize();
        }
        monitorMetricsDataMap = new ConcurrentHashMap<>(initSize);
        this.serverAvailable = true;
    }

    @Override
    public CollectRep.MetricsData getCurrentMetricsData(@NonNull Long monitorId, @NonNull String metric) {
        Map<String, CollectRep.MetricsData> metricsDataMap = monitorMetricsDataMap.computeIfAbsent(monitorId, key -> new ConcurrentHashMap<>(METRICS_SIZE));
        return snapshotOrNull(metricsDataMap.get(metric));
    }

    @Override
    public List<CollectRep.MetricsData> getCurrentMetricsData(@NonNull Long monitorId) {
        Map<String, CollectRep.MetricsData> metricsDataMap = monitorMetricsDataMap.computeIfAbsent(monitorId, key -> new ConcurrentHashMap<>(METRICS_SIZE));
        List<CollectRep.MetricsData> snapshots = new ArrayList<>(metricsDataMap.size());
        for (CollectRep.MetricsData cached : metricsDataMap.values()) {
            CollectRep.MetricsData snapshot = snapshotOrNull(cached);
            if (snapshot != null) {
                snapshots.add(snapshot);
            }
        }
        return snapshots;
    }

    @Override
    public void saveData(CollectRep.MetricsData metricsData) {
        if (metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return;
        }
        Long monitorId = metricsData.getId();
        String metrics = metricsData.getMetrics();
        CollectRep.MetricsData retained = CollectRep.MetricsData.newBuilder(metricsData).build();
        Map<String, CollectRep.MetricsData> metricsDataMap =
                monitorMetricsDataMap.computeIfAbsent(monitorId, key -> new ConcurrentHashMap<>(METRICS_SIZE));
        CollectRep.MetricsData oldMetricsData = metricsDataMap.put(metrics, retained);
        if (oldMetricsData != null) {
            oldMetricsData.close();
        }
    }

    @Override
    public void destroy() {
        if (monitorMetricsDataMap == null) {
            return;
        }
        for (Map<String, CollectRep.MetricsData> metricsDataMap : monitorMetricsDataMap.values()) {
            if (metricsDataMap == null) {
                continue;
            }
            for (CollectRep.MetricsData metricsData : metricsDataMap.values()) {
                if (metricsData != null) {
                    metricsData.close();
                }
            }
        }
        monitorMetricsDataMap.clear();
    }

    private static CollectRep.MetricsData snapshotOrNull(CollectRep.MetricsData cached) {
        if (cached == null) {
            return null;
        }
        return CollectRep.MetricsData.newBuilder(cached).build();
    }
}
