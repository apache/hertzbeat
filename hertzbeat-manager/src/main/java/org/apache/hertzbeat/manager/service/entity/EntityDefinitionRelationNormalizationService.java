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
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Normalizes relation and dependency evidence declared by entity definitions.
 */
@Service
public class EntityDefinitionRelationNormalizationService {

    private static final String SOURCE_MANUAL = "manual";
    private static final String RELATION_CONFIRMED = "confirmed";

    private final EntityRelationService entityRelationService;

    public EntityDefinitionRelationNormalizationService(EntityRelationService entityRelationService) {
        this.entityRelationService = entityRelationService;
    }

    public void attachDefinitionRelations(EntityDefinition.Spec spec, Map<String, Object> specMap) {
        if (spec == null) {
            return;
        }
        Map<String, Object> relationSpecMap = specMap == null ? Collections.emptyMap() : specMap;
        List<EntityDefinition.Relation> relations = mergeDefinitionRelations(
                extractDefinitionRelations(
                        defaultText(
                                relationSpecMap.containsKey("relations") ? "relations" : null,
                                relationSpecMap.containsKey("dependencies") ? "dependencies" : null),
                        relationSpecMap),
                extractDefinitionDependsOn(relationSpecMap.get("dependsOn"))
        );
        spec.setRelations(relations);
        spec.setDependsOn(extractRelationReferences(relations));
    }

    public List<EntityDefinition.Relation> extractDefinitionRelations(String relationKey, Map<String, Object> specMap) {
        Object relationValue = relationKey == null ? null : specMap.get(relationKey);
        if (!(relationValue instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.Relation> result = new ArrayList<>();
        for (Object item : items) {
            Map<String, Object> relationMap = toObjectMap(item);
            Long targetEntityId = asLong(defaultText(relationMap.containsKey("targetEntityId") ? "targetEntityId" : null,
                    relationMap.containsKey("target") ? "target" : null), relationMap);
            String targetRef = defaultText(asText(relationMap.get("targetRef")), asText(relationMap.get("ref")));
            if (targetEntityId == null && !StringUtils.hasText(targetRef)) {
                continue;
            }
            EntityDefinition.Relation relation = new EntityDefinition.Relation();
            relation.setTargetEntityId(targetEntityId);
            relation.setTargetRef(targetRef);
            relation.setRelationType(defaultText(asText(relationMap.get("relationType")), "depends_on"));
            relation.setRelationSource(defaultText(asText(relationMap.get("relationSource")), SOURCE_MANUAL));
            relation.setStatus(defaultText(asText(relationMap.get("status")), RELATION_CONFIRMED));
            relation.setScore(asInteger(relationMap.get("score")));
            relation.setDescription(asText(relationMap.get("description")));
            relation.setAttributes(toStringMap(relationMap.get("attributes")));
            result.add(relation);
        }
        return result;
    }

    public List<EntityDefinition.Relation> extractDefinitionDependsOn(Object dependsOnValue) {
        if (!(dependsOnValue instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.Relation> result = new ArrayList<>();
        for (Object item : items) {
            EntityDefinition.Relation relation = new EntityDefinition.Relation();
            if (item instanceof String text) {
                relation.setTargetRef(asText(text));
            } else {
                Map<String, Object> dependencyMap = toObjectMap(item);
                relation.setTargetRef(defaultText(asText(dependencyMap.get("ref")),
                        asText(dependencyMap.get("entity")), asText(dependencyMap.get("entityRef"))));
                relation.setTargetEntityId(asLong(defaultText(
                        dependencyMap.containsKey("targetEntityId") ? "targetEntityId" : null,
                        dependencyMap.containsKey("id") ? "id" : null
                ), dependencyMap));
            }
            if (relation.getTargetEntityId() == null && !StringUtils.hasText(relation.getTargetRef())) {
                continue;
            }
            relation.setRelationType("depends_on");
            relation.setRelationSource(SOURCE_MANUAL);
            relation.setStatus(RELATION_CONFIRMED);
            relation.setScore(100);
            result.add(relation);
        }
        return result;
    }

    public List<EntityDefinition.Relation> mergeDefinitionRelations(List<EntityDefinition.Relation> primary,
                                                                    List<EntityDefinition.Relation> additional) {
        if (CollectionUtils.isEmpty(primary)) {
            return CollectionUtils.isEmpty(additional) ? Collections.emptyList() : additional;
        }
        if (CollectionUtils.isEmpty(additional)) {
            return primary;
        }
        List<EntityDefinition.Relation> result = new ArrayList<>(primary);
        Set<String> seen = primary.stream().map(this::relationSignature).collect(Collectors.toCollection(LinkedHashSet::new));
        for (EntityDefinition.Relation relation : additional) {
            String signature = relationSignature(relation);
            if (seen.add(signature)) {
                result.add(relation);
            }
        }
        return result;
    }

    public List<String> extractRelationReferences(List<EntityDefinition.Relation> relations) {
        if (CollectionUtils.isEmpty(relations)) {
            return Collections.emptyList();
        }
        return relations.stream()
                .map(relation -> defaultText(relation.getTargetRef(), buildEntityReference(relation.getTargetEntityId())))
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
    }

    private String relationSignature(EntityDefinition.Relation relation) {
        String targetReference = defaultText(
                relation.getTargetRef(),
                buildEntityReference(relation.getTargetEntityId()),
                relation.getTargetEntityId() == null ? "" : String.valueOf(relation.getTargetEntityId()));
        return String.join("|",
                defaultText(relation.getRelationType(), "depends_on"),
                targetReference.trim().toLowerCase(java.util.Locale.ROOT));
    }

    private String buildEntityReference(Long entityId) {
        if (entityId == null || entityRelationService == null) {
            return null;
        }
        return entityRelationService.buildEntityReference(entityId);
    }

    private Map<String, Object> toObjectMap(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            return Collections.emptyMap();
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
            if (entry.getKey() != null) {
                result.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }
        return result;
    }

    private Map<String, String> toStringMap(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            return Collections.emptyMap();
        }
        Map<String, String> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
            String key = entry.getKey() == null ? null : String.valueOf(entry.getKey());
            String itemValue = entry.getValue() == null ? null : String.valueOf(entry.getValue());
            if (StringUtils.hasText(key) && itemValue != null) {
                result.put(key, itemValue);
            }
        }
        return result;
    }

    private String asText(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value);
        return StringUtils.hasText(text) ? text.trim() : null;
    }

    private Integer asInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Long asLong(String key, Map<String, Object> source) {
        if (!StringUtils.hasText(key)) {
            return null;
        }
        return asLong(source.get(key));
    }

    private Long asLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String defaultText(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }
}
