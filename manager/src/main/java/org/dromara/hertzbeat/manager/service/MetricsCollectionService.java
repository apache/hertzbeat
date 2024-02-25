package org.dromara.hertzbeat.manager.service;

import org.dromara.hertzbeat.common.entity.manager.MetricsCollection;

import java.util.List;

/**
 * Historical Collection Service
 * @author zqr10159
 */
public interface MetricsCollectionService {
    /**
     * Get all favorite historical metrics
     * 获取所有被收藏的历史指标
     * @param monitorId monitorId
     * @return historical metrics
     */
    List<MetricsCollection> getHistoricalMetrics(Long monitorId);

}
