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
 * Normalizes HertzBeat-specific evidence blocks inside entity definition documents.
 */
@Service
public class EntityDefinitionHertzbeatNormalizationService {

    private static final String LEGACY_CI_PIPELINE_FINGERPRINTS = "ci-pipeline-fingerprints";

    public void attachDefinitionHertzbeat(EntityDefinition definition, Map<String, Object> root, Map<String, Object> specMap) {
        if (definition == null) {
            return;
        }
        Map<String, Object> rootMap = root == null ? Collections.emptyMap() : root;
        Map<String, Object> evidenceSpecMap = specMap == null ? Collections.emptyMap() : specMap;
        definition.setHertzbeat(extractDefinitionHertzbeat(firstNonNull(
                rootMap.get("hertzbeat"), evidenceSpecMap.get("hertzbeat")),
                rootMap.get(LEGACY_CI_PIPELINE_FINGERPRINTS)));
    }

    public EntityDefinition.Hertzbeat extractDefinitionHertzbeat(Object value, Object legacyPipelineFingerprints) {
        Map<String, Object> hertzbeatMap = toObjectMap(value);
        EntityDefinition.Hertzbeat hertzbeat = new EntityDefinition.Hertzbeat();
        if (!hertzbeatMap.isEmpty()) {
            hertzbeat.setCodeLocations(extractDefinitionCodeLocations(hertzbeatMap.get("codeLocations")));
            hertzbeat.setEvents(extractDefinitionSavedQueries(hertzbeatMap.get("events")));
            hertzbeat.setLogs(extractDefinitionSavedQueries(hertzbeatMap.get("logs")));
            hertzbeat.setPerformanceData(extractDefinitionPerformanceData(hertzbeatMap.get("performanceData")));
            hertzbeat.setPipelines(extractDefinitionPipelines(hertzbeatMap.get("pipelines")));
        }
        if (hertzbeat.getPipelines() == null
                || CollectionUtils.isEmpty(hertzbeat.getPipelines().getFingerprints())) {
            EntityDefinition.Pipelines pipelines = extractLegacyPipelineFingerprints(legacyPipelineFingerprints);
            if (pipelines != null) {
                hertzbeat.setPipelines(pipelines);
            }
        }
        return hasHertzbeatContent(hertzbeat) ? hertzbeat : null;
    }

    private Object firstNonNull(Object primary, Object fallback) {
        return primary != null ? primary : fallback;
    }

    private EntityDefinition.Pipelines extractLegacyPipelineFingerprints(Object legacyPipelineFingerprints) {
        if (legacyPipelineFingerprints == null) {
            return null;
        }
        Map<String, Object> pipelinesMap = new LinkedHashMap<>();
        pipelinesMap.put("fingerprints", legacyPipelineFingerprints);
        pipelinesMap.put("legacyKey", LEGACY_CI_PIPELINE_FINGERPRINTS);
        return extractDefinitionPipelines(pipelinesMap);
    }

    private List<EntityDefinition.CodeLocation> extractDefinitionCodeLocations(Object value) {
        if (!(value instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.CodeLocation> results = new ArrayList<>();
        for (Object item : items) {
            Map<String, Object> codeLocationMap = toObjectMap(item);
            String repositoryUrl = defaultText(asText(codeLocationMap.get("repositoryURL")), asText(codeLocationMap.get("repositoryUrl")));
            List<String> paths = extractDefinitionStringList("paths", codeLocationMap);
            if (!StringUtils.hasText(repositoryUrl) && CollectionUtils.isEmpty(paths)) {
                continue;
            }
            EntityDefinition.CodeLocation codeLocation = new EntityDefinition.CodeLocation();
            codeLocation.setRepositoryURL(trimToNull(repositoryUrl));
            codeLocation.setPaths(paths);
            results.add(codeLocation);
        }
        return results;
    }

    private List<EntityDefinition.SavedQuery> extractDefinitionSavedQueries(Object value) {
        if (!(value instanceof List<?> items)) {
            return Collections.emptyList();
        }
        List<EntityDefinition.SavedQuery> results = new ArrayList<>();
        for (Object item : items) {
            Map<String, Object> queryMap = toObjectMap(item);
            String query = defaultText(asText(queryMap.get("query")), asText(queryMap.get("search")));
            if (!StringUtils.hasText(query)) {
                continue;
            }
            EntityDefinition.SavedQuery savedQuery = new EntityDefinition.SavedQuery();
            savedQuery.setName(defaultText(asText(queryMap.get("name")), asText(queryMap.get("label"))));
            savedQuery.setQuery(query.trim());
            results.add(savedQuery);
        }
        return results;
    }

    private EntityDefinition.PerformanceData extractDefinitionPerformanceData(Object value) {
        Map<String, Object> performanceMap = toObjectMap(value);
        if (performanceMap.isEmpty()) {
            return null;
        }
        List<String> tags = extractDefinitionStringList("tags", performanceMap);
        if (CollectionUtils.isEmpty(tags)) {
            return null;
        }
        EntityDefinition.PerformanceData performanceData = new EntityDefinition.PerformanceData();
        performanceData.setTags(tags);
        return performanceData;
    }

    private EntityDefinition.Pipelines extractDefinitionPipelines(Object value) {
        Map<String, Object> pipelinesMap = toObjectMap(value);
        if (pipelinesMap.isEmpty()) {
            return null;
        }
        List<String> fingerprints = extractDefinitionStringList("fingerprints", pipelinesMap);
        if (CollectionUtils.isEmpty(fingerprints)) {
            return null;
        }
        EntityDefinition.Pipelines pipelines = new EntityDefinition.Pipelines();
        pipelines.setFingerprints(fingerprints);
        return pipelines;
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

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
