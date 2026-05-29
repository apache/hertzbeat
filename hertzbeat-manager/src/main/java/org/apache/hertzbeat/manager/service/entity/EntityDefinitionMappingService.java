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
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.apache.hertzbeat.common.entity.manager.EntityCatalogContact;
import org.apache.hertzbeat.common.entity.manager.EntityCatalogLink;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.EntityOwnerRef;
import org.apache.hertzbeat.common.entity.manager.EntityRelation;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityInfo;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;

/**
 * Maps canonical entity definitions to internal entity DTOs and back.
 */
@Service
public class EntityDefinitionMappingService {

    private static final String SOURCE_MANUAL = "manual";
    private static final String BIND_ACTIVE = "active";
    private static final String RELATION_CONFIRMED = "confirmed";
    private static final String ENTITY_DEFINITION_API_VERSION = "hertzbeat/v1";
    private static final String LEGACY_ENTITY_DEFINITION_KIND = "Entity";
    private static final String TYPE_DATABASE = "database";
    private static final String TYPE_API = "api";
    private static final String KIND_DATASTORE = "datastore";
    private static final String KIND_API = "api";

    private final EntityRelationService entityRelationService;
    private final EntityWorkspaceAccessService entityWorkspaceAccessService;

    public EntityDefinitionMappingService(EntityRelationService entityRelationService,
                                          EntityWorkspaceAccessService entityWorkspaceAccessService) {
        this.entityRelationService = entityRelationService;
        this.entityWorkspaceAccessService = entityWorkspaceAccessService;
    }

    public EntityDto toEntityDto(EntityDefinition definition, Long entityId) {
        return toEntityDto(definition, entityId, entityWorkspaceAccessService.currentRequestWorkspaceId());
    }

    public EntityDto toEntityDto(EntityDefinition definition, Long entityId, String requestWorkspaceId) {
        EntityDto entityDto = new EntityDto();
        EntityInfo entityInfo = new EntityInfo();
        entityInfo.setId(entityId);
        entityInfo.setType(defaultText(
                normalizeEntityTypeFromKind(definition.getKind()),
                "service"
        ));
        entityInfo.setName(definition.getMetadata() == null ? null : definition.getMetadata().getName());
        entityInfo.setDisplayName(definition.getMetadata() == null ? null : definition.getMetadata().getDisplayName());
        entityInfo.setSubtype(definition.getSpec() == null ? null : definition.getSpec().getType());
        entityInfo.setDescription(definition.getMetadata() == null ? null : definition.getMetadata().getDescription());
        entityInfo.setLabels(definition.getMetadata() == null ? null : definition.getMetadata().getLabels());
        entityInfo.setTags(definition.getMetadata() == null ? Collections.emptyList() : definition.getMetadata().getTags());
        entityInfo.setAdditionalOwners(toEntityOwnerRefs(definition.getMetadata() == null ? null : definition.getMetadata().getAdditionalOwners()));
        entityInfo.setInheritFrom(definition.getMetadata() == null ? null : definition.getMetadata().getInheritFrom());
        entityInfo.setLinks(toEntityLinks(
                definition.getMetadata() == null ? null : definition.getMetadata().getLinks(),
                definition.getSpec() == null ? null : definition.getSpec().getRunbook()
        ));
        entityInfo.setContacts(toEntityContacts(definition.getMetadata() == null ? null : definition.getMetadata().getContacts()));
        entityInfo.setIntegrations(toJsonNode(definition.getIntegrations()));
        entityInfo.setExtensions(toJsonNode(definition.getExtensions()));
        entityInfo.setHertzbeat(toJsonNode(definition.getHertzbeat()));
        if (definition.getSpec() != null) {
            entityInfo.setSource(definition.getSpec().getSource());
            entityInfo.setOwner(defaultText(
                    definition.getMetadata() == null ? null : definition.getMetadata().getOwner(),
                    definition.getSpec().getOwner(),
                    definition.getSpec().getOwnedBy()
            ));
            entityInfo.setNamespace(defaultText(
                    definition.getMetadata() == null ? null : definition.getMetadata().getNamespace(),
                    definition.getSpec().getNamespace()
            ));
            entityInfo.setEnvironment(definition.getSpec().getEnvironment());
            entityInfo.setCriticality(definition.getSpec().getCriticality());
            entityInfo.setRunbook(definition.getSpec().getRunbook());
            entityInfo.setLifecycle(definition.getSpec().getLifecycle());
            entityInfo.setTier(definition.getSpec().getTier());
            entityInfo.setSystem(defaultText(definition.getSpec().getPartOf(), definition.getSpec().getSystem()));
            entityInfo.setComponentOf(definition.getSpec().getComponentOf());
            entityInfo.setComponents(definition.getSpec().getComponents());
            entityInfo.setImplementedBy(definition.getSpec().getImplementedBy());
            entityInfo.setApiInterface(toJsonNode(definition.getSpec().getApiInterface()));
            entityInfo.setLanguages(definition.getSpec().getLanguages());
        }
        entityDto.setEntityInfo(entityInfo);
        entityDto.setIdentities(toEntityIdentities(definition.getSpec() == null ? null : definition.getSpec().getTelemetry()));
        entityDto.setMonitorBinds(toEntityMonitorBinds(definition.getSpec() == null ? null : definition.getSpec().getTelemetry()));
        entityDto.setRelations(toEntityRelations(
                definition.getSpec() == null ? null : definition.getSpec().getRelations(),
                entityId,
                requestWorkspaceId));
        return entityDto;
    }

