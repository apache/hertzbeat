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

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * Renders canonical entity definition documents.
 */
@Service
public class EntityDefinitionDocumentRendererService {

    private static final String FORMAT_JSON = "json";
    private static final ObjectMapper PRETTY_JSON_MAPPER = JsonMapper.builder().build();

    public String renderDefinition(EntityDefinition definition, String format) {
        String normalizedFormat = normalizeDefinitionFormat(format);
        if (FORMAT_JSON.equals(normalizedFormat)) {
            try {
                return PRETTY_JSON_MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(toDefinitionMap(definition));
            } catch (Exception e) {
                throw new IllegalArgumentException("Fail to render entity definition json.", e);
            }
        }
        DumperOptions dumperOptions = new DumperOptions();
        dumperOptions.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
        dumperOptions.setPrettyFlow(true);
        dumperOptions.setIndent(2);
        dumperOptions.setIndicatorIndent(1);
        dumperOptions.setDefaultScalarStyle(DumperOptions.ScalarStyle.PLAIN);
        return new Yaml(dumperOptions).dumpAsMap(toDefinitionMap(definition));
    }

    private String normalizeDefinitionFormat(String format) {
        if (FORMAT_JSON.equalsIgnoreCase(defaultText(format, ""))) {
            return FORMAT_JSON;
        }
        return "yaml";
    }

