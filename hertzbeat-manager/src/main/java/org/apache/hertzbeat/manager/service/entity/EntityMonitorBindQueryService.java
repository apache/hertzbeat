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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.manager.dao.EntityMonitorBindDao;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Owns persisted monitor-bind evidence lookup for entity read-model boundaries.
 */
@Service
public class EntityMonitorBindQueryService {

    private final EntityMonitorBindDao entityMonitorBindDao;

    public EntityMonitorBindQueryService(EntityMonitorBindDao entityMonitorBindDao) {
        this.entityMonitorBindDao = entityMonitorBindDao;
    }

    public List<EntityMonitorBind> findMonitorBinds(Long entityId) {
        return entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(entityId);
    }

    public Map<Long, List<EntityMonitorBind>> findMonitorBindsByEntityIds(List<Long> entityIds) {
        if (CollectionUtils.isEmpty(entityIds)) {
            return Map.of();
        }
        List<Long> acceptedEntityIds = entityIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (CollectionUtils.isEmpty(acceptedEntityIds)) {
            return Map.of();
        }
        Map<Long, List<EntityMonitorBind>> bindsByEntityId = new LinkedHashMap<>();
        entityMonitorBindDao.findAllByEntityIdInOrderByEntityIdAscIdAsc(acceptedEntityIds)
                .forEach(bind -> {
                    if (bind == null || bind.getEntityId() == null) {
                        return;
                    }
                    bindsByEntityId.computeIfAbsent(bind.getEntityId(), ignored -> new java.util.ArrayList<>())
                            .add(bind);
                });
        return bindsByEntityId;
    }

    public List<EntityMonitorBind> findMonitorBindsByMonitorId(Long monitorId) {
        if (monitorId == null) {
            return Collections.emptyList();
        }
        return entityMonitorBindDao.findAllByMonitorId(monitorId);
    }

    public long countMonitorBinds(Long entityId) {
        return entityMonitorBindDao.countByEntityId(entityId);
    }

    public Map<Long, Long> countMonitorBindsByEntityIds(List<Long> entityIds) {
        if (CollectionUtils.isEmpty(entityIds)) {
            return Map.of();
        }
        return entityMonitorBindDao.countByEntityIdInGroupByEntityId(entityIds)
                .stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> ((Number) row[1]).longValue()
                ));
    }
}
