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

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Maintains entity monitor bindings and hides manager DAO lookup details.
 */
@Service
public class EntityMonitorBindService {

    private static final String SOURCE_MANUAL = "manual";
    private static final String SOURCE_AUTO = "auto";
    private static final String SOURCE_MONITOR_IDENTITY = "monitor_identity";
    private static final String BIND_ACTIVE = "active";

    private final EntityMonitorBindQueryService entityMonitorBindQueryService;
    private final EntityMonitorQueryService entityMonitorQueryService;
    private final EntityMonitorBindWriteModelService entityMonitorBindWriteModelService;

    public EntityMonitorBindService(EntityMonitorBindQueryService entityMonitorBindQueryService,
                                    EntityMonitorQueryService entityMonitorQueryService,
                                    EntityMonitorBindWriteModelService entityMonitorBindWriteModelService) {
        this.entityMonitorBindQueryService = entityMonitorBindQueryService;
        this.entityMonitorQueryService = entityMonitorQueryService;
        this.entityMonitorBindWriteModelService = entityMonitorBindWriteModelService;
    }

    public void deleteMonitorBinds(Long entityId) {
        entityMonitorBindWriteModelService.deleteMonitorBinds(entityId);
    }

    public void deleteMonitorBindsByMonitorIds(Set<Long> monitorIds) {
        entityMonitorBindWriteModelService.deleteMonitorBindsByMonitorIds(monitorIds);
    }

    public List<EntityMonitorBind> findMonitorBinds(Long entityId) {
        return entityMonitorBindQueryService.findMonitorBinds(entityId);
    }

    public List<EntityMonitorBind> findMonitorBindsByMonitorId(Long monitorId) {
        return entityMonitorBindQueryService.findMonitorBindsByMonitorId(monitorId);
    }

    public long countMonitorBinds(Long entityId) {
        return entityMonitorBindQueryService.countMonitorBinds(entityId);
    }

    public Map<Long, Long> countMonitorBindsByEntityIds(List<Long> entityIds) {
        return entityMonitorBindQueryService.countMonitorBindsByEntityIds(entityIds);
    }

    public void replaceMonitorBinds(Long entityId, List<EntityMonitorBind> monitorBinds) {
        List<EntityMonitorBind> rows = new ArrayList<>();
        Set<Long> acceptedMonitorIds = new LinkedHashSet<>();
        if (!CollectionUtils.isEmpty(monitorBinds)) {
            for (EntityMonitorBind bind : monitorBinds) {
                if (bind == null || !entityMonitorQueryService.monitorExists(bind.getMonitorId())) {
                    continue;
                }
                if (!acceptedMonitorIds.add(bind.getMonitorId())) {
                    continue;
                }
                requireMonitorAvailableForEntity(entityId, bind.getMonitorId());
                rows.add(EntityMonitorBind.builder()
                        .entityId(entityId)
                        .monitorId(bind.getMonitorId())
                        .bindType(defaultText(bind.getBindType(), SOURCE_MANUAL))
                        .bindSource(defaultText(bind.getBindSource(), SOURCE_MANUAL))
                        .status(defaultText(bind.getStatus(), BIND_ACTIVE))
                        .score(bind.getScore() == null ? 100 : bind.getScore())
                        .matchContext(bind.getMatchContext())
                        .build());
            }
        }
        entityMonitorBindWriteModelService.replaceMonitorBinds(entityId, rows);
    }

    private void requireMonitorAvailableForEntity(Long entityId, Long monitorId) {
        List<EntityMonitorBind> existingBinds = entityMonitorBindQueryService.findMonitorBindsByMonitorId(monitorId);
        for (EntityMonitorBind existingBind : existingBinds) {
            if (existingBind == null || Objects.equals(entityId, existingBind.getEntityId())) {
                continue;
            }
            throw new IllegalArgumentException("Monitor already bound to another entity: " + monitorId + ".");
        }
    }