    public EntityDefinition toEntityDefinition(EntityDto entityDto) {
        EntityDefinition definition = new EntityDefinition();
        definition.setApiVersion(ENTITY_DEFINITION_API_VERSION);
        definition.setKind(defaultText(toDefinitionKind(entityDto.getEntity().getType()), "service"));

        ObserveEntity entity = entityDto.getEntity();
        EntityDefinition.Metadata metadata = new EntityDefinition.Metadata();
        metadata.setName(entity.getName());
        metadata.setNamespace(entity.getNamespace());
        metadata.setOwner(entity.getOwner());
        metadata.setAdditionalOwners(toDefinitionOwnerRefs(entity.getAdditionalOwners()));
        metadata.setInheritFrom(entity.getInheritFrom());
        metadata.setDisplayName(entity.getDisplayName());
        metadata.setDescription(entity.getDescription());
        metadata.setLabels(entity.getLabels());
        metadata.setTags(normalizeTags(entity.getTags(), entity.getLabels()));
        metadata.setLinks(toDefinitionLinks(entity.getLinks(), entity.getRunbook()));
        metadata.setContacts(toDefinitionContacts(entity.getContacts()));
        definition.setMetadata(metadata);
        definition.setIntegrations(toObjectNodeMap(entity.getIntegrations()));
        definition.setExtensions(toObjectNodeMap(entity.getExtensions()));
        definition.setHertzbeat(toDefinitionHertzbeat(entity.getHertzbeat()));

        EntityDefinition.Spec spec = new EntityDefinition.Spec();
        spec.setSource(entity.getSource());
        spec.setOwner(entity.getOwner());
        spec.setOwnedBy(entity.getOwner());
        spec.setNamespace(entity.getNamespace());
        spec.setEnvironment(entity.getEnvironment());
        spec.setCriticality(entity.getCriticality());
        spec.setRunbook(entity.getRunbook());
        spec.setLifecycle(entity.getLifecycle());
        spec.setTier(entity.getTier());
        spec.setType(entity.getSubtype());
        spec.setSystem(entity.getSystem());
        spec.setPartOf(entity.getSystem());
        spec.setComponentOf(entity.getComponentOf());
        spec.setComponents(entity.getComponents());
        spec.setImplementedBy(entity.getImplementedBy());
        spec.setApiInterface(toDefinitionApiInterface(entity.getApiInterface()));
        spec.setLanguages(entity.getLanguages());

        EntityDefinition.Telemetry telemetry = new EntityDefinition.Telemetry();
        telemetry.setIdentities((entityDto.getIdentities() == null ? Collections.<EntityIdentity>emptyList() : entityDto.getIdentities()).stream()
                .map(identity -> {
                    EntityDefinition.Identity item = new EntityDefinition.Identity();
                    item.setKey(identity.getIdentityKey());
                    item.setValue(identity.getIdentityValue());
                    item.setType(identity.getIdentityType());
                    item.setPriority(identity.getPriority());
                    item.setPrimary(identity.isPrimaryIdentity());
                    return item;
                }).toList());
        telemetry.setMonitors((entityDto.getMonitorBinds() == null ? Collections.<EntityMonitorBind>emptyList() : entityDto.getMonitorBinds()).stream()
                .map(bind -> {
                    EntityDefinition.MonitorBind item = new EntityDefinition.MonitorBind();
                    item.setMonitorId(bind.getMonitorId());
                    item.setBindType(bind.getBindType());
                    item.setBindSource(bind.getBindSource());
                    item.setStatus(bind.getStatus());
                    item.setScore(bind.getScore());
                    item.setMatchContext(bind.getMatchContext());
                    return item;
                }).toList());
        if (!CollectionUtils.isEmpty(telemetry.getIdentities()) || !CollectionUtils.isEmpty(telemetry.getMonitors())) {
            spec.setTelemetry(telemetry);
        }

        Long entityId = entity.getId();
        List<EntityDefinition.Relation> relations = (entityDto.getRelations() == null ? Collections.<EntityRelation>emptyList() : entityDto.getRelations()).stream()
                .filter(relation -> entityId == null || Objects.equals(relation.getSourceEntityId(), entityId))
                .map(relation -> {
                    EntityDefinition.Relation item = new EntityDefinition.Relation();
                    item.setTargetEntityId(relation.getTargetEntityId());
                    item.setTargetRef(defaultText(relation.getTargetRef(),
                            entityRelationService.buildEntityReference(relation.getTargetEntityId())));
                    item.setRelationType(relation.getRelationType());
                    item.setRelationSource(relation.getRelationSource());
                    item.setStatus(relation.getStatus());
                    item.setScore(relation.getScore());
                    item.setDescription(relation.getDescription());
                    item.setAttributes(relation.getAttributes());
                    return item;
                }).toList();
        if (!relations.isEmpty()) {
            spec.setRelations(relations);
            spec.setDependsOn(extractRelationReferences(relations));
        }
        definition.setSpec(spec);
        return definition;
    }

