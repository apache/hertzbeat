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

package org.apache.hertzbeat.ai.gateway.conversation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.stream.IntStream;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.dao.DataAccessResourceFailureException;

class AgentExecutionSummaryServiceTest {
    private final AgentToolCallDao dao = mock(AgentToolCallDao.class);
    private final AgentExecutionSummaryService service = new AgentExecutionSummaryService(dao);

    @Test
    void nativeAlertPagesExposeCountsButNeverInventHistoricalCoverage() {
        var alert = row(1, "SUCCEEDED", "alert-scope", "READ", "alert.query");
        alert.setInputJson("{\"alertType\":\"single\",\"pageIndex\":0,\"pageSize\":5}");
        alert.setResultOutput("{\"alertType\":\"single\",\"result\":{\"content\":[{\"id\":1}],\"totalElements\":1,\"pageIndex\":0,\"pageSize\":5}}");
        when(dao.findByRunIdOrderByGmtCreateAsc(10L)).thenReturn(List.of(alert));
        var summary = service.summarize(run("SUCCEEDED"));
        assertEquals("NO_FAILED_ATTEMPTS", summary.status());
        var coverage = summary.queryCoverage().getFirst();
        assertEquals(1L, coverage.returned());
        assertEquals(1L, coverage.total());
        assertNull(coverage.start());
        assertNull(coverage.end());
        assertEquals("single", coverage.scope().get("alertType"));
        alert.setResultOutput("{\"alertType\":\"both\",\"single\":{\"content\":[],\"totalElements\":0}}");
        assertEquals("PARTIAL", service.summarize(run("SUCCEEDED")).status());
    }

    @Test
    void rejectedWindowProjectsOnlyTimeArgumentsWithoutChangingTheHistoricalAttempt() {
        var call = row(1, "DENIED", "original", "READ", "logs.analysis");
        call.setErrorMessage("REQUESTED_WINDOW: expected [1792266771302, 1792267671302]");
        call.setInputJson("{\"q\":{\"start\":1792266771,\"end\":1792267671,\"apiKey\":\"never-project-me\"}}");
        when(dao.findByRunIdOrderByGmtCreateAsc(10L)).thenReturn(List.of(call));
        var summary = service.summarize(run("SUCCEEDED"));
        var message = summary.failures().getFirst().errorMessage();
        assertTrue(message.contains("start=1792266771"));
        assertTrue(message.contains("end=1792267671"));
        org.junit.jupiter.api.Assertions.assertFalse(message.contains("never-project-me"));
        assertEquals("DENIED", call.getStatus());
        assertEquals("original", call.getInputHash());
        assertEquals("PARTIAL", summary.status());
    }

    @ParameterizedTest
    @CsvSource({"up,NO_FAILED_ATTEMPTS,3", "down,PARTIAL,2"})
    void onlyIdenticalScopePageUnionCanClosePartialCoverage(String secondStatus, String expectedStatus, int coverageRows) {
        var first = row(1, "SUCCEEDED", "page0", "READ", "monitor.query");
        first.setInputJson("{\"purpose\":\"ALL_ROWS\",\"pageIndex\":0,\"pageSize\":1,\"status\":\"up\"}");
        first.setResultOutput("{\"content\":[{\"monitorId\":1}],\"pageIndex\":0,\"pageSize\":1,\"totalElements\":2}");
        var second = row(2, "SUCCEEDED", "page1", "READ", "monitor.query");
        second.setInputJson("{\"purpose\":\"ALL_ROWS\",\"pageIndex\":1,\"pageSize\":1,\"status\":\"" + secondStatus + "\"}");
        second.setResultOutput("{\"content\":[{\"monitorId\":2}],\"pageIndex\":1,\"pageSize\":1,\"totalElements\":2}");
        when(dao.findByRunIdOrderByGmtCreateAsc(10L)).thenReturn(List.of(first, second));
        var summary = service.summarize(run("SUCCEEDED"));
        assertEquals(expectedStatus, summary.status());
        assertEquals(coverageRows, summary.queryCoverage().size());
        assertTrue(summary.queryCoverage().getFirst().partial());
        if (coverageRows == 3) {
            var aggregate = summary.queryCoverage().getLast();
            assertEquals(2L, aggregate.returned());
            assertEquals(2L, aggregate.total());
            org.junit.jupiter.api.Assertions.assertFalse(aggregate.partial());
            assertTrue(aggregate.scope().get("coverage").contains("identical-scope"));
        }
    }

    @ParameterizedTest
    @CsvSource({
        "same,READ,metrics.history,RECOVERED,SAME_REQUEST_SUCCEEDED,1",
        "changed,READ,metrics.history,PARTIAL,CHANGED_REQUEST_SUCCEEDED_SCOPE_UNVERIFIED,0",
        "same,WRITE,metrics.history,PARTIAL,UNRESOLVED,0",
        "same,READ,logs.query,PARTIAL,UNRESOLVED,0"
    })
    void recoveryRequiresSameRequestSuccessfulRead(String hash, String risk, String name,
            String status, String recovery, int recovered) {
        AgentToolCall first = row(1, "FAILED", "same", "READ", "metrics.history");
        AgentToolCall next = row(2, "SUCCEEDED", hash, risk, name);
        when(dao.findByRunIdOrderByGmtCreateAsc(10L)).thenReturn(List.of(first, next));
        var summary = service.summarize(run("SUCCEEDED"));
        assertEquals(status, summary.status());
        assertEquals(1, summary.failedAttempts());
        assertEquals(1, summary.succeededAttempts());
        assertEquals(recovered, summary.recoveredAttempts());
        assertEquals(recovery, summary.failures().getFirst().recovery());
        assertEquals("FAILED", first.getStatus());
    }

