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
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Workspace access boundary for entity reads and writes.
 */
@Service
public class EntityWorkspaceAccessService {

    private final EntityWorkspaceQueryService entityWorkspaceQueryService;

    public EntityWorkspaceAccessService(EntityWorkspaceQueryService entityWorkspaceQueryService) {
        this.entityWorkspaceQueryService = entityWorkspaceQueryService;
    }

    public List<ObserveEntity> filterEntitiesByRequestWorkspace(List<ObserveEntity> entities, String requestWorkspaceId) {
        if (!StringUtils.hasText(requestWorkspaceId) || CollectionUtils.isEmpty(entities)) {
            return entities;
        }
        return entities.stream()
                .filter(entity -> matchesRequestWorkspace(entity, requestWorkspaceId))
                .toList();
    }

    public List<ObserveEntity> findAccessibleEntitiesByIds(Collection<Long> entityIds, String requestWorkspaceId) {
        if (CollectionUtils.isEmpty(entityIds)) {
            return Collections.emptyList();
        }
        Set<Long> acceptedEntityIds = entityIds.stream()
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (acceptedEntityIds.isEmpty()) {
            return Collections.emptyList();
        }
        return filterEntitiesByRequestWorkspace(entityWorkspaceQueryService.findEntitiesByIds(acceptedEntityIds),
                requestWorkspaceId);
    }

    public List<ObserveEntity> findAccessibleEntitiesByIdsForRequestWorkspace(Collection<Long> entityIds) {
        return findAccessibleEntitiesByIds(entityIds, currentRequestWorkspaceId());
    }

    public List<ObserveEntity> findAccessibleEntities(String requestWorkspaceId, Sort sort) {
        String normalizedWorkspaceId = normalizeWorkspaceId(requestWorkspaceId);
        List<ObserveEntity> entities = entityWorkspaceQueryService.findEntities(normalizedWorkspaceId, sort);
        return filterEntitiesByRequestWorkspace(entities, normalizedWorkspaceId);
    }

    public List<ObserveEntity> findAccessibleEntities(String requestWorkspaceId, Pageable pageable) {
        String normalizedWorkspaceId = normalizeWorkspaceId(requestWorkspaceId);
        List<ObserveEntity> entities = entityWorkspaceQueryService.findEntities(normalizedWorkspaceId, pageable);
        return filterEntitiesByRequestWorkspace(entities, normalizedWorkspaceId);
    }

    public List<ObserveEntity> findAccessibleEntitiesForRequestWorkspace(Sort sort) {
        return findAccessibleEntities(currentRequestWorkspaceId(), sort);
    }

    public List<ObserveEntity> findAccessibleEntitiesForRequestWorkspace(Pageable pageable) {
        return findAccessibleEntities(currentRequestWorkspaceId(), pageable);
    }

    public Optional<ObserveEntity> findEntityById(long entityId) {
        return entityWorkspaceQueryService.findEntityById(entityId);
    }

    public Optional<ObserveEntity> findAccessibleEntityById(long entityId, String requestWorkspaceId) {
        return entityWorkspaceQueryService.findEntityById(entityId)
                .filter(entity -> matchesRequestWorkspace(entity, requestWorkspaceId));
    }

    public Optional<ObserveEntity> findAccessibleEntityByReference(String requestWorkspaceId,
                                                                   String type,
                                                                   String namespace,
                                                                   String name) {
        String normalizedWorkspaceId = normalizeWorkspaceId(requestWorkspaceId);
        Optional<ObserveEntity> entity = entityWorkspaceQueryService.findEntityByReference(
                normalizedWorkspaceId, type, namespace, name);
        return entity.filter(candidate -> matchesRequestWorkspace(candidate, normalizedWorkspaceId));
    }

    public Optional<ObserveEntity> findAccessibleEntityByReferenceForRequestWorkspace(String type,
                                                                                      String namespace,
                                                                                      String name) {
        return findAccessibleEntityByReference(currentRequestWorkspaceId(), type, namespace, name);
    }

    public Optional<ObserveEntity> findAccessibleEntityByReference(String requestWorkspaceId,
                                                                   String type,
                                                                   String name) {
        String normalizedWorkspaceId = normalizeWorkspaceId(requestWorkspaceId);
        Optional<ObserveEntity> entity = entityWorkspaceQueryService.findEntityByReference(
                normalizedWorkspaceId, type, name);
        return entity.filter(candidate -> matchesRequestWorkspace(candidate, normalizedWorkspaceId));
    }

    public Optional<ObserveEntity> findAccessibleEntityByReferenceForRequestWorkspace(String type, String name) {
        return findAccessibleEntityByReference(currentRequestWorkspaceId(), type, name);
    }

    public boolean matchesRequestWorkspace(ObserveEntity entity, String requestWorkspaceId) {
        if (!StringUtils.hasText(requestWorkspaceId)) {
            return true;
        }
        String normalizedRequestWorkspaceId = AuthTokenScopes.normalizeWorkspaceId(requestWorkspaceId);
        String entityWorkspaceId = entity == null ? null : entity.getWorkspaceId();
        if (!StringUtils.hasText(entityWorkspaceId)) {
            return AuthTokenScopes.DEFAULT_WORKSPACE_ID.equals(normalizedRequestWorkspaceId);
        }
        return normalizedRequestWorkspaceId.equals(AuthTokenScopes.normalizeWorkspaceId(entityWorkspaceId));
    }

    public boolean isEntityAccessibleForRequestWorkspace(long entityId) {
        return isEntityAccessibleForRequestWorkspace(entityId, currentRequestWorkspaceId());
    }

    public boolean isEntityAccessibleForRequestWorkspace(long entityId, String requestWorkspaceId) {
        if (!StringUtils.hasText(requestWorkspaceId)) {
            return true;
        }
        return findAccessibleEntityById(entityId, requestWorkspaceId).isPresent();
    }

    public Optional<ObserveEntity> findAccessibleEntityForRequestWorkspace(long entityId) {
        String requestWorkspaceId = currentRequestWorkspaceId();
        return findAccessibleEntityById(entityId, requestWorkspaceId);
    }

    public ObserveEntity requireAccessibleEntityForMutation(long entityId) {
        return findAccessibleEntityForRequestWorkspace(entityId)
                .orElseThrow(() -> new IllegalArgumentException("Entity not exist."));
    }

    public void requireAccessibleEntityForBoundWorkspace(long entityId) {
        if (!StringUtils.hasText(currentRequestWorkspaceId())) {
            return;
        }
        requireAccessibleEntityForMutation(entityId);
    }

    public String resolveWriteWorkspaceId(String sourceWorkspaceId, String currentWorkspaceId) {
        String requestWorkspaceId = currentRequestWorkspaceId();
        if (StringUtils.hasText(requestWorkspaceId)) {
            return requestWorkspaceId;
        }
        if (StringUtils.hasText(sourceWorkspaceId)) {
            return AuthTokenScopes.normalizeWorkspaceId(sourceWorkspaceId);
        }
        if (StringUtils.hasText(currentWorkspaceId)) {
            return AuthTokenScopes.normalizeWorkspaceId(currentWorkspaceId);
        }
        return AuthTokenScopes.DEFAULT_WORKSPACE_ID;
    }

    public String currentRequestWorkspaceId() {
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        return normalizeWorkspaceId(workspaceId);
    }

    private String normalizeWorkspaceId(String workspaceId) {
        return StringUtils.hasText(workspaceId) ? AuthTokenScopes.normalizeWorkspaceId(workspaceId) : null;
    }
}
