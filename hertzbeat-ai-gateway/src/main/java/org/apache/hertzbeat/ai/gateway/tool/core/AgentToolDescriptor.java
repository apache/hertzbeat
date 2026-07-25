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
 * Tool metadata exposed by the Agent Gateway catalog.
 */
@Getter
public class AgentToolDescriptor {

    private final String name;

    private final String description;

    private final String inputSchema;

    private final AgentToolRisk risk;

    private final String namespace;

    private final AgentToolExposure exposure;

    @Builder
    private AgentToolDescriptor(String name, String description, String inputSchema, AgentToolRisk risk,
                                String namespace, AgentToolExposure exposure) {
        // Tool descriptors are catalog entries consumed by model prompts, policy, and ledger persistence.
        if (!StringUtils.hasText(name)) {
            throw new IllegalArgumentException("Agent tool descriptor name is required");
        }
        if (!StringUtils.hasText(description)) {
            throw new IllegalArgumentException("Agent tool descriptor description is required");
        }
        if (!StringUtils.hasText(inputSchema)) {
            throw new IllegalArgumentException("Agent tool descriptor input schema is required");
        }
        if (!StringUtils.hasText(namespace)) {
            throw new IllegalArgumentException("Agent tool descriptor namespace is required");
        }
        this.name = name;
        this.description = description;
        this.inputSchema = inputSchema;
        this.risk = Objects.requireNonNull(risk, "Agent tool descriptor risk is required");
        this.namespace = namespace;
        this.exposure = Objects.requireNonNull(exposure, "Agent tool descriptor exposure is required");
    }
}
