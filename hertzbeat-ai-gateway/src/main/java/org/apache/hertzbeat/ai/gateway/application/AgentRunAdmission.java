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

import java.util.List;
import java.util.Objects;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.TranscriptMessage;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;

/**
 * Linearized outcome of admitting one durable Agent Gateway message.
 */
public record AgentRunAdmission(
        Decision decision,
        AgentSession session,
        AgentRun run,
        AgentApprovalHandling approvalHandling,
        List<TranscriptMessage> chatHistory) {

    public AgentRunAdmission {
        Objects.requireNonNull(decision, "Agent run admission decision is required");
        Objects.requireNonNull(session, "Agent run admission session is required");
        Objects.requireNonNull(run, "Agent run admission run is required");
        Objects.requireNonNull(approvalHandling, "Agent run admission approval handling is required");
        chatHistory = chatHistory == null ? List.of() : List.copyOf(chatHistory);
    }

    /** Durable admission decisions for one normalized message identity. */
    public enum Decision {
        EXECUTE_NEW,
        REPLAY_ACTIVE,
        REPLAY_TERMINAL,
        REJECT_MISMATCH
    }
}
