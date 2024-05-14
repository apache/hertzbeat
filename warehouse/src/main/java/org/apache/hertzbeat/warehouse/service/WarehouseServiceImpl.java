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

package org.apache.hertzbeat.warehouse.service;

import java.util.Collections;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.warehouse.store.realtime.AbstractRealTimeDataStorage;
import org.springframework.stereotype.Service;

/**
 * warehouse service impl
 */
@Service
@Slf4j
public class WarehouseServiceImpl implements WarehouseService {

    private final AbstractRealTimeDataStorage realTimeDataStorage;

    public WarehouseServiceImpl(AbstractRealTimeDataStorage realTimeDataStorage) {
        this.realTimeDataStorage = realTimeDataStorage;
    }

    @Override
    public List<CollectRep.MetricsData> queryMonitorMetricsData(Long monitorId) {
        boolean available = realTimeDataStorage.isServerAvailable();
        if (!available) {
            log.error("real time store not available");
            return Collections.emptyList();
        }
        return realTimeDataStorage.getCurrentMetricsData(monitorId);
    }
}
