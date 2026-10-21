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
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Contract for definition document field fallback and object-map shaping.
 */
class EntityDefinitionDocumentFieldNormalizationServiceTest {

    private final EntityDefinitionDocumentFieldNormalizationService normalizationService =
            new EntityDefinitionDocumentFieldNormalizationService();

    @Test
    void toObjectMapNormalizesStringKeysAndDropsNullKeys() {
        Map<String, Object> spec = Map.of("type", "service");
        Map<Object, Object> rawMap = new LinkedHashMap<>();
        rawMap.put("spec", spec);
        rawMap.put(42, "answer");
        rawMap.put(null, "ignored");

        Map<String, Object> normalized = normalizationService.toObjectMap(rawMap);

        assertEquals(List.of("spec", "42"), new ArrayList<>(normalized.keySet()));
        assertSame(spec, normalized.get("spec"));
        assertEquals("answer", normalized.get("42"));
    }

    @Test
    void returnsEmptyMapForMissingOrNonObjectNodes() {
        assertTrue(normalizationService.toObjectMap(null).isEmpty());
        assertTrue(normalizationService.toObjectMap("not-an-object").isEmpty());
        assertTrue(normalizationService.toObjectMap(Map.of()).isEmpty());
    }

    @Test
    void firstNonNullKeepsExplicitBlankTextAndFalseValues() {
        assertEquals("", normalizationService.firstNonNull(null, "", "fallback"));
        assertEquals(false, normalizationService.firstNonNull(null, false, true));
        assertEquals(0, normalizationService.firstNonNull(null, 0, 1));
    }

    @Test
    void resolvesApiVersionAliasesWithTrimmedDefault() {
        assertEquals("hertzbeat/v2", normalizationService.resolveDefinitionApiVersion(
                Map.of("apiVersion", " hertzbeat/v2 "), "hertzbeat/v1"));
        assertEquals("schema-dash", normalizationService.resolveDefinitionApiVersion(
                Map.of("schema-version", " schema-dash "), "hertzbeat/v1"));
        assertEquals("schema-underscore", normalizationService.resolveDefinitionApiVersion(
                Map.of("schema_version", " schema-underscore "), "hertzbeat/v1"));
        assertEquals("hertzbeat/v1", normalizationService.resolveDefinitionApiVersion(
                Map.of("schema_version", " "), " hertzbeat/v1 "));
    }

    @Test
    void resolvesSpecAndTelemetryDocumentNodesWithObjectMapShaping() {
        Map<Object, Object> telemetry = new LinkedHashMap<>();
        telemetry.put("identities", List.of("service.name"));
        telemetry.put(42, "answer");
        telemetry.put(null, "ignored");
        Map<Object, Object> spec = new LinkedHashMap<>();
        spec.put("telemetry", telemetry);
        spec.put(7, "seven");
        spec.put(null, "ignored");

        Map<String, Object> specMap = normalizationService.resolveDefinitionSpecMap(Map.of("spec", spec));
        Map<String, Object> telemetryMap = normalizationService.resolveDefinitionTelemetryMap(specMap);

        assertEquals(List.of("telemetry", "7"), new ArrayList<>(specMap.keySet()));
        assertEquals("seven", specMap.get("7"));
        assertEquals(List.of("identities", "42"), new ArrayList<>(telemetryMap.keySet()));
        assertEquals("answer", telemetryMap.get("42"));
        assertTrue(normalizationService.resolveDefinitionSpecMap(Map.of("spec", "not-an-object")).isEmpty());
        assertTrue(normalizationService.resolveDefinitionTelemetryMap(Map.of("telemetry", "not-an-object")).isEmpty());
    }
}
