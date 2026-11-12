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

package org.apache.hertzbeat.ai.gateway.permission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalActorVerifier;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentSessionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

class AgentPermissionModeServiceTest {
    final AgentActor actor =
            AgentActor.builder().type("user").id("owner").roles(List.of("user")).build();
    final GatewayEnvelope envelope =
            GatewayEnvelope.builder()
                    .channelId("web-ui")
                    .workspaceId("isolated")
                    .actor(actor)
                    .receivedAt(1L)
                    .build();
    final MutableClock clock = new MutableClock();
    AgentPermissionModeService service;
    AgentPermissionStateDao states;
    AgentPermissionAuditDao audits;
    AgentApprovalActorVerifier verifier;

    @BeforeEach
    void setup() {
        var sessions = mock(AgentSessionDao.class);
        states = mock(AgentPermissionStateDao.class);
        audits = mock(AgentPermissionAuditDao.class);
        verifier = mock(AgentApprovalActorVerifier.class);
        var row =
                AgentSession.builder()
                        .id(1L)
                        .sessionUid("ags-test")
                        .sessionKey("key")
                        .workspaceId("isolated")
                        .channel("web-ui")
                        .actorType("user")
                        .actorId("owner")
                        .actorRoles("[\"user\"]")
                        .originEntryType("USER_INPUT")
                        .status(AgentSessionStatus.ACTIVE)
                        .build();
        when(sessions
                        .findBySessionUidAndWorkspaceIdAndChannelAndActorTypeAndActorIdAndOriginEntryType(
                                eq("ags-test"),
                                eq("isolated"),
                                eq("web-ui"),
                                eq("user"),
                                eq("owner"),
                                eq("USER_INPUT")))
                .thenReturn(Optional.of(row));
        when(sessions.findBySessionUid("ags-test")).thenReturn(Optional.of(row));
        when(sessions.findFirstById(1L)).thenReturn(Optional.of(row));
        when(verifier.isCurrent(actor)).thenReturn(true);
        Map<String, AgentPermissionState> data = new ConcurrentHashMap<>();
        when(states.findById(anyString()))
                .thenAnswer(i -> Optional.ofNullable(data.get(i.getArgument(0))));
        when(states.save(any()))
                .thenAnswer(
                        i -> {
                            AgentPermissionState value = i.getArgument(0);
                            data.put(value.getId(), value);
                            return value;
                        });
        when(states.countActiveGrant(
                        anyString(),
                        org.mockito.ArgumentMatchers.anyLong(),
                        anyString(),
                        org.mockito.ArgumentMatchers.anyLong()))
                .thenAnswer(
                        i -> {
                            var state = data.get(i.getArgument(0));
                            return state != null
                                            && state.getGeneration() == (long) i.getArgument(1)
                                            && "FULL".equals(state.getMode())
                                            && state.getExpiresAt() > (long) i.getArgument(3)
                                            && state.getRolesHash().equals(i.getArgument(2))
                                    ? 1L
                                    : 0L;
                        });
        service = new AgentPermissionModeService(sessions, states, audits, verifier, clock);
    }

