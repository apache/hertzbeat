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
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

/** Production output-shape predicates for plain-run READ grounding. */
class AgentReadGroundingEvaluatorTest {

    private final AgentReadGroundingEvaluator evaluator = new AgentReadGroundingEvaluator();

    @Test
    void reviewedReadAllowlistShouldAcceptOnlyProductionShapedNonEmptyOutput() {
        positiveCases().forEach(observation -> {
            AgentGroundingProof proof = evaluator.evaluate("run-1", call(observation), result(observation))
                    .orElseThrow(() -> new AssertionError(observation.toolName()));
            assertEquals(observation.kind(), proof.getObservationKind(), observation.toolName());
            assertEquals(observation.count(), proof.getObservationCount(), observation.toolName());
        });
    }

    @Test
    void wellFormedEmptyReadsShouldStillCountAsObservations() {
        Map<String, Object> emptyHistoryArguments = Map.of(
                "monitorId", 7L, "metricKey", "basic.qps", "start", 1_000L, "end", 2_000L);
        Map<String, Object> emptyHistory = Map.of(
                "monitorId", 7L, "metricKey", "basic.qps", "start", 1_000L, "end", 2_000L,
                "values", Map.of(), "returnedPoints", 0, "totalPoints", 0);
        List<Observation> emptyReads = List.of(
                observation("monitor.query", Map.of(), page(List.of()), "monitor-list", 0),
                observation("logs.query", Map.of(), page(List.of()), "log-records", 0),
                observation("traces.query", Map.of(), page(List.of()), "trace-records", 0),
                observation("entity.query", Map.of(), page(List.of()), "entity-list", 0),
                observation("collector.list", Map.of(), page(List.of()), "collector-list", 0),
                observation("topology.query", Map.of(),
                        Map.of("apiBacked", true, "nodes", List.of()), "topology-nodes", 0),
                observation("alert.query", Map.of(),
                        Map.of("result", page(List.of())), "alert-records", 0),
                observation("alert.query", Map.of(),
                        Map.of("single", page(List.of()), "group", page(List.of())), "alert-records", 0),
                observation("alert.similar", Map.of(),
                        Map.of("content", List.of(), "returnedCount", 0), "similar-alerts", 0),
                observation("alert.summary", Map.of(), Map.of("total", 0), "alert-summary", 0),
                observation("metrics.history", emptyHistoryArguments, emptyHistory, "metric-points", 0),
                observation("metrics.realtime", Map.of("monitorId", 7L, "metrics", "basic"),
                        Map.of("monitorId", 7L, "metrics", "basic", "valueRows", List.of(),
                                "rowCount", 0), "metric-rows", 0),
                observation("database.mysql_slow_queries", Map.of(),
                        Map.of("rows", List.of(), "rowCount", 0), "database-rows", 0));

        emptyReads.forEach(observation -> {
            AgentGroundingProof proof = evaluator.evaluate("run-1", call(observation), result(observation))
                    .orElseThrow(() -> new AssertionError(observation.toolName()));
            assertEquals(observation.kind(), proof.getObservationKind(), observation.toolName());
            assertEquals(0, proof.getObservationCount(), observation.toolName());
        });
    }

