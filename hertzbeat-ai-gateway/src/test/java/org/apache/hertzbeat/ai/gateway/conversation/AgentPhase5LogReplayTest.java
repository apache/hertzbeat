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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvidencePrompt;
import org.apache.hertzbeat.ai.gateway.runtime.RuntimePrompt;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

class AgentPhase5LogReplayTest {
    @Test
    void actualFailedScopeAndExactUtcWindowReachTheNextModelPromptWithoutRewritingText() throws Exception {
        var fixture = getClass().getResourceAsStream("/agent/phase5-log-query-replay.json");
        var calls = JsonUtil.fromJson(new String(fixture.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8)).path("calls");
        List<AgentToolCall> rows = new ArrayList<>();
        for (var call : calls) {
            var row = new AgentToolCall();
            row.setId((long) rows.size() + 1);
            row.setRunId(1L);
            row.setSessionId(2L);
            row.setRunUid("run_695260982385920");
            row.setRisk("READ");
            row.setToolCallId(call.path("toolCallId").asText());
            row.setToolName(call.path("toolName").asText());
            row.setStatus(call.path("status").asText());
            row.setInputJson(call.path("arguments").toString());
            row.setInputHash("request-" + rows.size());
            row.setResultOutput(call.path("resultOutput").isNull() ? null : call.path("resultOutput").toString());
            row.setErrorMessage(call.path("errorCode").isNull() ? null : call.path("errorCode").asText());
            rows.add(row);
        }
        var dao = mock(AgentToolCallDao.class);
        when(dao.findByRunIdOrderByGmtCreateAsc(1L)).thenReturn(rows);
        var run = new AgentRun();
        run.setId(1L);
        run.setSessionId(2L);
        run.setRunUid("run_695260982385920");
        run.setStatus("RUNNING");
        var summary = new AgentExecutionSummaryService(dao).summarize(run);
        assertEquals(7, summary.totalAttempts());
        assertEquals(1, summary.failedAttempts());
        assertEquals(1, summary.unresolvedAttempts());
        assertEquals(6, summary.queryCoverage().size());
        assertEquals("CHANGED_REQUEST_SUCCEEDED_SCOPE_UNVERIFIED", summary.failures().getFirst().recovery());
        var original = RuntimePrompt.builder().instructions("Original policy").blocks(List.of()).build();
        var prompt = AgentRuntimeEvidencePrompt.append(original, summary);
        assertEquals("Original policy", original.getInstructions());
        assertEquals(0, original.getBlocks().size());
        var evidence = JsonUtil.fromJson(prompt.getBlocks().getLast().getContent());
        assertEquals(RuntimePrompt.Role.USER, prompt.getBlocks().getLast().getRole());
        assertEquals(1, evidence.path("execution").path("failedAttempts").asInt());
        assertTrue(evidence.toString().contains("severityText must be TRACE"));
        assertTrue(evidence.toString().contains("2026-10-17T06:09:10Z"));
        assertTrue(evidence.toString().contains("2026-10-17T06:24:10.741Z"));
        assertFalse(evidence.toString().contains("05:35"));
        assertTrue(prompt.getInstructions().contains("Report every failed or denied attempt"));
        assertTrue(prompt.getInstructions().contains("Do not recompute UTC"));
        assertFalse(evidence.toString().contains("resultOutput"));
        assertFalse(evidence.toString().contains("inputJson"));
    }

    @Test
    void unavailableLedgerNeverBecomesZeroFailuresOrCompleteCoverage() {
        var p = AgentRuntimeEvidencePrompt.append(RuntimePrompt.builder().instructions("").blocks(List.of()).build(),
                AgentExecutionSummary.unavailable());
        assertTrue(p.getBlocks().getLast().getContent().contains("UNKNOWN"));
        assertTrue(p.getBlocks().getLast().getContent().contains("\"failedAttempts\":null"));
    }
}