    @Test
    void missingHashesAndEmptySuccessfulOutputCannotEraseFailure() {
        when(dao.findByRunIdOrderByGmtCreateAsc(10L)).thenReturn(List.of(
                row(1, "FAILED", null, "READ", "logs.group_by_stats"),
                row(2, "SUCCEEDED", null, "READ", "logs.group_by_stats")));
        var summary = service.summarize(run("SUCCEEDED"));
        assertEquals("PARTIAL", summary.status());
        assertEquals(1, summary.unresolvedAttempts());
    }

    @Test
    void unavailableAndMissingEvidenceAreNotZeroFailureClaims() {
        when(dao.findByRunIdOrderByGmtCreateAsc(10L)).thenReturn(List.of());
        assertEquals("NO_RECORDS", service.summarize(run("SUCCEEDED")).status());
        when(dao.findByRunIdOrderByGmtCreateAsc(10L))
                .thenThrow(new DataAccessResourceFailureException("offline"));
        var unknown = service.summarize(run("SUCCEEDED"));
        assertEquals("UNKNOWN", unknown.status());
        assertNull(unknown.failedAttempts());
    }

    @Test
    void foreignRunRowsNeverLeakIntoSummary() {
        var foreign = row(1, "FAILED", "hash", "READ", "metrics.history");
        foreign.setSessionId(999L);
        when(dao.findByRunIdOrderByGmtCreateAsc(10L)).thenReturn(List.of(foreign));
        var summary = service.summarize(run("SUCCEEDED"));
        assertEquals("UNKNOWN", summary.status());
        assertTrue(summary.failures().isEmpty());
    }

    @Test
    void truncatedFailureListRetainsTotalCounts() {
        var rows = IntStream.rangeClosed(1, 25)
                .mapToObj(i -> row(i, "DENIED", "hash", "READ", "metrics.history")).toList();
        when(dao.findByRunIdOrderByGmtCreateAsc(10L)).thenReturn(rows);
        var summary = service.summarize(run("SUCCEEDED"));
        assertEquals(25, summary.failedAttempts());
        assertEquals(20, summary.failures().size());
        assertTrue(summary.truncated());
        assertEquals("PARTIAL", summary.status());
    }

    @ParameterizedTest
    @CsvSource({"RUNNING,IN_PROGRESS", "CREATED,IN_PROGRESS", "SUCCEEDED,PARTIAL", "FAILED,PARTIAL"})
    void unfinishedAttemptsRemainExplicit(String lifecycle, String expected) {
        when(dao.findByRunIdOrderByGmtCreateAsc(10L)).thenReturn(List.of(
                row(1, "RUNNING", "hash", "READ", "metrics.history")));
        assertEquals(expected, service.summarize(run(lifecycle)).status());
    }

    @Test
    void budgetStopWithOnlySuccessfulAttemptsStillReturnsPartialReason() {
        AgentRun run = run("FAILED");
        run.setErrorMessage("PARTIAL: TOTAL_TOOL_BUDGET reached");
        when(dao.findByRunIdOrderByGmtCreateAsc(10L)).thenReturn(List.of(row(1, "SUCCEEDED", "hash", "READ", "metrics.history")));
        var summary = service.summarize(run);
        assertEquals("PARTIAL", summary.status());
        assertEquals(0, summary.failedAttempts());
        assertEquals("PARTIAL: TOTAL_TOOL_BUDGET reached", summary.stopReason());
    }

    @Test
    void partialPageFactsDoNotDependOnTheModelClaimingCompleteCoverage() {
        var page = row(1, "SUCCEEDED", "hash", "READ", "traces.query");
        page.setResultOutput("{\"content\":[{}],\"totalElements\":85,\"pageIndex\":0,\"pageSize\":1}");
        when(dao.findByRunIdOrderByGmtCreateAsc(10L)).thenReturn(List.of(page));
        var summary = service.summarize(run("SUCCEEDED"));
        assertEquals("NO_FAILED_ATTEMPTS", summary.status());
        assertTrue(summary.queryCoverage().getFirst().partial());
        assertEquals(0, summary.failedAttempts());
        assertEquals(85L, summary.queryCoverage().getFirst().total());
        assertEquals(1L, summary.queryCoverage().getFirst().returned());
    }

    private AgentRun run(String status) {
        AgentRun run = new AgentRun();
        run.setId(10L);
        run.setRunUid("run");
        run.setSessionId(20L);
        run.setStatus(status);
        return run;
    }

    private AgentToolCall row(long id, String status, String hash, String risk, String name) {
        AgentToolCall call = new AgentToolCall();
        call.setId(id);
        call.setRunId(10L);
        call.setRunUid("run");
        call.setSessionId(20L);
        call.setToolCallId("call-" + id);
        call.setToolName(name);
        call.setInputHash(hash);
        call.setRisk(risk);
        call.setStatus(status);
        call.setErrorMessage("failed request");
        if ("SUCCEEDED".equals(status)) {
            call.setResultOutput("{\"returnedPoints\":0,\"totalPoints\":0}");
        }
        return call;
    }
}
