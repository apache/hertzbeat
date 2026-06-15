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

package org.apache.hertzbeat.manager.gateway.observability;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceActivityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceEntityRefInfo;
import org.apache.hertzbeat.manager.service.entity.EntityGovernanceStateService;
import org.apache.hertzbeat.manager.service.entity.EntityIdentityQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorBindQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityWorkspaceQueryService;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Manager-backed observability workspace read gateway.
 *
 * <p>This gateway remains in the manager module while entity lookups pass through the
 * manager entity query boundaries instead of exposing raw entity DAOs to observability.
 */
@Component
@RequiredArgsConstructor
public class ManagerObservabilityWorkspaceQueryGateway implements ObservabilityWorkspaceQueryGateway {

    private final EntityIdentityQueryService entityIdentityQueryService;
    private final EntityWorkspaceQueryService entityWorkspaceQueryService;
    private final EntityMonitorBindQueryService entityMonitorBindQueryService;
    private final ManagerObservabilityInventoryQueryService inventoryQueryService;
    private final EntityGovernanceStateService entityGovernanceStateService;

    @Override
    public long countMonitors() {
        return inventoryQueryService.countMonitors();
    }

    @Override
    public long countCollectors() {
        return inventoryQueryService.countCollectors();
    }

    @Override
    public long countCollectorsByStatus(byte status) {
        return inventoryQueryService.countCollectorsByStatus(status);
    }

    @Override
    public Optional<Monitor> findLatestMonitor() {
        return inventoryQueryService.findLatestMonitor();
    }

    @Override
    public long countDistinctBoundEntityIdsByIdentityKeys(Set<String> identityKeys) {
        return entityIdentityQueryService.countDistinctEntityIdsByIdentityKeys(identityKeys);
    }

    @Override
    public List<EntityIdentity> findIdentitiesByKeysAndNormalizedValues(Set<String> identityKeys, Set<String> normalizedValues) {
        return entityIdentityQueryService.findMatchingIdentities(identityKeys, normalizedValues);
    }

    @Override
    public Map<Long, ObserveEntity> findEntitiesByIds(Set<Long> entityIds) {
        if (CollectionUtils.isEmpty(entityIds)) {
            return Collections.emptyMap();
        }
        return entityWorkspaceQueryService.findEntitiesByIds(entityIds).stream()
                .collect(LinkedHashMap::new, (map, entity) -> map.put(entity.getId(), entity), Map::putAll);
    }

    @Override
    public long countMonitorBindsByEntityId(Long entityId) {
        return entityMonitorBindQueryService.countMonitorBinds(entityId);
    }

    @Override
    public Optional<ObserveEntity> findEntityById(Long entityId) {
        return entityWorkspaceQueryService.findEntityById(entityId);
    }

    @Override
    public List<EntityIdentity> findIdentitiesByEntityId(Long entityId) {
        return entityIdentityQueryService.findIdentities(entityId);
    }

    @Override
    public void recordEntityDiscoveryGovernanceActivity(String workspaceId, String action, String status,
                                                        String summary, String detail,
                                                        Map<Long, String> entityRefs) {
        if (!StringUtils.hasText(workspaceId) || !StringUtils.hasText(summary)) {
            return;
        }
        String normalizedAction = StringUtils.hasText(action) ? action.trim() : "identity_review";
        String normalizedStatus = StringUtils.hasText(status) ? status.trim() : "needs_governance";
        EntityDiscoveryGovernanceActivityInfo activityInfo = new EntityDiscoveryGovernanceActivityInfo();
        activityInfo.setId(governanceActivityId(workspaceId, normalizedAction, summary, detail, entityRefs));
        activityInfo.setStatus(normalizedStatus);
        activityInfo.setAction(normalizedAction);
        activityInfo.setSummary(summary.trim());
        activityInfo.setDetail(StringUtils.hasText(detail) ? detail.trim() : null);
        activityInfo.setEntityRefs(toEntityRefs(entityRefs));
        entityGovernanceStateService.saveDiscoveryGovernanceActivity(activityInfo, workspaceId);
    }

    private String governanceActivityId(String workspaceId, String action, String summary, String detail,
                                        Map<Long, String> entityRefs) {
        String rawKey = workspaceId + '\n' + action + '\n' + summary + '\n'
                + (detail == null ? "" : detail) + '\n' + (entityRefs == null ? Map.of() : entityRefs);
        return "otlp-" + action + "-" + UUID.nameUUIDFromBytes(rawKey.getBytes(StandardCharsets.UTF_8));
    }

    private List<EntityDiscoveryGovernanceEntityRefInfo> toEntityRefs(Map<Long, String> entityRefs) {
        if (CollectionUtils.isEmpty(entityRefs)) {
            return List.of();
        }
        return entityRefs.entrySet().stream()
                .filter(entry -> entry.getKey() != null)
                .map(entry -> new EntityDiscoveryGovernanceEntityRefInfo(entry.getKey(), entry.getValue()))
                .toList();
    }
}
