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

import java.util.List;
import java.util.Objects;
import lombok.Builder;
import lombok.Getter;
import org.apache.hertzbeat.ai.gateway.contract.AgentAlertIncidentContext;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.springframework.util.StringUtils;

/**
 * Immutable runtime context snapshot for one Agent Gateway runtime invocation.
 */
@Getter
public final class AgentRuntimeContext {

    private final AgentRuntimeEntryType entryType;
    private final AgentApprovalHandling approvalHandling;
    private final String channelId;
    private final long receivedAt;
    private final String preferredLanguage;
    private final AgentAlertIncidentContext alertIncident;
    private final AgentActor actor;
    private final String userMessage;
    private final String sessionUid;
    private final Long runId;
    private final String runUid;
    private final Long runSessionId;
    private final AgentTargetRef effectiveTarget;
    private final String currentTimeIso;
    private final String timezone;
    private final String traceId;
    private final List<TranscriptMessage> chatHistory;

    @Builder
    private AgentRuntimeContext(AgentRuntimeEntryType entryType, AgentApprovalHandling approvalHandling,
                                String channelId, Long receivedAt, String preferredLanguage,
                                AgentAlertIncidentContext alertIncident, AgentActor actor, String userMessage,
                                String sessionUid, Long runId, String runUid, Long runSessionId,
                                AgentTargetRef effectiveTarget, String currentTimeIso, String timezone, String traceId,
                                List<TranscriptMessage> chatHistory) {
        // The context is the runtime boundary; every downstream identity is read without DTO/entity fallbacks.
        this.entryType = Objects.requireNonNull(entryType, "Agent runtime context entry type is required");
        this.approvalHandling = Objects.requireNonNull(approvalHandling,
                "Agent runtime context approval handling is required");
        this.receivedAt = Objects.requireNonNull(receivedAt, "Agent runtime context received time is required");
        this.actor = Objects.requireNonNull(actor, "Agent runtime context actor is required");
        this.runId = Objects.requireNonNull(runId, "Agent runtime context run id is required");
        this.runSessionId = Objects.requireNonNull(runSessionId, "Agent runtime context run session id is required");
        if (!StringUtils.hasText(channelId)) {
            throw new IllegalArgumentException("Agent runtime context channel id is required");
        }
        if (!StringUtils.hasText(userMessage)) {
            throw new IllegalArgumentException("Agent runtime context user message is required");
        }
        if (!StringUtils.hasText(sessionUid)) {
            throw new IllegalArgumentException("Agent runtime context session uid is required");
        }
        if (!StringUtils.hasText(runUid)) {
            throw new IllegalArgumentException("Agent runtime context run uid is required");
        }
        if (!StringUtils.hasText(currentTimeIso)) {
            throw new IllegalArgumentException("Agent runtime context current time is required");
        }
        if (!StringUtils.hasText(timezone)) {
            throw new IllegalArgumentException("Agent runtime context timezone is required");
        }
        if (!StringUtils.hasText(traceId)) {
            throw new IllegalArgumentException("Agent runtime context trace id is required");
        }
        this.channelId = channelId;
        this.preferredLanguage = preferredLanguage;
        this.alertIncident = alertIncident;
        this.userMessage = userMessage;
        this.sessionUid = sessionUid;
        this.runUid = runUid;
        this.effectiveTarget = effectiveTarget;
        this.currentTimeIso = currentTimeIso;
        this.timezone = timezone;
        this.traceId = traceId;
        // Context builders may omit history for a new session; supplied history must not contain null messages.
        this.chatHistory = chatHistory == null ? List.of() : List.copyOf(chatHistory);
    }

}