    @Test
    void delayExplicitConsentReplayRevocationAndExpiryAreServerEnforced() {
        assertEquals("MANUAL", service.status(envelope, "ags-test").mode());
        var challenge = service.challenge(envelope, "ags-test");
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.confirm(
                                envelope,
                                "ags-test",
                                new AgentPermissionModeService.Confirm(
                                        challenge.challengeId(), challenge.generation(), 1, true)));
        clock.now += 4999;
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.confirm(
                                envelope,
                                "ags-test",
                                new AgentPermissionModeService.Confirm(
                                        challenge.challengeId(), challenge.generation(), 1, true)));
        clock.now++;
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.confirm(
                                envelope,
                                "ags-test",
                                new AgentPermissionModeService.Confirm(
                                        challenge.challengeId(),
                                        challenge.generation(),
                                        1,
                                        false)));
        var command =
                new AgentPermissionModeService.Confirm(
                        challenge.challengeId(), challenge.generation(), 1, true);
        var grant = service.confirm(envelope, "ags-test", command);
        assertEquals("FULL", grant.mode());
        for (String tool :
                List.of(
                        "label.create",
                        "label.update",
                        "notice.rule_create",
                        "notice.template_update")) {
            var bounded =
                    AgentToolDescriptor.builder()
                            .name(tool)
                            .description("existing consent boundary")
                            .inputSchema("{}")
                            .risk(AgentToolRisk.CHANGE)
                            .access(AgentToolAccess.USER)
                            .exposure(
                                    org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure
                                            .MODEL_ON_DEMAND)
                            .namespace(tool.substring(0, tool.indexOf('.')))
                            .build();
            var policy = new AgentPolicyService().decide(actor, bounded);
            assertEquals(AgentPolicyDecision.REQUIRE_APPROVAL, policy.getDecision());
            assertEquals(
                    AgentPolicyDecision.REQUIRE_APPROVAL,
                    service.apply(request().toBuilder().toolName(tool).build(), bounded, policy)
                            .policy()
                            .getDecision());
        }

        assertEquals(grant, service.confirm(envelope, "ags-test", command));
        var request = request();
        var descriptor =
                AgentToolDescriptor.builder()
                        .name("monitor.create_batch")
                        .description("test")
                        .inputSchema("{}")
                        .risk(AgentToolRisk.CHANGE)
                        .access(AgentToolAccess.USER)
                        .exposure(
                                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure
                                        .MODEL_ON_DEMAND)
                        .namespace("monitor")
                        .build();
        var base = new AgentPolicyService().decide(actor, descriptor);
        var admitted = service.apply(request, descriptor, base);
        assertEquals(
                org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision.ALLOW,
                admitted.policy().getDecision());
        assertTrue(admitted.request().getExecutionGuard().getAsBoolean());
        assertTrue(
                service.apply(
                                request.toBuilder().explicitConfirmationRequired(true).build(),
                                descriptor,
                                base)
                        .policy()
                        .requiresApproval(),
                "Manifest confirmation cannot be bypassed by FULL mode");
        service.revoke(envelope, "ags-test");
        assertFalse(admitted.request().getExecutionGuard().getAsBoolean());
        assertThrows(
                IllegalArgumentException.class,
                () -> service.confirm(envelope, "ags-test", command));
        assertTrue(service.apply(request, descriptor, base).policy().requiresApproval());
        var second = service.challenge(envelope, "ags-test");
        clock.now += 5000;
        var renewed =
                service.confirm(
                        envelope,
                        "ags-test",
                        new AgentPermissionModeService.Confirm(
                                second.challengeId(), second.generation(), 1, true));
        clock.now = renewed.expiresAt();
        assertEquals("MANUAL", service.status(envelope, "ags-test").mode());
    }

    @Test
    void fullModeNeverEscalatesRbacDangerousOperationsOrExistingPendingApprovals() {
        var challenge = service.challenge(envelope, "ags-test");
        clock.now += 5000;
        service.confirm(
                envelope,
                "ags-test",
                new AgentPermissionModeService.Confirm(
                        challenge.challengeId(), challenge.generation(), 1, true));
        var policy = new AgentPolicyService();
        for (var risk : List.of(AgentToolRisk.READ, AgentToolRisk.DANGEROUS)) {
            var descriptor = descriptor(risk, AgentToolAccess.USER);
            var base = policy.decide(actor, descriptor);
            assertEquals(
                    base.getDecision(),
                    service.apply(request(), descriptor, base).policy().getDecision());
        }
        var unmapped = descriptor(AgentToolRisk.CHANGE, AgentToolAccess.USER);
        assertTrue(
                service.apply(request(), unmapped, policy.decide(actor, unmapped))
                        .policy()
                        .requiresApproval());
        var admin = descriptor(AgentToolRisk.CHANGE, AgentToolAccess.ADMIN);
        assertTrue(service.apply(request(), admin, policy.decide(actor, admin)).policy().denied());
        var ordinary = descriptor(AgentToolRisk.CHANGE, AgentToolAccess.USER);
        assertTrue(
                service.apply(
                                request().toBuilder().approvalId("existing-proposal").build(),
                                ordinary,
                                policy.decide(actor, ordinary))
                        .policy()
                        .requiresApproval());
        when(verifier.isCurrent(actor)).thenReturn(false);
        assertTrue(
                service.apply(request(), ordinary, policy.decide(actor, ordinary))
                        .policy()
                        .denied());
    }

    @Test
    void foreignSessionWorkspaceOrActorAndStaleChallengeAreDenied() {
        var first = service.challenge(envelope, "ags-test");
        var latest = service.challenge(envelope, "ags-test");
        clock.now += 5000;
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.confirm(
                                envelope,
                                "ags-test",
                                new AgentPermissionModeService.Confirm(
                                        first.challengeId(), first.generation(), 1, true)));
        assertThrows(IllegalArgumentException.class, () -> service.status(envelope, "ags-foreign"));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.status(
                                envelope.toBuilder().workspaceId("foreign").build(), "ags-test"));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.confirm(
                                envelope,
                                "ags-test",
                                new AgentPermissionModeService.Confirm(
                                        latest.challengeId(), latest.generation(), 2, true)));
    }

    private AgentToolDescriptor descriptor(AgentToolRisk risk, AgentToolAccess access) {
        return AgentToolDescriptor.builder()
                .name("test.action")
                .description("test")
                .inputSchema("{}")
                .risk(risk)
                .access(access)
                .exposure(
                        org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure.MODEL_ON_DEMAND)
                .namespace("test")
                .build();
    }

    private AgentToolExecutionRequest request() {
        return AgentToolExecutionRequest.builder()
                .sessionUid("ags-test")
                .runId(10L)
                .runSessionId(1L)
                .runUid("run-test")
                .workspaceId("isolated")
                .actor(actor)
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .toolName("monitor.create_batch")
                .toolCallId("test-call")
                .arguments(Map.of())
                .build();
    }

    static class MutableClock extends Clock {
        long now = 10000;

        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        public Clock withZone(ZoneId zone) {
            return this;
        }

        public Instant instant() {
            return Instant.ofEpochMilli(now);
        }

        public long millis() {
            return now;
        }
    }
}
