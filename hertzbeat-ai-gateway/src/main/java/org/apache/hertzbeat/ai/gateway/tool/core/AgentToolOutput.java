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
import lombok.extern.jackson.Jacksonized;

/**
 * Structured output returned by one Agent tool handler.
 */
@Getter
@Builder
@Jacksonized
public class AgentToolOutput {

    private final AgentToolStatus status;

    private final String modelContent;

    private final String errorMessage;

    private AgentToolOutput(AgentToolStatus status, String modelContent, String errorMessage) {
        // Tool output is the handler/plugin boundary; ledger completion requires an explicit lifecycle status.
        this.status = Objects.requireNonNull(status, "Agent tool output status is required");
        this.modelContent = modelContent;
        this.errorMessage = errorMessage;
    }
}