    private Map<String, Object> toDefinitionMap(EntityDefinition definition) {
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("apiVersion", definition.getApiVersion());
        root.put("kind", definition.getKind());

        Map<String, Object> metadata = new LinkedHashMap<>();
        if (definition.getMetadata() != null) {
            putIfPresent(metadata, "name", definition.getMetadata().getName());
            putIfPresent(metadata, "namespace", definition.getMetadata().getNamespace());
            putIfPresent(metadata, "owner", definition.getMetadata().getOwner());
            if (!CollectionUtils.isEmpty(definition.getMetadata().getAdditionalOwners())) {
                metadata.put("additionalOwners", definition.getMetadata().getAdditionalOwners().stream().map(owner -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    putIfPresent(item, "name", owner.getName());
                    putIfPresent(item, "type", owner.getType());
                    return item;
                }).toList());
            }
            putIfPresent(metadata, "inheritFrom", definition.getMetadata().getInheritFrom());
            putIfPresent(metadata, "displayName", definition.getMetadata().getDisplayName());
            putIfPresent(metadata, "description", definition.getMetadata().getDescription());
            if (!CollectionUtils.isEmpty(definition.getMetadata().getTags())) {
                metadata.put("tags", definition.getMetadata().getTags());
            }
            if (!CollectionUtils.isEmpty(definition.getMetadata().getLabels())) {
                metadata.put("labels", definition.getMetadata().getLabels());
            }
            if (!CollectionUtils.isEmpty(definition.getMetadata().getLinks())) {
                metadata.put("links", definition.getMetadata().getLinks().stream().map(link -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    putIfPresent(item, "name", link.getName());
                    putIfPresent(item, "type", link.getType());
                    putIfPresent(item, "provider", link.getProvider());
                    putIfPresent(item, "url", link.getUrl());
                    return item;
                }).toList());
            }
            if (!CollectionUtils.isEmpty(definition.getMetadata().getContacts())) {
                metadata.put("contacts", definition.getMetadata().getContacts().stream().map(contact -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    putIfPresent(item, "name", contact.getName());
                    putIfPresent(item, "type", contact.getType());
                    putIfPresent(item, "contact", defaultText(contact.getContact(), contact.getValue()));
                    return item;
                }).toList());
            }
        }
        root.put("metadata", metadata);

        Map<String, Object> spec = new LinkedHashMap<>();
        if (definition.getSpec() != null) {
            putIfPresent(spec, "type", definition.getSpec().getType());
            putIfPresent(spec, "source", definition.getSpec().getSource());
            putIfPresent(spec, "ownedBy", definition.getSpec().getOwnedBy());
            putIfPresent(spec, "environment", definition.getSpec().getEnvironment());
            putIfPresent(spec, "criticality", definition.getSpec().getCriticality());
            putIfPresent(spec, "runbook", definition.getSpec().getRunbook());
            putIfPresent(spec, "lifecycle", definition.getSpec().getLifecycle());
            putIfPresent(spec, "tier", definition.getSpec().getTier());
            putIfPresent(spec, "partOf", defaultText(definition.getSpec().getPartOf(), definition.getSpec().getSystem()));
            if (!CollectionUtils.isEmpty(definition.getSpec().getComponentOf())) {
                spec.put("componentOf", definition.getSpec().getComponentOf());
            }
            if (!CollectionUtils.isEmpty(definition.getSpec().getComponents())) {
                spec.put("components", definition.getSpec().getComponents());
            }
            if (!CollectionUtils.isEmpty(definition.getSpec().getImplementedBy())) {
                spec.put("implementedBy", definition.getSpec().getImplementedBy());
            }
            if (definition.getSpec().getApiInterface() != null) {
                Map<String, Object> apiInterface = new LinkedHashMap<>();
                if (definition.getSpec().getApiInterface().getDefinition() != null) {
                    apiInterface.put("definition", definition.getSpec().getApiInterface().getDefinition());
                }
                putIfPresent(apiInterface, "fileRef", definition.getSpec().getApiInterface().getFileRef());
                if (!apiInterface.isEmpty()) {
                    spec.put("interface", apiInterface);
                }
            }
            if (!CollectionUtils.isEmpty(definition.getSpec().getLanguages())) {
                spec.put("languages", definition.getSpec().getLanguages());
            }
            putTelemetryIfPresent(spec, definition.getSpec().getTelemetry());
            if (!CollectionUtils.isEmpty(definition.getSpec().getRelations())) {
                if (!CollectionUtils.isEmpty(definition.getSpec().getDependsOn())) {
                    spec.put("dependsOn", definition.getSpec().getDependsOn());
                }
                spec.put("relations", definition.getSpec().getRelations().stream().map(relation -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    if (relation.getTargetEntityId() != null) {
                        item.put("targetEntityId", relation.getTargetEntityId());
                    }
                    putIfPresent(item, "targetRef", relation.getTargetRef());
                    putIfPresent(item, "relationType", relation.getRelationType());
                    putIfPresent(item, "relationSource", relation.getRelationSource());
                    putIfPresent(item, "status", relation.getStatus());
                    if (relation.getScore() != null) {
                        item.put("score", relation.getScore());
                    }
                    putIfPresent(item, "description", relation.getDescription());
                    if (!CollectionUtils.isEmpty(relation.getAttributes())) {
                        item.put("attributes", relation.getAttributes());
                    }
                    return item;
                }).toList());
            }
        }
        root.put("spec", spec);
        if (!CollectionUtils.isEmpty(definition.getIntegrations())) {
            root.put("integrations", definition.getIntegrations());
        }
        if (!CollectionUtils.isEmpty(definition.getExtensions())) {
            root.put("extensions", definition.getExtensions());
        }
        Map<String, Object> hertzbeat = toDefinitionHertzbeatMap(definition.getHertzbeat());
        if (!hertzbeat.isEmpty()) {
            root.put("hertzbeat", hertzbeat);
        }
        return root;
    }

    private void putTelemetryIfPresent(Map<String, Object> spec, EntityDefinition.Telemetry telemetryDefinition) {
        if (telemetryDefinition == null) {
            return;
        }
        Map<String, Object> telemetry = new LinkedHashMap<>();
        if (!CollectionUtils.isEmpty(telemetryDefinition.getIdentities())) {
            telemetry.put("identities", telemetryDefinition.getIdentities().stream().map(identity -> {
                Map<String, Object> item = new LinkedHashMap<>();
                putIfPresent(item, "key", identity.getKey());
                putIfPresent(item, "value", identity.getValue());
                putIfPresent(item, "type", identity.getType());
                if (identity.getPriority() != null) {
                    item.put("priority", identity.getPriority());
                }
                if (identity.getPrimary() != null) {
                    item.put("primary", identity.getPrimary());
                }
                return item;
            }).toList());
        }
        if (!CollectionUtils.isEmpty(telemetryDefinition.getMonitors())) {
            telemetry.put("monitors", telemetryDefinition.getMonitors().stream().map(bind -> {
                Map<String, Object> item = new LinkedHashMap<>();
                if (bind.getMonitorId() != null) {
                    item.put("monitorId", bind.getMonitorId());
                }
                putIfPresent(item, "bindType", bind.getBindType());
                putIfPresent(item, "bindSource", bind.getBindSource());
                putIfPresent(item, "status", bind.getStatus());
                if (bind.getScore() != null) {
                    item.put("score", bind.getScore());
                }
                if (!CollectionUtils.isEmpty(bind.getMatchContext())) {
                    item.put("matchContext", bind.getMatchContext());
                }
                return item;
            }).toList());
        }
        if (!telemetry.isEmpty()) {
            spec.put("telemetry", telemetry);
        }
    }

    private Map<String, Object> toDefinitionHertzbeatMap(EntityDefinition.Hertzbeat hertzbeat) {
        if (!hasHertzbeatContent(hertzbeat)) {
            return Collections.emptyMap();
        }
        Map<String, Object> result = new LinkedHashMap<>();
        if (!CollectionUtils.isEmpty(hertzbeat.getCodeLocations())) {
            result.put("codeLocations", hertzbeat.getCodeLocations().stream().map(codeLocation -> {
                Map<String, Object> item = new LinkedHashMap<>();
                putIfPresent(item, "repositoryURL", codeLocation.getRepositoryURL());
                if (!CollectionUtils.isEmpty(codeLocation.getPaths())) {
                    item.put("paths", codeLocation.getPaths());
                }
                return item;
            }).toList());
        }
        if (!CollectionUtils.isEmpty(hertzbeat.getEvents())) {
            result.put("events", hertzbeat.getEvents().stream().map(query -> {
                Map<String, Object> item = new LinkedHashMap<>();
                putIfPresent(item, "name", query.getName());
                putIfPresent(item, "query", query.getQuery());
                return item;
            }).toList());
        }
        if (!CollectionUtils.isEmpty(hertzbeat.getLogs())) {
            result.put("logs", hertzbeat.getLogs().stream().map(query -> {
                Map<String, Object> item = new LinkedHashMap<>();
                putIfPresent(item, "name", query.getName());
                putIfPresent(item, "query", query.getQuery());
                return item;
            }).toList());
        }
        if (hertzbeat.getPerformanceData() != null && !CollectionUtils.isEmpty(hertzbeat.getPerformanceData().getTags())) {
            Map<String, Object> performanceData = new LinkedHashMap<>();
            performanceData.put("tags", hertzbeat.getPerformanceData().getTags());
            result.put("performanceData", performanceData);
        }
        if (hertzbeat.getPipelines() != null && !CollectionUtils.isEmpty(hertzbeat.getPipelines().getFingerprints())) {
            Map<String, Object> pipelines = new LinkedHashMap<>();
            pipelines.put("fingerprints", hertzbeat.getPipelines().getFingerprints());
            result.put("pipelines", pipelines);
        }
        return result;
    }

    private boolean hasHertzbeatContent(EntityDefinition.Hertzbeat hertzbeat) {
        if (hertzbeat == null) {
            return false;
        }
        return !CollectionUtils.isEmpty(hertzbeat.getCodeLocations())
                || !CollectionUtils.isEmpty(hertzbeat.getEvents())
                || !CollectionUtils.isEmpty(hertzbeat.getLogs())
                || (hertzbeat.getPerformanceData() != null && !CollectionUtils.isEmpty(hertzbeat.getPerformanceData().getTags()))
                || (hertzbeat.getPipelines() != null && !CollectionUtils.isEmpty(hertzbeat.getPipelines().getFingerprints()));
    }

    private void putIfPresent(Map<String, Object> target, String key, Object value) {
        if (value instanceof String stringValue) {
            if (StringUtils.hasText(stringValue)) {
                target.put(key, stringValue);
            }
            return;
        }
        if (value != null) {
            target.put(key, value);
        }
    }

    private String defaultText(String... values) {
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return "";
    }
}
