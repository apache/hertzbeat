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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.Test;

import java.util.List;

/** Current-run ledger identity is validated before reading any restored payload. */
class AgentRuntimeLedgerIdentityTest {
    private final AgentTranscriptRecorder recorder = mock(AgentTranscriptRecorder.class);
    private final AgentToolCallDao dao = mock(AgentToolCallDao.class);
    private final AgentRun run =
            AgentRun.builder().id(2L).sessionId(1L).runUid("run").entryType("USER_INPUT").build();

    @Test
    void duplicateLedgerCallIdsFailBeforeOutputsCanAuthorizeProgressOrUndercountBudget() {
        var first = row("reused");
        var second = row("reused");
        when(dao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(first, second));
        assertThrows(
                IllegalStateException.class,
                () ->
                        new AgentGroundingEvidenceVerifier(recorder, dao)
                                .verifyHistory(run, null, List.of()));
        verify(first, never()).getResultOutput();
        verify(second, never()).getResultOutput();
    }

    @Test
    void safeReceiptRestorationNeverReadsNonReadInputJson() {
        var row = row("once");
        when(dao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(row));
        var verified =
                new AgentGroundingEvidenceVerifier(recorder, dao)
                        .verifyHistory(run, null, List.of());
        assertEquals(1, verified.budgetAttempts().size());
        assertEquals("bound-hash", verified.budgetAttempts().getFirst().trustedInputHash());
        verify(row, never()).getInputJson();
    }

    @Test
    void foreignRunOrSessionCannotContributeBudgetOrReceiptEvidence() {
        var row = row("foreign");
        row.setSessionId(99L);
        when(dao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(row));
        assertThrows(
                IllegalStateException.class,
                () ->
                        new AgentGroundingEvidenceVerifier(recorder, dao)
                                .verifyHistory(run, null, List.of()));
        verify(row, never()).getResultOutput();
        verify(row, never()).getInputJson();
    }

    private AgentToolCall row(String id) {
        return spy(
                AgentToolCall.builder()
                        .runId(2L)
                        .sessionId(1L)
                        .runUid("run")
                        .toolCallId(id)
                        .toolName("monitor.update")
                        .risk("CHANGE")
                        .status("SUCCEEDED")
                        .inputHash("bound-hash")
                        .resultOutput("{}")
                        .build());
    }
}
