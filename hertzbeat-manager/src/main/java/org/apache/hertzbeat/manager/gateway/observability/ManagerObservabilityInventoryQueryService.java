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

package org.apache.hertzbeat.manager.gateway.observability;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.springframework.stereotype.Service;

/**
 * Query boundary for monitor and collector inventory reads used by observability orchestration.
 */
@Service
@RequiredArgsConstructor
public class ManagerObservabilityInventoryQueryService {

    private final MonitorDao monitorDao;
    private final CollectorDao collectorDao;

    public long countMonitors() {
        return monitorDao.count();
    }

    public long countCollectors() {
        return collectorDao.count();
    }

    public long countCollectorsByStatus(byte status) {
        return collectorDao.countByStatus(status);
    }

    public Optional<Monitor> findLatestMonitor() {
        return monitorDao.findFirstByOrderByGmtUpdateDesc();
    }
}
