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

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalActorVerifier;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentSessionStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Session-only approval preference; never expands RBAC, task authority, tool catalog or budgets.
 */
@Service
public class AgentPermissionModeService {
    public static final int NOTICE_VERSION = 1;
    public static final long MINIMUM_REVIEW_MS = 5000;
    public static final long FULL_DURATION_MS = 15 * 60 * 1000;
    private static final String SCOPE = "CURRENT_USER_SESSION_NORMAL_APPLICATION_WRITES";
    private final AgentSessionDao sessions;
    private final AgentPermissionStateDao states;
    private final AgentPermissionAuditDao audits;
    private final AgentApprovalActorVerifier actors;
    private final Clock clock;

    @Autowired
    public AgentPermissionModeService(
            AgentSessionDao sessions,
            AgentPermissionStateDao states,
            AgentPermissionAuditDao audits,
            AgentApprovalActorVerifier actors) {
        this(sessions, states, audits, actors, Clock.systemUTC());
    }

    AgentPermissionModeService(
            AgentSessionDao sessions,
            AgentPermissionStateDao states,
            AgentPermissionAuditDao audits,
            AgentApprovalActorVerifier actors,
            Clock clock) {
        this.sessions = sessions;
        this.states = states;
        this.audits = audits;
        this.actors = actors;
        this.clock = clock;
    }

    /** Effective server-time permission state for the current owned conversation. */
    public record View(
            String sessionUid,
            String mode,
            long generation,
            long expiresAt,
            long serverNow,
            boolean fullAllowed,
            int noticeVersion,
            String scope,
            int revocationGuardVersion) {}

    /** One-time confirmation challenge with server-enforced minimum review delay. */
    public record Challenge(
            String sessionUid,
            String challengeId,
            long generation,
            long notBefore,
            long expiresAt,
            long serverNow,
            int noticeVersion,
            String scope) {}

    /** Explicit human confirmation bound to the exact challenge and risk-notice version. */
    @JsonIgnoreProperties(ignoreUnknown = false)
    public record Confirm(
            String challengeId, long generation, int noticeVersion, boolean acknowledged) {}

    /** Internal policy result and revocable execution guard, never exposed as a model tool. */
    public record Admission(AgentPolicyResult policy, AgentToolExecutionRequest request) {}

    @Transactional(readOnly = true)
    public View status(GatewayEnvelope envelope, String sessionUid) {
        owner(envelope, sessionUid, false);
        return view(
                envelope, sessionUid, states.findById(scope(envelope, sessionUid)).orElse(null));
    }

    @Transactional
    public Challenge challenge(GatewayEnvelope envelope, String sessionUid) {
        owner(envelope, sessionUid, true);
        if (!actors.isCurrent(envelope.getActor())) {
            throw failure("permission_role_not_current");
        }
        var state = state(envelope, sessionUid);
        long now = clock.millis();
        String nonce = UUID.randomUUID().toString();
        state.setGeneration(Math.addExact(state.getGeneration(), 1));
        state.setChallengeGeneration(state.getGeneration());
        state.setChallengeHash(GatewayText.sha256(nonce));
        state.setNotBefore(Math.addExact(now, MINIMUM_REVIEW_MS));
        state.setChallengeExpiresAt(Math.addExact(now, 120000));
        states.save(state);
        audit(envelope, state, "CHALLENGE_CREATED");
        return new Challenge(
                sessionUid,
                nonce,
                state.getChallengeGeneration(),
                state.getNotBefore(),
                state.getChallengeExpiresAt(),
                now,
                NOTICE_VERSION,
                SCOPE);
    }

    @Transactional
    public View confirm(GatewayEnvelope envelope, String sessionUid, Confirm request) {
        owner(envelope, sessionUid, true);
        if (request == null
                || !request.acknowledged()
                || request.noticeVersion() != NOTICE_VERSION
                || request.challengeId() == null
                || !request.challengeId().matches("[a-f0-9-]{36}")
                || !actors.isCurrent(envelope.getActor())) {
            throw failure("permission_confirmation_invalid");
        }
        var state =
                states.findById(scope(envelope, sessionUid))
                        .orElseThrow(() -> failure("permission_challenge_missing"));
        long now = clock.millis();
        String hash = GatewayText.sha256(request.challengeId());
        if (hash.equals(state.getConsumedChallengeHash())
                && request.generation() == state.getConsumedGeneration()
                && state.getGeneration() == state.getConsumedGrantGeneration()
                && full(state, envelope.getActor(), now)) {
            return view(envelope, sessionUid, state);
        }
        if (!hash.equals(state.getChallengeHash())
                || request.generation() != state.getChallengeGeneration()
                || request.generation() != state.getGeneration()) {
            throw failure("permission_challenge_stale");
        }
        if (now < state.getNotBefore()) {
            throw failure("permission_review_too_early");
        }
        if (now >= state.getChallengeExpiresAt()) {
            throw failure("permission_challenge_expired");
        }
        state.setMode("FULL");
        state.setExpiresAt(Math.addExact(now, FULL_DURATION_MS));
        state.setRolesHash(roles(envelope.getActor()));
        state.setGeneration(Math.addExact(state.getGeneration(), 1));
        state.setConsumedChallengeHash(hash);
        state.setConsumedGeneration(request.generation());
        state.setConsumedGrantGeneration(state.getGeneration());
        state.setChallengeHash(null);
        states.save(state);
        audit(envelope, state, "FULL_CONFIRMED");
        return view(envelope, sessionUid, state);
    }

