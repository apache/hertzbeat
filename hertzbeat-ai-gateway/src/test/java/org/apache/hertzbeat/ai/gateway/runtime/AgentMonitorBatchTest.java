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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

/** Durable pure batch phase policy, with no model, native service or database effects. */
class AgentMonitorBatchTest {
    @Test
    void finalProgressRetainsOnlyFixedFailureCodes() {
        var batch = new AgentMonitorBatch("run");
        batch.enableNativeBulk();
        batch.initialize(goal(2));
        var call = batch.next(64);
        var items =
                ((List<?>) call.getArguments().get("items"))
                        .stream()
                                .map(
                                        value -> {
                                            var item = (Map<?, ?>) value;
                                            return Map.of(
                                                    "idempotencyKey",
                                                    item.get("idempotencyKey"),
                                                    "state",
                                                    "PROBE_FAILED",
                                                    "reason",
                                                    "HTTP_403");
                                        })
                                .toList();
        String result =
                JsonUtil.toJson(
                        Map.of("batchVersion", "monitor-bulk.v1", "batch", Map.of("items", items)));
        batch.observe(
                call,
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk.CHANGE,
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus.SUCCEEDED,
                result,
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                        .normalizedArgumentsHash(call.getArguments()),
                true);
        assertEquals(List.of("HTTP_403"), batch.failureCodes());
        assertTrue(batch.summary().contains("HTTP_403"));
        var changed = new AgentMonitorBatch("run");
        changed.enableNativeBulk();
        changed.initialize(goal(2));
        changed.observe(
                call,
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk.CHANGE,
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus.SUCCEEDED,
                result,
                "invalid-binding",
                true);
        assertTrue(changed.failureCodes().isEmpty());
    }

    @Test
    void fiftyItemsAreFrozenBeforeEffectsAndFitTranscriptStorage() {
        var batch = new AgentMonitorBatch("run");
        batch.initialize(goal(50));
        var snapshot = batch.snapshot();
        assertEquals(50, snapshot.items().size());
        assertEquals(
                50, snapshot.items().stream().map(AgentMonitorBatch.Item::id).distinct().count());
        assertTrue(
                JsonUtil.toJson(snapshot).getBytes(java.nio.charset.StandardCharsets.UTF_8).length
                        < 40000);
        var resumed = new AgentMonitorBatch("run");
        resumed.restore(goal(50), snapshot);
        assertEquals(snapshot, resumed.snapshot());
        assertEquals(batch.next(64), resumed.next(64));
    }

    @Test
    void targetsMustBeCompleteUniqueAndCredentialFree() {
        var target = new AgentTaskAssessment.CreateTarget("one", "https://example.test/", 60);
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        new AgentMonitorBatch("run")
                                .initialize(
                                        new AgentTaskAssessment.Goal(
                                                AgentTaskAssessment.Type.CHANGE,
                                                AgentTaskAssessment.Operation.CREATE,
                                                "monitor",
                                                2,
                                                List.of(),
                                                Map.of(),
                                                List.of(target, target))));
        for (String url :
                List.of(
                        "https://user:pass@example.test",
                        "https://example.test/?token=secret",
                        "file:///tmp/site")) {
            assertThrows(
                    IllegalArgumentException.class,
                    () ->
                            new AgentMonitorBatch("run")
                                    .initialize(
                                            new AgentTaskAssessment.Goal(
                                                    AgentTaskAssessment.Type.CHANGE,
                                                    AgentTaskAssessment.Operation.CREATE,
                                                    "monitor",
                                                    2,
                                                    List.of(),
                                                    Map.of(),
                                                    List.of(
                                                            target,
                                                            new AgentTaskAssessment.CreateTarget(
                                                                    "two", url, 60)))));
        }
    }

    @Test
    void changedRestoredItemOrRunCannotBeAdopted() {
        var batch = new AgentMonitorBatch("run");
        batch.initialize(goal(2));
        assertThrows(
                IllegalArgumentException.class,
                () -> new AgentMonitorBatch("other").restore(goal(2), batch.snapshot()));
        assertThrows(
                IllegalArgumentException.class,
                () -> new AgentMonitorBatch("run").restore(goal(3), batch.snapshot()));
    }

    static AgentTaskAssessment.Goal goal(int count) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                AgentTaskAssessment.Operation.CREATE,
                "monitor",
                count,
                List.of(),
                Map.of(),
                IntStream.range(0, count)
                        .mapToObj(
                                i ->
                                        new AgentTaskAssessment.CreateTarget(
                                                "local-" + i,
                                                "http://127.0.0.1:18080/site/" + i,
                                                600))
                        .toList());
    }
}
