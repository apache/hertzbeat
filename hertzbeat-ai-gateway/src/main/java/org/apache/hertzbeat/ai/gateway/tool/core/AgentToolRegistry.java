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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;

/**
 * Registry for Agent tool handlers.
 */
public class AgentToolRegistry {

    private static final int MAX_DISCOVERED_TOOLS_PER_SEARCH = 10;

    private final Map<String, RegisteredTool> handlers = new LinkedHashMap<>();

    public void register(RegisteredTool tool) {
        RegisteredTool registeredTool = Objects.requireNonNull(tool, "Registered tool is required");
        AgentToolDescriptor descriptor = registeredTool.descriptor();
        String toolName = descriptor.getName();
        if (handlers.containsKey(toolName)) {
            throw new IllegalStateException("Duplicate Agent tool: " + toolName);
        }
        handlers.put(toolName, registeredTool);
    }

    public Optional<RegisteredTool> find(String toolName) {
        return Optional.ofNullable(handlers.get(toolName));
    }

    public List<AgentToolDescriptor> descriptors() {
        return handlers.values().stream()
            .map(RegisteredTool::descriptor)
            .toList();
    }

    public List<AgentToolDescriptor> discoverableDescriptors(String namespace, String query) {
        // An unscoped discovery call would inject the entire on-demand catalog into the model context.
        if ((namespace == null || namespace.isBlank()) && (query == null || query.isBlank())) {
            throw new IllegalArgumentException("tool discovery requires namespace or query");
        }
        // Tool descriptions use author-defined casing, while model search text is case-insensitive.
        String searchText = query == null ? null : query.toLowerCase(java.util.Locale.ROOT);
        return handlers.values().stream()
            .map(RegisteredTool::descriptor)
            .filter(descriptor -> descriptor.getExposure() == AgentToolExposure.MODEL_ON_DEMAND)
            .filter(descriptor -> namespace == null || namespace.isBlank()
                || namespace.equalsIgnoreCase(descriptor.getNamespace()))
            .filter(descriptor -> searchText == null || searchText.isBlank()
                || descriptor.getName().toLowerCase(java.util.Locale.ROOT)
                    .contains(searchText)
                || descriptor.getDescription().toLowerCase(java.util.Locale.ROOT)
                    .contains(searchText))
            .limit(MAX_DISCOVERED_TOOLS_PER_SEARCH)
            .toList();
    }

    /**
     * Immutable catalog entry with its single execution function.
     */
    public static final class RegisteredTool {

        private final AgentToolDescriptor descriptor;
        private final Function<AgentToolExecutionContext, AgentToolOutput> executor;

        public RegisteredTool(AgentToolDescriptor descriptor,
                              Function<AgentToolExecutionContext, AgentToolOutput> executor) {
            this.descriptor = Objects.requireNonNull(descriptor, "Agent tool descriptor is required");
            this.executor = Objects.requireNonNull(executor, "Agent tool executor is required");
        }

        public AgentToolDescriptor descriptor() {
            return descriptor;
        }

        public AgentToolOutput execute(AgentToolExecutionContext context) {
            return executor.apply(Objects.requireNonNull(context, "Agent tool execution context is required"));
        }
    }
}
