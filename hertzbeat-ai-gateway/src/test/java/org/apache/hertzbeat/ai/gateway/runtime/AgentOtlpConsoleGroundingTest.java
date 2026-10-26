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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.junit.jupiter.api.Test;

class AgentOtlpConsoleGroundingTest {
    // Recorded native tool output; the tests replay data without contacting a model or storage.
    private static final String DATA = """
            {"context":{"collectorId":null,"end":1792325529085,"endpoint":null,"entityId":null,"entityName":null,"entityType":null,"environment":null,"i\
            nstance":null,"operationName":null,"serviceName":null,"serviceNamespace":null,"start":1792325229085},"query":"sum by (__name__, service_name\
            , service_namespace, deployment_environment_name, hertzbeat_entity_id, hertzbeat_entity_type, hertzbeat_entity_name) ({hertzbeat_workspace_i\
            d=\\"default\\", __name__=\\"codex_remote_models_fetch_update_duration_ms_milliseconds_count\\"})","datasource":"Greptime-promql","queryMode\
            ":"promql","results":{"refId":"otlp-metrics-console","status":200,"msg":null,"frames":[{"schema":{"fields":[{"name":"__ts__","type":"time","\
            unit":null},{"name":"__value__","type":"number","unit":null}],"labels":{"__name__":"codex_remote_models_fetch_update_duration_ms_millisecond\
            s_count","deployment_environment_name":"local-preview","service_name":"codex-app-server"},"meta":null},"data":[[1792325229000,"1"],[17923252\
            89000,"1"],[1792325349000,"1"],[1792325409000,"1"],[1792325469000,"1"],[1792325529000,"1"]]}]},"stats":{"totalSeries":1,"nonEmptySeries":1,"\
            latestObservedAt":1792325529000},"emptyStateReason":null,"errorMessage":null}
            """;

    @Test
    void acceptsNativeBoundedScalarAndCountsPointsRatherThanPopulation() {
        var observation = classify(query(), data(), Map.of());
        assertNotNull(observation);
        assertEquals("otlp-metric-points", observation.kind());
        assertEquals(6, observation.count());
    }

    @Test
    void acceptsSuccessfulEmptyWindowButRejectsFailedEmptyWindow() {
        var data = data();
        map(data.get("results")).put("frames", List.of());
        var stats = new LinkedHashMap<String, Object>(Map.of("totalSeries", 0, "nonEmptySeries", 0));
        stats.put("latestObservedAt", null);
        data.put("stats", stats);
        data.put("emptyStateReason", "no_matching_metrics");
        assertEquals(0, classify(query(), data, Map.of()).count());
        data.put("emptyStateReason", "load_failed");
        assertNull(classify(query(), data, Map.of()));
    }

    @Test
    void rejectsFailurePartialProjectionAndMissingMetadata() {
        assertNull(classify(query(), data(), Map.of("partial", true)));
        assertNull(classify(query(), data(), Map.of("projectionTruncated", true)));
        var data = data();
        map(data.get("results")).put("status", 503);
        assertNull(classify(query(), data, Map.of()));
        data = data();
        data.remove("stats");
        assertNull(classify(query(), data, Map.of()));
    }

    @Test
    void rejectsWrongWindowScopeAndMetric() {
        var query = query();
        query.put("end", 1792325529086L);
        assertNull(classify(query, data(), Map.of()));
        for (String key : List.of("entityId", "entityType", "serviceName", "serviceNamespace", "environment",
                "collectorId", "instance", "endpoint", "operationName")) {
            query = query();
            query.put(key, key.equals("entityId") ? 42L : "another-scope");
            assertNull(classify(query, data(), Map.of()), key);
        }
        query = query();
        query.put("query", "another_metric");
        assertNull(classify(query, data(), Map.of()));
    }

    @Test
    void rejectsInconsistentStatisticsMalformedRowsAndOutOfWindowSamples() {
        var data = data();
        map(data.get("stats")).put("nonEmptySeries", 0);
        assertNull(classify(query(), data, Map.of()));
        data = data();
        map(data.get("stats")).put("latestObservedAt", 1792325529001L);
        assertNull(classify(query(), data, Map.of()));
        for (Object value : List.of("NaN", "Infinity", "missing")) {
            data = data();
            frame(data).put("data", List.of(List.of(1792325529000L, value)));
            assertNull(classify(query(), data, Map.of()));
        }
        data = data();
        frame(data).put("data", List.of(List.of(1792325228000L, "1")));
        assertNull(classify(query(), data, Map.of()));
    }

