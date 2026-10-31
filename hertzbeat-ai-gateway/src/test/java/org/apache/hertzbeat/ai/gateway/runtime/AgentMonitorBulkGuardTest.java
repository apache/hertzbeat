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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorMutationReceipt;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

class AgentMonitorBulkGuardTest {
    @Test
    void batchCannotExpandFrozenTargetsAlterTimeoutOrRepeatItems() {
        var goal =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.CREATE,
                        "monitor",
                        2,
                        List.of(),
                        Map.of("params", Map.of("timeout", 10000)),
                        List.of(
                                new AgentTaskAssessment.CreateTarget(
                                        "ai-e2e-a", "https://a.example/", 600),
                                new AgentTaskAssessment.CreateTarget(
                                        "ai-e2e-b", "https://b.example/", 600)));
        var first =
                AgentMonitorBulkArguments.item(
                        "batch-a",
                        AgentMonitorBatch.createArguments(goal, goal.createTargets().getFirst()));
        assertTrue(
                AgentMonitorMutationSemantics.permits(
                        goal,
                        "monitor.create_batch",
                        Map.of("items", List.of(first), "retryPreflightFailures", false)));
        var changed = new LinkedHashMap<String, Object>(first);
        changed.put("url", "https://outside.example:443/");
        assertFalse(
                AgentMonitorMutationSemantics.permits(
                        goal, "monitor.create_batch", Map.of("items", List.of(changed))));
        changed = new LinkedHashMap<>(first);
        changed.put("timeout", 20000);
        assertFalse(
                AgentMonitorMutationSemantics.permits(
                        goal, "monitor.create_batch", Map.of("items", List.of(changed))));
        changed = new LinkedHashMap<>(first);
        changed.put("idempotencyKey", "another-key");
        assertFalse(
                AgentMonitorMutationSemantics.permits(
                        goal, "monitor.create_batch", Map.of("items", List.of(first, changed))));
        changed = new LinkedHashMap<>(first);
        changed.put("authorization", "secret-fixture");
        assertFalse(
                AgentMonitorMutationSemantics.permits(
                        goal, "monitor.create_batch", Map.of("items", List.of(changed))));
        changed = new LinkedHashMap<>(first);
        changed.put("timeout", null);
        assertFalse(
                AgentMonitorMutationSemantics.permits(
                        goal, "monitor.create_batch", Map.of("items", List.of(changed))));
    }

    @Test
    void numericIdTextStaysExactAndForgedReadbackCannotVerify() {
        assertEquals(9007199254740993L, AgentMonitorBulkArguments.monitorId("9007199254740993"));
        for (String id : List.of("1.0", "-1", "01", "9223372036854775808", "NaN")) {
            assertNull(AgentMonitorBulkArguments.monitorId(id));
        }
        var input =
                Map.<String, Object>of(
                        "idempotencyKey",
                        "batch-a",
                        "name",
                        "ai-e2e-a",
                        "url",
                        "https://a.example:443/",
                        "intervals",
                        600);
        var forged =
                new AgentMonitorMutationReceipt.Target(
                        42L,
                        Map.of("app", "website", "name", "ai-e2e-a", "intervals", 600),
                        Map.of(
                                "host",
                                "outside.example",
                                "port",
                                "443",
                                "ssl",
                                "true",
                                "uri",
                                "/"));
        assertFalse(AgentMonitorBulkArguments.targetMatchesItem(forged, input));
        assertFalse(
                AgentMonitorMutationSemantics.matchesRequest(
                        new AgentMonitorMutationReceipt(
                                AgentMonitorMutationReceipt.VERSION,
                                "monitor.create_batch",
                                "hash",
                                List.of(forged)),
                        Map.of("items", List.of(input))));
    }
}