    private List<EntityIdentity> toEntityIdentities(EntityDefinition.Telemetry telemetry) {
        if (telemetry == null || CollectionUtils.isEmpty(telemetry.getIdentities())) {
            return Collections.emptyList();
        }
        return telemetry.getIdentities().stream()
                .filter(identity -> StringUtils.hasText(identity.getKey()) && StringUtils.hasText(identity.getValue()))
                .map(identity -> EntityIdentity.builder()
                        .identityKey(identity.getKey().trim())
                        .identityValue(identity.getValue().trim())
                        .identityType(defaultText(identity.getType(), SOURCE_MANUAL))
                        .priority(identity.getPriority())
                        .primaryIdentity(Boolean.TRUE.equals(identity.getPrimary()))
                        .build())
                .toList();
    }

    private List<EntityMonitorBind> toEntityMonitorBinds(EntityDefinition.Telemetry telemetry) {
        if (telemetry == null || CollectionUtils.isEmpty(telemetry.getMonitors())) {
            return Collections.emptyList();
        }
        return telemetry.getMonitors().stream()
                .filter(bind -> bind.getMonitorId() != null)
                .map(bind -> EntityMonitorBind.builder()
                        .monitorId(bind.getMonitorId())
                        .bindType(defaultText(bind.getBindType(), SOURCE_MANUAL))
                        .bindSource(defaultText(bind.getBindSource(), SOURCE_MANUAL))
                        .status(defaultText(bind.getStatus(), BIND_ACTIVE))
                        .score(bind.getScore())
                        .matchContext(bind.getMatchContext())
                        .build())
                .toList();
    }

