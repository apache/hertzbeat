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
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Normalizes the metadata-facing portions of entity definition documents.
 */
@Service
public class EntityDefinitionMetadataNormalizationService {

    public EntityDefinition.Metadata extractDefinitionMetadata(Map<String, Object> root, Map<String, Object> specMap) {
        Map<String, Object> rootMap = root == null ? Collections.emptyMap() : root;
        Map<String, Object> metadataMap = toObjectMap(rootMap.get("metadata"));
        Map<String, Object> normalizedSpecMap = specMap == null ? Collections.emptyMap() : specMap;
        boolean useRootMetadataFallback = !metadataMap.containsKey("labels") && !metadataMap.containsKey("tags")
                && (rootMap.containsKey("labels") || rootMap.containsKey("tags"));

        EntityDefinition.Metadata metadata = new EntityDefinition.Metadata();
        metadata.setName(defaultText(
                asText(metadataMap.get("name")),
                asText(rootMap.get("dd-service")),
                asText(rootMap.get("dd_service")),
                asText(rootMap.get("name"))
        ));
        metadata.setNamespace(defaultText(asText(metadataMap.get("namespace")),
                asText(normalizedSpecMap.get("namespace")), asText(normalizedSpecMap.get("serviceNamespace")),
                asText(rootMap.get("namespace"))));
        metadata.setOwner(defaultText(asText(metadataMap.get("owner")),
                asText(metadataMap.get("team")),
                asText(normalizedSpecMap.get("owner")), asText(normalizedSpecMap.get("ownedBy")),
                asText(normalizedSpecMap.get("team")),
                asText(rootMap.get("team"))));
        metadata.setAdditionalOwners(extractDefinitionOwnerRefs(defaultText(
                metadataMap.containsKey("additionalOwners") ? "additionalOwners" : null,
                normalizedSpecMap.containsKey("additionalOwners") ? "additionalOwners" : null,
                normalizedSpecMap.containsKey("owners") ? "owners" : null
        ), metadataMap, normalizedSpecMap));
        metadata.setInheritFrom(defaultText(asText(metadataMap.get("inheritFrom")),
                asText(metadataMap.get("inherit_from")), asText(rootMap.get("inheritFrom")),
                asText(rootMap.get("inherit_from"))));
        metadata.setDisplayName(defaultText(asText(metadataMap.get("displayName")),
                asText(metadataMap.get("display_name")), asText(rootMap.get("displayName")),
                asText(rootMap.get("display_name"))));
        metadata.setDescription(defaultText(
                asText(metadataMap.get("description")),
                asText(normalizedSpecMap.get("description")),
                asText(rootMap.get("description"))
        ));
        metadata.setLabels(extractDefinitionLabels(useRootMetadataFallback ? rootMap : metadataMap));
        metadata.setTags(extractDefinitionTags(useRootMetadataFallback ? rootMap : metadataMap));
        metadata.setLinks(extractDefinitionLinks(defaultText(metadataMap.containsKey("links") ? "links" : null,
                normalizedSpecMap.containsKey("links") ? "links" : null,
                rootMap.containsKey("links") ? "links" : null), metadataMap, normalizedSpecMap, rootMap, null));
        metadata.setContacts(extractDefinitionContacts(defaultText(metadataMap.containsKey("contacts") ? "contacts" : null,
                normalizedSpecMap.containsKey("contacts") ? "contacts" : null,
                rootMap.containsKey("contacts") ? "contacts" : null), metadataMap, normalizedSpecMap, rootMap));
        return metadata;
    }

    public String extractDefinitionRunbook(Map<String, Object> root, Map<String, Object> specMap) {
        Map<String, Object> rootMap = root == null ? Collections.emptyMap() : root;
        Map<String, Object> normalizedSpecMap = specMap == null ? Collections.emptyMap() : specMap;
        Map<String, Object> metadataMap = toObjectMap(rootMap.get("metadata"));
        return defaultText(
                asText(normalizedSpecMap.get("runbook")),
                extractRunbook(normalizedSpecMap.get("links")),
                extractRunbook(metadataMap.get("links")),
                extractRunbook(rootMap.get("links")),
                asText(rootMap.get("runbook"))
        );
    }