    @Test
    void preservesAggregateValuesWithoutNarrowingThemIntoObservationCounts() {
        var data = data();
        frame(data).put("data", List.of(List.of(1792325529000L, "3000000000")));
        assertEquals(1, classify(query(), data, Map.of()).count());
        var context = map(data.get("context"));
        var query = query();
        context.put("serviceName", "local-sample");
        query.put("serviceName", "local-sample");
        assertNotNull(classify(query, data, Map.of()));
    }

    @Test
    void acceptsEmptySeriesOnlyWithConsistentEmptyState() {
        var data = data();
        frame(data).put("data", List.of());
        var stats = map(data.get("stats"));
        stats.put("nonEmptySeries", 0);
        stats.put("latestObservedAt", null);
        data.put("emptyStateReason", "current_time_range_no_data");
        assertEquals(0, classify(query(), data, Map.of()).count());
        data.put("emptyStateReason", "no_matching_metrics");
        assertNull(classify(query(), data, Map.of()));
    }

    @Test
    void rejectsUntrustedEnvelopeAndInvalidQueryControls() {
        var query = query();
        query.put("workspaceId", "other");
        assertNull(classify(query, data(), Map.of()));
        query = query();
        query.put("start", 1792000000000L);
        assertNull(classify(query, data(), Map.of()));
        assertNull(classify(query(), data(), Map.of("format", "text")));
        assertNull(classify(query(), data(), Map.of("data", JsonUtil.toJson(Map.of("code", 500, "data", data())))));
    }

    @Test
    void bindsDurableProofToTheSuccessfulReadAndRejectsTampering() {
        var call = call(query());
        String output = output(data(), Map.of());
        var result = AgentToolExecutionResult.builder().toolCallId(call.getToolCallId()).toolName(call.getToolName())
                .risk(AgentToolRisk.READ).status(AgentToolStatus.SUCCEEDED).decision(AgentPolicyDecision.ALLOW)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED).output(output).build();
        var evaluator = new AgentReadGroundingEvaluator();
        var proof = evaluator.evaluate("local-proof-run", call, result).orElseThrow();
        var message = TranscriptMessage.builder().role(TranscriptMessage.TranscriptRole.TOOL_RESULT)
                .toolCallId(call.getToolCallId()).toolName(call.getToolName())
                .content(List.of(TranscriptContent.text(output))).groundingProof(proof).build();
        assertTrue(evaluator.restores(message, "local-proof-run", call.getArguments()));
        var changed = query();
        changed.put("serviceName", "another-service");
        assertFalse(evaluator.restores(message, "local-proof-run", Map.of("q", changed)));
        assertFalse(evaluator.restores(message.toBuilder().content(List.of(TranscriptContent.text(output.replace("1792325529000", "1792325529001")))).build(),
                "local-proof-run", call.getArguments()));
        assertTrue(evaluator.evaluate("local-proof-run", call, result.toBuilder().status(AgentToolStatus.FAILED).build()).isEmpty());
        assertTrue(evaluator.evaluate("local-proof-run", call, result.toBuilder().risk(AgentToolRisk.CHANGE).build()).isEmpty());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> map(Object value) { return (Map<String, Object>) value; }

    private Map<String, Object> frame(Map<String, Object> data) {
        return map(((List<?>) map(data.get("results")).get("frames")).getFirst());
    }

    private Map<String, Object> data() { return JsonUtil.fromJson(DATA, Map.class); }

    private Map<String, Object> query() {
        return new LinkedHashMap<>(Map.of("start", 1792325229085L, "end", 1792325529085L,
                "query", "codex_remote_models_fetch_update_duration_ms_milliseconds_count", "limit", "1", "step", "60"));
    }

    private AgentReadObservationClassifier.Observation classify(Map<String, Object> query,
                                                               Map<String, Object> data, Map<String, Object> flags) {
        return new AgentReadObservationClassifier().classify(call(query), output(data, flags));
    }

    private AgentRuntimeToolCall call(Map<String, Object> query) {
        return AgentRuntimeToolCall.builder().toolCallId("local-otlp-proof").toolName("metrics.otlp_console")
                .arguments(Map.of("q", query)).build();
    }

    private String output(Map<String, Object> data, Map<String, Object> flags) {
        var output = new LinkedHashMap<String, Object>(Map.of("format", "json_text", "partial", false,
                "projectionTruncated", false, "data", JsonUtil.toJson(Map.of("code", 0, "data", data))));
        output.putAll(flags);
        return JsonUtil.toJson(output);
    }
}
