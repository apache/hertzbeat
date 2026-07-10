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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Maintains entity relations and resolves catalog references behind the workspace boundary.
 */
@Service
public class EntityRelationService {

    private static final String SOURCE_MANUAL = "manual";
    private static final String RELATION_CONFIRMED = "confirmed";
    private static final String TYPE_DATABASE = "database";
    private static final String TYPE_API = "api";
    private static final String KIND_DATASTORE = "datastore";
    private static final String KIND_API = "api";
    private static final String LEGACY_ENTITY_DEFINITION_KIND = "Entity";
    private static final String DEFAULT_NAMESPACE = "default";

    private final EntityWorkspaceAccessService entityWorkspaceAccessService;
    private final EntityRelationQueryService entityRelationQueryService;
    private final EntityRelationWriteModelService entityRelationWriteModelService;

    public EntityRelationService(EntityWorkspaceAccessService entityWorkspaceAccessService,
                                 EntityRelationQueryService entityRelationQueryService,
                                 EntityRelationWriteModelService entityRelationWriteModelService) {
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
        this.entityRelationQueryService = entityRelationQueryService;
        this.entityRelationWriteModelService = entityRelationWriteModelService;
    }

    public void replaceRelations(Long entityId, List<EntityRelation> relations) {
        replaceRelationsForRequestWorkspace(entityId, relations);
    }

    public void replaceRelationsForRequestWorkspace(Long entityId, List<EntityRelation> relations) {
        replaceRelationsInternal(entityId, relations, null, true);
    }

    public void deleteRelationsForEntity(Long entityId) {
        entityRelationWriteModelService.deleteIncomingAndOutgoingRelations(entityId);
    }

    public List<EntityRelation> findEntityRelations(Long entityId) {
        return entityRelationQueryService.findEntityRelations(entityId);
    }

    public List<EntityRelation> findEntityRelations(Long entityId, int limit) {
        return entityRelationQueryService.findEntityRelations(entityId, limit);
    }

    public long countEntityRelations(Long entityId) {
        return entityRelationQueryService.countEntityRelations(entityId);
    }

    public Map<Long, Long> countEntityRelationsByEntityIds(List<Long> entityIds) {
        return entityRelationQueryService.countEntityRelationsByEntityIds(entityIds);
    }

    public void replaceRelations(Long entityId, List<EntityRelation> relations, String requestWorkspaceId) {
        replaceRelationsInternal(entityId, relations, requestWorkspaceId, false);
    }

    private void replaceRelationsInternal(Long entityId,
                                          List<EntityRelation> relations,
                                          String requestWorkspaceId,
                                          boolean requestWorkspaceScoped) {
        if (CollectionUtils.isEmpty(relations)) {
            entityRelationWriteModelService.replaceSourceRelations(entityId, List.of());
            return;
        }
        List<EntityRelation> rows = new ArrayList<>();
        Set<String> dedupeKeys = new LinkedHashSet<>();
        for (EntityRelation relation : relations) {
            Long sourceEntityId = relation.getSourceEntityId() == null ? entityId : relation.getSourceEntityId();
            String targetRef = trimToNull(relation.getTargetRef());
            Long targetEntityId = relation.getTargetEntityId();
            if (targetEntityId == null && StringUtils.hasText(targetRef)) {
                targetEntityId = requestWorkspaceScoped
                        ? resolveEntityReferenceForRequestWorkspace(targetRef)
                        : resolveEntityReference(targetRef, requestWorkspaceId);
            }
            if (!Objects.equals(sourceEntityId, entityId)) {
                continue;
            }
            if (targetEntityId == null && !StringUtils.hasText(targetRef)) {
                continue;
            }
            if (targetEntityId != null && Objects.equals(sourceEntityId, targetEntityId)) {
                continue;
            }
            String normalizedTargetRef = defaultText(targetRef, buildEntityReference(targetEntityId));
            String dedupeKey = String.join("|",
                    String.valueOf(sourceEntityId),
                    defaultText(relation.getRelationType(), "depends_on"),
                    targetEntityId == null ? "" : String.valueOf(targetEntityId),
                    defaultText(normalizedTargetRef, ""));
            if (!dedupeKeys.add(dedupeKey)) {
                continue;
            }
            rows.add(EntityRelation.builder()
                    .sourceEntityId(sourceEntityId)
                    .targetEntityId(targetEntityId)
                    .targetRef(normalizedTargetRef)
                    .relationType(defaultText(relation.getRelationType(), "depends_on"))
                    .relationSource(defaultText(relation.getRelationSource(), SOURCE_MANUAL))
                    .status(defaultText(relation.getStatus(), RELATION_CONFIRMED))
                    .score(relation.getScore() == null ? 100 : relation.getScore())
                    .description(relation.getDescription())
                    .attributes(relation.getAttributes())
                    .build());
        }
        entityRelationWriteModelService.replaceSourceRelations(entityId, rows);
    }

