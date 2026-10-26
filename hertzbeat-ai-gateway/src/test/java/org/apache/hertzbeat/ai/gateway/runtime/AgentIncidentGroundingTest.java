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
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.contract.AgentIncidentScope;
import org.apache.hertzbeat.ai.gateway.application.AgentIncidentTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

class AgentIncidentGroundingTest {
    @Test
    void automaticIncidentNeedsExactReadAndPersistsEveryEvidence() {
        List<TranscriptMessage> transcript = new ArrayList<>();
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, execute(transcript, true));
        assertEquals(2, transcript.stream().filter(message -> message.getGroundingProof() != null).count());
        assertEquals(AgentRuntimeEventType.ERROR, execute(new ArrayList<>(), false));
    }

    @Test
    void multipleIncidentProofsReplayOnlyWithMatchingLedger() {
        List<TranscriptMessage> transcript = new ArrayList<>();
        execute(transcript, true);
        List<TranscriptMessage> proofs = transcript.stream().filter(m -> m.getGroundingProof() != null).toList();
        AgentTranscriptRecorder recorder = mock(AgentTranscriptRecorder.class);
        AgentToolCallDao dao = mock(AgentToolCallDao.class);
        AgentRun run = AgentRun.builder().id(2L).runUid("run-incident").entryType("ALERT_TRIGGER").build();
        when(recorder.findRunGroundingMessages(2L)).thenReturn(proofs);
        when(dao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(proofs.stream().map(message -> {
            AgentGroundingProof proof = message.getGroundingProof();
            return AgentToolCall.builder().runId(2L).runUid("run-incident").toolCallId(message.getToolCallId())
                    .toolName("alert.get").risk("READ").status("SUCCEEDED").inputHash(proof.getInputHash())
                    .inputJson(JsonUtil.toJson(call(proof.getAlertId()).getArguments())).resultOutput(message.text()).build();
        }).toList());
        AgentGroundingEvidenceVerifier verifier = new AgentGroundingEvidenceVerifier(recorder, dao);
        assertTrue(verifier.hasDurableGrounding(run, target()));
        assertEquals(2, verifier.verifiedProofs(run, target()).size());
        var authority = mock(AgentIncidentTargetAuthorityService.class);
        var recoveryVerifier = new AgentGroundingEvidenceVerifier(recorder, dao, authority, null);
        when(authority.verify("w", target())).thenReturn(true);
        assertTrue(recoveryVerifier.verifyHistory(run, target(), transcript, "w").grounded());
        when(authority.verify("w", target())).thenReturn(false);
        assertFalse(recoveryVerifier.verifyHistory(run, target(), transcript, "w").grounded());
        assertTrue(recoveryVerifier.hasDurableGrounding(run, target()), "Historical evidence remains historical");
        when(dao.findByRunIdOrderByGmtCreateAsc(2L)).thenReturn(List.of());
        assertFalse(verifier.hasDurableGrounding(run, target()));
    }

    @Test
    void foreignIdEmptyRowAndDiscoveryCannotGround() {
        var evaluator = new AgentTargetGroundingEvaluator();
        assertTrue(evaluator.evaluate("run", target(), call(44L), result(44L)).isEmpty());
        var empty = AgentToolExecutionResult.builder().toolCallId("call-42").toolName("alert.get")
                .risk(AgentToolRisk.READ).status(AgentToolStatus.SUCCEEDED).decision(AgentPolicyDecision.ALLOW)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output("{\"alertId\":42,\"alertType\":\"single\",\"single\":{}}").build();
        assertTrue(evaluator.evaluate("run", target(), call(42L), empty).isEmpty());
    }

    private AgentRuntimeEventType execute(List<TranscriptMessage> transcript, boolean persist) {
        AgentToolBridge bridge = mock(AgentToolBridge.class);
        when(bridge.visibleTools()).thenReturn(List.of(AgentToolDescriptor.builder().name("alert.get")
                .namespace("alert").exposure(AgentToolExposure.MODEL_VISIBLE)
                .risk(AgentToolRisk.READ).description("Read alert").inputSchema("{\"type\":\"object\"}").build()));
        when(bridge.execute(any(), any(), any(), any(), any())).thenReturn(result(42L), result(43L));
        var responses = new ArrayDeque<>(List.of(
                AgentRuntimeModelResponse.toolCalls("", List.of(call(42L)), null),
                AgentRuntimeModelResponse.toolCalls("", List.of(call(43L)), null),
                AgentRuntimeModelResponse.finalAnswer("Observed alert facts; no entity association is verified.", null)));
        AgentRuntimeModelClient model = new AgentRuntimeModelClient() {
            public boolean supportsReplyReview() { return true; }

            public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request, AgentRuntimeControl control,
                    java.util.function.Consumer<String> consumer) {
                if (request.getPrompt().getInstructions().contains("ORIGINAL_TASK_COMPLETION_REVIEW"))
                    return AgentRuntimeModelResponse.finalAnswer(JsonUtil.toJson(new AgentTaskAssessment(
                        new AgentTaskAssessment.Goal(AgentTaskAssessment.Type.OBSERVATION, AgentTaskAssessment.Operation.QUERY, "alert", null),
                        AgentTaskOutcome.Stage.COMPLETE, true, List.of())), null);
                return responses.remove();
            }
        };
        var context = AgentRuntimeContext.builder().entryType(AgentRuntimeEntryType.ALERT_TRIGGER)
                .approvalHandling(AgentApprovalHandling.DENY).channelId("system").receivedAt(2000L)
                .actor(AgentActor.alertAnalysisActor()).userMessage("Investigate").workspaceId("w")
                .sessionUid("session").runId(2L).runUid("run-incident").runSessionId(1L)
                .currentTimeIso("2026-10-16T00:00:00Z").timezone("UTC").traceId("trace")
                .effectiveTarget(target()).build();
        List<AgentRuntimeEvent> events = new ArrayList<>();
        Clock clock = Clock.systemUTC();
        try (AgentRuntimeControl control = AgentRuntimeControl.forContext(context, clock)) {
            new AgentRuntimeLoop(new AgentRuntimeProperties(), model, bridge, clock).run(context, control,
                    events::add, message -> {
                        transcript.add(message);
                        return persist ? (long) transcript.size() : null;
                    });
        }
        if (!persist) {
            assertEquals(2, responses.size(), "Scoped evidence failure must stop before the next model request");
        }
        return events.stream().map(AgentRuntimeEvent::getType)
                .filter(type -> type == AgentRuntimeEventType.RUN_COMPLETED || type == AgentRuntimeEventType.ERROR)
                .reduce((a, b) -> b).orElseThrow();
    }

    private AgentTargetRef target() {
        return AgentTargetRef.builder().version("incident.v1").alertId(42L).alertType("single")
                .incident(new AgentIncidentScope(1L, List.of(42L, 43L), 1000, 2000))
                .authority(AgentTargetAuthority.builder().bindingId(1L).version("incident-authority.v1")
                        .hash("sha256:" + "a".repeat(64)).build()).build();
    }

    private AgentRuntimeToolCall call(Long id) {
        return AgentRuntimeToolCall.builder().toolCallId("call-" + id).toolName("alert.get")
                .arguments(Map.of("alertId", id, "alertType", "single")).build();
    }

    private AgentToolExecutionResult result(Long id) {
        String output = "{\"alertId\":" + id + ",\"alertType\":\"single\",\"single\":{\"id\":" + id
                + ",\"fingerprint\":\"f\",\"status\":\"firing\",\"content\":\"Observed\",\"triggerTimes\":1,"
                + "\"startAt\":1000,\"activeAt\":1500,\"endAt\":null,\"labels\":{},\"annotations\":{}}}";
        return AgentToolExecutionResult.builder().toolCallId("call-" + id).toolName("alert.get")
                .risk(AgentToolRisk.READ).status(AgentToolStatus.SUCCEEDED).decision(AgentPolicyDecision.ALLOW)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED).output(output).build();
    }
}
