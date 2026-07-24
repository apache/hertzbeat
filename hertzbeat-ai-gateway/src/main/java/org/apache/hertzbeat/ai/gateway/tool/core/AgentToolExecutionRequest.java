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

package org.apache.hertzbeat.ai.gateway.tool.core;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Consumer;
import lombok.Builder;
import lombok.Getter;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.springframework.util.StringUtils;

/**
 * Scoped request to execute one Gateway tool through policy.
 */
@Getter
public class AgentToolExecutionRequest {

    private final String sessionUid;

    private final Long runId;

    private final String runUid;

    private final Long runSessionId;

    private final AgentActor actor;

    private final AgentRuntimeEntryType entryType;

    private final AgentApprovalHandling approvalHandling;

    private final String toolName;

    private final String toolCallId;

    private final String approvalId;

    private final Map<String, Object> arguments;

    private final String approvalStatus;

    private final Consumer<AgentRuntimeEvent> eventConsumer;

    @Builder(toBuilder = true)
    private AgentToolExecutionRequest(String sessionUid, Long runId, String runUid, Long runSessionId, AgentActor actor,
                                       AgentRuntimeEntryType entryType, AgentApprovalHandling approvalHandling,
                                       String toolName, String toolCallId, String approvalId,
                                       Map<String, Object> arguments, String approvalStatus,
                                       Consumer<AgentRuntimeEvent> eventConsumer) {
        if (!StringUtils.hasText(sessionUid)) {
            throw new IllegalArgumentException("Agent tool execution session uid is required");
        }
        this.sessionUid = sessionUid;
        this.runId = Objects.requireNonNull(runId, "Agent tool execution run id is required");
        if (!StringUtils.hasText(runUid)) {
            throw new IllegalArgumentException("Agent tool execution run uid is required");
        }
        this.runUid = runUid;
        this.runSessionId = Objects.requireNonNull(runSessionId, "Agent tool execution run session id is required");
        this.actor = Objects.requireNonNull(actor, "Agent tool execution actor is required");
        this.entryType = Objects.requireNonNull(entryType, "Agent tool execution entry type is required");
        this.approvalHandling = Objects.requireNonNull(approvalHandling,
                "Agent tool execution approval handling is required");
        if (!StringUtils.hasText(toolName)) {
            throw new IllegalArgumentException("Agent tool name is required");
        }
        if (!StringUtils.hasText(toolCallId)) {
            throw new IllegalArgumentException("Agent tool-call id is required");
        }
        this.toolName = toolName;
        this.toolCallId = toolCallId;
        this.approvalId = approvalId;
        Map<String, Object> requiredArguments = Objects.requireNonNull(arguments,
            "Agent tool execution arguments are required");
        this.arguments = Collections.unmodifiableMap(new LinkedHashMap<>(requiredArguments));
        this.approvalStatus = approvalStatus;
        this.eventConsumer = eventConsumer == null ? event -> { } : eventConsumer;
    }

    public void publishEvent(AgentRuntimeEvent event) {
        eventConsumer.accept(event);
    }
}
