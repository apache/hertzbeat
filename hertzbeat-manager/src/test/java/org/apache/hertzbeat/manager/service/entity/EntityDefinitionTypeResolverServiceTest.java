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
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Contract for entity definition kind/type/subtype taxonomy resolution.
 */
class EntityDefinitionTypeResolverServiceTest {

    private final EntityDefinitionTypeResolverService resolverService = new EntityDefinitionTypeResolverService();

    @Test
    void resolvesCanonicalKindAndLegacyAliases() {
        assertEquals("database", resolverService.resolveDefinitionEntityType(
                Map.of("kind", "datastore"), Map.of()));
        assertEquals("api", resolverService.resolveDefinitionEntityType(
                Map.of("kind", "api"), Map.of()));
        assertEquals("service", resolverService.resolveDefinitionEntityType(
                Map.of("kind", "Entity", "dd-service", "checkout-api"), Map.of()));
    }

    @Test
    void prefersExplicitEntityTypeBeforeTypeFallback() {
        assertEquals("host", resolverService.resolveDefinitionEntityType(
                Map.of("type", "service"), Map.of("entity_type", "host")));
        assertEquals("queue", resolverService.resolveDefinitionEntityType(
                Map.of(), Map.of("type", "queue")));
    }

    @Test
    void resolvesSubtypeOnlyWhenTypeIsNotTheCanonicalEntityType() {
        assertNull(resolverService.resolveDefinitionSubtype(
                Map.of(), Map.of("type", "queue"), "queue"));
        assertEquals("graphql", resolverService.resolveDefinitionSubtype(
                Map.of(), Map.of("type", "graphql"), "api"));
        assertEquals("mysql", resolverService.resolveDefinitionSubtype(
                Map.of("resourceType", "mysql"), Map.of("type", "database"), "database"));
    }

    @Test
    void rejectsUnsupportedExplicitKindOrEntityTypeInsteadOfDefaultingToService() {
        IllegalArgumentException kind = assertThrows(IllegalArgumentException.class,
                () -> resolverService.resolveDefinitionEntityType(Map.of("kind", "cache"), Map.of()));
        assertEquals("Unsupported entity definition kind: cache.", kind.getMessage());

        IllegalArgumentException entityType = assertThrows(IllegalArgumentException.class,
                () -> resolverService.resolveDefinitionEntityType(Map.of(), Map.of("entity_type", "cache")));
        assertEquals("Unsupported entity definition entity type: cache.", entityType.getMessage());
    }
}
