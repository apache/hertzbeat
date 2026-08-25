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
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Resolves the canonical session before entering the serialized admission transaction. */
@Service
public class AgentRunAdmissionService {

    private final AgentSessionService sessionService;
    private final AgentRunAdmissionTransaction admissionTransaction;
    private final AgentRunDao runDao;
    private final AgentTargetCanonicalizationService targetCanonicalizationService;

    public AgentRunAdmissionService(AgentSessionService sessionService,
                                    AgentRunAdmissionTransaction admissionTransaction, AgentRunDao runDao,
                                    AgentTargetCanonicalizationService targetCanonicalizationService) {
        this.sessionService = sessionService;
        this.admissionTransaction = admissionTransaction;
        this.runDao = runDao;
        this.targetCanonicalizationService = targetCanonicalizationService;
    }

    public AgentRunAdmission admit(InvokeCommand command) {
        validateCommandIdentity(command);
        if (!targetCanonicalizationService.requiresCanonicalization(command)) {
            return admitResolved(command, command);
        }
        Optional<AgentSession> existingSession = sessionService.findSession(
                command.envelope(), command.userInput().getConversationId());
        if (hasExistingRun(existingSession, command)) {
            return admissionTransaction.admit(existingSession.orElseThrow().getId(), command, null);
        }
        try {
            InvokeCommand canonicalCommand = targetCanonicalizationService.canonicalize(command);
            return admitResolved(command, canonicalCommand);
        } catch (RuntimeException failure) {
            Optional<AgentSession> winnerSession = sessionService.findSession(
                    command.envelope(), command.userInput().getConversationId());
            if (hasExistingRun(winnerSession, command)) {
                return admissionTransaction.admit(winnerSession.orElseThrow().getId(), command, null);
            }
            throw failure;
        }
    }

    private AgentRunAdmission admitResolved(InvokeCommand sourceCommand, InvokeCommand executionCommand) {
        AgentSession session = sessionService.findOrCreateSession(
                sourceCommand.envelope(), sourceCommand.userInput(), sourceCommand.entryType());
        if (!Objects.equals(session.getWorkspaceId(), sourceCommand.envelope().getWorkspaceId())) {
            throw new IllegalArgumentException("Agent run session workspace does not match the command");
        }
        return admissionTransaction.admit(session.getId(), sourceCommand, executionCommand);
    }

    private boolean hasExistingRun(Optional<AgentSession> session, InvokeCommand command) {
        return session.isPresent() && runDao.findBySessionIdAndMessageId(
                session.get().getId(), command.userInput().getMessageId()).isPresent();
    }

    private void validateCommandIdentity(InvokeCommand command) {
        if (!StringUtils.hasText(command.userInput().getMessageId())
                || !Objects.equals(command.commandId(), command.userInput().getMessageId())) {
            throw new IllegalArgumentException("Agent command and message identity must match");
        }
    }
}
