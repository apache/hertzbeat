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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.springframework.stereotype.Service;

/** Verifies that a durable grounding proof converges with the successful READ ledger row. */
@Service
public class AgentGroundingEvidenceVerifier {

    private static final ObjectMapper QUIET_JSON = JsonMapper.builder().build();

    private final AgentTranscriptRecorder transcriptRecorder;
    private final AgentToolCallDao toolCallDao;
    private final AgentReadGroundingEvaluator readEvaluator = new AgentReadGroundingEvaluator();
    private final AgentTargetGroundingEvaluator targetEvaluator = new AgentTargetGroundingEvaluator();

    public AgentGroundingEvidenceVerifier(AgentTranscriptRecorder transcriptRecorder,
                                          AgentToolCallDao toolCallDao) {
        this.transcriptRecorder = transcriptRecorder;
        this.toolCallDao = toolCallDao;
    }

    public boolean hasDurableGrounding(AgentRun run, AgentTargetRef target) {
        if (run == null || run.getId() == null || GatewayText.isBlank(run.getRunUid())) {
            return false;
        }
        if (!groundingEligible(run)) {
            return false;
        }
        List<TranscriptMessage> candidates = transcriptRecorder.findRunGroundingMessages(run.getId()).stream()
                .filter(Objects::nonNull)
                .filter(message -> message.getRole() == TranscriptMessage.TranscriptRole.TOOL_RESULT)
                .filter(message -> message.getGroundingProof() != null)
                .filter(message -> Objects.equals(run.getRunUid(), message.getGroundingProof().getRunUid()))
                .filter(this::isTypedProof)
                .toList();
        if (candidates.size() != 1) {
            return false;
        }
        TranscriptMessage message = candidates.getFirst();
        List<AgentToolCall> matchingLedger = toolCallDao.findByRunIdOrderByGmtCreateAsc(run.getId()).stream()
                .filter(Objects::nonNull)
                .filter(call -> Objects.equals(message.getToolCallId(), call.getToolCallId())
                        && Objects.equals(message.getToolName(), call.getToolName()))
                .toList();
        return matchingLedger.size() == 1 && ledgerMatches(run, target, message, matchingLedger.getFirst());
    }

    public List<TranscriptMessage> verifiedHistory(AgentRun run, AgentTargetRef target,
                                                   List<TranscriptMessage> history) {
        return verifyHistory(run, target, history).messages();
    }

    public VerifiedHistory verifyHistory(AgentRun run, AgentTargetRef target,
                                         List<TranscriptMessage> history) {
        List<TranscriptMessage> bounded = history == null ? List.of() : List.copyOf(history);
        if (hasDurableGrounding(run, target)) {
            return new VerifiedHistory(bounded, true);
        }
        return new VerifiedHistory(bounded.stream()
                .map(message -> clearCurrentRunProof(run, message))
                .toList(), false);
    }

    private boolean ledgerMatches(AgentRun run, AgentTargetRef target, TranscriptMessage message,
                                  AgentToolCall ledger) {
        AgentGroundingProof proof = message.getGroundingProof();
        if (!(Objects.equals(run.getId(), ledger.getRunId())
                && Objects.equals(run.getRunUid(), ledger.getRunUid())
                && Objects.equals(AgentToolStatus.SUCCEEDED.name(), ledger.getStatus())
                && Objects.equals(AgentToolRisk.READ.name(), ledger.getRisk())
                && Objects.equals(proof.getInputHash(), ledger.getInputHash())
                && Objects.equals(proof.getOutputHash(), outputHash(ledger.getResultOutput()))
                && Objects.equals(proof.getOutputHash(), outputHash(message.text())))) {
            return false;
        }
        Map<String, Object> arguments = arguments(ledger.getInputJson());
        if (arguments == null) {
            return false;
        }
        return target == null
                ? readEvaluator.restores(message, run.getRunUid(), arguments, ledger.getInputHash())
                : targetEvaluator.restoresVerifiedResult(
                        message, run.getRunUid(), target, arguments, ledger.getInputHash());
    }

    private boolean groundingEligible(AgentRun run) {
        return Objects.equals(AgentRuntimeEntryType.USER_INPUT.name(), run.getEntryType())
                || Objects.equals(AgentRuntimeEntryType.SCHEDULE_TRIGGER.name(), run.getEntryType());
    }

    private boolean isTypedProof(TranscriptMessage message) {
        String version = message.getGroundingProof().getVersion();
        return Objects.equals(AgentGroundingProof.VERSION, version)
                || Objects.equals(AgentReadGroundingEvaluator.VERSION, version);
    }

    private TranscriptMessage clearCurrentRunProof(AgentRun run, TranscriptMessage message) {
        if (message == null || message.getGroundingProof() == null
                || !Objects.equals(run.getRunUid(), message.getGroundingProof().getRunUid())) {
            return message;
        }
        return message.toBuilder().groundingProof(null).groundingRunUid(null).build();
    }

    private String outputHash(String output) {
        return GatewayText.sha256(AgentRuntimeTextSanitizer.redact(output));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> arguments(String json) {
        try {
            Object value = QUIET_JSON.readValue(json, Object.class);
            return value instanceof Map<?, ?> map ? (Map<String, Object>) map : null;
        } catch (IOException | RuntimeException ignored) {
            return null;
        }
    }

    /** History projection plus the trusted durable-grounding decision made from proof and ledger together. */
    static final class VerifiedHistory {

        private final List<TranscriptMessage> messages;
        private final boolean grounded;

        private VerifiedHistory(List<TranscriptMessage> messages, boolean grounded) {
            this.messages = messages == null ? List.of() : List.copyOf(messages);
            this.grounded = grounded;
        }

        List<TranscriptMessage> messages() {
            return messages;
        }

        boolean grounded() {
            return grounded;
        }
    }
}
