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

package org.apache.hertzbeat.ai.sop.registry;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.stereotype.Component;
import org.springframework.util.ClassUtils;
import org.springframework.util.ReflectionUtils;

/**
 * Registry for Spring AI tools.
 *
 * <p>Scans beans containing {@link Tool} methods on first use and delegates argument deserialization,
 * proxy method resolution, and result conversion to Spring AI's {@link MethodToolCallbackProvider}.
 */
@Slf4j
@Component
public class ToolRegistry {

    private final ApplicationContext applicationContext;
    private volatile Map<String, RegisteredTool> tools = Map.of();
    private volatile boolean initialized = false;

    @Autowired
    public ToolRegistry(ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
    }

    private void ensureInitialized() {
        if (!initialized) {
            synchronized (this) {
                if (!initialized) {
                    tools = scanAllBeans();
                    initialized = true;
                    log.info("Registered {} tool methods: {}", tools.size(), tools.keySet());
                }
            }
        }
    }

    private Map<String, RegisteredTool> scanAllBeans() {
        log.info("Scanning for @Tool annotated methods...");
        List<Object> toolBeans = Arrays.stream(applicationContext.getBeanDefinitionNames())
                .filter(this::containsToolMethod)
                .map(applicationContext::getBean)
                .toList();

        if (toolBeans.isEmpty()) {
            return Map.of();
        }

        ToolCallback[] callbacks = MethodToolCallbackProvider.builder().toolObjects(toolBeans.toArray())
                .build().getToolCallbacks();
        Map<String, RegisteredTool> discoveredTools = new LinkedHashMap<>();
        for (ToolCallback callback : callbacks) {
            String toolName = callback.getToolDefinition().name();
            discoveredTools.put(toolName, new RegisteredTool(callback, getRequiredParameters(callback)));
        }
        return Collections.unmodifiableMap(discoveredTools);
    }

    private boolean containsToolMethod(String beanName) {
        Class<?> beanType = applicationContext.getType(beanName, false);
        if (beanType == null) {
            return false;
        }
        return Arrays.stream(ReflectionUtils.getDeclaredMethods(ClassUtils.getUserClass(beanType)))
                .anyMatch(this::isToolMethod);
    }

    private boolean isToolMethod(Method method) {
        return AnnotationUtils.findAnnotation(method, Tool.class) != null;
    }

    @SuppressWarnings("unchecked")
    private Set<String> getRequiredParameters(ToolCallback callback) {
        Map<String, Object> schema = JsonUtil.fromJson(callback.getToolDefinition().inputSchema(), Map.class);
        if (schema == null || !(schema.get("required") instanceof List<?> required)) {
            return Set.of();
        }
        return required.stream()
                .map(String::valueOf)
                .collect(Collectors.toUnmodifiableSet());
    }

    /**
     * Invokes a tool with the provided arguments.
     */
    public String invoke(String toolName, Map<String, Object> args) {
        ensureInitialized();
        RegisteredTool tool = tools.get(toolName);
        if (tool == null) {
            throw new IllegalArgumentException("Unknown tool: " + toolName
                    + ". Available tools: " + tools.keySet());
        }
        Map<String, Object> safeArgs = args == null ? Map.of() : args;
        validateRequiredParameters(tool.requiredParameters(), safeArgs);
        String result = tool.callback().call(JsonUtil.toJson(safeArgs));
        Object convertedResult = JsonUtil.fromJson(result, Object.class);
        return convertedResult instanceof String text ? text : result;
    }

    private void validateRequiredParameters(Set<String> requiredParameters, Map<String, Object> args) {
        for (String parameter : requiredParameters) {
            Object value = args.get(parameter);
            if (value == null || value instanceof String text && text.isBlank()) {
                throw new IllegalArgumentException("Required tool parameter is missing: " + parameter);
            }
        }
    }

    /**
     * Checks whether a tool exists.
     */
    public boolean hasMethod(String toolName) {
        ensureInitialized();
        return tools.containsKey(toolName);
    }

    /**
     * Returns an immutable snapshot of all registered tool names.
     */
    public Set<String> getToolNames() {
        ensureInitialized();
        return Set.copyOf(tools.keySet());
    }

    private record RegisteredTool(ToolCallback callback, Set<String> requiredParameters) {
    }
}
