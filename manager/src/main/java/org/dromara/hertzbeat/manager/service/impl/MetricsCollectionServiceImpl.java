package org.dromara.hertzbeat.manager.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.manager.MetricsCollection;
import org.dromara.hertzbeat.manager.dao.MetricsCollectionDao;
import org.dromara.hertzbeat.manager.service.MetricsCollectionService;
import org.springframework.stereotype.Service;

import java.util.List;
@Slf4j
@RequiredArgsConstructor
@Service
public class MetricsCollectionServiceImpl implements MetricsCollectionService {

    private final MetricsCollectionDao metricsCollectionDao;

    /**
     * Get all favorite historical metrics
     * 获取所有被收藏的历史指标
     * @param monitorId monitorId
     * @return historical metrics
     */
    @Override
    public List<MetricsCollection> getHistoricalMetrics(Long monitorId) {
        return metricsCollectionDao.findByMonitorId(monitorId);
    }
}
