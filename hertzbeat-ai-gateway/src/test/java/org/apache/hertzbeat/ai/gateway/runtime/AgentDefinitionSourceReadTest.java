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

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorDefinitionDraft;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

class AgentDefinitionSourceReadTest {
    private Map<String, Object> output(String yaml) {
        return new HashMap<>(
                Map.of(
                        "app",
                        "ai-e2e-source",
                        "revision",
                        "a".repeat(64),
                        "origin",
                        "custom",
                        "editable",
                        true,
                        "deletable",
                        true,
                        "hidden",
                        false,
                        "available",
                        true,
                        "definition",
                        yaml,
                        "definitionHash",
                        AgentMonitorDefinitionDraft.inspect(yaml).definitionHash()));
    }

    private AgentReadObservationClassifier.Observation classify(
            Map<String, Object> args, Map<String, Object> data) {
        return new AgentReadObservationClassifier()
                .classify(
                        AgentRuntimeToolCall.builder()
                                .toolCallId("source")
                                .toolName("monitor.definition_source")
                                .arguments(args)
                                .build(),
                        JsonUtil.toJson(data));
    }

    @Test
    void requiresExactRequestedIdentityValidRevisionAndContentHash() {
        var result = output("app: ai-e2e-source\nmetrics: []\n");
        assertNotNull(classify(Map.of("app", "ai-e2e-source"), result));
        assertNull(classify(Map.of("app", "another"), result));
        result.put("definitionHash", "b".repeat(64));
        assertNull(classify(Map.of("app", "ai-e2e-source"), result));
        result.put("revision", 12);
        assertNull(classify(Map.of("app", "ai-e2e-source"), result));
    }

    @Test
    void blockedAndCredentialBearingSourceCannotBecomeEvidence() {
        assertNull(
                classify(
                        Map.of("app", "ai-e2e-source"),
                        Map.of("app", "ai-e2e-source", "available", false)));
        var result = output("app: ai-e2e-source\nmetrics: []\n");
        result.put("definition", "app: ai-e2e-source\npassword: private-sentinel\n");
        assertNull(classify(Map.of("app", "ai-e2e-source"), result));
    }
}
