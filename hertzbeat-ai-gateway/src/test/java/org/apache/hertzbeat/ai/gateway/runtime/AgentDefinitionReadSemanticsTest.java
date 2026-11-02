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

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

class AgentDefinitionReadSemanticsTest {
    @Test
    void nativeNamedMetadataIsReadProofOnlyAndRawYamlNeverBecomesEvidence() {
        var classifier = new AgentReadObservationClassifier();
        Map<String, Object> row =
                new LinkedHashMap<>(
                        Map.of(
                                "app",
                                "ai-e2e-test",
                                "label",
                                "Test",
                                "origin",
                                "custom",
                                "editable",
                                true,
                                "deletable",
                                true,
                                "hidden",
                                false,
                                "revision",
                                "a".repeat(64)));
        var detail =
                AgentRuntimeToolCall.builder()
                        .toolCallId("get")
                        .toolName("monitor.definition_get")
                        .arguments(Map.of("app", "ai-e2e-test"))
                        .build();
        assertEquals(
                "monitor-definition-metadata",
                classifier.classify(detail, JsonUtil.toJson(row)).kind());
        row.put("definition", "app: ai-e2e-test");
        assertNull(classifier.classify(detail, JsonUtil.toJson(row)));
        row.remove("definition");
        var catalog =
                AgentRuntimeToolCall.builder()
                        .toolCallId("catalog")
                        .toolName("monitor.definition_catalog")
                        .arguments(Map.of("offset", 0, "limit", 1))
                        .build();
        Map<String, Object> page =
                new LinkedHashMap<>(
                        Map.of(
                                "schemaVersion",
                                1,
                                "items",
                                List.of(row),
                                "offset",
                                0,
                                "limit",
                                1,
                                "total",
                                2,
                                "hasMore",
                                true));
        assertEquals(1, classifier.classify(catalog, JsonUtil.toJson(page)).count());
        page.put("hasMore", false);
        assertNull(classifier.classify(catalog, JsonUtil.toJson(page)));
    }
}
