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
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.dao.EntityIdentityDao;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Builds entity DTO drafts from submitted definition documents.
 */
@Service
public class EntityDefinitionDraftService {

    private final EntityDefinitionDocumentParserService entityDefinitionDocumentParserService;
    private final EntityDefinitionNormalizationService entityDefinitionNormalizationService;
    private final EntityDefinitionMappingService entityDefinitionMappingService;
    private final EntityIdentityDao entityIdentityDao;
    private final EntityIdentityResolutionService entityIdentityResolutionService;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;
    private final EntityMonitorBindQueryService entityMonitorBindQueryService;

    public EntityDefinitionDraftService(EntityDefinitionDocumentParserService entityDefinitionDocumentParserService,
                                        EntityDefinitionNormalizationService entityDefinitionNormalizationService,
                                        EntityDefinitionMappingService entityDefinitionMappingService,
                                        EntityIdentityDao entityIdentityDao,
                                        EntityIdentityResolutionService entityIdentityResolutionService,
                                        EntityWorkspaceAccessService entityWorkspaceAccessService,
                                        EntityMonitorBindQueryService entityMonitorBindQueryService) {
        this.entityDefinitionDocumentParserService = entityDefinitionDocumentParserService;
        this.entityDefinitionNormalizationService = entityDefinitionNormalizationService;
        this.entityDefinitionMappingService = entityDefinitionMappingService;
        this.entityIdentityDao = entityIdentityDao;
        this.entityIdentityResolutionService = entityIdentityResolutionService;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
        this.entityMonitorBindQueryService = entityMonitorBindQueryService;
    }

    public EntityDto parseEntityDefinition(EntityDefinitionRequest definitionRequest, Long entityId) {
        return parseEntityDefinition(definitionRequest, entityId, null, true);
    }

    public EntityDto parseEntityDefinition(EntityDefinitionRequest definitionRequest,
                                           Long entityId,
                                           String requestWorkspaceId) {
        return parseEntityDefinition(definitionRequest, entityId, requestWorkspaceId, false);
    }

    private EntityDto parseEntityDefinition(EntityDefinitionRequest definitionRequest,
                                            Long entityId,
                                            String requestWorkspaceId,
                                            boolean resolveRequestWorkspaceAtMappingBoundary) {
        List<EntityDto> entityDtos = parseEntityDefinitionBundle(
                definitionRequest, entityId, requestWorkspaceId, resolveRequestWorkspaceAtMappingBoundary);
        if (CollectionUtils.isEmpty(entityDtos)) {
            throw new IllegalArgumentException("Entity definition content can not be blank.");
        }
        if (entityDtos.size() > 1) {
            throw new IllegalArgumentException("Entity definition bundle contains multiple entities. Use the bundle API.");
        }
        return entityDtos.getFirst();
    }

    public List<EntityDto> parseEntityDefinitionBundle(EntityDefinitionRequest definitionRequest) {
        return parseEntityDefinitionBundle(definitionRequest, null, null, true);
    }

    public List<EntityDto> parseEntityDefinitionBundle(EntityDefinitionRequest definitionRequest,
                                                       String requestWorkspaceId) {
        return parseEntityDefinitionBundle(definitionRequest, null, requestWorkspaceId, false);
    }

    private List<EntityDto> parseEntityDefinitionBundle(EntityDefinitionRequest definitionRequest,
                                                       Long entityId,
                                                       String requestWorkspaceId,
                                                       boolean resolveRequestWorkspaceAtMappingBoundary) {
        List<EntityDto> entityDtos = entityDefinitionDocumentParserService.parseDefinitionRecords(definitionRequest).stream()
                .map(entityDefinitionNormalizationService::normalizeDefinition)
                .map(definition -> resolveRequestWorkspaceAtMappingBoundary
                        ? entityDefinitionMappingService.toEntityDto(definition, entityId)
                        : entityDefinitionMappingService.toEntityDto(definition, entityId, requestWorkspaceId))
                .toList();
        rejectPreviewPrimaryIdentityCollisions(entityDtos, entityId);
        rejectPreviewMonitorBindCollisions(entityDtos, entityId);
        return entityDtos;
    }

