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

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Anti-corruption query boundary for old monitor records used by entity workflows.
 */
@Service
public class EntityMonitorQueryService {

    private final MonitorDao monitorDao;

    public EntityMonitorQueryService(MonitorDao monitorDao) {
        this.monitorDao = monitorDao;
    }

    public Optional<Monitor> findMonitor(long monitorId) {
        return monitorDao.findById(monitorId);
    }

    public boolean monitorExists(Long monitorId) {
        return monitorId != null && monitorDao.existsById(monitorId);
    }

    public List<Monitor> findMonitorsByIds(Collection<Long> monitorIds) {
        if (CollectionUtils.isEmpty(monitorIds)) {
            return Collections.emptyList();
        }
        Set<Long> acceptedMonitorIds = monitorIds.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (acceptedMonitorIds.isEmpty()) {
            return Collections.emptyList();
        }
        return monitorDao.findMonitorsByIdIn(acceptedMonitorIds);
    }
}
