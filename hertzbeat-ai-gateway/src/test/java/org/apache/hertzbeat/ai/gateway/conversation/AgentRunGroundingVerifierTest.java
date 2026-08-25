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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.runtime.AgentGroundingProof;
import org.apache.hertzbeat.ai.gateway.runtime.AgentGroundingEvidenceVerifier;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeTextSanitizer;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptContent;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Durable proof and successful READ-ledger convergence tests. */
@ExtendWith(MockitoExtension.class)
class AgentRunGroundingVerifierTest {

    private static final String OUTPUT = "{\"monitorId\":99}";

    @Mock
    private AgentTranscriptRecorder transcriptRecorder;

    @Mock
    private AgentToolCallDao toolCallDao;

    @Test
    void uniqueTypedProofAndMatchingSucceededReadLedgerShouldVerify() {
        when(transcriptRecorder.findRunGroundingMessages(2L)).thenReturn(List.of(proofMessage()));
        when(toolCallDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(ledger(),
                AgentToolCall.builder().runId(2L).runUid("run-1").toolCallId("call-2")
                        .toolName("entity.query").risk(AgentToolRisk.READ.name())
                        .status(AgentToolStatus.SUCCEEDED.name()).inputJson("{}")
                        .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(Map.of()))
                        .resultOutput("{\"content\":[{\"entity\":{\"id\":7}}],\"totalElements\":1}")
                        .build()));

