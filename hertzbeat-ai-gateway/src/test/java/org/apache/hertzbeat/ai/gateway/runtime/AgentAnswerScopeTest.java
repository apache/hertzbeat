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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.ArrayDeque;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

class AgentAnswerScopeTest {
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-08-15T00:00:00Z"), ZoneOffset.UTC);

    @Test
    void oneSampleWithExactTotalCompletesCountWithoutAuditOrOtherSignals() {
        var result = run("How many monitors are there now?", "COUNT", page(6, true, "COUNT"),
                "Currently there are 6 monitors.", List.of());
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, result.events.getLast().getType());
        assertEquals("Currently there are 6 monitors.", result.text());
        assertFalse(result.text().contains("NOT_QUERIED"));
        assertFalse(result.text().contains("Next checks"));
        assertEquals(1, result.toolCalls);
    }

    @Test
    void requestedPageKeepsNaturalAnswerWithoutClaimingFullList() {
        var result = run("Show one monitor", "PAGE", page(6, true, "PAGE"),
                "Here is the first monitor: demo. There are 6 matching monitors.", List.of());
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, result.events.getLast().getType());
        assertEquals("Here is the first monitor: demo. There are 6 matching monitors.", result.text());
    }

    @Test
    void legacyQueryAlsoDoesNotReplaceNaturalCountWithAnAuditTemplate() {
        var result = run("How many monitors?", "PAGE", "{\"content\":[{\"monitorId\":42}],\"totalElements\":6}",
                "Currently there are 6 monitors.", List.of());
        assertEquals("Currently there are 6 monitors.", result.text());
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, result.events.getLast().getType());
    }

    @Test
    void zeroMatchingMonitorsCompleteCountWithoutProvingHealth() {
        var result = run("How many monitors?", "COUNT", page(0, false, "COUNT"),
                "Currently there are 0 monitors.", List.of());
        assertEquals("Currently there are 0 monitors.", result.text());
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, result.events.getLast().getType());
    }

    @Test
    void allRowsRequireCompletePagesButCountDoesNot() {
        var result = run("Show the inventory", "ALL_ROWS", page(6, true, "ALL_ROWS"),
                "I found demo.", List.of());
        assertEquals(AgentRuntimeEventType.ERROR, result.events.getLast().getType());
        assertTrue(result.text().contains("monitor"));
        assertFalse(result.text().contains("NOT_QUERIED"));
    }

    @Test
    void requestedCrossSignalsStillRequireOnlyTheirOwnData() {
        var result = run("cross-signal logs and traces", "COUNT", page(6, true, "COUNT"),
                "There are 6 monitors; logs and traces could not be verified.", List.of());
        assertEquals(AgentRuntimeEventType.ERROR, result.events.getLast().getType());
        assertFalse(result.text().contains("entity: NOT_QUERIED"));
        assertFalse(result.text().contains("topology: NOT_QUERIED"));
    }

    @Test
    void countAfterAnEarlierDiagnosticDoesNotInheritItsOtherSignals() {
        var result = run("How many monitors now?", "COUNT", page(6, true, "COUNT"),
                "Currently there are 6 monitors.", List.of(TranscriptMessage.userText("cross-signal metrics logs traces")));
        assertEquals("Currently there are 6 monitors.", result.text());
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, result.events.getLast().getType());
    }

    @Test
    void filteredCountUsesTheMatchingTotalAndDoesNotClaimTheGlobalPopulation() {
        Map<String, Object> filters = Map.of("ids", List.of(42, 43, 44, 45, 46, 47), "status", "up");
        Map<String, Object> output = JsonUtil.fromJson(page(6, true, "COUNT"), Map.class);
        ((Map<String, Object>) output.get("queryMetadata")).put("filters", filters);
        var result = runWithArguments("How many of these selected online monitors?", "COUNT", JsonUtil.toJson(output),
                "Currently there are 6 monitors matching these filters.", List.of(), filters);
        assertEquals("Currently there are 6 monitors matching these filters.", result.text());
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, result.events.getLast().getType());
    }

    @Test
    void mismatchedFiltersDoNotAuthorizeCount() {
        var result = runWithArguments("How many selected monitors?", "COUNT", page(6, true, "COUNT"),
                "There are 6 selected monitors.", List.of(), Map.of("ids", List.of(42)));
        assertEquals(AgentRuntimeEventType.ERROR, result.events.getLast().getType());
        assertFalse(result.text().contains("There are 6"));
    }

    @Test
    void oneOnlineSampleCannotEstablishPopulationStatusStatistics() {
        var result = run("Give the monitor status breakdown", "STATUS_COUNTS", page(6, true, "STATUS_COUNTS"),
                "All 6 monitors are up.", List.of());
        assertEquals(AgentRuntimeEventType.ERROR, result.events.getLast().getType());
        assertFalse(result.text().contains("All 6"));
        assertTrue(result.text().contains("status aggregates"));
    }

    @Test
    void unsupportedHistoricalWindowGivesBriefReasonWithoutCurrentCount() {
        var result = run("Count monitors in last week's window", "TIME_RANGE",
                "{\"state\":\"unsupported_time_range\",\"reasonCode\":\"MONITOR_HISTORY_FILTER_UNSUPPORTED\"}",
                "There are 6 monitors.", List.of());
        assertEquals(AgentRuntimeEventType.ERROR, result.events.getLast().getType());
        assertTrue(result.text().contains("current snapshot only"));
        assertFalse(result.text().contains("6"));
    }

    @Test
    void chineseCountReplyUsesTheLocaleCatalogAndStaysBrief() {
        var report = AgentVerifiedEvidenceReport.forRequest("Count monitors", java.util.Locale.CHINESE);
        report.observe("monitor.query", Map.of("purpose", "COUNT", "pageSize", 1), true, page(6, true, "COUNT"));
        var expected = java.util.ResourceBundle.getBundle("agent_evidence", java.util.Locale.CHINESE)
                .getString("answer.count").replace("{0}", "6");
        assertEquals(expected, report.conciseAnswer());
        assertTrue(report.conciseAnswer().length() < 60);
        assertFalse(report.needsCoverage());
    }

    @Test
    void emptyLegacyPageCannotTurnIntoAnUnsupportedHealthyConclusion() {
        var result = run("Inspect monitors", "PAGE", "{\"content\":[],\"totalElements\":0}",
                "No monitors matched this query.", List.of());
        assertEquals("No monitors matched this query.", result.text());
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, result.events.getLast().getType());
    }

    @Test
    void completedCrossSignalAnalysisDoesNotCollapseIntoOnlyTheMonitorCount() {
        var report = AgentVerifiedEvidenceReport.forRequest("cross-signal logs and traces", java.util.Locale.ENGLISH);
        report.observe("monitor.query", Map.of("purpose", "COUNT", "pageSize", 1), true, page(6, true, "COUNT"));
        report.observe("logs.query", Map.of(), true, "{\"content\":[],\"totalElements\":0}");
        report.observe("traces.query", Map.of(), true, "{\"content\":[],\"totalElements\":0}");
        assertFalse(report.needsCoverage());
        assertEquals(null, report.conciseAnswer());
    }

    @Test
    void unmatchedAggregateRemainderCannotBeInventedAsUnknownStatusRecords() {
        Map<String, Object> output = JsonUtil.fromJson(page(6, true, "STATUS_COUNTS"), Map.class);
        ((Map<String, Object>) output.get("queryMetadata")).put("statusCountsScope", "MATCHING_FILTERS");
        output.put("status", Map.of("up", 1, "down", 0, "paused", 0, "unreachable", 0));
        var result = run("Give the complete status distribution", "STATUS_COUNTS", JsonUtil.toJson(output),
                "One up and five with unknown status.", List.of());
        assertEquals(AgentRuntimeEventType.ERROR, result.events.getLast().getType());
        assertFalse(result.text().contains("five"));
        assertFalse(result.text().contains("5"));
    }

    @Test
    void consistentStatusAggregatesCompleteWithoutInventingAdditionalStatusBuckets() {
        Map<String, Object> output = JsonUtil.fromJson(page(6, true, "STATUS_COUNTS"), Map.class);
        ((Map<String, Object>) output.get("queryMetadata")).put("statusCountsScope", "MATCHING_FILTERS");
        output.put("status", Map.of("up", 6, "down", 0, "paused", 0, "unreachable", 0));
        var result = run("Give the status distribution", "STATUS_COUNTS", JsonUtil.toJson(output),
                "There are 6 up, 0 down, 0 paused and 0 unreachable.", List.of());
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, result.events.getLast().getType());
        assertTrue(result.text().contains("6 up"));
        assertFalse(result.text().contains("unknown status"));
        assertFalse(result.text().contains("healthy"));
    }

    private String page(long total, boolean row, String purpose) {
        return JsonUtil.toJson(Map.of("content", row ? List.of(Map.of("monitorId", 42, "name", "demo", "status", "up")) : List.of(),
                "totalElements", total, "pageIndex", 0, "pageSize", 1,
                "queryMetadata", Map.of("version", "monitor-query.v1", "purpose", purpose,
                        "totalScope", "MATCHING_FILTERS", "totalIsExact", true, "filters", Map.of())));
    }

    private Result run(String input, String purpose, String output, String answer, List<TranscriptMessage> history) {
        return runWithArguments(input, purpose, output, answer, history, Map.of());
    }

    private Result runWithArguments(String input, String purpose, String output, String answer,
                                    List<TranscriptMessage> history, Map<String, Object> filters) {
        var bridge = mock(AgentToolBridge.class);
        when(bridge.visibleTools()).thenReturn(List.of());
        when(bridge.discoverableTools(any(), any(), any())).thenReturn(List.of());
        int[] calls = {0};
        when(bridge.execute(any(), any(), any(), any(), any())).thenAnswer(invocation -> {
            calls[0]++;
            return AgentToolExecutionResult.builder().toolCallId("query").toolName("monitor.query")
                    .risk(AgentToolRisk.READ).status(AgentToolStatus.SUCCEEDED).decision(AgentPolicyDecision.ALLOW)
                    .approvalStatus(AgentApprovalStatus.NOT_REQUIRED).output(output).build();
        });
        var arguments = new LinkedHashMap<String, Object>(filters);
        arguments.put("purpose", purpose);
        arguments.put("pageSize", 1);
        var responses = new ArrayDeque<>(List.of(AgentRuntimeModelResponse.toolCalls("", List.of(
                AgentRuntimeToolCall.builder().toolCallId("query").toolName("monitor.query")
                        .arguments(arguments).build()), null),
                AgentRuntimeModelResponse.finalAnswer(answer, null)));
        AgentRuntimeModelClient client = AgentTaskCompletionTestClient.observation(
                (request, control, deltas) -> responses.remove(), "monitor");
        var ctx = AgentRuntimeContext.builder().entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION).channelId("web-ui").receivedAt(1L)
                .actor(AgentActor.builder().type("user").id("alice").roles(List.of("user")).build())
                .userMessage(input).preferredLanguage("en").workspaceId("default").sessionUid("session").runId(2L)
                .runUid("scope-run").runSessionId(1L).currentTimeIso("2026-08-15T00:00:00Z").timezone("UTC")
                .traceId("trace").chatHistory(history).build();
        var events = new ArrayList<AgentRuntimeEvent>();
        var transcript = new ArrayList<TranscriptMessage>();
        var properties = new AgentRuntimeProperties();
        properties.setMaxSteps(3);
        try (var control = AgentRuntimeControl.forContext(ctx, CLOCK)) {
            new AgentRuntimeLoop(properties, client, bridge, CLOCK).run(ctx, control, events::add, message -> {
                transcript.add(message);
                return (long) transcript.size();
            });
        }
        return new Result(events, transcript, calls[0]);
    }

    private record Result(List<AgentRuntimeEvent> events, List<TranscriptMessage> transcript, int toolCalls) {
        String text() {
            return transcript.getLast().text();
        }
    }
}
