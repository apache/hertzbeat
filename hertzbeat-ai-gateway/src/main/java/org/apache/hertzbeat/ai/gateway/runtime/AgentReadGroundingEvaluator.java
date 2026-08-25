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

import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.springframework.util.StringUtils;

/** Builds fail-closed proof for allowlisted, semantically non-empty HertzBeat reads. */
final class AgentReadGroundingEvaluator {

    static final String VERSION = "read-grounding.v1";

    private final AgentReadObservationClassifier classifier = new AgentReadObservationClassifier();

    Optional<AgentGroundingProof> evaluate(String runUid, AgentRuntimeToolCall call,
                                            AgentToolExecutionResult result) {
        if (!baseResultMatches(runUid, call, result)) {
            return Optional.empty();
        }
        AgentReadObservationClassifier.Observation observation = classifier.classify(call, result.getOutput());
        if (observation == null || observation.count() <= 0) {
            return Optional.empty();
        }
        return Optional.of(AgentGroundingProof.builder()
                .version(VERSION)
                .runUid(runUid)
                .toolName(call.getToolName())
                .toolCallId(call.getToolCallId())
                .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(call.getArguments()))
                .outputHash(outputHash(result.getOutput()))
                .observationKind(observation.kind())
                .observationCount(observation.count())
                .build());
    }

    boolean restores(TranscriptMessage message, String runUid, Map<String, Object> arguments) {
        return restores(message, runUid, arguments,
                AgentToolPayloadHasher.normalizedArgumentsHash(arguments));
    }

    boolean restores(TranscriptMessage message, String runUid, Map<String, Object> arguments,
                     String trustedInputHash) {
        AgentGroundingProof proof = message == null ? null : message.getGroundingProof();
        return proof != null
                && message.getRole() == TranscriptMessage.TranscriptRole.TOOL_RESULT
                && VERSION.equals(proof.getVersion())
                && Objects.equals(runUid, proof.getRunUid())
                && Objects.equals(message.getToolName(), proof.getToolName())
                && Objects.equals(message.getToolCallId(), proof.getToolCallId())
                && StringUtils.hasText(proof.getInputHash())
                && Objects.equals(trustedInputHash, proof.getInputHash())
                && Objects.equals(outputHash(message.text()), proof.getOutputHash())
                && StringUtils.hasText(proof.getObservationKind())
                && proof.getObservationCount() != null
                && proof.getObservationCount() > 0
                && proof.getTargetFingerprint() == null
                && proof.getTargetVersion() == null
                && proof.getEntityId() == null
                && proof.getMonitorId() == null
                && proof.getMetricKey() == null
                && proof.getStart() == null
                && proof.getEnd() == null
                && proof.getTimezone() == null
                && proof.getAuthorityHash() == null
                && observationMatchesProof(message.getToolName(), message.text(), arguments, proof);
    }

    private boolean baseResultMatches(String runUid, AgentRuntimeToolCall call,
                                      AgentToolExecutionResult result) {
        return StringUtils.hasText(runUid)
                && call != null
                && result != null
                && result.getStatus() == AgentToolStatus.SUCCEEDED
                && result.getRisk() == AgentToolRisk.READ
                && Objects.equals(call.getToolCallId(), result.getToolCallId())
                && Objects.equals(call.getToolName(), result.getToolName())
                && StringUtils.hasText(result.getOutput());
    }

    private boolean observationMatchesProof(String toolName, String output, Map<String, Object> arguments,
                                             AgentGroundingProof proof) {
        AgentReadObservationClassifier.Observation observation = classifier.classify(
                AgentRuntimeToolCall.builder()
                        .toolCallId(proof.getToolCallId()).toolName(toolName)
                        .arguments(arguments == null ? Map.of() : arguments).build(), output);
        return observation != null
                && Objects.equals(observation.kind(), proof.getObservationKind())
                && Objects.equals(observation.count(), proof.getObservationCount());
    }

    private String outputHash(String output) {
        return GatewayText.sha256(AgentRuntimeTextSanitizer.redact(output));
    }
}