    @Test
    void identifiersRowsAndUnknownDatabaseNamespaceMustFailClosed() {
        List<Observation> denied = List.of(
                observation("monitor.get", Map.of("monitorId", 7L), Map.of("monitorId", 8L)),
                observation("entity.get", Map.of("entityId", 7L), Map.of("entity", Map.of("id", 8L))),
                observation("traces.get", Map.of("traceId", "trace-a"), traceDetail("trace-b")),
                observation("alert.get", Map.of("alertId", 7L), Map.of("alertId", 8L, "single", Map.of("id", 8L))),
                observation("monitor.query", Map.of(), page(List.of("not-a-monitor"))),
                observation("monitor.query", Map.of(), page(List.of(Map.of()))),
                observation("monitor.query", Map.of(), page(List.of(Map.of("id", 7L)))),
                observation("traces.query", Map.of(), page(List.of(Map.of("traceId", "")))),
                observation("entity.query", Map.of(), page(List.of(Map.of("entity", Map.of())))),
                observation("logs.query", Map.of(), page(List.of(Map.of("body", "message")))),
                observation("database.future_query", Map.of(), rows()),
                observation("database.mysql_slow_queries", Map.of(),
                        Map.of("rows", List.of("not-a-row"), "rowCount", 1)),
                observation("database.mysql_slow_queries", Map.of(),
                        Map.of("rows", List.of(Map.of()), "rowCount", 1)),
                observation("metrics.realtime", Map.of("monitorId", 7L, "metrics", "basic"),
                        Map.of("monitorId", 7L, "metrics", "other", "valueRows", List.of(Map.of()),
                                "rowCount", 1)),
                observation("metrics.realtime", Map.of("monitorId", 7L, "metrics", "basic"),
                        Map.of("monitorId", 7L, "metrics", "basic", "valueRows", List.of(Map.of()),
                                "rowCount", 1)),
                observation("metrics.history", Map.of("monitorId", 7L, "metricKey", "basic.qps",
                                "start", 1_000L, "end", 2_000L),
                        Map.of("monitorId", 7L, "metricKey", "basic.qps", "start", 1_000L, "end", 2_000L,
                                "values", Map.of("instance=a", List.of(Map.of())),
                                "returnedPoints", 1, "totalPoints", 1)),
                observation("alert.get", Map.of("alertId", 7L),
                        Map.of("alertId", 7L, "single", Map.of("id", 8L))),
                observation("collector.collect_once", Map.of(), Map.of("status", "SUCCESS", "metricsCount", 1,
                        "metrics", List.of(Map.of("metrics", "basic", "rowCount", 0, "valueRows", 0)))));

        denied.forEach(observation -> assertTrue(
                evaluator.evaluate("run-1", call(observation), result(observation)).isEmpty(),
                observation.toolName()));
    }

    @Test
    void repeatedErrorSummaryAcceptsReadyEmptyWindowAndRejectsOtherSemanticStates() {
        Map<String, Object> arguments = Map.of("start", 1_000L, "end", 2_000L);
        Map<String, Object> scope = Map.of("workspaceId", "default", "start", 1_000L, "end", 2_000L,
                "serviceName", "", "environment", "");
        Map<String, Object> ready = Map.of("state", "ready", "scope", scope, "coverage", "window",
                "matchingEvents", 0, "groups", List.of());
        Observation empty = observation("logs.repeated_errors.summary", arguments,
                repeatedErrorEnvelope(ready), "repeated-error-events", 0);
        AgentGroundingProof proof = evaluator.evaluate("run-1", call(empty), result(empty)).orElseThrow();
        assertEquals(0, proof.getObservationCount());
        assertEquals("repeated-error-events", proof.getObservationKind());
        for (String state : List.of("unsupported", "unavailable", "over_budget")) {
            Observation unavailable = observation("logs.repeated_errors.summary", arguments,
                    repeatedErrorEnvelope(Map.of("state", state, "scope", scope, "groups", List.of())));
            assertTrue(evaluator.evaluate("run-1", call(unavailable), result(unavailable)).isEmpty());
        }
        Observation mismatch = observation("logs.repeated_errors.summary", Map.of("start", 999L, "end", 2_000L),
                repeatedErrorEnvelope(ready));
        assertTrue(evaluator.evaluate("run-1", call(mismatch), result(mismatch)).isEmpty());
        Map<String, Object> truncated = new java.util.HashMap<>(repeatedErrorEnvelope(ready));
        truncated.put("projectionTruncated", true);
        Observation partial = observation("logs.repeated_errors.summary", arguments, truncated);
        assertTrue(evaluator.evaluate("run-1", call(partial), result(partial)).isEmpty());
        Observation failed = observation("logs.repeated_errors.summary", arguments, repeatedErrorEnvelope(ready));
        assertTrue(evaluator.evaluate("run-1", call(failed),
                result(failed).toBuilder().status(AgentToolStatus.FAILED).build()).isEmpty());
    }

