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
import lombok.Builder;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.springframework.util.StringUtils;

/**
 * Strongly typed Gateway command.
 */
public sealed interface GatewayCommand permits
        GatewayCommand.InvokeCommand,
        GatewayCommand.ApprovalDecisionCommand,
        GatewayCommand.CancelRunCommand,
        GatewayCommand.GetSessionCommand,
        GatewayCommand.ListSessionsCommand,
        GatewayCommand.GetSessionTranscriptCommand,
        GatewayCommand.ListModelProviderOptionsCommand,
        GatewayCommand.ListModelProviderConfigurationsCommand,
        GatewayCommand.CreateModelProviderConfigurationCommand,
        GatewayCommand.UpdateModelProviderConfigurationCommand,
        GatewayCommand.DeleteModelProviderConfigurationCommand,
        GatewayCommand.SwitchModelProviderCommand {

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
            AgentApprovalDecision decision) implements GatewayCommand {

        public ApprovalDecisionCommand {
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            decision = Objects.requireNonNull(decision, "approval decision is required");
            if (!StringUtils.hasText(commandId) || !StringUtils.hasText(approvalId)) {
                throw new IllegalArgumentException("commandId and approvalId are required");
            }
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
            if (!ActorSupport.hasIdentity(envelope.getActor())) {
                throw new IllegalArgumentException("Session query actor is required");
            }
        }
    }

    /**
     * Current actor session list query.
     */
    @Builder
    record ListSessionsCommand(
            GatewayEnvelope envelope,
            ReplyMode replyMode,
            String commandId,
            String title,
            int pageIndex,
            int pageSize) implements GatewayCommand {

        public ListSessionsCommand {
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            if (!StringUtils.hasText(commandId)) {
                throw new IllegalArgumentException("commandId is required");
            }
            if (!ActorSupport.hasIdentity(envelope.getActor())) {
                throw new IllegalArgumentException("Session query actor is required");
            }
            if (pageIndex < 0 || pageSize < 1) {
                throw new IllegalArgumentException("Session page index and size are invalid");
            }
            pageSize = Math.min(pageSize, 200);
        }
    }

    /**
     * Current actor session transcript query.
     */
    @Builder
    record GetSessionTranscriptCommand(
            GatewayEnvelope envelope,
            ReplyMode replyMode,
            String commandId,
            String sessionUid,
            int pageIndex,
            int pageSize) implements GatewayCommand {

        public GetSessionTranscriptCommand {
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            if (!StringUtils.hasText(commandId) || !StringUtils.hasText(sessionUid)) {
                throw new IllegalArgumentException("commandId and sessionUid are required");
            }
            if (!ActorSupport.hasIdentity(envelope.getActor())) {
                throw new IllegalArgumentException("Session query actor is required");
            }
            if (pageIndex < 0 || pageSize < 1) {
                throw new IllegalArgumentException("Session page index and size are invalid");
            }
            pageSize = Math.min(pageSize, 200);
        }
    }

    /**
     * Registered model provider option query.
     */
    @Builder
    record ListModelProviderOptionsCommand(
            GatewayEnvelope envelope,
            ReplyMode replyMode,
            String commandId) implements GatewayCommand {

        public ListModelProviderOptionsCommand {
            // Channel commands require trusted invocation metadata and an explicit delivery mode.
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            if (!StringUtils.hasText(commandId)) {
                throw new IllegalArgumentException("commandId is required");
            }
            if (replyMode != ReplyMode.FINAL_ONLY) {
                throw new IllegalArgumentException("Model provider option queries require final-only replies");
            }
            if (!ActorSupport.hasIdentity(envelope.getActor())) {
                throw new IllegalArgumentException("Model provider option query actor is required");
            }
        }
    }

    /**
     * Saved model provider configuration query.
     */
    @Builder
    record ListModelProviderConfigurationsCommand(
            GatewayEnvelope envelope,
            ReplyMode replyMode,
            String commandId) implements GatewayCommand {

        public ListModelProviderConfigurationsCommand {
            // Channel commands require trusted invocation metadata and an explicit delivery mode.
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            if (!StringUtils.hasText(commandId)) {
                throw new IllegalArgumentException("commandId is required");
            }
            if (replyMode != ReplyMode.FINAL_ONLY) {
                throw new IllegalArgumentException("Model provider configuration queries require final-only replies");
            }
            if (!ActorSupport.hasIdentity(envelope.getActor())) {
                throw new IllegalArgumentException("Model provider configuration query actor is required");
            }
        }
    }

    /**
     * Saved model provider configuration creation.
     */
    @Builder
    record CreateModelProviderConfigurationCommand(
            GatewayEnvelope envelope,
            ReplyMode replyMode,
            String commandId,
            ModelProviderConfig config) implements GatewayCommand {

        public CreateModelProviderConfigurationCommand {
            // Channel commands require trusted invocation metadata and an explicit delivery mode.
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            if (!StringUtils.hasText(commandId)) {
                throw new IllegalArgumentException("commandId is required");
            }
            if (replyMode != ReplyMode.FINAL_ONLY) {
                throw new IllegalArgumentException("Model provider configuration creation requires final-only replies");
            }
            if (!ActorSupport.hasIdentity(envelope.getActor())) {
                throw new IllegalArgumentException("Model provider configuration creation actor is required");
            }
            // A create command owns the complete provider DTO so validation and normalization happen once downstream.
            config = Objects.requireNonNull(config, "model provider config is required");
        }
    }

    /**
     * Saved model provider configuration update.
     */
    @Builder
    record UpdateModelProviderConfigurationCommand(
            GatewayEnvelope envelope,
            ReplyMode replyMode,
            String commandId,
            String providerUid,
            ModelProviderConfig config) implements GatewayCommand {

        public UpdateModelProviderConfigurationCommand {
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            if (!StringUtils.hasText(commandId) || !StringUtils.hasText(providerUid)) {
                throw new IllegalArgumentException("commandId and providerUid are required");
            }
            if (replyMode != ReplyMode.FINAL_ONLY) {
                throw new IllegalArgumentException("Model provider configuration updates require final-only replies");
            }
            if (!ActorSupport.hasIdentity(envelope.getActor())) {
                throw new IllegalArgumentException("Model provider configuration update actor is required");
            }
            config = Objects.requireNonNull(config, "model provider config is required");
        }
    }

    /**
     * Saved model provider configuration deletion.
     */
    @Builder
    record DeleteModelProviderConfigurationCommand(
            GatewayEnvelope envelope,
            ReplyMode replyMode,
            String commandId,
            String providerUid) implements GatewayCommand {

        public DeleteModelProviderConfigurationCommand {
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            if (!StringUtils.hasText(commandId) || !StringUtils.hasText(providerUid)) {
                throw new IllegalArgumentException("commandId and providerUid are required");
            }
            if (replyMode != ReplyMode.FINAL_ONLY) {
                throw new IllegalArgumentException("Model provider configuration deletions require final-only replies");
            }
            if (!ActorSupport.hasIdentity(envelope.getActor())) {
                throw new IllegalArgumentException("Model provider configuration deletion actor is required");
            }
        }
    }

    /**
     * Active model provider selection. A null UID selects the YAML default.
     */
    @Builder
    record SwitchModelProviderCommand(
            GatewayEnvelope envelope,
            ReplyMode replyMode,
            String commandId,
            String providerUid) implements GatewayCommand {

        public SwitchModelProviderCommand {
            envelope = Objects.requireNonNull(envelope, "envelope is required");
            replyMode = Objects.requireNonNull(replyMode, "replyMode is required");
            if (!StringUtils.hasText(commandId)) {
                throw new IllegalArgumentException("commandId is required");
            }
            if (replyMode != ReplyMode.FINAL_ONLY) {
                throw new IllegalArgumentException("Model provider switches require final-only replies");
            }
            if (!ActorSupport.hasIdentity(envelope.getActor())) {
                throw new IllegalArgumentException("Model provider switch actor is required");
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
