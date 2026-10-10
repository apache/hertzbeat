/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.service.entity;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.pojo.dto.EntityApmRedView;
import org.apache.hertzbeat.warehouse.repository.ApmRedQueryRepository;
import org.apache.hertzbeat.warehouse.repository.ApmRedQueryRepository.ApmRedQuery;
import org.apache.hertzbeat.warehouse.repository.ApmRedQueryRepository.ApmRedQueryResult;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Resolves a request-owned entity to a canonical service identity before reading APM RED Flow data.
 */
@Service
public class EntityApmRedReadModelService {

    private static final Set<String> SERVICE_ENTITY_TYPES = Set.of("service", "database", "middleware", "api");

    private final EntityWorkspaceAccessService entityWorkspaceAccessService;
    private final EntityIdentityQueryService entityIdentityQueryService;
    private final ObjectProvider<ApmRedQueryRepository> repositoryProvider;

    public EntityApmRedReadModelService(EntityWorkspaceAccessService entityWorkspaceAccessService,
                                        EntityIdentityQueryService entityIdentityQueryService,
                                        ObjectProvider<ApmRedQueryRepository> repositoryProvider) {
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
        this.entityIdentityQueryService = entityIdentityQueryService;
        this.repositoryProvider = repositoryProvider;
    }

    /**
     * Query one exact, bounded entity investigation window.
     *
     * @return null when the entity is not visible to the request workspace
     */
    public EntityApmRedView query(long entityId, long start, long end) {
        validateWindow(start, end);
        ObserveEntity entity = entityWorkspaceAccessService.findAccessibleEntityForRequestWorkspace(entityId)
                .orElse(null);
        if (entity == null) {
            return null;
        }
        String workspaceId = workspaceId(entity);
        List<EntityIdentity> identities = entityIdentityQueryService.findIdentities(workspaceId, entityId);
        EntityApmRedView.Identity identity = resolveIdentity(entity, identities);
        String canonicalServiceName = canonicalServiceName(entity, identities);
        String serviceNamespace = identity.serviceNamespace();
        String deploymentEnvironment = identity.deploymentEnvironment();
        if (!StringUtils.hasText(canonicalServiceName)) {
            return EntityApmRedView.unavailable(start, end, identity);
        }

        ApmRedQueryRepository repository;
        try {
            repository = repositoryProvider.getIfAvailable();
        } catch (RuntimeException exception) {
            return EntityApmRedView.unavailable(start, end, identity);
        }
        if (repository == null) {
            return EntityApmRedView.unavailable(start, end, identity);
        }
        ApmRedQueryResult result = repository.query(new ApmRedQuery(
                start,
                end,
                workspaceId,
                Long.toString(entityId),
                entity.getType(),
                canonicalServiceName,
                serviceNamespace,
                deploymentEnvironment));
        if (!result.available()) {
            return EntityApmRedView.unavailable(start, end, identity);
        }
        if (result.points().isEmpty()) {
            return EntityApmRedView.empty(start, end, identity);
        }
        return EntityApmRedView.ready(
                start,
                end,
                identity,
                toSummary(result.summary()),
                result.points().stream().map(EntityApmRedReadModelService::toPoint).toList());
    }

    static EntityApmRedView.Identity resolveIdentity(ObserveEntity entity, List<EntityIdentity> identities) {
        return new EntityApmRedView.Identity(workspaceId(entity), Long.toString(entity.getId()), entity.getType(),
                firstText(canonicalServiceName(entity, identities), entity.getName()),
                firstText(identityValue(identities, "service.namespace"), entity.getNamespace()),
                firstText(identityValue(identities, "deployment.environment.name"), entity.getEnvironment()));
    }

    private static String canonicalServiceName(ObserveEntity entity, List<EntityIdentity> identities) {
        String name = identityValue(identities, "service.name");
        return !StringUtils.hasText(name) && SERVICE_ENTITY_TYPES.contains(entity.getType())
                ? trimToNull(entity.getName()) : name;
    }

    private void validateWindow(long start, long end) {
        if (start < 0L || end <= start || end - start > ApmRedQueryRepository.MAX_WINDOW_MILLIS) {
            throw new IllegalArgumentException("entity_apm_red_window_invalid");
        }
    }

    private static String workspaceId(ObserveEntity entity) {
        return StringUtils.hasText(entity.getWorkspaceId())
                ? AuthTokenScopes.normalizeWorkspaceId(entity.getWorkspaceId())
                : AuthTokenScopes.DEFAULT_WORKSPACE_ID;
    }

    private static String identityValue(List<EntityIdentity> identities, String key) {
        if (identities == null) {
            return null;
        }
        return identities.stream()
                .filter(identity -> identity != null && key.equals(identity.getIdentityKey()))
                .filter(identity -> StringUtils.hasText(identity.getIdentityValue()))
                .sorted(Comparator.comparing(EntityIdentity::isPrimaryIdentity).reversed()
                        .thenComparing(EntityIdentity::getPriority,
                                Comparator.nullsLast(Comparator.reverseOrder())))
                .map(EntityIdentity::getIdentityValue)
                .map(String::trim)
                .findFirst()
                .orElse(null);
    }

    private static String firstText(String preferred, String fallback) {
        String normalized = trimToNull(preferred);
        return normalized == null ? trimToNull(fallback) : normalized;
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    static EntityApmRedView.RedSummary toSummary(
            ApmRedQueryRepository.ApmRedSummary summary) {
        return new EntityApmRedView.RedSummary(
                summary.requestCount(),
                summary.errorCount(),
                summary.requestRatePerSecond(),
                summary.errorRate(),
                summary.latencyAverageMs(),
                summary.latencyP95Ms());
    }

    private static EntityApmRedView.RedPoint toPoint(ApmRedQueryRepository.ApmRedPoint point) {
        return new EntityApmRedView.RedPoint(
                point.timestamp(),
                point.requestCount(),
                point.errorCount(),
                point.requestRatePerSecond(),
                point.errorRate(),
                point.latencyAverageMs(),
                point.latencyP95Ms());
    }
}
