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

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.manager.service.entity.EntityIdentityQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorBindQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityWorkspaceQueryService;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

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
}
