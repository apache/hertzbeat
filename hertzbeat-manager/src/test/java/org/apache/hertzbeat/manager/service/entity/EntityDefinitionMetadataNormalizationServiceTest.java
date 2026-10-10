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
import java.util.Set;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.junit.jupiter.api.Test;

/**
 * Contract for metadata, contact, owner, label, tag, link, and runbook definition normalization.
 */
class EntityDefinitionMetadataNormalizationServiceTest {

    private final EntityDefinitionMetadataNormalizationService normalizationService =
            new EntityDefinitionMetadataNormalizationService();

    @Test
    void extractsMetadataAliasesAndLegacyRootLabelsWithoutInventingEvidence() {
        Map<String, Object> root = Map.of(
                "dd-service", "checkout-api",
                "team", "payments",
                "labels", Map.of("env", "prod", "tier", "edge"),
                "metadata", Map.of(
                        "display_name", "Checkout API",
                        "contacts", Map.of("slack", "#checkout-ops"),
                        "links", List.of(
                                Map.of("type", "runbook", "url", "https://runbooks/checkout"),
                                Map.of("label", "Dashboard", "href", "https://grafana/checkout", "provider", "grafana"))),
                "spec", Map.of(
                        "serviceNamespace", "commerce",
                        "description", "Handles checkout traffic",
                        "owners", List.of(
                                "payments",
                                Map.of("name", "platform", "type", "group"))));
        Map<String, Object> specMap = Map.of(
                "serviceNamespace", "commerce",
                "description", "Handles checkout traffic",
                "owners", List.of(
                        "payments",
                        Map.of("name", "platform", "type", "group")));

        EntityDefinition.Metadata metadata = normalizationService.extractDefinitionMetadata(root, specMap);

        assertEquals("checkout-api", metadata.getName());
        assertEquals("commerce", metadata.getNamespace());
        assertEquals("payments", metadata.getOwner());
        assertEquals("Checkout API", metadata.getDisplayName());
        assertEquals("Handles checkout traffic", metadata.getDescription());
        assertEquals(Map.of("env", "prod", "tier", "edge"), metadata.getLabels());
        assertEquals(Set.of("env:prod", "tier:edge"), Set.copyOf(metadata.getTags()));
        assertEquals("payments", metadata.getAdditionalOwners().getFirst().getName());
        assertEquals("team", metadata.getAdditionalOwners().getFirst().getType());
        assertEquals("platform", metadata.getAdditionalOwners().get(1).getName());
        assertEquals("group", metadata.getAdditionalOwners().get(1).getType());
        assertEquals("runbook", metadata.getLinks().getFirst().getType());
        assertEquals("https://runbooks/checkout", metadata.getLinks().getFirst().getUrl());
        assertEquals("grafana", metadata.getLinks().get(1).getProvider());
        assertEquals("#checkout-ops", metadata.getContacts().getFirst().getContact());
    }

    @Test
    void extractsRunbookWithSpecMetadataRootPrecedence() {
        Map<String, Object> root = Map.of(
                "runbook", "https://root/runbook",
                "links", List.of(Map.of("type", "runbook", "url", "https://root-links/runbook")),
                "metadata", Map.of("links", Map.of("runbook", "https://metadata/runbook")),
                "spec", Map.of("links", Map.of("runbook", "https://spec/runbook")));
        Map<String, Object> specMap = Map.of("links", Map.of("runbook", "https://spec/runbook"));

        assertEquals("https://spec/runbook", normalizationService.extractDefinitionRunbook(root, specMap));
    }
}
