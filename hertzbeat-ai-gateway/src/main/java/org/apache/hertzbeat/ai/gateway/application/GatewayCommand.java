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

import java.util.Objects;
import java.util.Map;
import lombok.Builder;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.springframework.util.StringUtils;

/**
 * Strongly typed Gateway command.
 */
public sealed interface GatewayCommand permits
        GatewayCommand.InvokeCommand,
        GatewayCommand.ApprovalDecisionCommand,
        GatewayCommand.CancelRunCommand,
        GatewayCommand.ListToolsCommand,
        GatewayCommand.GetRunCommand,
        GatewayCommand.GetSessionCommand {

    GatewayEnvelope envelope();

    ReplyMode replyMode();

    String commandId();

    /**
     * Normalized runtime invocation shared by interactive and alert channels.
     */
    @Builder
    record InvokeCommand(
            GatewayEnvelope envelope,
            ReplyMode replyMode,
            String commandId,
            UserInput userInput,
            AgentRuntimeEntryType entryType) implements GatewayCommand {

        public InvokeCommand {
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            if (!StringUtils.hasText(commandId)) {
                throw new IllegalArgumentException("commandId is required");
            }
            userInput = Objects.requireNonNull(userInput, "userInput is required");
            entryType = Objects.requireNonNull(entryType, "entryType is required");
        }

        public InvokeCommand(GatewayEnvelope envelope, ReplyMode replyMode, String commandId, UserInput userInput) {
            this(envelope, replyMode, commandId, userInput, AgentRuntimeEntryType.USER_INPUT);
        }
    }

    /**
     * Approval decision command.
     */
    @Builder
    record ApprovalDecisionCommand(
            GatewayEnvelope envelope,
            ReplyMode replyMode,
            String commandId,
            String approvalId,
            AgentApprovalDecision decision,
            Map<String, Object> sensitiveParams) implements GatewayCommand {

        public ApprovalDecisionCommand {
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            decision = Objects.requireNonNull(decision, "approval decision is required");
            if (!StringUtils.hasText(commandId) || !StringUtils.hasText(approvalId)) {
                throw new IllegalArgumentException("commandId and approvalId are required");
            }
            sensitiveParams = sensitiveParams == null ? Map.of() : Map.copyOf(sensitiveParams);
        }
    }

    /**
     * Runtime cancellation command.
     */
    @Builder
    record CancelRunCommand(
            GatewayEnvelope envelope,
            ReplyMode replyMode,
            String commandId,
            String runUid,
            String reason) implements GatewayCommand {

        public CancelRunCommand {
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            if (!StringUtils.hasText(commandId) || !StringUtils.hasText(runUid)) {
                throw new IllegalArgumentException("commandId and runUid are required");
            }
        }
    }

    /**
     * Tool catalog query command.
     */
    @Builder
    record ListToolsCommand(
            GatewayEnvelope envelope,
            ReplyMode replyMode,
            String commandId) implements GatewayCommand {

        public ListToolsCommand {
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            if (!StringUtils.hasText(commandId)) {
                throw new IllegalArgumentException("commandId is required");
            }
        }
    }

    /**
     * Run query command.
     */
    @Builder
    record GetRunCommand(
            GatewayEnvelope envelope,
            ReplyMode replyMode,
            String commandId,
            String runUid) implements GatewayCommand {

        public GetRunCommand {
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            if (!StringUtils.hasText(commandId) || !StringUtils.hasText(runUid)) {
                throw new IllegalArgumentException("commandId and runUid are required");
            }
        }
    }

    /**
     * Session query command.
     */
    @Builder
    record GetSessionCommand(
            GatewayEnvelope envelope,
            ReplyMode replyMode,
            String commandId,
            String sessionUid) implements GatewayCommand {

        public GetSessionCommand {
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            if (!StringUtils.hasText(commandId) || !StringUtils.hasText(sessionUid)) {
                throw new IllegalArgumentException("commandId and sessionUid are required");
            }
        }
    }

    /**
     * Response delivery mode requested by a channel.
     */
    enum ReplyMode {
        FINAL_ONLY,
        STREAM
    }
}