    private Map<String, Object> repeatedErrorEnvelope(Map<String, Object> data) {
        return Map.of("format", "json_text", "partial", false, "projectionTruncated", false,
                "data", JsonUtil.toJson(Map.of("code", 0, "data", data)));
    }

    @Test
    void successfulEmptyLogOverviewAndGroupsAreTypedObservations() {
        Map<String, Object> counts = Map.of("totalCount", 0, "errorCount", 0, "warnCount", 0,
                "infoCount", 0, "debugCount", 0, "fatalCount", 0, "traceCount", 0,
                "traceCoverage", Map.of("withTrace", 0, "withoutTrace", 0, "withSpan", 0, "withBothTraceAndSpan", 0));
        Observation stats = observation("logs.overview_stats", Map.of("q", Map.of("start", 1_000L, "end", 2_000L)),
                repeatedErrorEnvelope(counts), "log-events", 0);
        assertEquals(0, evaluator.evaluate("run-1", call(stats), result(stats)).orElseThrow().getObservationCount());
        Observation groups = observation("logs.group_by_stats",
                Map.of("q", Map.of("start", 1_000L, "end", 2_000L, "groupBy", "service.name")),
                repeatedErrorEnvelope(Map.of("groupBy", "service.name", "groups", List.of())), "log-groups", 0);
        assertEquals(0, evaluator.evaluate("run-1", call(groups), result(groups)).orElseThrow().getObservationCount());
        var invalid = new java.util.HashMap<String, Object>(counts);
        invalid.put("errorCount", 1);
        Observation inconsistent = observation("logs.overview_stats", stats.arguments(), repeatedErrorEnvelope(invalid));
        assertTrue(evaluator.evaluate("run-1", call(inconsistent), result(inconsistent)).isEmpty());
    }