    private List<EntityRelation> toEntityRelations(List<EntityDefinition.Relation> relations,
                                                   Long entityId,
                                                   String requestWorkspaceId) {
        if (CollectionUtils.isEmpty(relations)) {
            return Collections.emptyList();
        }
        return relations.stream()
                .map(relation -> EntityRelation.builder()
                        .sourceEntityId(entityId)
                        .targetEntityId(defaultTargetEntityId(relation, requestWorkspaceId))
                        .targetRef(defaultText(relation.getTargetRef(),
                                relation.getTargetEntityId() == null
                                        ? null
                                        : entityRelationService.buildEntityReference(relation.getTargetEntityId())))
                        .relationType(defaultText(relation.getRelationType(), "depends_on"))
                        .relationSource(defaultText(relation.getRelationSource(), SOURCE_MANUAL))
                        .status(defaultText(relation.getStatus(), RELATION_CONFIRMED))
                        .score(relation.getScore())
                        .description(relation.getDescription())
                        .attributes(relation.getAttributes())
                        .build())
                .filter(relation -> relation.getTargetEntityId() != null || StringUtils.hasText(relation.getTargetRef()))
                .toList();
    }

    private List<String> normalizeTags(List<String> tags, Map<String, String> labels) {
        List<String> normalized = defaultList(tags, Collections.emptyList()).stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList();
        if (!CollectionUtils.isEmpty(normalized)) {
            return normalized;
        }
        return toDefinitionTags(labels);
    }

    private List<String> toDefinitionTags(Map<String, String> labels) {
        if (CollectionUtils.isEmpty(labels)) {
            return Collections.emptyList();
        }
        return labels.entrySet().stream()
                .filter(entry -> StringUtils.hasText(entry.getKey()))
                .map(entry -> StringUtils.hasText(entry.getValue())
                        ? entry.getKey().trim() + ":" + entry.getValue().trim()
                        : entry.getKey().trim())
                .toList();
    }

    private List<EntityCatalogLink> toEntityLinks(List<EntityDefinition.Link> links, String runbookUrl) {
        if (CollectionUtils.isEmpty(links) && !StringUtils.hasText(runbookUrl)) {
            return Collections.emptyList();
        }
        List<EntityCatalogLink> result = new ArrayList<>();
        if (!CollectionUtils.isEmpty(links)) {
            for (EntityDefinition.Link link : links) {
                if (link == null || !StringUtils.hasText(link.getUrl())) {
                    continue;
                }
                result.add(new EntityCatalogLink(
                        defaultText(link.getName(), link.getType()),
                        defaultText(link.getType(), "link"),
                        trimToNull(link.getProvider()),
                        link.getUrl().trim()
                ));
            }
        }
        if (StringUtils.hasText(runbookUrl)) {
            boolean hasRunbook = result.stream().anyMatch(link -> "runbook".equalsIgnoreCase(defaultText(link.getType(), link.getName())));
            if (!hasRunbook) {
                result.add(0, new EntityCatalogLink("runbook", "runbook", "manual", runbookUrl.trim()));
            }
        }
        return result;
    }

    private List<EntityCatalogContact> toEntityContacts(List<EntityDefinition.Contact> contacts) {
        if (CollectionUtils.isEmpty(contacts)) {
            return Collections.emptyList();
        }
        return contacts.stream()
                .filter(contact -> contact != null && StringUtils.hasText(defaultText(contact.getValue(), contact.getContact())))
                .map(contact -> {
                    String value = defaultText(contact.getValue(), contact.getContact()).trim();
                    EntityCatalogContact item = new EntityCatalogContact(
                            defaultText(contact.getName(), contact.getType()),
                            defaultText(contact.getType(), "contact"),
                            value
                    );
                    item.setContact(value);
                    return item;
                })
                .toList();
    }

    private List<EntityDefinition.Link> toDefinitionLinks(List<EntityCatalogLink> links, String runbookUrl) {
        List<EntityDefinition.Link> result = new ArrayList<>();
        if (!CollectionUtils.isEmpty(links)) {
            for (EntityCatalogLink link : links) {
                if (link == null || !StringUtils.hasText(link.getUrl())) {
                    continue;
                }
                EntityDefinition.Link item = new EntityDefinition.Link();
                item.setName(defaultText(link.getName(), link.getType()));
                item.setType(defaultText(link.getType(), "link"));
                item.setProvider(trimToNull(link.getProvider()));
                item.setUrl(link.getUrl().trim());
                result.add(item);
            }
        }
        if (StringUtils.hasText(runbookUrl)) {
            boolean hasRunbook = result.stream().anyMatch(link -> "runbook".equalsIgnoreCase(defaultText(link.getType(), link.getName())));
            if (!hasRunbook) {
                EntityDefinition.Link runbook = new EntityDefinition.Link();
                runbook.setName("runbook");
                runbook.setType("runbook");
                runbook.setProvider("manual");
                runbook.setUrl(runbookUrl.trim());
                result.add(0, runbook);
            }
        }
        return result;
    }