    @Transactional
    public View revoke(GatewayEnvelope envelope, String sessionUid) {
        owner(envelope, sessionUid, true);
        var state = state(envelope, sessionUid);
        if (!"MANUAL".equals(state.getMode()) || state.getChallengeHash() != null) {
            state.setMode("MANUAL");
            state.setExpiresAt(0);
            state.setChallengeHash(null);
            state.setGeneration(Math.addExact(state.getGeneration(), 1));
            states.save(state);
            audit(envelope, state, "MANUAL_RESTORED");
        }
        return view(envelope, sessionUid, state);
    }

    @Transactional(readOnly = true)
    public Admission apply(
            AgentToolExecutionRequest request,
            AgentToolDescriptor descriptor,
            AgentPolicyResult base) {
        if (base.denied()
                || descriptor.getRisk() != AgentToolRisk.CHANGE
                || request.getEntryType() != AgentRuntimeEntryType.USER_INPUT) {
            return new Admission(base, request);
        }
        if (!"user".equals(request.getActor().getType())) {
            return new Admission(base, request);
        }
        var actual = sessions.findBySessionUid(request.getSessionUid()).orElse(null);
        if (actual == null
                || !Objects.equals(actual.getId(), request.getRunSessionId())
                || !Objects.equals(actual.getActorType(), request.getActor().getType())
                || !Objects.equals(actual.getActorId(), request.getActor().getId())
                || !Objects.equals(actual.getWorkspaceId(), request.getWorkspaceId())) {
            return new Admission(
                    policy(AgentPolicyDecision.DENY, descriptor, "Session owner or scope mismatch"),
                    request);
        }
        if (!"web-ui".equals(actual.getChannel())) {
            return new Admission(base, request);
        }
        var envelope = envelope(request);
        AgentSession session;
        try {
            session = owner(envelope, request.getSessionUid(), false);
        } catch (IllegalArgumentException invalid) {
            return new Admission(
                    policy(AgentPolicyDecision.DENY, descriptor, "Session owner or scope mismatch"),
                    request);
        }
        if (!Objects.equals(session.getId(), request.getRunSessionId())
                || !actors.isCurrent(request.getActor())) {
            return new Admission(
                    policy(
                            AgentPolicyDecision.DENY,
                            descriptor,
                            "Session owner or current role changed"),
                    request);
        }
        if (request.getApprovalId() != null && !request.getApprovalId().isBlank()) {
            return new Admission(
                    policy(
                            AgentPolicyDecision.REQUIRE_APPROVAL,
                            descriptor,
                            "Existing proposal still requires its original decision"),
                    request);
        }
        if (request.isExplicitConfirmationRequired()) {
            return new Admission(
                    policy(
                            AgentPolicyDecision.REQUIRE_APPROVAL,
                            descriptor,
                            "This immutable manifest requires its own explicit confirmation"),
                    request);
        }
        var state = states.findById(scope(envelope, request.getSessionUid())).orElse(null);
        if (!full(state, request.getActor(), clock.millis())) {
            return new Admission(
                    policy(
                            AgentPolicyDecision.REQUIRE_APPROVAL,
                            descriptor,
                            "Manual mode requires the session owner's approval for each change"),
                    request);
        }
        if (!org.apache.hertzbeat.ai.gateway.runtime.AgentApplicationMutationAuthority
                .allowsFullMode(descriptor.getName())) {
            return new Admission(
                    policy(
                            AgentPolicyDecision.REQUIRE_APPROVAL,
                            descriptor,
                            "This application operation still requires per-action approval under"
                                    + " the existing session consent scope"),
                    request);
        }
        long generation = state.getGeneration();
        String id = state.getId();
        var original = request.getExecutionGuard();
        var admitted =
                request.toBuilder()
                        .executionGuard(
                                () -> original.getAsBoolean() && current(id, generation, request))
                        .build();
        return new Admission(
                policy(
                        AgentPolicyDecision.ALLOW,
                        descriptor,
                        "Session full mode generation="
                                + generation
                                + "; RBAC, task, dangerous-operation and budget checks remain"
                                + " enforced"),
                admitted);
    }