    private void rejectPreviewMonitorBindCollisions(List<EntityDto> entityDtos, Long currentEntityId) {
        for (EntityDto entityDto : entityDtos) {
            if (entityDto == null || CollectionUtils.isEmpty(entityDto.getMonitorBinds())) {
                continue;
            }
            for (org.apache.hertzbeat.common.entity.manager.EntityMonitorBind monitorBind : entityDto.getMonitorBinds()) {
                if (monitorBind == null || monitorBind.getMonitorId() == null) {
                    continue;
                }
                for (org.apache.hertzbeat.common.entity.manager.EntityMonitorBind existingBind
                        : entityMonitorBindQueryService.findMonitorBindsByMonitorId(monitorBind.getMonitorId())) {
                    if (existingBind == null || existingBind.getEntityId() == null
                            || existingBind.getEntityId().equals(currentEntityId)) {
                        continue;
                    }
                    throw new IllegalArgumentException("Monitor already bound to another entity: "
                            + monitorBind.getMonitorId() + ".");
                }
            }
        }
    }

    private void rejectPreviewPrimaryIdentityCollisions(List<EntityDto> entityDtos, Long currentEntityId) {
        List<PreviewPrimaryIdentity> primaryIdentities = collectPreviewPrimaryIdentities(entityDtos);
        if (primaryIdentities.isEmpty()) {
            return;
        }

        Set<String> identityKeys = new HashSet<>();
        Set<String> normalizedValues = new HashSet<>();
        for (PreviewPrimaryIdentity identity : primaryIdentities) {
            identityKeys.add(identity.identityKey());
            normalizedValues.add(identity.normalizedValue());
        }

        List<EntityIdentity> matchingIdentities =
                entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(identityKeys, normalizedValues);
        if (CollectionUtils.isEmpty(matchingIdentities)) {
            return;
        }

        Set<Long> matchingEntityIds = new HashSet<>();
        for (EntityIdentity matchingIdentity : matchingIdentities) {
            Long matchingEntityId = matchingIdentity.getEntityId();
            if (matchingEntityId != null && !matchingEntityId.equals(currentEntityId)) {
                matchingEntityIds.add(matchingEntityId);
            }
        }
        if (matchingEntityIds.isEmpty()) {
            return;
        }

        Set<Long> accessibleEntityIds = new HashSet<>(entityWorkspaceAccessService
                .findAccessibleEntitiesByIdsForRequestWorkspace(matchingEntityIds)
                .stream()
                .map(ObserveEntity::getId)
                .toList());
        if (accessibleEntityIds.isEmpty()) {
            return;
        }

        for (PreviewPrimaryIdentity primaryIdentity : primaryIdentities) {
            for (EntityIdentity matchingIdentity : matchingIdentities) {
                if (!accessibleEntityIds.contains(matchingIdentity.getEntityId())) {
                    continue;
                }
                if (matchingIdentity.isPrimaryIdentity()
                        && primaryIdentity.identityKey().equals(matchingIdentity.getIdentityKey())
                        && primaryIdentity.normalizedValue().equals(matchingIdentity.getNormalizedValue())) {
                    throw new IllegalArgumentException("Entity primary identity already exists: "
                            + primaryIdentity.identityKey() + "=" + primaryIdentity.identityValue() + ".");
                }
            }
        }
    }

    private List<PreviewPrimaryIdentity> collectPreviewPrimaryIdentities(List<EntityDto> entityDtos) {
        List<PreviewPrimaryIdentity> identities = new ArrayList<>();
        for (EntityDto entityDto : entityDtos) {
            if (entityDto == null || CollectionUtils.isEmpty(entityDto.getIdentities())) {
                continue;
            }
            for (EntityIdentity identity : entityDto.getIdentities()) {
                if (identity == null
                        || !identity.isPrimaryIdentity()
                        || !StringUtils.hasText(identity.getIdentityKey())
                        || !StringUtils.hasText(identity.getIdentityValue())) {
                    continue;
                }
                String identityKey = identity.getIdentityKey().trim();
                String identityValue = identity.getIdentityValue().trim();
                String normalizedValue = entityIdentityResolutionService.normalizeIdentityValue(identityKey, identityValue);
                if (StringUtils.hasText(normalizedValue)) {
                    identities.add(new PreviewPrimaryIdentity(identityKey, identityValue, normalizedValue));
                }
            }
        }
        return identities;
    }

    private record PreviewPrimaryIdentity(String identityKey, String identityValue, String normalizedValue) {
    }
}
