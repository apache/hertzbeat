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
import java.util.Optional;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.pojo.dto.AppCount;
import org.springframework.stereotype.Service;

/**
 * Query boundary for old monitor catalog and app status evidence.
 */
@Service
public class OldMonitorCatalogQueryService {

    private final MonitorDao monitorDao;

    public OldMonitorCatalogQueryService(MonitorDao monitorDao) {
        this.monitorDao = monitorDao;
    }

    public Optional<Monitor> findMonitorById(Long monitorId) {
        if (monitorId == null) {
            return Optional.empty();
        }
        return monitorDao.findById(monitorId);
    }

    public Optional<Monitor> findMonitorByName(String name) {
        return monitorDao.findMonitorByNameEquals(name);
    }

    public List<Monitor> findMonitorsByApp(String app) {
        return monitorDao.findMonitorsByAppEquals(app);
    }

    public List<Long> findAllMonitorIds() {
        return monitorDao.findAll()
                .stream()
                .map(Monitor::getId)
                .collect(Collectors.toList());
    }

    public List<AppCount> findAppStatusCounts() {
        return monitorDao.findAppsStatusCount();
    }
}
