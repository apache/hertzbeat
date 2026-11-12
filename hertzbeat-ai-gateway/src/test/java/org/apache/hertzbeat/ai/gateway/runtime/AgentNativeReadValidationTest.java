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

import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadGroundingTest.classify;
import static org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadGroundingTest.map;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.List;
import java.util.Map;

class AgentNativeReadValidationTest {
    private static final ObjectMapper JSON = new ObjectMapper();

    @ParameterizedTest(name = "malformed {index}")
    @MethodSource("org.apache.hertzbeat.ai.gateway.runtime.AgentNativeReadGroundingTest#fixtures")
    void rejectsContradictoryRowsCountsAndIdentities(Map<String, Object> fixture) throws Exception {
        var output = map(fixture.get("output"));
        var data = payload(fixture, output);
        switch (fixture.get("tool").toString()) {
            case "monitor.investigation" ->
                    map(map(data.get("collection")).get("event")).put("observedAt", 999999);
            case "alert.investigation" -> data.put("alertId", 99);
            case "alert.group.evidence" -> data.put("missingIds", List.of(99));
            case "alert.group.query" -> row(data, "content").put("id", -1);
            case "traces.list" -> row(data, "content").put("rootState", "missing");
            case "traces.spans" -> row(map(data.get("data")), "content").put("spanId", "invalid");
            case "traces.histogram" -> row(map(data.get("data")), "buckets").put("count", -1);
            case "traces.groups" -> map(data.get("data")).put("totalCount", 0);
            case "traces.detail" ->
                    row(map(map(data.get("gantt")).get("detail")), "spans")
                            .put("durationNanos", "-1");
            case "logs.repeated_errors.records" -> row(data, "records").put("uid", "invalid uid");
            case "logs.list", "logs.live.snapshot" -> row(data, "content").put("timeUnixNano", "1");
            case "logs.trace_coverage_stats" -> map(data.get("traceCoverage")).put("withSpan", 2);
            case "logs.trend_stats" -> row(data, "buckets").put("count", -1);
            case "logs.compare" -> data.put("matchingA", 2);
            default -> throw new AssertionError("Missing malformed contract case");
        }
        putPayload(fixture, output, data);
        assertNull(
                classify(fixture, map(fixture.get("args")), output),
                fixture.get("tool").toString());
    }

    @Test
    void acceptsReturnedLogPageWithoutClaimingTheUnreturnedPopulation() throws Exception {
        var fixture = fixture("logs.list");
        var output = map(fixture.get("output"));
        var data = payload(fixture, output);
        data.put("totalElements", 100);
        output.put("partial", true);
        putPayload(fixture, output, data);
        var observation = classify(fixture, map(fixture.get("args")), output);
        assertEquals(1, observation.count());
        assertEquals("log-page-records", observation.kind());
        output.put("projectionTruncated", true);
        assertNull(classify(fixture, map(fixture.get("args")), output));
    }

    @Test
    void preservesBoundedTraceCoverageAndRejectsUnknownCoverage() throws Exception {
        var fixture = fixture("traces.histogram");
        var output = map(fixture.get("output"));
        output.put(
                "coverage",
                Map.of(
                        "mode",
                        "bounded",
                        "rowLimit",
                        1500,
                        "scannedRows",
                        1500,
                        "truncated",
                        true));
        output.put("partial", true);
        var observation = classify(fixture, map(fixture.get("args")), output);
        assertNotNull(observation);
        assertEquals("trace-histogram-bounded", observation.kind());
        output.put("coverage", Map.of("mode", "unspecified", "truncated", false));
        assertNull(classify(fixture, map(fixture.get("args")), output));
    }

    @Test
    void rejectsFailedEmptyTelemetryAndUnaccountedMissingAlertIds() throws Exception {
        var fixture = fixture("traces.histogram");
        var output = map(fixture.get("emptyOutput"));
        output.put("state", "unavailable");
        assertNull(classify(fixture, map(fixture.get("args")), output));
        fixture = fixture("alert.group.evidence");
        output = map(fixture.get("emptyOutput"));
        map(output.get("data")).put("missingIds", List.of(8));
        assertNull(classify(fixture, map(fixture.get("args")), output));
    }

    @Test
    void rejectsAbsentPrimitiveInsteadOfDefaultingToEmptyAndRejectsDuplicateJsonKeys()
            throws Exception {
        var fixture = fixture("logs.trace_coverage_stats");
        var output = map(fixture.get("emptyOutput"));
        var data = payload(fixture, output);
        map(data.get("traceCoverage")).remove("withSpan");
        putPayload(fixture, output, data);
        assertNull(classify(fixture, map(fixture.get("args")), output));
        fixture = fixture("traces.histogram");
        String json = JSON.writeValueAsString(fixture.get("output"));
        json = json.replace("\"totalCount\":1", "\"totalCount\":0,\"totalCount\":1");
        assertNull(
                new AgentReadObservationClassifier()
                        .classify(
                                AgentNativeReadGroundingTest.call(
                                        fixture, map(fixture.get("args"))),
                                json));
    }

    @Test
    void canonicalSpanSelectionDoesNotOverrideAnExplicitRequestedSpan() throws Exception {
        var fixture = fixture("traces.detail");
        var args = new java.util.LinkedHashMap<>(map(fixture.get("args")));
        var output = map(fixture.get("output"));
        assertNotNull(classify(fixture, args, output));
        args.put("spanId", "a".repeat(16));
        assertNull(classify(fixture, args, output));
        args.put("spanId", output.get("selectedSpanId"));
        assertNotNull(classify(fixture, args, output));
    }

    private Map<String, Object> fixture(String tool) throws Exception {
        return AgentNativeReadGroundingTest.fixtures()
                .filter(item -> tool.equals(item.get("tool")))
                .findFirst()
                .orElseThrow();
    }

    private Map<String, Object> payload(Map<String, Object> fixture, Map<String, Object> output)
            throws Exception {
        if (fixture.get("kind").equals("log")) {
            return map(JSON.readValue(output.get("data").toString(), Map.class).get("data"));
        }
        return fixture.get("kind").equals("management") ? map(output.get("data")) : output;
    }

    private void putPayload(
            Map<String, Object> fixture, Map<String, Object> output, Map<String, Object> data)
            throws Exception {
        if (fixture.get("kind").equals("log")) {
            output.put("data", JSON.writeValueAsString(Map.of("code", 0, "data", data)));
        }
    }

    private Map<String, Object> row(Map<String, Object> data, String key) {
        return map(((List<?>) data.get(key)).getFirst());
    }
}
