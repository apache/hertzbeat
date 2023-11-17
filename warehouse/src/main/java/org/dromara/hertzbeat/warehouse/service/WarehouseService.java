package org.dromara.hertzbeat.warehouse.service;

import org.dromara.hertzbeat.common.entity.message.CollectRep;

import java.util.List;

/**
 * service for warehouse
 *
 * @author tom
 */
public interface WarehouseService {

    /**
     * query monitor real time metrics data by monitor id
     * @param monitorId monitor id
     * @return metrics data
     */
    List<CollectRep.MetricsData> queryMonitorMetricsData(Long monitorId);
}
