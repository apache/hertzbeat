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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorMutationReceipt;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

class AgentMonitorBulkReadSemanticsTest {
    private final Map<String, Object> item =
            Map.of(
                    "idempotencyKey",
                    "ai-e2e-proof",
                    "name",
                    "ai-e2e-proof",
                    "url",
                    "https://example.org:443/",
                    "intervals",
                    600);

    @Test
    void nativePartialStatusIsReadEvidenceAndRejectsTamperedCountsAndTargets() {
        var args = Map.<String, Object>of("items", List.of(item));
        var hash = AgentToolPayloadHasher.normalizedArgumentsHash(args);
        var target =
                new AgentMonitorMutationReceipt.Target(
                        42L,
                        Map.of("app", "website", "name", "ai-e2e-proof", "intervals", 600),
                        Map.of("host", "example.org", "port", "443", "ssl", "true", "uri", "/"));
        var verified =
                Map.of(
                        "idempotencyKey",
                        "ai-e2e-proof",
                        "state",
                        "VERIFIED",
                        "monitorId",
                        "42",
                        "fields",
                        target.fields(),
                        "parameters",
                        target.parameters());
        Map<String, Object> batch =
                new LinkedHashMap<>(
                        Map.of(
                                "schemaVersion",
                                1,
                                "items",
                                List.of(verified),
                                "verified",
                                1,
                                "failed",
                                0,
                                "pending",
                                0,
                                "unknown",
                                0));
        Map<String, Object> output =
                new LinkedHashMap<>(
                        Map.of(
                                "batchVersion",
                                "monitor-bulk.v1",
                                "batch",
                                batch,
                                "mutation",
                                new AgentMonitorMutationReceipt(
                                        AgentMonitorMutationReceipt.VERSION,
                                        "monitor.create_batch",
                                        hash,
                                        List.of(target))));
        var call = call("monitor.batch_status", args);
        var classifier = new AgentReadObservationClassifier();
        assertEquals(
                "website-batch-status-items",
                classifier.classify(call, JsonUtil.toJson(output)).kind());
        batch.put("failed", 1);
        assertNull(classifier.classify(call, JsonUtil.toJson(output)));
        batch.put("failed", 0);
        var wrong = new LinkedHashMap<String, Object>(verified);
        wrong.put("monitorId", "43");
        batch.put("items", List.of(wrong));
        assertNull(classifier.classify(call, JsonUtil.toJson(output)));
        batch.put(
                "items",
                List.of(
                        Map.of(
                                "idempotencyKey",
                                "ai-e2e-proof",
                                "state",
                                "PROBE_FAILED",
                                "reason",
                                "HTTP_403")));
        batch.put("verified", 0);
        batch.put("failed", 1);
        output.put(
                "mutation",
                new AgentMonitorMutationReceipt(
                        AgentMonitorMutationReceipt.VERSION,
                        "monitor.create_batch",
                        hash,
                        List.of()));
        assertNotNull(classifier.classify(call, JsonUtil.toJson(output)));
    }

    @Test
    void frozenManifestProofRequiresExactSelectionHashAndBoundedPage() {
        var args = Map.<String, Object>of("runUid", "run-original", "offset", 0, "limit", 1);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("planVersion", "monitor-batch-plan.v1");
        data.put("rootRunUid", "run-root");
        data.put("selectedRunUid", "run-original");
        data.put("planHash", "a".repeat(64));
        data.put("items", List.of(item));
        data.put("expectedCount", 2);
        data.put("offset", 0);
        data.put("limit", 1);
        data.put("total", 2);
        data.put("hasMore", true);
        data.put("readOnly", true);
        data.put("inputHash", AgentToolPayloadHasher.normalizedArgumentsHash(args));
        var classifier = new AgentReadObservationClassifier();
        var call = call("monitor.batch_plan", args);
        assertNotNull(classifier.classify(call, JsonUtil.toJson(data)));
        data.put("selectedRunUid", "run-other");
        assertNull(classifier.classify(call, JsonUtil.toJson(data)));
        data.put("selectedRunUid", "run-original");
        data.put("hasMore", false);
        assertNull(classifier.classify(call, JsonUtil.toJson(data)));
        data.put("hasMore", true);
        data.put("inputHash", "wrong");
        assertNull(classifier.classify(call, JsonUtil.toJson(data)));
    }

    private AgentRuntimeToolCall call(String name, Map<String, Object> args) {
        return AgentRuntimeToolCall.builder()
                .toolName(name)
                .toolCallId("fixture")
                .arguments(args)
                .build();
    }
}
