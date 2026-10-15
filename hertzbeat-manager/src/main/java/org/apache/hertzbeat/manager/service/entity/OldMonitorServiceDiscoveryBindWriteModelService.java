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

import java.util.Set;
import org.apache.hertzbeat.manager.dao.MonitorBindDao;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Write-model boundary for old monitor service-discovery bind cleanup.
 */
@Service
public class OldMonitorServiceDiscoveryBindWriteModelService {

    private final MonitorBindDao monitorBindDao;

    public OldMonitorServiceDiscoveryBindWriteModelService(MonitorBindDao monitorBindDao) {
        this.monitorBindDao = monitorBindDao;
    }

    public void deleteBindsByParentMonitorIds(Set<Long> monitorIds) {
        if (CollectionUtils.isEmpty(monitorIds)) {
            return;
        }
        monitorBindDao.deleteMonitorBindByBizIdIn(monitorIds);
    }

    public void deleteBindsByChildMonitorId(Long monitorId) {
        if (monitorId == null) {
            return;
        }
        monitorBindDao.deleteByMonitorId(monitorId);
    }
}
