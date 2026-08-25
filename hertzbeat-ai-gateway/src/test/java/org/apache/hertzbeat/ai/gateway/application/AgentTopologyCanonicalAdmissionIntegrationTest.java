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
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTopologyRef;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentTranscriptEntryDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.service.entity.EntityWorkspaceQueryService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

/** Real H2 admission proof for exact focused Topology targets. */
@SpringJUnitConfig
@ContextConfiguration(classes = AgentRunAdmissionConcurrencyIntegrationTest.TestApplication.class)
class AgentTopologyCanonicalAdmissionIntegrationTest {

    @Autowired
    private AgentRunAdmissionService admissionService;
    @Autowired
    private AgentSessionDao sessionDao;
    @Autowired
    private AgentRunDao runDao;
    @Autowired
    private AgentTranscriptEntryDao transcriptDao;
    @Autowired
    private EntityWorkspaceQueryService entityWorkspaceQueryService;

    @BeforeEach
    void setUp() {
        reset(entityWorkspaceQueryService);
        when(entityWorkspaceQueryService.findEntityById("workspace-a", 42L))
                .thenReturn(Optional.of(entity("healthy")));
    }

    @AfterEach
    void cleanDatabase() {
        transcriptDao.deleteAll();
        runDao.deleteAll();
        sessionDao.deleteAll();
        reset(entityWorkspaceQueryService);
    }

    @Test
    void exactTopologyShouldPersistReplayAndRecanonicalizeAfterRootEntityDrift() {
        AgentRunAdmission first = admissionService.admit(command("message-1", exactScope()));
        AgentTargetRef persisted = AgentRunService.targetFromRun(first.run());
        assertEquals(AgentTopologyTargetAuthorityService.TARGET_VERSION, persisted.getVersion());
        assertEquals(42L, persisted.getEntityId());
        assertEquals(exactScope(), persisted.getTopology());
        assertEquals(persisted, userTranscript().getRequestSnapshot().target());
        String originalHash = persisted.getAuthority().getHash();

        when(entityWorkspaceQueryService.findEntityById("workspace-a", 42L))
                .thenReturn(Optional.of(entity("degraded")));
        AgentRunAdmission replay = admissionService.admit(command("message-1", exactScope()));
        AgentRunAdmission next = admissionService.admit(command("message-2", exactScope()));

        assertEquals(AgentRunAdmission.Decision.REPLAY_ACTIVE, replay.decision());
        assertEquals(AgentRunAdmission.Decision.EXECUTE_NEW, next.decision());
        assertEquals(originalHash, AgentRunService.targetFromRun(replay.run()).getAuthority().getHash());
        assertNotEquals(originalHash, AgentRunService.targetFromRun(next.run()).getAuthority().getHash());
        verify(entityWorkspaceQueryService, times(2)).findEntityById("workspace-a", 42L);
    }

    @Test
    void omittedOptionalScopeMustReplayAgainstTheSameNormalizedDurableTarget() {
        AgentTopologyRef minimal = AgentTopologyRef.builder().rootEntityId(42L).depth(1).build();

        AgentRunAdmission first = admissionService.admit(command("message-defaults", minimal));
        AgentRunAdmission replay = admissionService.admit(command("message-defaults", minimal));
        AgentTopologyRef persisted = AgentRunService.targetFromRun(first.run()).getTopology();

        assertEquals(AgentRunAdmission.Decision.EXECUTE_NEW, first.decision());
        assertEquals(AgentRunAdmission.Decision.REPLAY_ACTIVE, replay.decision());
        assertEquals("entity-relation", persisted.getSourceKind());
        assertEquals(false, persisted.getHideInternal());
        assertEquals(0, persisted.getPageIndex());
        assertEquals(50, persisted.getPageSize());
    }

    @Test
    void unavailableMalformedOrForgedTopologyMustCreateNoDurableState() {
        reset(entityWorkspaceQueryService);
        assertThrows(IllegalArgumentException.class,
                () -> admissionService.admit(command("message-missing", exactScope())));

        AgentTargetRef forged = AgentTargetRef.builder()
                .version(AgentTopologyTargetAuthorityService.TARGET_VERSION)
                .entityId(42L)
                .topology(exactScope())
                .authority(AgentTargetAuthority.builder().bindingId(42L)
                        .version(AgentTopologyTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "0".repeat(64)).build())
                .build();
        assertThrows(IllegalArgumentException.class,
                () -> admissionService.admit(withTarget(command("message-forged", exactScope()), forged)));
        assertThrows(IllegalArgumentException.class, () -> admissionService.admit(command(
                "message-malformed", exactScope().toBuilder().nodeId("node").edgeId("edge").build())));

        assertEquals(0, sessionDao.count());
        assertEquals(0, runDao.count());
        assertEquals(0, transcriptDao.count());
    }

    private InvokeCommand command(String messageId, AgentTopologyRef topology) {
        return InvokeCommand.builder()
                .envelope(GatewayEnvelope.builder().channelId("web-ui").workspaceId("workspace-a").receivedAt(100L)
                        .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                        .build())
                .replyMode(ReplyMode.STREAM)
                .commandId(messageId)
                .userInput(UserInput.builder().conversationId("topology-conversation").messageId(messageId)
                        .target(AgentTargetRef.builder().topology(topology).build())
                        .message(UserInput.Message.builder().text("inspect topology").build()).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .build();
    }

    private AgentTopologyRef exactScope() {
        return AgentTopologyRef.builder()
                .rootEntityId(42L).nodeId("entity:42").depth(2)
                .environment("prod").sourceKind("otlp-trace-call")
                .start(1_000L).end(2_000L).relationType("trace-call")
                .hideInternal(true).pageIndex(0).pageSize(50)
                .build();
    }

    private ObserveEntity entity(String status) {
        return ObserveEntity.builder().workspaceId("workspace-a").id(42L).type("service").name("checkout")
                .displayName("Checkout API").namespace("commerce").environment("prod").status(status)
                .criticality("high").owner("sre").lifecycle("production").tier("tier1").system("commerce")
                .source("manual").description("Checkout service").build();
    }

    private InvokeCommand withTarget(InvokeCommand command, AgentTargetRef target) {
        return new InvokeCommand(command.envelope(), command.replyMode(), command.commandId(),
                command.userInput().toBuilder().target(target).build(), command.entryType());
    }

    private TranscriptMessage userTranscript() {
        var entry = transcriptDao.findBySessionIdOrderBySessionSequenceAsc(
                        sessionDao.findAll().getFirst().getId(), PageRequest.of(0, 20)).stream()
                .filter(candidate -> TranscriptMessage.TranscriptRole.USER.wireValue()
                        .equals(candidate.getMessageRole()))
                .findFirst()
                .orElseThrow();
        return JsonUtil.fromJson(entry.getPayloadJson(), TranscriptMessage.class);
    }
}
