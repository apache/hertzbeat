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

package org.apache.hertzbeat.ai.gateway.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.contract.AgentAlertIncidentContext;
import org.apache.hertzbeat.ai.gateway.contract.AgentRunRequestSnapshot;
import org.apache.hertzbeat.ai.gateway.contract.AgentServiceRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTopologyRef;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunSnapshot;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunSnapshotService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunStatus;
import org.apache.hertzbeat.ai.gateway.conversation.AgentTranscriptRecorder;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Durable exact-request recovery contracts for fresh WebUI retry. */
@ExtendWith(MockitoExtension.class)
class AgentRunRequestRecoveryTest {

    @Mock
    private AgentTranscriptRecorder transcriptRecorder;

    @Test
    void exactRunBoundRequestShouldProjectSafeFreshRetryMaterial() {
        AgentRunRequestSnapshot request = request("Inspect checkout", List.of("artifact-a", "artifact-b"));
        when(transcriptRecorder.findUniqueRunRequestMessage(2L)).thenReturn(Optional.of(message(request)));

        AgentRunSnapshot snapshot = service().snapshot(session(), failedRun());

        assertEquals("conversation-1", snapshot.retryRequest().conversationId());
        assertEquals("message-1", snapshot.retryRequest().messageId());
        assertEquals("Inspect checkout", snapshot.retryRequest().message());
        assertEquals(List.of("artifact-a", "artifact-b"), snapshot.retryRequest().attachments());
        assertEquals("en-US", snapshot.retryRequest().preferredLanguage());
        assertEquals(42L, snapshot.retryRequest().target().getMonitorId());
        assertEquals("Warehouse unavailable", snapshot.errorMessage());
        assertEquals(true, snapshot.replayAvailable());

        AgentRun cancelled = failedRun();
        cancelled.setStatus(AgentRunStatus.CANCELLED.name());
        cancelled.setErrorMessage("Cancelled by operator");
        assertEquals("message-1", service().snapshot(session(), cancelled).retryRequest().messageId());

        AgentRun succeeded = failedRun();
        succeeded.setStatus(AgentRunStatus.SUCCEEDED.name());
        succeeded.setResultSummary("Completed investigation");
        assertNull(service().snapshot(session(), succeeded).retryRequest());
    }

    @Test
    void legacyPrunedRedactedAndMismatchedMarkersShouldFailClosed() {
        AgentRun run = failedRun();
        AgentRunRequestSnapshot exact = request("Inspect checkout", List.of("artifact-a"));
        List<TranscriptMessage> invalid = List.of(
                TranscriptMessage.userText("Inspect checkout", AgentRunRequestFingerprint.VERSION,
                        AgentRunRequestFingerprint.from(exact)),
                message(exact).toBuilder().pruned(true).build(),
                message(request("token=[REDACTED]", List.of("artifact-a"))).toBuilder()
                        .requestFingerprint(AgentRunRequestFingerprint.from(
                                request("token=private", List.of("artifact-a"))))
                        .build(),
                message(exact.toBuilder().target(AgentTargetRef.builder().monitorId(43L).build()).build()),
                message(exact.toBuilder().alertIncident(AgentAlertIncidentContext.builder()
                        .analysisPolicyId(1L).alertIds(List.of(2L)).alertCount(1).windowStartedAt(1L).build()).build()),
                message(exact.toBuilder().approvalHandling(AgentApprovalHandling.DENY.name()).build()),
                message(exact.toBuilder().replyMode(GatewayCommand.ReplyMode.FINAL_ONLY.name()).build()));
        for (TranscriptMessage candidate : invalid) {
            when(transcriptRecorder.findUniqueRunRequestMessage(2L)).thenReturn(Optional.of(candidate));
            assertNull(service().snapshot(session(), run).retryRequest());
        }
        when(transcriptRecorder.findUniqueRunRequestMessage(2L)).thenReturn(Optional.empty());
        assertNull(service().snapshot(session(), run).retryRequest());

        AgentSession foreignChannel = session();
        foreignChannel.setChannel("system");
        assertNull(service().snapshot(foreignChannel, run).retryRequest());
    }

    @Test
    void canonicalTargetShouldReloadExactlyButRetryOnlyTheSourceIntent() {
        AgentTargetRef canonical = canonicalTarget();
        AgentRunRequestSnapshot request = request("Inspect checkout", List.of()).toBuilder()
                .target(canonical).build();
        AgentRun run = failedRun();
        run.setTargetContextJson(org.apache.hertzbeat.common.util.JsonUtil.toJson(canonical));
        when(transcriptRecorder.findUniqueRunRequestMessage(2L)).thenReturn(Optional.of(message(request)));

        AgentRunSnapshot snapshot = service().snapshot(session(), run);

        assertEquals(canonical, snapshot.target());
        assertEquals(42L, snapshot.retryRequest().target().getMonitorId());
        assertEquals("basic.qps", snapshot.retryRequest().target().getSignal().getQuery());
        assertNull(snapshot.retryRequest().target().getEntityId());
        assertNull(snapshot.retryRequest().target().getService());
        assertNull(snapshot.retryRequest().target().getAuthority());
    }