    private boolean current(String id, long generation, AgentToolExecutionRequest request) {
        if (!actors.isCurrent(request.getActor())) {
            return false;
        }
        return states.countActiveGrant(id, generation, roles(request.getActor()), clock.millis())
                == 1;
    }

    private AgentPolicyResult policy(
            AgentPolicyDecision decision, AgentToolDescriptor descriptor, String reason) {
        return AgentPolicyResult.builder()
                .decision(decision)
                .risk(descriptor.getRisk())
                .reason(reason)
                .build();
    }

    private GatewayEnvelope envelope(AgentToolExecutionRequest request) {
        return GatewayEnvelope.builder()
                .channelId("web-ui")
                .workspaceId(request.getWorkspaceId())
                .actor(request.getActor())
                .receivedAt(clock.millis())
                .build();
    }

    private AgentSession owner(GatewayEnvelope envelope, String sessionUid, boolean lock) {
        if (envelope == null
                || !"web-ui".equals(envelope.getChannelId())
                || !ActorSupport.hasIdentity(envelope.getActor())
                || !"user".equals(envelope.getActor().getType())
                || sessionUid == null
                || !sessionUid.matches("[A-Za-z0-9_.:-]{1,64}")) {
            throw failure("permission_owner_mismatch");
        }
        var actor = envelope.getActor();
        var session =
                sessions.findBySessionUidAndWorkspaceIdAndChannelAndActorTypeAndActorIdAndOriginEntryType(
                                sessionUid,
                                envelope.getWorkspaceId(),
                                "web-ui",
                                actor.getType(),
                                actor.getId(),
                                "USER_INPUT")
                        .orElseThrow(() -> failure("permission_owner_mismatch"));
        if (lock) {
            session =
                    sessions.findFirstById(session.getId())
                            .orElseThrow(() -> failure("permission_session_missing"));
        }
        if (session.getStatus() != AgentSessionStatus.ACTIVE
                || !sessionUid.equals(session.getSessionUid())
                || !actor.getId().equals(session.getActorId())
                || !envelope.getWorkspaceId().equals(session.getWorkspaceId())) {
            throw failure("permission_session_inactive");
        }
        return session;
    }

    private AgentPermissionState state(GatewayEnvelope envelope, String sessionUid) {
        String id = scope(envelope, sessionUid);
        return states.findById(id)
                .orElseGet(
                        () -> {
                            var state = new AgentPermissionState();
                            state.setId(id);
                            state.setSessionUid(sessionUid);
                            return state;
                        });
    }

    private String scope(GatewayEnvelope envelope, String sessionUid) {
        return GatewayText.sha256(
                JsonUtil.toJson(
                        List.of(
                                envelope.getWorkspaceId(),
                                envelope.getActor().getType(),
                                envelope.getActor().getId(),
                                sessionUid)));
    }

    private String roles(AgentActor actor) {
        return GatewayText.sha256(JsonUtil.toJson(actor.getRoles().stream().sorted().toList()));
    }

    private boolean full(AgentPermissionState state, AgentActor actor, long now) {
        return state != null
                && "FULL".equals(state.getMode())
                && state.getExpiresAt() > now
                && actors.isCurrent(actor)
                && roles(actor).equals(state.getRolesHash());
    }

    private View view(GatewayEnvelope envelope, String sessionUid, AgentPermissionState state) {
        boolean enabled = full(state, envelope.getActor(), clock.millis());
        return new View(
                sessionUid,
                enabled ? "FULL" : "MANUAL",
                state == null ? 0 : state.getGeneration(),
                enabled ? state.getExpiresAt() : 0,
                clock.millis(),
                actors.isCurrent(envelope.getActor()),
                NOTICE_VERSION,
                SCOPE,
                1);
    }

    private void audit(GatewayEnvelope envelope, AgentPermissionState state, String action) {
        var event = new AgentPermissionAudit();
        event.setId(UUID.randomUUID().toString());
        event.setScopeId(state.getId());
        event.setSessionUid(state.getSessionUid());
        event.setActorId(envelope.getActor().getId());
        event.setWorkspaceId(envelope.getWorkspaceId());
        event.setAction(action);
        event.setGeneration(state.getGeneration());
        event.setOccurredAt(clock.millis());
        event.setExpiresAt(state.getExpiresAt());
        audits.save(event);
    }

    private IllegalArgumentException failure(String code) {
        return new IllegalArgumentException(code);
    }
}
