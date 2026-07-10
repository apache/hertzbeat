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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Builds integration hints that connect traditional monitors to entity catalog candidates.
 */
@Service
public class EntityIntegrationHintService {

    private static final String RECOMMEND_ALREADY_BOUND = "already_bound";

    private final EntityMonitorQueryService entityMonitorQueryService;
    private final EntityIdentityResolutionService entityIdentityResolutionService;
    private final EntityMonitorBindService entityMonitorBindService;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;

    public EntityIntegrationHintService(EntityMonitorQueryService entityMonitorQueryService,
                                        EntityIdentityResolutionService entityIdentityResolutionService,
                                        EntityMonitorBindService entityMonitorBindService,
                                        EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this.entityMonitorQueryService = entityMonitorQueryService;
        this.entityIdentityResolutionService = entityIdentityResolutionService;
        this.entityMonitorBindService = entityMonitorBindService;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
    }

    public List<EntityMonitorBindingCandidate> getMonitorBindingCandidates(long monitorId) {
        Monitor monitor = entityMonitorQueryService.findMonitor(monitorId).orElse(null);
        if (monitor == null) {
            return Collections.emptyList();
        }
        return includeExistingBoundEntities(monitor.getId(),
                entityIdentityResolutionService.resolveMonitorBindingCandidates(monitor));
    }

    public Map<Long, List<EntityMonitorBindingCandidate>> getMonitorBindingCandidates(List<Long> monitorIds) {
        if (CollectionUtils.isEmpty(monitorIds)) {
            return Collections.emptyMap();
        }
        Map<Long, List<EntityMonitorBindingCandidate>> result = new LinkedHashMap<>();
        monitorIds.stream()
                .filter(java.util.Objects::nonNull)
                .filter(monitorId -> monitorId > 0)
                .distinct()
                .limit(100)
                .forEach(monitorId -> result.put(monitorId, getMonitorBindingCandidates(monitorId)));
        return result;
    }

    private List<EntityMonitorBindingCandidate> includeExistingBoundEntities(
            long monitorId, List<EntityMonitorBindingCandidate> identityCandidates) {
        List<EntityMonitorBindingCandidate> candidates = new java.util.ArrayList<>(
                identityCandidates == null ? Collections.emptyList() : identityCandidates);
        Set<Long> candidateEntityIds = candidates.stream()
                .map(EntityMonitorBindingCandidate::getEntityId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<Long> boundEntityIds = entityMonitorBindService.findMonitorBindsByMonitorId(monitorId).stream()
                .map(EntityMonitorBind::getEntityId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        boundEntityIds.removeAll(candidateEntityIds);
        if (CollectionUtils.isEmpty(boundEntityIds)) {
            return candidates;
        }
        Map<Long, ObserveEntity> entities = entityWorkspaceAccessService
                .findAccessibleEntitiesByIdsForRequestWorkspace(boundEntityIds)
                .stream()
                .collect(Collectors.toMap(ObserveEntity::getId, item -> item, (left, right) -> left));
        for (Long entityId : boundEntityIds) {
            ObserveEntity entity = entities.get(entityId);
            if (entity == null) {
                continue;
            }
            candidates.add(new EntityMonitorBindingCandidate(
                    entity.getId(),
                    entity.getDisplayName() == null ? entity.getName() : entity.getDisplayName(),
                    entity.getType(),
                    0,
                    RECOMMEND_ALREADY_BOUND,
                    true,
                    Collections.emptyMap()));
        }
        return candidates;
    }
}
