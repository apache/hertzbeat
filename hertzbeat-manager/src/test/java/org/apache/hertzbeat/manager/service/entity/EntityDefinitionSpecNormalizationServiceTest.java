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

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.junit.jupiter.api.Test;

/**
 * Contract for definition spec profile normalization.
 */
class EntityDefinitionSpecNormalizationServiceTest {

    private final EntityDefinitionSpecNormalizationService normalizationService =
            new EntityDefinitionSpecNormalizationService();

    @Test
    void extractsSpecAliasesAndLegacyComponentSystemFallback() {
        EntityDefinition.Metadata metadata = new EntityDefinition.Metadata();
        metadata.setNamespace("commerce");
        metadata.setOwner("payments");
        Map<String, Object> root = Map.of(
                "team", "fallback-team",
                "env", "root-env",
                "system", "root-system",
                "components", List.of("root-component"),
                "implementedBy", "fallback-runtime",
                "interface", Map.of("schema", Map.of("openapi", "3.1.0"), "file_ref", "schemas/root.yaml"),
                "languages", "go");
        Map<String, Object> specMap = Map.of(
                "environment", "prod",
                "criticality", "high",
                "lifecycle", "production",
                "tier", "edge",
                "componentOf", List.of("checkout-platform", "payments-domain"),
                "components", List.of("api", "api", "worker"),
                "implementedBy", List.of("java", "spring"),
                "interface", Map.of("definition", Map.of("openapi", "3.0.3"), "fileRef", "schemas/checkout.yaml"),
                "languages", List.of("java", "typescript"));

        EntityDefinition.Spec spec = normalizationService.extractDefinitionSpec(
                root, specMap, metadata, "service", "https://runbooks/checkout");

        assertEquals("service", spec.getType());
        assertEquals("manual", spec.getSource());
        assertEquals("payments", spec.getOwner());
        assertEquals("payments", spec.getOwnedBy());
        assertEquals("commerce", spec.getNamespace());
        assertEquals("prod", spec.getEnvironment());
        assertEquals("high", spec.getCriticality());
        assertEquals("https://runbooks/checkout", spec.getRunbook());
        assertEquals("production", spec.getLifecycle());
        assertEquals("edge", spec.getTier());
        assertEquals("checkout-platform", spec.getSystem());
        assertEquals("checkout-platform", spec.getPartOf());
        assertEquals(List.of("payments-domain"), spec.getComponentOf());
        assertEquals(List.of("api", "worker"), spec.getComponents());
        assertEquals(List.of("java", "spring"), spec.getImplementedBy());
        assertEquals("schemas/checkout.yaml", spec.getApiInterface().getFileRef());
        assertEquals(Map.of("openapi", "3.0.3"), spec.getApiInterface().getDefinition());
        assertEquals(List.of("java", "typescript"), spec.getLanguages());
    }

    @Test
    void keepsExplicitSystemAndFallsBackToRootInterfaceAndLanguages() {
        EntityDefinition.Metadata metadata = new EntityDefinition.Metadata();
        Map<String, Object> root = Map.of(
                "environment", "staging",
                "application", "root-app",
                "componentOf", List.of("ignored-system", "component-a"),
                "interface", Map.of("schema", Map.of("asyncapi", "2.6.0"), "file_ref", "schemas/root.yaml"),
                "languages", "go");
        Map<String, Object> specMap = Map.of("system", "explicit-system");

        EntityDefinition.Spec spec = normalizationService.extractDefinitionSpec(root, specMap, metadata, "api", null);

        assertEquals("api", spec.getType());
        assertEquals("staging", spec.getEnvironment());
        assertEquals("explicit-system", spec.getSystem());
        assertEquals("explicit-system", spec.getPartOf());
        assertEquals(List.of("ignored-system", "component-a"), spec.getComponentOf());
        assertEquals("schemas/root.yaml", spec.getApiInterface().getFileRef());
        assertEquals(Map.of("asyncapi", "2.6.0"), spec.getApiInterface().getDefinition());
        assertEquals(List.of("go"), spec.getLanguages());
    }
}
