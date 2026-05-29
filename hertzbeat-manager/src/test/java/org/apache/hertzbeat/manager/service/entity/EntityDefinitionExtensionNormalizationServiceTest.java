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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.junit.jupiter.api.Test;

/**
 * Contract for definition integration/extension object-node normalization.
 */
class EntityDefinitionExtensionNormalizationServiceTest {

    private final EntityDefinitionExtensionNormalizationService normalizationService =
            new EntityDefinitionExtensionNormalizationService();

    @Test
    void extractsObjectNodeMapWithStringKeysAndDropsNullKeys() {
        Map<String, Object> pagerduty = Map.of("service", "checkout");
        Map<Object, Object> raw = new LinkedHashMap<>();
        raw.put("pagerduty", pagerduty);
        raw.put(42, Map.of("enabled", true));
        raw.put(null, "ignored");

        Map<String, Object> result = normalizationService.extractDefinitionObjectNodeMap(raw);

        assertEquals(2, result.size());
        assertSame(pagerduty, result.get("pagerduty"));
        assertEquals(Map.of("enabled", true), result.get("42"));
        assertFalse(result.containsKey(null));
    }

    @Test
    void returnsSharedEmptyMapForMissingOrNonObjectNodes() {
        assertSame(Collections.emptyMap(), normalizationService.extractDefinitionObjectNodeMap(null));
        assertSame(Collections.emptyMap(), normalizationService.extractDefinitionObjectNodeMap("not-an-object"));
        assertSame(Collections.emptyMap(), normalizationService.extractDefinitionObjectNodeMap(Map.of()));
    }

    @Test
    void attachesIntegrationAndExtensionEnvelopesFromRootAndSpecFallbacks() {
        EntityDefinition definition = new EntityDefinition();
        Map<String, Object> root = Map.of(
                "integrations", Map.of("pagerduty", Map.of("service", "checkout")),
                "extensions", "not-an-object"
        );
        Map<String, Object> specMap = Map.of(
                "integrations", Map.of("ignored", Map.of("service", "from-spec")),
                "extensions", Map.of("scorecard", Map.of("level", "gold"))
        );

        normalizationService.attachDefinitionAddOns(definition, root, specMap);

        assertEquals("checkout", ((Map<?, ?>) definition.getIntegrations().get("pagerduty")).get("service"));
        assertEquals(Map.of(), definition.getExtensions());
    }
}