    @Test
    void canonicalEntityShouldReloadExactlyButRetryOnlyTheEntityId() {
        AgentTargetRef canonical = AgentTargetRef.builder()
                .version(AgentEntityTargetAuthorityService.TARGET_VERSION)
                .entityId(84L)
                .authority(AgentTargetAuthority.builder()
                        .bindingId(84L)
                        .version(AgentEntityTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "b".repeat(64))
                        .build())
                .build();
        AgentRunRequestSnapshot request = request("Inspect entity", List.of()).toBuilder()
                .target(canonical).build();
        AgentRun run = failedRun();
        run.setTargetContextJson(org.apache.hertzbeat.common.util.JsonUtil.toJson(canonical));
        when(transcriptRecorder.findUniqueRunRequestMessage(2L)).thenReturn(Optional.of(message(request)));

        AgentRunSnapshot snapshot = service().snapshot(session(), run);

        assertEquals(canonical, snapshot.target());
        assertEquals(84L, snapshot.retryRequest().target().getEntityId());
        assertNull(snapshot.retryRequest().target().getVersion());
        assertNull(snapshot.retryRequest().target().getMonitorId());
        assertNull(snapshot.retryRequest().target().getAuthority());
    }

    @Test
    void canonicalTopologyShouldReloadExactlyButRetryOnlyTheNormalizedSourceScope() {
        AgentTopologyRef topology = AgentTopologyRef.builder()
                .rootEntityId(84L).nodeId("entity:84").depth(2)
                .environment("prod").sourceKind("otlp-trace-call")
                .start(1_000L).end(2_000L).relationType("trace-call")
                .hideInternal(true).pageIndex(0).pageSize(50)
                .build();
        AgentTargetRef canonical = AgentTargetRef.builder()
                .version(AgentTopologyTargetAuthorityService.TARGET_VERSION)
                .entityId(84L)
                .topology(topology)
                .authority(AgentTargetAuthority.builder()
                        .bindingId(84L)
                        .version(AgentTopologyTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "c".repeat(64))
                        .build())
                .build();
        AgentRunRequestSnapshot request = request("Inspect topology", List.of()).toBuilder()
                .target(canonical).build();
        AgentRun run = failedRun();
        run.setTargetContextJson(org.apache.hertzbeat.common.util.JsonUtil.toJson(canonical));
        when(transcriptRecorder.findUniqueRunRequestMessage(2L)).thenReturn(Optional.of(message(request)));

        AgentRunSnapshot snapshot = service().snapshot(session(), run);

        assertEquals(canonical, snapshot.target());
        assertEquals(topology, snapshot.retryRequest().target().getTopology());
        assertNull(snapshot.retryRequest().target().getVersion());
        assertNull(snapshot.retryRequest().target().getEntityId());
        assertNull(snapshot.retryRequest().target().getAuthority());
    }

    private TranscriptMessage message(AgentRunRequestSnapshot request) {
        return TranscriptMessage.userText(request.message(), AgentRunRequestFingerprint.VERSION,
                AgentRunRequestFingerprint.from(request), request);
    }

    private AgentRunRequestSnapshot request(String message, List<String> attachments) {
        return AgentRunRequestSnapshot.builder()
                .version(AgentRunRequestSnapshot.VERSION)
                .conversationId("conversation-1")
                .messageId("message-1")
                .entryType(AgentRuntimeEntryType.USER_INPUT.name())
                .target(AgentTargetRef.builder().monitorId(42L).build())
                .message(message)
                .attachments(attachments)
                .preferredLanguage("en-US")
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION.name())
                .replyMode(GatewayCommand.ReplyMode.STREAM.name())
                .build();
    }

    private AgentRunSnapshotService service() {
        return new AgentRunSnapshotService(transcriptRecorder, org.mockito.Mockito.mock(
                org.apache.hertzbeat.ai.gateway.runtime.AgentGroundingEvidenceVerifier.class));
    }

    private AgentSession session() {
        return AgentSession.builder().id(1L).sessionUid("session-1").conversationId("conversation-1")
                .channel("web-ui").originEntryType(AgentRuntimeEntryType.USER_INPUT.name()).build();
    }

    private AgentRun failedRun() {
        return AgentRun.builder().id(2L).runUid("run-1").sessionId(1L).messageId("message-1")
                .entryType(AgentRuntimeEntryType.USER_INPUT.name())
                .targetContextJson(org.apache.hertzbeat.common.util.JsonUtil.toJson(
                        AgentTargetRef.builder().monitorId(42L).build()))
                .status(AgentRunStatus.FAILED.name()).errorMessage("Warehouse unavailable").build();
    }

    private AgentTargetRef canonicalTarget() {
        return AgentTargetRef.builder().version("entity-monitor-metric.v1").entityId(7L).monitorId(42L)
                .service(AgentServiceRef.builder().name("checkout").namespace("commerce").environment("prod").build())
                .signal(AgentSignalRef.builder().type("metrics").query("basic.qps")
                        .start(1_000L).end(2_000L).timezone("UTC").build())
                .authority(AgentTargetAuthority.builder().bindingId(11L).version("1")
                        .hash("sha256:" + "a".repeat(64)).build()).build();
    }
}