    private List<EntityDefinition.Contact> toDefinitionContacts(List<EntityCatalogContact> contacts) {
        if (CollectionUtils.isEmpty(contacts)) {
            return Collections.emptyList();
        }
        return contacts.stream()
                .filter(contact -> contact != null && StringUtils.hasText(defaultText(contact.getContact(), contact.getValue())))
                .map(contact -> {
                    EntityDefinition.Contact item = new EntityDefinition.Contact();
                    item.setName(defaultText(contact.getName(), contact.getType()));
                    item.setType(defaultText(contact.getType(), "contact"));
                    item.setContact(defaultText(contact.getContact(), contact.getValue()).trim());
                    return item;
                })
                .toList();
    }

    private EntityDefinition.Hertzbeat toDefinitionHertzbeat(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        return JsonUtil.fromJson(node.toString(), EntityDefinition.Hertzbeat.class);
    }

    private EntityDefinition.ApiInterface toDefinitionApiInterface(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        return JsonUtil.fromJson(node.toString(), EntityDefinition.ApiInterface.class);
    }

    private Map<String, Object> toObjectNodeMap(JsonNode node) {
        if (node == null || node.isNull() || !node.isObject()) {
            return Collections.emptyMap();
        }
        return JsonUtil.fromJson(node.toString(), new tools.jackson.core.type.TypeReference<Map<String, Object>>() {
        });
    }

    private JsonNode toJsonNode(Object value) {
        if (value == null) {
            return null;
        }
        return JsonUtil.fromJson(JsonUtil.toJson(value));
    }

    private List<String> extractRelationReferences(List<EntityDefinition.Relation> relations) {
        if (CollectionUtils.isEmpty(relations)) {
            return Collections.emptyList();
        }
        return relations.stream()
                .map(relation -> defaultText(relation.getTargetRef(),
                        relation.getTargetEntityId() == null
                                ? null
                                : entityRelationService.buildEntityReference(relation.getTargetEntityId())))
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
    }

    private List<EntityOwnerRef> toEntityOwnerRefs(List<EntityDefinition.OwnerRef> owners) {
        if (CollectionUtils.isEmpty(owners)) {
            return Collections.emptyList();
        }
        return owners.stream()
                .filter(owner -> owner != null && StringUtils.hasText(owner.getName()))
                .map(owner -> new EntityOwnerRef(owner.getName().trim(), defaultText(owner.getType(), "team")))
                .toList();
    }

    private List<EntityDefinition.OwnerRef> toDefinitionOwnerRefs(List<EntityOwnerRef> owners) {
        if (CollectionUtils.isEmpty(owners)) {
            return Collections.emptyList();
        }
        return owners.stream()
                .filter(owner -> owner != null && StringUtils.hasText(owner.getName()))
                .map(owner -> {
                    EntityDefinition.OwnerRef item = new EntityDefinition.OwnerRef();
                    item.setName(owner.getName().trim());
                    item.setType(defaultText(owner.getType(), "team"));
                    return item;
                })
                .toList();
    }

    private <T> List<T> defaultList(List<T> primary, List<T> fallback) {
        if (!CollectionUtils.isEmpty(primary)) {
            return primary;
        }
        return fallback;
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

    private Long defaultTargetEntityId(EntityDefinition.Relation relation, String requestWorkspaceId) {
        if (relation == null) {
            return null;
        }
        if (relation.getTargetEntityId() != null) {
            return entityRelationService.resolveDirectEntityReference(relation.getTargetEntityId(), requestWorkspaceId);
        }
        return entityRelationService.resolveEntityReference(relation.getTargetRef(), requestWorkspaceId);
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
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
