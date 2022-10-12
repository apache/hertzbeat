package com.usthe.warehouse.store;

import com.usthe.common.entity.dto.Value;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.queue.CommonDataQueue;
import com.usthe.warehouse.WarehouseProperties;
import com.usthe.warehouse.WarehouseWorkerPool;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.DisposableBean;

import java.util.List;
import java.util.Map;

/**
 * @author ceilzcx
 * @since 2022/10/12
 */
@Slf4j
public abstract class AbstractDataStorage implements DisposableBean {
    protected final WarehouseWorkerPool workerPool;
    protected final WarehouseProperties properties;
    protected final CommonDataQueue commonDataQueue;

    protected AbstractDataStorage(WarehouseWorkerPool workerPool,
                                  WarehouseProperties properties,
                                  CommonDataQueue commonDataQueue) {
        this.workerPool = workerPool;
        this.properties = properties;
        this.commonDataQueue = commonDataQueue;
    }

    protected void startStorageData(boolean consume) {
        Runnable runnable = () -> {
            Thread.currentThread().setName("warehouse-tdEngine-data-storage");
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    CollectRep.MetricsData metricsData = commonDataQueue.pollPersistentStorageMetricsData();
                    if (consume && metricsData != null) {
                        saveData(metricsData);
                    }
                } catch (InterruptedException e) {
                    log.error(e.getMessage());
                }
            }
        };
        workerPool.executeJob(runnable);
        workerPool.executeJob(runnable);
    }

    abstract void saveData(CollectRep.MetricsData metricsData);

    /**
     * 从TD ENGINE时序数据库获取指标历史数据
     *
     * @param monitorId 监控ID
     * @param app 监控类型
     * @param metrics 指标集合名
     * @param metric 指标名
     * @param instance 实例
     * @param history 历史范围
     * @return 指标历史数据列表
     */
    public abstract Map<String, List<Value>> getHistoryMetricData(
            Long monitorId, String app, String metrics, String metric, String instance, String history);

    public abstract Map<String, List<Value>> getHistoryIntervalMetricData(
            Long monitorId, String app, String metrics, String metric, String instance, String history);
}
