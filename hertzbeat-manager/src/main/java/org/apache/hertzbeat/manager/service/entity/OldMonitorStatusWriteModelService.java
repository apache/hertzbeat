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

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Write-model boundary for old monitor status mutation.
 */
@Service
public class OldMonitorStatusWriteModelService {

    private final MonitorDao monitorDao;

    public OldMonitorStatusWriteModelService(MonitorDao monitorDao) {
        this.monitorDao = monitorDao;
    }

    public void updateMonitorStatus(Long monitorId, byte status) {
        monitorDao.updateMonitorStatus(monitorId, status);
    }

    public List<Monitor> findAndMarkManagedMonitorsPaused(Set<Long> monitorIds) {
        if (CollectionUtils.isEmpty(monitorIds)) {
            return List.of();
        }
        return monitorDao.findMonitorsByIdIn(monitorIds)
                .stream()
                .filter(monitor -> monitor.getStatus() != CommonConstants.MONITOR_PAUSED_CODE)
                .peek(monitor -> monitor.setStatus(CommonConstants.MONITOR_PAUSED_CODE))
                .collect(Collectors.toList());
    }

    public List<Monitor> findAndMarkPausedMonitorsUp(Set<Long> monitorIds) {
        if (CollectionUtils.isEmpty(monitorIds)) {
            return List.of();
        }
        return monitorDao.findMonitorsByIdIn(monitorIds)
                .stream()
                .filter(monitor -> monitor.getStatus() == CommonConstants.MONITOR_PAUSED_CODE)
                .peek(monitor -> monitor.setStatus(CommonConstants.MONITOR_UP_CODE))
                .collect(Collectors.toList());
    }

    public void saveMonitorStatusChanges(List<Monitor> monitors) {
        if (CollectionUtils.isEmpty(monitors)) {
            return;
        }
        monitorDao.saveAll(monitors);
    }

    public void saveMonitorJobId(Monitor monitor, long jobId) {
        if (monitor == null) {
            return;
        }
        monitor.setJobId(jobId);
        monitorDao.save(monitor);
    }
}
