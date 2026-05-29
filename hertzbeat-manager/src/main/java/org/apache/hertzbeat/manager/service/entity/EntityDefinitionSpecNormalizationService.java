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
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Normalizes the spec profile portion of entity definition documents.
 */
@Service
public class EntityDefinitionSpecNormalizationService {

    private static final String SOURCE_MANUAL = "manual";

    public EntityDefinition.Spec extractDefinitionSpec(Map<String, Object> root, Map<String, Object> specMap,
                                                       EntityDefinition.Metadata metadata, String resolvedSubtype,
                                                       String runbook) {
        Map<String, Object> rootMap = root == null ? Collections.emptyMap() : root;
        Map<String, Object> normalizedSpecMap = specMap == null ? Collections.emptyMap() : specMap;
        EntityDefinition.Metadata safeMetadata = metadata == null ? new EntityDefinition.Metadata() : metadata;

        EntityDefinition.Spec spec = new EntityDefinition.Spec();
        spec.setType(resolvedSubtype);
        spec.setSource(defaultText(asText(normalizedSpecMap.get("source")), SOURCE_MANUAL));
        spec.setOwner(defaultText(asText(normalizedSpecMap.get("owner")),
                asText(normalizedSpecMap.get("ownedBy")),
                asText(normalizedSpecMap.get("team")),
                safeMetadata.getOwner(),
                asText(rootMap.get("team"))));
        spec.setOwnedBy(defaultText(asText(normalizedSpecMap.get("ownedBy")),
                asText(normalizedSpecMap.get("owner")),
                asText(normalizedSpecMap.get("team")),
                safeMetadata.getOwner(),
                asText(rootMap.get("team"))));
        spec.setNamespace(defaultText(safeMetadata.getNamespace(),
                asText(normalizedSpecMap.get("namespace")),
                asText(normalizedSpecMap.get("serviceNamespace")),
                asText(rootMap.get("namespace"))));
        spec.setEnvironment(defaultText(asText(normalizedSpecMap.get("environment")),
                asText(normalizedSpecMap.get("deploymentEnvironment")),
                asText(rootMap.get("environment")),
                asText(rootMap.get("env"))));
        spec.setCriticality(defaultText(asText(normalizedSpecMap.get("criticality")), asText(rootMap.get("criticality"))));
        spec.setRunbook(runbook);
        spec.setLifecycle(defaultText(asText(normalizedSpecMap.get("lifecycle")), asText(rootMap.get("lifecycle"))));
        spec.setTier(defaultText(asText(normalizedSpecMap.get("tier")), asText(rootMap.get("tier"))));

        List<String> components = defaultList(extractDefinitionStringList("components", normalizedSpecMap),
                extractDefinitionStringList("components", rootMap));
        List<String> componentOf = defaultList(extractDefinitionStringList("componentOf", normalizedSpecMap),
                extractDefinitionStringList("componentOf", rootMap));
        String explicitSpecSystem = defaultText(
                asText(normalizedSpecMap.get("partOf")),
                asText(normalizedSpecMap.get("system")),
                asText(normalizedSpecMap.get("systemName")),
                asText(normalizedSpecMap.get("system_name"))
        );
        String rootSystem = defaultText(
                asText(rootMap.get("partOf")),
                asText(rootMap.get("system")),
                asText(rootMap.get("systemName")),
                asText(rootMap.get("system_name")),
                asText(rootMap.get("application"))
        );
        boolean deriveSystemFromLegacyComponentOf = !StringUtils.hasText(explicitSpecSystem) && componentOf.size() > 1;
        String system = defaultText(explicitSpecSystem, deriveSystemFromLegacyComponentOf ? componentOf.getFirst() : null,
                rootSystem);
        if (deriveSystemFromLegacyComponentOf) {
            componentOf = new ArrayList<>(componentOf.subList(1, componentOf.size()));
        }
        spec.setSystem(system);
        spec.setPartOf(system);
        spec.setComponentOf(componentOf);
        spec.setComponents(components);
        spec.setImplementedBy(defaultList(extractDefinitionStringList("implementedBy", normalizedSpecMap),
                extractDefinitionStringList("implementedBy", rootMap)));
        spec.setApiInterface(extractDefinitionApiInterface(firstNonNull(
                normalizedSpecMap.get("interface"), rootMap.get("interface"))));
        spec.setLanguages(defaultList(extractDefinitionStringList("languages", normalizedSpecMap),
                extractDefinitionStringList("languages", rootMap)));
        return spec;
    }

    private EntityDefinition.ApiInterface extractDefinitionApiInterface(Object value) {
        Map<String, Object> interfaceMap = toObjectMap(value);
        if (interfaceMap.isEmpty()) {
            return null;
        }
        EntityDefinition.ApiInterface apiInterface = new EntityDefinition.ApiInterface();
        Object definition = firstNonNull(interfaceMap.get("definition"), interfaceMap.get("schema"));
        if (definition != null) {
            apiInterface.setDefinition(definition);
        }
        apiInterface.setFileRef(defaultText(
                asText(interfaceMap.get("fileRef")),
                asText(interfaceMap.get("fileref")),
                asText(interfaceMap.get("file_ref"))
        ));
        if (apiInterface.getDefinition() == null && !StringUtils.hasText(apiInterface.getFileRef())) {
            return null;
        }
        return apiInterface;
    }

    private List<String> extractDefinitionStringList(String key, Map<String, Object> source) {
        if (!StringUtils.hasText(key) || source == null || source.isEmpty()) {
            return Collections.emptyList();
        }
        Object rawValue = source.get(key);
        if (rawValue instanceof List<?> items) {
            return items.stream()
                    .map(this::asText)
                    .filter(StringUtils::hasText)
                    .map(String::trim)
                    .distinct()
                    .toList();
        }
        String value = asText(rawValue);
        if (StringUtils.hasText(value)) {
            return List.of(value.trim());
        }
        return Collections.emptyList();
    }

    private <T> List<T> defaultList(List<T> primary, List<T> fallback) {
        if (!CollectionUtils.isEmpty(primary)) {
            return primary;
        }
        return CollectionUtils.isEmpty(fallback) ? Collections.emptyList() : fallback;
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

    private String asText(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value);
        return StringUtils.hasText(text) ? text.trim() : null;
    }

    private Object firstNonNull(Object... values) {
        if (values == null) {
            return null;
        }
        for (Object value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
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
