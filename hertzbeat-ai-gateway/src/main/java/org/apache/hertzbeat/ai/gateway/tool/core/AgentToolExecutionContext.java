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
import lombok.Getter;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;

/**
 * Resolved execution context passed to a concrete Agent tool handler.
 */
@Getter
public class AgentToolExecutionContext {

    private final AgentToolExecutionRequest request;

    private final AgentToolCall ledgerCall;

    public AgentToolExecutionContext(AgentToolExecutionRequest request, AgentToolCall ledgerCall) {
        // The orchestrator resolves the immutable request and persisted ledger call before handler invocation.
        this.request = Objects.requireNonNull(request, "request must not be null");
        this.ledgerCall = Objects.requireNonNull(ledgerCall, "ledgerCall must not be null");
    }

    public void publishEvent(AgentRuntimeEvent event) {
        request.publishEvent(event);
    }
}
