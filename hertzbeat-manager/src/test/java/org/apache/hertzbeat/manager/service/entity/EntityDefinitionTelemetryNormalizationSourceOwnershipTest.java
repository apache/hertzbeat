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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/**
 * Source contract that keeps entity definition telemetry extraction out of the broad normalizer.
 */
class EntityDefinitionTelemetryNormalizationSourceOwnershipTest {

    private static final Path ENTITY_DEFINITION_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionNormalizationService.java");
    private static final Path ENTITY_DEFINITION_TELEMETRY_NORMALIZATION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDefinitionTelemetryNormalizationService.java");

    @Test
    void definitionNormalizerDelegatesTelemetryIdentityAndMonitorBindExtraction() throws Exception {
        String normalizationSource = Files.readString(ENTITY_DEFINITION_NORMALIZATION_SERVICE);
        String telemetrySource = Files.readString(ENTITY_DEFINITION_TELEMETRY_NORMALIZATION_SERVICE);

        assertTrue(normalizationSource.contains(
                "private final EntityDefinitionTelemetryNormalizationService entityDefinitionTelemetryNormalizationService"),
                "Definition normalization should delegate telemetry extraction to a dedicated boundary");
        assertTrue(normalizationSource.contains(
                "entityDefinitionTelemetryNormalizationService.extractDefinitionTelemetry(telemetryMap)"));
        assertFalse(normalizationSource.contains("telemetryMap.get(\"identities\")"),
                "Telemetry identity key ownership should live in the telemetry boundary");
        assertFalse(normalizationSource.contains("telemetryMap.get(\"monitors\")"),
                "Telemetry monitor-bind key ownership should live in the telemetry boundary");
        assertFalse(normalizationSource.contains("new EntityDefinition.Telemetry()"),
                "Telemetry envelope assembly should live in the telemetry boundary");
        assertFalse(normalizationSource.contains("telemetry.setIdentities("),
                "Telemetry identity attachment should live in the telemetry boundary");
        assertFalse(normalizationSource.contains("telemetry.setMonitors("),
                "Telemetry monitor-bind attachment should live in the telemetry boundary");
        assertFalse(normalizationSource.contains("CollectionUtils.isEmpty(telemetry"),
                "Telemetry empty-evidence suppression should live in the telemetry boundary");

        assertFalse(normalizationSource.contains("private List<EntityDefinition.Identity> extractDefinitionIdentities("),
                "Identity telemetry extraction should live in the telemetry boundary");
        assertFalse(normalizationSource.contains("private List<EntityDefinition.MonitorBind> extractDefinitionMonitorBinds("),
                "Monitor-bind telemetry extraction should live in the telemetry boundary");
        assertFalse(normalizationSource.contains("BIND_ACTIVE"),
                "Telemetry bind defaults should live in the telemetry boundary");

        assertTrue(telemetrySource.contains("private static final String SOURCE_MANUAL = \"manual\""));
        assertTrue(telemetrySource.contains("private static final String BIND_ACTIVE = \"active\""));
        assertTrue(telemetrySource.contains("public EntityDefinition.Telemetry extractDefinitionTelemetry("));
        assertTrue(telemetrySource.contains("extractDefinitionIdentities(telemetryMap.get(\"identities\"))"));
        assertTrue(telemetrySource.contains("extractDefinitionMonitorBinds(telemetryMap.get(\"monitors\"))"));
        assertTrue(telemetrySource.contains("public List<EntityDefinition.Identity> extractDefinitionIdentities("));
        assertTrue(telemetrySource.contains("public List<EntityDefinition.MonitorBind> extractDefinitionMonitorBinds("));
        assertTrue(telemetrySource.contains("return null;"));
        assertTrue(telemetrySource.contains("identity.setType(defaultText("));
        assertTrue(telemetrySource.contains("bind.setMatchContext(toStringListMap("));
    }
}
