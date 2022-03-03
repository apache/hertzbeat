package com.usthe.warehouse.store;

import com.usthe.collector.dispatch.export.MetricsDataExporter;
import com.usthe.common.entity.message.CollectRep;
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
    private MetricsDataExporter dataExporter;

    public MemoryDataStorage(WarehouseWorkerPool workerPool, MetricsDataExporter dataExporter) {
        metricsDataMap = new ConcurrentHashMap<>(1024);
        this.workerPool = workerPool;
        this.dataExporter = dataExporter;
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
                    CollectRep.MetricsData metricsData = dataExporter.pollMemoryStorageMetricsData();
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
