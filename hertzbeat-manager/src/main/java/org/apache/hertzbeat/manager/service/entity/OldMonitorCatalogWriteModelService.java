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

package org.apache.hertzbeat.manager.service.entity;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.springframework.stereotype.Service;

/**
 * Write-model boundary for old monitor catalog row persistence.
 */
@Service
public class OldMonitorCatalogWriteModelService {

    private final MonitorDao monitorDao;

    public OldMonitorCatalogWriteModelService(MonitorDao monitorDao) {
        this.monitorDao = monitorDao;
    }

    public void saveMonitor(Monitor monitor) {
        if (monitor == null) {
            return;
        }
        monitorDao.save(monitor);
    }

    public List<Monitor> deleteMonitorsByIds(Set<Long> monitorIds) {
        if (monitorIds == null || monitorIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<Monitor> monitors = monitorDao.findMonitorsByIdIn(monitorIds);
        if (!monitors.isEmpty()) {
            monitorDao.deleteAll(monitors);
        }
        return monitors;
    }
}