    public void replaceAutoMonitorBinds(Long monitorId, List<EntityMonitorBindingCandidate> candidates) {
        if (monitorId == null) {
            return;
        }
        Set<Long> manuallyBoundEntityIds = entityMonitorBindQueryService.findMonitorBindsByMonitorId(monitorId)
                .stream()
                .filter(bind -> bind != null && !SOURCE_AUTO.equals(bind.getBindType()))
                .map(EntityMonitorBind::getEntityId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<EntityMonitorBind> rows = new ArrayList<>();
        if (!CollectionUtils.isEmpty(candidates)) {
            for (EntityMonitorBindingCandidate candidate : candidates) {
                if (candidate == null || candidate.getEntityId() == null
                        || manuallyBoundEntityIds.contains(candidate.getEntityId())) {
                    continue;
                }
                rows.add(EntityMonitorBind.builder()
                        .entityId(candidate.getEntityId())
                        .monitorId(monitorId)
                        .bindType(SOURCE_AUTO)
                        .bindSource(SOURCE_MONITOR_IDENTITY)
                        .status(BIND_ACTIVE)
                        .score(candidate.getScore() == null ? 0 : candidate.getScore())
                        .matchContext(candidate.getMatchedIdentities())
                        .build());
            }
        }
        entityMonitorBindWriteModelService.replaceAutoMonitorBinds(monitorId, rows);
    }

    public List<Monitor> findEntityMonitors(Long entityId) {
        List<EntityMonitorBind> binds = entityMonitorBindQueryService.findMonitorBinds(entityId);
        return resolveMonitorsInBindOrder(binds);
    }

    public Map<Long, List<Monitor>> findEntityMonitorsByEntityIds(List<Long> entityIds) {
        if (CollectionUtils.isEmpty(entityIds)) {
            return Collections.emptyMap();
        }
        Map<Long, List<EntityMonitorBind>> bindsByEntityId =
                entityMonitorBindQueryService.findMonitorBindsByEntityIds(entityIds);
        Set<Long> monitorIds = bindsByEntityId.values()
                .stream()
                .flatMap(List::stream)
                .map(EntityMonitorBind::getMonitorId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (monitorIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, Monitor> monitorMap = entityMonitorQueryService.findMonitorsByIds(monitorIds).stream()
                .collect(Collectors.toMap(Monitor::getId, item -> item, (left, right) -> left));
        Map<Long, List<Monitor>> monitorsByEntityId = new java.util.LinkedHashMap<>();
        for (Long entityId : entityIds) {
            List<EntityMonitorBind> binds = bindsByEntityId.get(entityId);
            if (CollectionUtils.isEmpty(binds)) {
                continue;
            }
            List<Monitor> monitors = new ArrayList<>();
            for (EntityMonitorBind bind : binds) {
                Monitor monitor = monitorMap.get(bind.getMonitorId());
                if (monitor != null) {
                    monitors.add(monitor);
                }
            }
            if (!monitors.isEmpty()) {
                monitorsByEntityId.put(entityId, monitors);
            }
        }
        return monitorsByEntityId;
    }

    private List<Monitor> resolveMonitorsInBindOrder(List<EntityMonitorBind> binds) {
        if (CollectionUtils.isEmpty(binds)) {
            return Collections.emptyList();
        }
        Set<Long> monitorIds = binds.stream()
                .map(EntityMonitorBind::getMonitorId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (monitorIds.isEmpty()) {
            return Collections.emptyList();
        }
        Map<Long, Monitor> monitorMap = entityMonitorQueryService.findMonitorsByIds(monitorIds).stream()
                .collect(Collectors.toMap(Monitor::getId, item -> item, (left, right) -> left));
        List<Monitor> monitors = new ArrayList<>();
        for (Long monitorId : monitorIds) {
            Monitor monitor = monitorMap.get(monitorId);
            if (monitor != null) {
                monitors.add(monitor);
            }
        }
        return monitors;
    }

    private String defaultText(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }
}
