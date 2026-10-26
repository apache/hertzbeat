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
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

class AgentRuntimeReadBudgetTest {
    private final AgentRuntimeProperties limits = new AgentRuntimeProperties();

    @Test
    void canonicalArgumentsIgnoreMapOrderNullAndNumericRepresentation() {
        Map<String, Object> first = new HashMap<>();
        first.put("start", 1000L);
        first.put("end", new BigDecimal("2000.00"));
        first.put("hideNoise", false);
        first.put("groupBy", null);
        assertEquals(AgentRuntimeReadBudget.canonical(first),
                AgentRuntimeReadBudget.canonical(Map.of("end", 2000, "start", new BigDecimal("1000.0"))));
    }

    @Test
    void unrelatedSuccessCannotResetEquivalentFailureAccounting() {
        AgentRuntimeReadBudget budget = new AgentRuntimeReadBudget();
        for (int i = 0; i < 3; i++) {
            String stop = budget.record(attempt("f" + i, "logs.group_by_stats", Map.of("q", Map.of("start", 1)),
                    null, AgentToolStatus.FAILED), limits);
            if (i < 2) {
                assertNull(stop);
            } else {
                assertTrue(stop.contains("READ_EQUIVALENT_REQUEST_BUDGET"));
            }
            budget.record(attempt("s" + i, "logs.group_by_stats", Map.of("q", Map.of("start", 10 + i)),
                    "{\"groupBy\":\"severity\",\"groups\":[]}", AgentToolStatus.SUCCEEDED), limits);
        }
    }

    @Test
    void replayOfActualTwentySixGroupCallsStopsBeforeRepeatingExploration() throws Exception {
        String json;
        try (var stream = getClass().getResourceAsStream("/agent/log-group-exploration-replay.json")) {
            json = new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        }
        var calls = JsonUtil.fromJson(json).path("calls");
        assertEquals(26, calls.size());
        AgentRuntimeReadBudget budget = new AgentRuntimeReadBudget();
        String stop = null;
        int executed = 0;
        for (var call : calls) {
            var arguments = JsonUtil.fromJson(call.path("arguments").toString(), Map.class);
            stop = budget.record(attempt("replay-" + executed, call.path("toolName").asText(), arguments,
                    call.path("observation").toString(), AgentToolStatus.valueOf(call.path("status").asText())), limits);
            executed++;
            // A different successful query in between cannot erase this run's accounting.
            budget.record(attempt("other-" + executed, "metrics.realtime", Map.of("monitorId", executed),
                    "{\"rowCount\":0}", AgentToolStatus.SUCCEEDED), limits);
            if (stop != null) {
                break;
            }
        }
        // The first empty ERROR result is call8; calls9..13 and19 repeat that observation in the same scope.
        assertEquals(19, executed, "Six redundant ERROR observations stop the26-call replay");
        assertTrue(stop.contains("READ_NO_PROGRESS_BUDGET"), stop);
    }

    @Test
    void pagesWithNewRowsAndChangedWindowsHaveExplicitProgress() {
        AgentRuntimeReadBudget budget = new AgentRuntimeReadBudget();
        for (int page = 0; page < 12; page++) {
            var args = Map.<String, Object>of("start", 1000, "end", 2000, "pageIndex", page, "pageSize", 10);
            assertNull(budget.record(attempt("p" + page, "traces.query", args,
                    "{\"content\":[{\"traceId\":\"" + page + "\"}]}", AgentToolStatus.SUCCEEDED), limits));
        }
        for (int window = 0; window < 12; window++) {
            assertNull(budget.record(attempt("w" + window, "logs.group_by_stats",
                    Map.of("q", Map.of("start", 1000 + window, "end", 2000 + window)),
                    "{\"groups\":[]}", AgentToolStatus.SUCCEEDED), limits));
        }
    }

    @Test
    void sameRequestWithNewObservedRowsIsNotAnEquivalentRepeat() {
        AgentRuntimeReadBudget budget = new AgentRuntimeReadBudget();
        for (int i = 0; i < 8; i++) {
            assertNull(budget.record(attempt("fresh" + i, "traces.query", Map.of("start", 1000, "end", 2000),
                    "{\"content\":[{\"traceId\":\"new-" + i + "\"}]}", AgentToolStatus.SUCCEEDED), limits));
        }
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"metrics.realtime", "metrics.history"})
    void changedMetricValuesAreExplicitProgressForTheSameRequest(String tool) {
        AgentRuntimeReadBudget budget = new AgentRuntimeReadBudget();
        for (int i = 0; i < 8; i++) {
            String output = "metrics.realtime".equals(tool) ? "{\"valueRows\":[{\"value\":" + i + "}]}"
                    : "{\"values\":{\"series\":[{\"time\":1000,\"value\":" + i + "}]}}";
            assertNull(budget.record(attempt("metric-" + i, tool, Map.of("monitorId", 42), output,
                    AgentToolStatus.SUCCEEDED), limits));
        }
    }

    @Test
    void restoredSameRunCountersRetainTotalAndDuplicateBudgets() {
        var attempts = IntStream.range(0, 3).mapToObj(i -> attempt("c" + i, "logs.group_by_stats",
                Map.of("q", Map.of("start", 1)), "{\"groups\":[]}", AgentToolStatus.SUCCEEDED)).toList();
        AgentRuntimeLoopState state = new AgentRuntimeLoopState(List.of());
        state.restoreBudget(attempts, limits);
        assertEquals(3, state.getToolCallCount());
        assertTrue(state.budgetStop().contains("READ_EQUIVALENT_REQUEST_BUDGET"));
        state.restoreBudget(attempts, limits);
        assertEquals(3, state.getToolCallCount());
    }

    private AgentRuntimeReadBudget.Attempt attempt(String id, String tool, Map<String, Object> args,
                                                   String output, AgentToolStatus status) {
        return new AgentRuntimeReadBudget.Attempt(id, tool, AgentToolRisk.READ, status, args, output, "invalid");
    }
}
