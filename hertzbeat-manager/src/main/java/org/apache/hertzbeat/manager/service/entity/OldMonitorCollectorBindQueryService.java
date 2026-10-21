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

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Query boundary for old monitor collector-bind evidence.
 */
@Service
public class OldMonitorCollectorBindQueryService {

    private final CollectorMonitorBindDao collectorMonitorBindDao;

    public OldMonitorCollectorBindQueryService(CollectorMonitorBindDao collectorMonitorBindDao) {
        this.collectorMonitorBindDao = collectorMonitorBindDao;
    }

    public Optional<String> findCollectorByMonitorId(Long monitorId) {
        if (monitorId == null) {
            return Optional.empty();
        }
        return collectorMonitorBindDao.findCollectorMonitorBindByMonitorId(monitorId)
                .map(CollectorMonitorBind::getCollector);
    }

    public Map<Long, String> findCollectorByMonitorIds(Set<Long> monitorIds) {
        if (CollectionUtils.isEmpty(monitorIds)) {
            return Map.of();
        }
        return collectorMonitorBindDao.findCollectorMonitorBindsByMonitorIdIn(monitorIds)
                .stream()
                .collect(Collectors.toMap(CollectorMonitorBind::getMonitorId, CollectorMonitorBind::getCollector));
    }
}
