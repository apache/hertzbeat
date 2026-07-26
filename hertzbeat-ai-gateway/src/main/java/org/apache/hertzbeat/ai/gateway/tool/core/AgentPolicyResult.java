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

import java.util.Objects;
import lombok.Builder;
import lombok.Getter;
import org.springframework.util.StringUtils;

/**
 * Deterministic policy decision result.
 */
@Getter
public class AgentPolicyResult {

    private final AgentPolicyDecision decision;

    private final AgentToolRisk risk;

    private final String reason;

    @Builder
    private AgentPolicyResult(AgentPolicyDecision decision, AgentToolRisk risk, String reason) {
        this.decision = Objects.requireNonNull(decision, "Agent policy decision is required");
        this.risk = Objects.requireNonNull(risk, "Agent policy risk is required");
        if (!StringUtils.hasText(reason)) {
            throw new IllegalArgumentException("Agent policy reason is required");
        }
        this.reason = reason;
    }

    /**
     * Return whether the policy requires approval before any execution may happen.
     */
    public boolean requiresApproval() {
        return AgentPolicyDecision.REQUIRE_APPROVAL == decision;
    }

    /**
     * Return whether the policy blocks execution without being an approval wait.
     */
    public boolean denied() {
        return AgentPolicyDecision.DENY == decision;
    }
}