    private Map<String, String> extractDefinitionLabels(Map<String, Object> metadataMap) {
        Map<String, String> labels = toStringMap(metadataMap.get("labels"));
        if (!labels.isEmpty()) {
            return labels;
        }
        Object tags = metadataMap.get("tags");
        if (!(tags instanceof List<?> tagList)) {
            return Collections.emptyMap();
        }
        Map<String, String> mappedLabels = new LinkedHashMap<>();
        for (Object tag : tagList) {
            String item = asText(tag);
            if (!StringUtils.hasText(item)) {
                continue;
            }
            int index = item.indexOf(':');
            if (index <= 0 || index >= item.length() - 1) {
                mappedLabels.put(item.trim(), "");
            } else {
                mappedLabels.put(item.substring(0, index).trim(), item.substring(index + 1).trim());
            }
        }
        return mappedLabels;
    }

    private List<String> extractDefinitionTags(Map<String, Object> metadataMap) {
        if (metadataMap == null || metadataMap.isEmpty()) {
            return Collections.emptyList();
        }
        Object tags = metadataMap.get("tags");
        if (tags instanceof List<?> tagList) {
            return tagList.stream()
                    .map(this::asText)
                    .filter(StringUtils::hasText)
                    .toList();
        }
        Map<String, String> labels = toStringMap(metadataMap.get("labels"));
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

    private String extractRunbook(Object links) {
        if (links instanceof Map<?, ?> mapLinks) {
            Object runbook = mapLinks.get("runbook");
            return asText(runbook);
        }
        if (!(links instanceof List<?> items)) {
            return null;
        }
        for (Object item : items) {
            Map<String, Object> link = toObjectMap(item);
            String name = asText(link.get("name"));
            String type = asText(link.get("type"));
            if ("runbook".equals(name) || "runbook".equals(type)) {
                return asText(link.get("url"));
            }
        }
        return null;
    }

    private List<EntityDefinition.Link> extractDefinitionLinks(String key, Map<String, Object> metadataMap,
                                                               Map<String, Object> specMap, Map<String, Object> rootMap,
                                                               String runbookUrl) {
        Object links = null;
        if (key != null) {
            if (metadataMap.containsKey(key)) {
                links = metadataMap.get(key);
            } else if (specMap.containsKey(key)) {
                links = specMap.get(key);
            } else if (rootMap.containsKey(key)) {
                links = rootMap.get(key);
            }
        }
        List<EntityDefinition.Link> result = new ArrayList<>();
        if (links instanceof Map<?, ?> linkMap) {
            for (Map.Entry<?, ?> entry : linkMap.entrySet()) {
                String linkName = entry.getKey() == null ? null : String.valueOf(entry.getKey());
                String url = asText(entry.getValue());
                if (!StringUtils.hasText(linkName) || !StringUtils.hasText(url)) {
                    continue;
                }
                EntityDefinition.Link item = new EntityDefinition.Link();
                item.setName(linkName.trim());
                item.setType("runbook".equalsIgnoreCase(linkName) ? "runbook" : "link");
                item.setUrl(url.trim());
                result.add(item);
            }
        } else if (links instanceof List<?> items) {
            for (Object itemValue : items) {
                Map<String, Object> linkMap = toObjectMap(itemValue);
                String url = defaultText(asText(linkMap.get("url")), asText(linkMap.get("href")));
                if (!StringUtils.hasText(url)) {
                    continue;
                }
                EntityDefinition.Link item = new EntityDefinition.Link();
                item.setName(defaultText(asText(linkMap.get("name")), asText(linkMap.get("label"))));
                item.setType(defaultText(asText(linkMap.get("type")), "link"));
                item.setProvider(asText(linkMap.get("provider")));
                item.setUrl(url.trim());
                result.add(item);
            }
        }
        if (StringUtils.hasText(runbookUrl)) {
            boolean hasRunbook = result.stream().anyMatch(link -> "runbook".equalsIgnoreCase(defaultText(link.getType(), link.getName())));
            if (!hasRunbook) {
                EntityDefinition.Link runbook = new EntityDefinition.Link();
                runbook.setName("runbook");
                runbook.setType("runbook");
                runbook.setUrl(runbookUrl.trim());
                result.add(0, runbook);
            }
        }
        return result;
    }

    private List<EntityDefinition.Contact> extractDefinitionContacts(String key, Map<String, Object> metadataMap,
                                                                     Map<String, Object> specMap, Map<String, Object> rootMap) {
        Object contacts = null;
        if (key != null) {
            if (metadataMap.containsKey(key)) {
                contacts = metadataMap.get(key);
            } else if (specMap.containsKey(key)) {
                contacts = specMap.get(key);
            } else if (rootMap.containsKey(key)) {
                contacts = rootMap.get(key);
            }
        }
        if (contacts instanceof Map<?, ?> contactMap) {
            List<EntityDefinition.Contact> result = new ArrayList<>();
            for (Map.Entry<?, ?> entry : contactMap.entrySet()) {
                String contactName = entry.getKey() == null ? null : String.valueOf(entry.getKey());
                String value = asText(entry.getValue());
                if (!StringUtils.hasText(contactName) || !StringUtils.hasText(value)) {
                    continue;
                }
                EntityDefinition.Contact item = new EntityDefinition.Contact();
                item.setName(contactName.trim());
                item.setType(contactName.trim());
                item.setValue(value.trim());
                item.setContact(value.trim());
                result.add(item);
            }
            return result;
        }
        if (!(contacts instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.Contact> result = new ArrayList<>();
        for (Object itemValue : items) {
            Map<String, Object> contactMap = toObjectMap(itemValue);
            String value = defaultText(
                    asText(contactMap.get("value")),
                    asText(contactMap.get("contact")),
                    asText(contactMap.get("url"))
            );
            if (!StringUtils.hasText(value)) {
                continue;
            }
            EntityDefinition.Contact item = new EntityDefinition.Contact();
            item.setName(defaultText(asText(contactMap.get("name")), asText(contactMap.get("label"))));
            item.setType(defaultText(asText(contactMap.get("type")), "contact"));
            item.setValue(value.trim());
            item.setContact(value.trim());
            result.add(item);
        }
        return result;
    }

    private List<EntityDefinition.OwnerRef> extractDefinitionOwnerRefs(String ownerKey, Map<String, Object> metadataMap,
                                                                       Map<String, Object> specMap) {
        Object ownerValue = ownerKey == null ? null : (metadataMap.containsKey(ownerKey) ? metadataMap.get(ownerKey) : specMap.get(ownerKey));
        if (!(ownerValue instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.OwnerRef> result = new ArrayList<>();
        Set<String> dedupe = new LinkedHashSet<>();
        for (Object item : items) {
            if (item instanceof String value) {
                String name = value.trim();
                if (dedupe.add(name + "|team")) {
                    EntityDefinition.OwnerRef owner = new EntityDefinition.OwnerRef();
                    owner.setName(name);
                    owner.setType("team");
                    result.add(owner);
                }
                continue;
            }
            Map<String, Object> ownerMap = toObjectMap(item);
            String name = defaultText(asText(ownerMap.get("name")), asText(ownerMap.get("team")), asText(ownerMap.get("value")));
            if (name != null) {
                String type = defaultText(asText(ownerMap.get("type")), "team");
                if (dedupe.add(name.trim() + "|" + type.trim())) {
                    EntityDefinition.OwnerRef owner = new EntityDefinition.OwnerRef();
                    owner.setName(name.trim());
                    owner.setType(type.trim());
                    result.add(owner);
                }
            }
        }
        return result;
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
