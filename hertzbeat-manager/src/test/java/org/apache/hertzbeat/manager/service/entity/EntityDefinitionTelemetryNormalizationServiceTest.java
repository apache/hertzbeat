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
 * Contract for telemetry identity and monitor-bind normalization in entity definitions.
 */
class EntityDefinitionTelemetryNormalizationServiceTest {

    private final EntityDefinitionTelemetryNormalizationService normalizationService =
            new EntityDefinitionTelemetryNormalizationService();

    @Test
    void extractsOnlyDeclaredTelemetryIdentitiesWithDefaults() {
        List<EntityDefinition.Identity> identities = normalizationService.extractDefinitionIdentities(List.of(
                Map.of("key", "service.name", "value", "checkout-api", "source", "otel",
                        "priority", "100", "primary", "true"),
                Map.of("key", "deployment.environment.name"),
                Map.of("value", "missing-key"),
                "not-a-row"
        ));

        assertEquals(1, identities.size());
        EntityDefinition.Identity identity = identities.getFirst();
        assertEquals("service.name", identity.getKey());
        assertEquals("checkout-api", identity.getValue());
        assertEquals("otel", identity.getType());
        assertEquals(100, identity.getPriority());
        assertEquals(true, identity.getPrimary());

        List<EntityDefinition.Identity> defaulted = normalizationService.extractDefinitionIdentities(List.of(
                Map.of("key", "host.name", "value", "i-01")
        ));
        assertEquals("manual", defaulted.getFirst().getType());
    }

    @Test
    void extractsMonitorBindsFromCanonicalAndLegacyIdsWithMatchContext() {
        List<EntityDefinition.MonitorBind> monitorBinds = normalizationService.extractDefinitionMonitorBinds(List.of(
                Map.of(
                        "id", "42",
                        "bindType", "identity",
                        "bindSource", "otel",
                        "score", "91",
                        "matchContext", Map.of(
                                "service.name", List.of("checkout-api"),
                                "deployment.environment.name", "prod")),
                Map.of("monitorId", 43L),
                Map.of("monitorId", "not-a-number"),
                "not-a-row"
        ));

        assertEquals(2, monitorBinds.size());
        EntityDefinition.MonitorBind first = monitorBinds.getFirst();
        assertEquals(42L, first.getMonitorId());
        assertEquals("identity", first.getBindType());
        assertEquals("otel", first.getBindSource());
        assertEquals("active", first.getStatus());
        assertEquals(91, first.getScore());
        assertEquals(List.of("checkout-api"), first.getMatchContext().get("service.name"));
        assertEquals(List.of("prod"), first.getMatchContext().get("deployment.environment.name"));

        EntityDefinition.MonitorBind defaulted = monitorBinds.get(1);
        assertEquals(43L, defaulted.getMonitorId());
        assertEquals("manual", defaulted.getBindType());
        assertEquals("manual", defaulted.getBindSource());
        assertEquals("active", defaulted.getStatus());
        assertEquals(Map.of(), defaulted.getMatchContext());
    }

    @Test
    void buildsTelemetryEnvelopeOnlyWhenDeclaredEvidenceExists() {
        EntityDefinition.Telemetry telemetry = normalizationService.extractDefinitionTelemetry(Map.of(
                "identities", List.of(Map.of("key", "service.name", "value", "checkout-api")),
                "monitors", List.of(Map.of("monitorId", 42L, "status", "candidate"))
        ));

        assertEquals("checkout-api", telemetry.getIdentities().getFirst().getValue());
        assertEquals(42L, telemetry.getMonitors().getFirst().getMonitorId());
        assertEquals("candidate", telemetry.getMonitors().getFirst().getStatus());

        assertNull(normalizationService.extractDefinitionTelemetry(Map.of()));
        assertNull(normalizationService.extractDefinitionTelemetry(Map.of(
                "identities", List.of(Map.of("key", "missing-value")),
                "monitors", "not-a-list"
        )));
        assertNull(normalizationService.extractDefinitionTelemetry(null));
    }
}
