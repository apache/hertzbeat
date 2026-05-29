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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.junit.jupiter.api.Test;

/**
 * Contract for HertzBeat-specific evidence block normalization in entity definitions.
 */
class EntityDefinitionHertzbeatNormalizationServiceTest {

    private final EntityDefinitionHertzbeatNormalizationService normalizationService =
            new EntityDefinitionHertzbeatNormalizationService();

    @Test
    void extractsOnlyDeclaredHertzBeatEvidenceBlocks() {
        EntityDefinition.Hertzbeat hertzbeat = normalizationService.extractDefinitionHertzbeat(Map.of(
                "codeLocations", List.of(
                        Map.of("repositoryUrl", "https://git/checkout", "paths", List.of("src", "src")),
                        Map.of("repositoryURL", "https://git/checkout-runbooks"),
                        Map.of("paths", "deploy"),
                        Map.of("label", "missing evidence")),
                "events", List.of(
                        Map.of("label", "deploys", "search", "event.kind:deploy"),
                        Map.of("name", "blank")),
                "logs", List.of(Map.of("name", "errors", "query", "level:error")),
                "performanceData", Map.of("tags", List.of("checkout", "api", "checkout")),
                "pipelines", Map.of("fingerprints", List.of("buildkite:canonical"))),
                List.of("buildkite:legacy"));

        assertEquals(3, hertzbeat.getCodeLocations().size());
        assertEquals("https://git/checkout", hertzbeat.getCodeLocations().getFirst().getRepositoryURL());
        assertEquals(List.of("src"), hertzbeat.getCodeLocations().getFirst().getPaths());
        assertEquals("https://git/checkout-runbooks", hertzbeat.getCodeLocations().get(1).getRepositoryURL());
        assertEquals(List.of("deploy"), hertzbeat.getCodeLocations().get(2).getPaths());
        assertEquals("deploys", hertzbeat.getEvents().getFirst().getName());
        assertEquals("event.kind:deploy", hertzbeat.getEvents().getFirst().getQuery());
        assertEquals("level:error", hertzbeat.getLogs().getFirst().getQuery());
        assertEquals(List.of("checkout", "api"), hertzbeat.getPerformanceData().getTags());
        assertEquals(List.of("buildkite:canonical"), hertzbeat.getPipelines().getFingerprints());
    }

    @Test
    void fallsBackToLegacyPipelineFingerprintsAndDropsEmptyBlocks() {
        EntityDefinition.Hertzbeat hertzbeat = normalizationService.extractDefinitionHertzbeat(
                Map.of("logs", List.of(Map.of("label", "missing-query"))),
                List.of("buildkite:checkout-main", "buildkite:checkout-main", " "));

        assertEquals(List.of("buildkite:checkout-main"), hertzbeat.getPipelines().getFingerprints());

        assertNull(normalizationService.extractDefinitionHertzbeat(Map.of(), null));
        assertNull(normalizationService.extractDefinitionHertzbeat(
                Map.of("performanceData", Map.of("tags", List.of(" "))),
                null));
    }

    @Test
    void attachesHertzBeatEvidenceEnvelopeFromRootAndSpecFallbacks() {
        EntityDefinition definition = new EntityDefinition();
        Map<String, Object> root = Map.of(
                "hertzbeat", Map.of("logs", List.of(Map.of("name", "errors", "query", "level:error"))),
                "ci-pipeline-fingerprints", List.of("buildkite:legacy"));
        Map<String, Object> specMap = Map.of(
                "hertzbeat", Map.of(
                        "logs", List.of(Map.of("name", "ignored", "query", "ignored:true")),
                        "pipelines", Map.of("fingerprints", List.of("buildkite:canonical"))));

        normalizationService.attachDefinitionHertzbeat(definition, root, specMap);

        assertEquals("level:error", definition.getHertzbeat().getLogs().getFirst().getQuery());
        assertEquals(List.of("buildkite:legacy"), definition.getHertzbeat().getPipelines().getFingerprints());
    }
}
