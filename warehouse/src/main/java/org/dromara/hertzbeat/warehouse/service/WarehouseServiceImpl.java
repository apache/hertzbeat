package org.dromara.hertzbeat.warehouse.service;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.warehouse.store.AbstractRealTimeDataStorage;
import org.dromara.hertzbeat.warehouse.store.RealTimeMemoryDataStorage;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * warehouse service impl
 * @author tom
 */
@Service
@Slf4j
public class WarehouseServiceImpl implements WarehouseService {

    private final List<AbstractRealTimeDataStorage> realTimeDataStorages;

    public WarehouseServiceImpl(List<AbstractRealTimeDataStorage> realTimeDataStorages) {
        this.realTimeDataStorages = realTimeDataStorages;
    }

    @Override
    public List<CollectRep.MetricsData> queryMonitorMetricsData(Long monitorId) {
        AbstractRealTimeDataStorage realTimeDataStorage = realTimeDataStorages.stream()
                .filter(AbstractRealTimeDataStorage::isServerAvailable)
                .max((o1, o2) -> {
                    if (o1 instanceof RealTimeMemoryDataStorage) {
                        return -1;
                    } else if (o2 instanceof RealTimeMemoryDataStorage) {
                        return 1;
                    } else {
                        return 0;
                    }
                }).orElse(null);
        if (realTimeDataStorage == null) {
            log.error("real time store not available");
            return Collections.emptyList();
        }
        return realTimeDataStorage.getCurrentMetricsData(monitorId);
    }
}