    private Stream<Observation> positiveCases() {
        Map<String, Object> exactHistoryArguments = Map.of(
                "monitorId", 7L, "metricKey", "basic.qps", "start", 1_000L, "end", 2_000L);
        Map<String, Object> exactHistory = Map.of(
                "monitorId", 7L, "metricKey", "basic.qps", "start", 1_000L, "end", 2_000L,
                "values", Map.of("instance=a", List.of(Map.of("time", 1_500L, "origin", "3"))),
                "returnedPoints", 1, "totalPoints", 1);
        Stream<Observation> fixed = Stream.of(
                observation("monitor.get", Map.of("monitorId", 7L), Map.of("monitorId", 7L), "monitor"),
                observation("monitor.query", Map.of(), page(List.of(Map.of("monitorId", 7L))), "monitor-list"),
                observation("metrics.realtime", Map.of("monitorId", 7L, "metrics", "basic"),
                        Map.of("monitorId", 7L, "metrics", "basic", "valueRows",
                                List.of(Map.of("labels", Map.of(), "values", List.of(Map.of("origin", "3")))),
                                "rowCount", 1), "metric-rows"),
                observation("metrics.history", exactHistoryArguments, exactHistory, "metric-points"),
                observation("logs.query", Map.of(),
                        page(List.of(Map.of("timeUnixNano", 1L, "body", "message"))), "log-records"),
                observation("traces.query", Map.of(),
                        page(List.of(Map.of("traceId", "trace-a"))), "trace-records"),
                observation("traces.get", Map.of("traceId", "trace-a"), traceDetail("trace-a"), "trace-spans"),
                observation("entity.get", Map.of("entityId", 7L),
                        Map.of("entity", Map.of("id", 7L)), "entity"),
                observation("entity.query", Map.of(),
                        page(List.of(Map.of("entity", Map.of("id", 7L)))), "entity-list"),
                observation("topology.query", Map.of(),
                        Map.of("apiBacked", true, "nodes", List.of(Map.of("entityId", 7L))), "topology-nodes"),
                observation("alert.get", Map.of("alertId", 7L),
                        Map.of("alertId", 7L, "single", Map.of("id", 7L)), "alert"),
                observation("alert.query", Map.of(),
                        Map.of("result", page(List.of(Map.of("id", 7L)))), "alert-records"),
                observation("alert.similar", Map.of(),
                        Map.of("content", List.of(Map.of("id", 8L)), "returnedCount", 1), "similar-alerts"),
                observation("alert.summary", Map.of(), Map.of("total", 1), "alert-summary"),
                observation("collector.list", Map.of(),
                        page(List.of(Map.of("name", "collector-a"))), "collector-list"),
                observation("collector.collect_once", Map.of(), collectorResult(), "collector-results"),
                observation("collector.detect", Map.of(),
                        Map.of("status", "SUCCESS", "collect", collectorResult()), "collector-results"),
                observation("metrics.warehouse_status", Map.of(), Map.of("online", false), "warehouse-status"),
                observation("dns.query", Map.of(), protocolRows(), "protocol-metric-rows"),
                observation("http.get", Map.of(), protocolRows(), "protocol-metric-rows"));
        Stream<Observation> database = Stream.of(
                "database.mysql_slow_queries", "database.mysql_process_list", "database.mysql_lock_waits",
                "database.mysql_global_status", "database.explain_query")
                .map(name -> observation(name, Map.of(), rows(), "database-rows"));
        return Stream.concat(fixed, database);
    }

    private Observation observation(String toolName, Map<String, Object> arguments, Map<String, Object> output) {
        return observation(toolName, arguments, output, "denied");
    }

    private Observation observation(String toolName, Map<String, Object> arguments, Map<String, Object> output,
                                    String kind) {
        return new Observation(toolName, arguments, output, kind, 1);
    }

    private Observation observation(String toolName, Map<String, Object> arguments, Map<String, Object> output,
                                    String kind, int count) {
        return new Observation(toolName, arguments, output, kind, count);
    }

    private AgentRuntimeToolCall call(Observation observation) {
        return AgentRuntimeToolCall.builder().toolCallId("call-1").toolName(observation.toolName())
                .arguments(observation.arguments()).build();
    }

    private AgentToolExecutionResult result(Observation observation) {
        return AgentToolExecutionResult.builder().toolCallId("call-1").toolName(observation.toolName())
                .status(AgentToolStatus.SUCCEEDED).risk(AgentToolRisk.READ)
                .decision(AgentPolicyDecision.ALLOW).approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(JsonUtil.toJson(observation.output())).build();
    }

    private Map<String, Object> page(List<?> content) {
        return Map.of("content", content, "totalElements", content.size());
    }

    private Map<String, Object> traceDetail(String traceId) {
        return Map.of("traceId", traceId, "spans", List.of(Map.of("spanId", "span-a")),
                "spanCount", 1, "partial", false);
    }

    private Map<String, Object> collectorResult() {
        return Map.of("status", "SUCCESS", "metricsCount", 1,
                "metrics", List.of(Map.of("metrics", "basic", "rowCount", 1, "valueRows", 1)));
    }

    private Map<String, Object> protocolRows() {
        return Map.of("metrics", List.of(Map.of(
                "rows", List.of(Map.of("value", 1)), "rowCount", 1, "truncated", false)));
    }

    private Map<String, Object> rows() {
        return Map.of("rows", List.of(Map.of("value", 1)), "rowCount", 1);
    }

    private record Observation(String toolName, Map<String, Object> arguments, Map<String, Object> output,
                               String kind, int count) {
    }
}
