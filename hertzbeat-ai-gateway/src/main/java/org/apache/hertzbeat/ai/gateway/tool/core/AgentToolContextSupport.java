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
import java.util.Map;
import java.util.Objects;
import java.util.function.Supplier;

/**
 * Shared context handling for Agent tool namespace services.
 */
public final class AgentToolContextSupport {

    private static final ThreadLocal<AgentToolExecutionContext> CURRENT = new ThreadLocal<>();

    private AgentToolContextSupport() {
    }

    public static <T> T withInvocation(AgentToolExecutionContext invocation, Supplier<T> action) {
        // Registered handlers establish a complete scoped invocation before executing annotated tool methods.
        Objects.requireNonNull(invocation, "invocation must not be null");
        Objects.requireNonNull(action, "action must not be null");
        AgentToolExecutionContext previous = CURRENT.get();
        CURRENT.set(invocation);
        try {
            return action.get();
        } finally {
            if (previous == null) {
                CURRENT.remove();
            } else {
                CURRENT.set(previous);
            }
        }
    }

    public static AgentToolExecutionContext invocation() {
        AgentToolExecutionContext invocation = CURRENT.get();
        if (invocation == null) {
            throw new IllegalArgumentException("Agent tool execution context is required");
        }
        return invocation;
    }

    public static Map<String, Object> arguments(Object... nameValues) {
        if (nameValues.length == 0) {
            return Map.of();
        }
        if (nameValues.length % 2 != 0) {
            throw new IllegalArgumentException("Tool arguments must be name/value pairs");
        }
        Map<String, Object> arguments = new LinkedHashMap<>();
        for (int i = 0; i < nameValues.length; i += 2) {
            Object value = nameValues[i + 1];
            if (value != null) {
                arguments.put(String.valueOf(nameValues[i]), value);
            }
        }
        return arguments;
    }

    public static int bound(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
