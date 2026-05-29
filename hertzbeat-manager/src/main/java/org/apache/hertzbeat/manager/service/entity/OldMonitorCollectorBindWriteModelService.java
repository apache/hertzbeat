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

import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Write-model boundary for old monitor collector-bind cleanup.
 */
@Service
public class OldMonitorCollectorBindWriteModelService {

    private final CollectorMonitorBindDao collectorMonitorBindDao;

    public OldMonitorCollectorBindWriteModelService(CollectorMonitorBindDao collectorMonitorBindDao) {
        this.collectorMonitorBindDao = collectorMonitorBindDao;
    }

    public void deleteCollectorBindByMonitorId(Long monitorId) {
        if (monitorId == null) {
            return;
        }
        collectorMonitorBindDao.deleteCollectorMonitorBindsByMonitorId(monitorId);
    }

    public void replaceCollectorBind(Long monitorId, String collector) {
        if (monitorId == null) {
            return;
        }
        deleteCollectorBindByMonitorId(monitorId);
        saveCollectorBind(monitorId, collector);
    }

    public void saveCollectorBind(Long monitorId, String collector) {
        if (monitorId == null) {
            return;
        }
        if (!StringUtils.hasText(collector)) {
            return;
        }
        CollectorMonitorBind collectorMonitorBind = CollectorMonitorBind.builder()
                .collector(collector)
                .monitorId(monitorId)
                .build();
        collectorMonitorBindDao.save(collectorMonitorBind);
    }
}
