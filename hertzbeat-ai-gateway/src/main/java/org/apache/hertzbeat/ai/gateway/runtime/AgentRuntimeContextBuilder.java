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

import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.springframework.util.StringUtils;

/**
 * Builds bounded runtime context snapshots from gateway runtime requests.
 */
public class AgentRuntimeContextBuilder {

    private final Clock clock;
    private final Supplier<String> traceIdSupplier;

    public AgentRuntimeContextBuilder() {
        this(Clock.systemUTC(), () -> UUID.randomUUID().toString());
    }

    public AgentRuntimeContextBuilder(Clock clock, Supplier<String> traceIdSupplier) {
        // Clock and trace supplier are runtime composition dependencies; fail fast before a request is built.
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
        this.traceIdSupplier = Objects.requireNonNull(traceIdSupplier, "traceIdSupplier must not be null");
    }

    public AgentRuntimeContext build(AgentRuntimeRequest request, AgentRuntimeProperties runtimeProperties) {
        // Runtime requests and configuration are composition outputs; fail before deriving a partial context.
        Objects.requireNonNull(request, "request must not be null");
        Objects.requireNonNull(runtimeProperties, "runtimeProperties must not be null");
        AgentRuntimeEntryType entryType = request.getEntryType();
        GatewayEnvelope envelope = request.getEnvelope();
        UserInput userInput = request.getUserInput();
        AgentRun run = request.getRun();
        AgentTargetRef effectiveTarget = effectiveTarget(entryType, userInput, run);
        List<TranscriptMessage> chatHistory = List.copyOf(request.getChatHistory());
        Instant now = Instant.now(clock);
        String currentTimeIso = DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(now.atZone(clock.getZone()));
        String timezone = clock.getZone().getId();
        String traceId = resolveTraceId();
        return AgentRuntimeContext.builder()
                .entryType(entryType)
                .approvalHandling(request.getApprovalHandling())
                .channelId(envelope.getChannelId())
                .receivedAt(envelope.getReceivedAt())
                .preferredLanguage(envelope.getPreferredLanguage())
                .alertIncident(userInput.getAlertIncident())
                .actor(envelope.getActor())
                .userMessage(userInput.getMessage().getText())
                .sessionUid(request.getSession().getSessionUid())
                .runId(run.getId())
                .runUid(run.getRunUid())
                .runSessionId(run.getSessionId())
                .effectiveTarget(effectiveTarget)
                .currentTimeIso(currentTimeIso)
                .timezone(timezone)
                .traceId(traceId)
                .chatHistory(chatHistory)
                .build();
    }

    private static AgentTargetRef effectiveTarget(AgentRuntimeEntryType entryType, UserInput userInput, AgentRun run) {
        if (entryType == AgentRuntimeEntryType.USER_INPUT && userInput.getTarget() != null) {
            return userInput.getTarget();
        }
        return targetFromRun(run);
    }

    private static AgentTargetRef targetFromRun(AgentRun run) {
        if (run.getTargetMonitorId() == null
                && run.getTargetAlertId() == null
                && !StringUtils.hasText(run.getTargetCollector())) {
            return null;
        }
        return AgentTargetRef.builder()
                .monitorId(run.getTargetMonitorId())
                .alertId(run.getTargetAlertId())
                .collector(run.getTargetCollector())
                .build();
    }

    private String resolveTraceId() {
        String generated = traceIdSupplier.get();
        // Custom trace suppliers may return padded or blank values; normalize before using the value as an identity.
        return StringUtils.hasText(generated) ? generated.strip() : UUID.randomUUID().toString();
    }

}