        assertTrue(verifier().hasDurableGrounding(run(), null));
        List<TranscriptMessage> verified = verifier().verifiedHistory(run(), null, history());
        assertTrue(verified.get(1).getGroundingProof() != null);
    }

    @Test
    void duplicateForeignMovedOrLedgerMismatchShouldFailClosed() {
        when(transcriptRecorder.findRunGroundingMessages(2L)).thenReturn(List.of(proofMessage(), proofMessage()));
        when(toolCallDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(ledger()));
        assertFalse(verifier().hasDurableGrounding(run(), null));

        AgentGroundingProof foreign = proof("run-other");
        when(transcriptRecorder.findRunGroundingMessages(2L)).thenReturn(List.of(message(foreign)));
        assertFalse(verifier().hasDurableGrounding(run(), null));

        TranscriptMessage moved = TranscriptMessage.groundedToolResult(
                "call-other", "monitor.get", OUTPUT, null, proof());
        when(transcriptRecorder.findRunGroundingMessages(2L)).thenReturn(List.of(moved));
        assertFalse(verifier().hasDurableGrounding(run(), null));

        TranscriptMessage wrongRole = proofMessage().toBuilder()
                .role(TranscriptMessage.TranscriptRole.ASSISTANT).build();
        when(transcriptRecorder.findRunGroundingMessages(2L)).thenReturn(List.of(wrongRole));
        assertFalse(verifier().hasDurableGrounding(run(), null));

        when(transcriptRecorder.findRunGroundingMessages(2L)).thenReturn(List.of(proofMessage()));
        when(toolCallDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(
                ledger(AgentToolStatus.FAILED.name(), inputHash(), OUTPUT)));
        assertFalse(verifier().hasDurableGrounding(run(), null));

        when(toolCallDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(
                ledger(AgentToolStatus.SUCCEEDED.name(), "different", OUTPUT)));
        assertFalse(verifier().hasDurableGrounding(run(), null));

        when(toolCallDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(
                ledger(AgentToolStatus.SUCCEEDED.name(), inputHash(), "{\"monitorId\":100}")));
        assertFalse(verifier().hasDurableGrounding(run(), null));

        Map<String, Object> secretArguments = Map.of(
                "monitorId", 99L, "authorization", "Bearer private-token");
        AgentGroundingProof secretProof = AgentGroundingProof.builder()
                .version("read-grounding.v1").runUid("run-1")
                .toolName("monitor.get").toolCallId("call-1")
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(secretArguments))
                .outputHash(GatewayText.sha256(AgentRuntimeTextSanitizer.redact(OUTPUT)))
                .observationKind("monitor").observationCount(1).build();
        when(transcriptRecorder.findRunGroundingMessages(2L)).thenReturn(List.of(message(secretProof)));
        when(toolCallDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(AgentToolCall.builder()
                .runId(2L).runUid("run-1").toolCallId("call-1").toolName("monitor.get")
                .risk(AgentToolRisk.READ.name()).status(AgentToolStatus.SUCCEEDED.name())
                .inputJson("{\"monitorId\":99,\"authorization\":\"[REDACTED]\"}")
                .inputHash(secretProof.getInputHash()).resultOutput(OUTPUT).build()));
        assertTrue(verifier().hasDurableGrounding(run(), null));

        when(toolCallDao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of(AgentToolCall.builder()
                .runId(2L).runUid("run-1").toolCallId("call-1").toolName("monitor.get")
                .risk(AgentToolRisk.READ.name()).status(AgentToolStatus.SUCCEEDED.name())
                .inputJson("{\"monitorId\":99,\"authorization\":\"[REDACTED]\"}")
                .inputHash("different").resultOutput(OUTPUT).build()));
        assertFalse(verifier().hasDurableGrounding(run(), null));

        List<TranscriptMessage> stripped = verifier().verifiedHistory(run(), null, history());
        assertTrue(stripped.get(1).getGroundingProof() == null);
    }

    @Test
    void alertTriggerGenericProofMustNotAuthorizeTerminalReplay() {
        AgentRun alertRun = AgentRun.builder()
                .id(2L).runUid("run-1").sessionId(1L).messageId("message-1")
                .entryType(AgentRuntimeEntryType.ALERT_TRIGGER.name())
                .status(AgentRunStatus.SUCCEEDED.name())
                .resultSummary("Unsupported alert conclusion")
                .build();
        assertFalse(verifier().hasDurableGrounding(alertRun, null));
        AgentRunSnapshot snapshot = new AgentRunSnapshotService(transcriptRecorder, verifier()).snapshot(
                AgentSession.builder().id(1L).sessionUid("session-1").build(), alertRun);
        assertFalse(snapshot.replayAvailable());
        assertTrue(snapshot.result() == null);
    }

    private AgentGroundingEvidenceVerifier verifier() {
        return new AgentGroundingEvidenceVerifier(transcriptRecorder, toolCallDao);
    }

    private AgentRun run() {
        return AgentRun.builder().id(2L).runUid("run-1")
                .entryType(AgentRuntimeEntryType.USER_INPUT.name()).build();
    }

    private TranscriptMessage proofMessage() {
        return message(proof());
    }

    private List<TranscriptMessage> history() {
        return List.of(TranscriptMessage.assistantToolCalls("Reading.", List.of(
                TranscriptContent.toolCall("call-1", "monitor.get", Map.of("monitorId", 99L))), null),
                proofMessage());
    }

    private TranscriptMessage message(AgentGroundingProof proof) {
        return TranscriptMessage.groundedToolResult("call-1", "monitor.get", OUTPUT, null, proof);
    }

    private AgentGroundingProof proof() {
        return proof("run-1");
    }

    private AgentGroundingProof proof(String runUid) {
        return AgentGroundingProof.builder()
                .version("read-grounding.v1")
                .runUid(runUid)
                .toolName("monitor.get")
                .toolCallId("call-1")
                .inputHash(inputHash())
                .outputHash(GatewayText.sha256(AgentRuntimeTextSanitizer.redact(OUTPUT)))
                .observationKind("monitor")
                .observationCount(1)
                .build();
    }

    private AgentToolCall ledger() {
        return ledger(AgentToolStatus.SUCCEEDED.name(), inputHash(), OUTPUT);
    }

    private AgentToolCall ledger(String status, String inputHash, String resultOutput) {
        return AgentToolCall.builder()
                .runId(2L)
                .runUid("run-1")
                .toolCallId("call-1")
                .toolName("monitor.get")
                .risk(AgentToolRisk.READ.name())
                .status(status)
                .inputJson("{\"monitorId\":99}")
                .inputHash(inputHash)
                .resultOutput(resultOutput)
                .build();
    }

    private String inputHash() {
        return AgentToolPayloadHasher.normalizedArgumentsHash(Map.of("monitorId", 99L));
    }
}