    public Long resolveEntityReferenceForRequestWorkspace(String targetRef) {
        if (!StringUtils.hasText(targetRef)) {
            return null;
        }
        Long directId = parseLong(targetRef);
        if (directId != null) {
            return resolveDirectEntityReferenceForRequestWorkspace(directId);
        }
        String normalized = targetRef.trim();
        int typeSeparator = normalized.indexOf(':');
        if (typeSeparator < 0 || typeSeparator == normalized.length() - 1) {
            return null;
        }
        String type = normalizeEntityTypeFromKind(normalized.substring(0, typeSeparator));
        String remainder = normalized.substring(typeSeparator + 1).trim();
        if (!StringUtils.hasText(type) || !StringUtils.hasText(remainder)) {
            return null;
        }
        int namespaceSeparator = remainder.indexOf('/');
        if (namespaceSeparator > 0 && namespaceSeparator < remainder.length() - 1) {
            String namespace = remainder.substring(0, namespaceSeparator).trim();
            String name = remainder.substring(namespaceSeparator + 1).trim();
            return entityWorkspaceAccessService
                    .findAccessibleEntityByReferenceForRequestWorkspace(type, namespace, name)
                    .map(ObserveEntity::getId)
                    .orElseGet(() -> entityWorkspaceAccessService
                            .findAccessibleEntityByReferenceForRequestWorkspace(type, name)
                            .map(ObserveEntity::getId)
                            .orElse(null));
        }
        return entityWorkspaceAccessService.findAccessibleEntityByReferenceForRequestWorkspace(type, remainder)
                .map(ObserveEntity::getId)
                .orElse(null);
    }

    public Long resolveEntityReference(String targetRef, String requestWorkspaceId) {
        if (!StringUtils.hasText(targetRef)) {
            return null;
        }
        Long directId = parseLong(targetRef);
        if (directId != null) {
            return resolveDirectEntityReference(directId, requestWorkspaceId);
        }
        String normalized = targetRef.trim();
        int typeSeparator = normalized.indexOf(':');
        if (typeSeparator < 0 || typeSeparator == normalized.length() - 1) {
            return null;
        }
        String type = normalizeEntityTypeFromKind(normalized.substring(0, typeSeparator));
        String remainder = normalized.substring(typeSeparator + 1).trim();
        if (!StringUtils.hasText(type) || !StringUtils.hasText(remainder)) {
            return null;
        }
        int namespaceSeparator = remainder.indexOf('/');
        if (namespaceSeparator > 0 && namespaceSeparator < remainder.length() - 1) {
            String namespace = remainder.substring(0, namespaceSeparator).trim();
            String name = remainder.substring(namespaceSeparator + 1).trim();
            return entityWorkspaceAccessService.findAccessibleEntityByReference(requestWorkspaceId, type, namespace, name)
                    .map(ObserveEntity::getId)
                    .orElseGet(() -> entityWorkspaceAccessService
                            .findAccessibleEntityByReference(requestWorkspaceId, type, name)
                            .map(ObserveEntity::getId)
                            .orElse(null));
        }
        return entityWorkspaceAccessService.findAccessibleEntityByReference(requestWorkspaceId, type, remainder)
                .map(ObserveEntity::getId)
                .orElse(null);
    }

    public Long resolveDirectEntityReferenceForRequestWorkspace(Long entityId) {
        if (entityId == null) {
            return null;
        }
        return entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace(entityId) ? entityId : null;
    }

    public Long resolveDirectEntityReference(Long entityId, String requestWorkspaceId) {
        if (entityId == null) {
            return null;
        }
        if (!StringUtils.hasText(requestWorkspaceId)) {
            return entityId;
        }
        return entityWorkspaceAccessService.findAccessibleEntityById(entityId, requestWorkspaceId)
                .map(ObserveEntity::getId)
                .orElse(null);
    }

    public String buildEntityReference(Long entityId) {
        if (entityId == null) {
            return null;
        }
        return entityWorkspaceAccessService.findEntityById(entityId)
                .map(this::buildEntityReference)
                .orElse(null);
    }

    public String buildEntityReference(ObserveEntity entity) {
        if (entity == null || !StringUtils.hasText(entity.getType()) || !StringUtils.hasText(entity.getName())) {
            return null;
        }
        String namespace = defaultText(entity.getNamespace(), DEFAULT_NAMESPACE);
        return toDefinitionKind(entity.getType()) + ":" + namespace + "/" + entity.getName();
    }

    private String normalizeEntityTypeFromKind(String kind) {
        if (!StringUtils.hasText(kind)) {
            return null;
        }
        if (LEGACY_ENTITY_DEFINITION_KIND.equalsIgnoreCase(kind.trim())) {
            return null;
        }
        return switch (kind.trim().toLowerCase()) {
            case KIND_DATASTORE -> TYPE_DATABASE;
            case KIND_API -> TYPE_API;
            default -> kind.trim().toLowerCase();
        };
    }

    private String toDefinitionKind(String entityType) {
        if (!StringUtils.hasText(entityType)) {
            return null;
        }
        return switch (entityType.trim().toLowerCase()) {
            case TYPE_DATABASE -> KIND_DATASTORE;
            case TYPE_API -> KIND_API;
            default -> entityType.trim().toLowerCase();
        };
    }

    private Long parseLong(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String defaultText(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
