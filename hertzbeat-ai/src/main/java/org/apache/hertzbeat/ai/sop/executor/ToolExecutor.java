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

package org.apache.hertzbeat.ai.sop.executor;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.sop.model.SopStep;
import org.apache.hertzbeat.ai.sop.registry.ToolRegistry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

/**
 * Executor for 'tool' type steps.
 * Uses ToolRegistry to dynamically discover and invoke @Tool annotated methods.
 */
@Slf4j
@Component
public class ToolExecutor implements SopExecutor {

    private static final Pattern FULL_PLACEHOLDER = Pattern.compile("^\\$\\{([^{}]+)}$");
    private static final Pattern INLINE_PLACEHOLDER = Pattern.compile("\\$\\{([^{}]+)}");

    private final ToolRegistry toolRegistry;

    @Autowired
    public ToolExecutor(@Lazy ToolRegistry toolRegistry) {
        this.toolRegistry = toolRegistry;
    }

    @Override
    public boolean support(String type) {
        return "tool".equalsIgnoreCase(type);
    }

    @Override
    public Object execute(SopStep step, Map<String, Object> context) {
        String toolName = step.getTool();
        log.info("Executing tool step: {}", toolName);

        Map<String, Object> args = resolveArgs(step.getArgs(), context);

        try {
            String result = toolRegistry.invoke(toolName, args);
            log.debug("Tool {} returned result length: {}", toolName, 
                    result != null ? result.length() : 0);
            return result;
        } catch (Exception e) {
            log.error("Failed to execute tool {}: {}", toolName, e.getMessage());
            throw new RuntimeException("Tool execution failed: " + toolName, e);
        }
    }

    private Map<String, Object> resolveArgs(Map<String, Object> args, Map<String, Object> context) {
        if (args == null) {
            return new HashMap<>();
        }

        Map<String, Object> resolved = new HashMap<>();
        for (Map.Entry<String, Object> entry : args.entrySet()) {
            Object value = entry.getValue();
            if (value instanceof String) {
                resolved.put(entry.getKey(), resolveStringArg((String) value, context));
            } else {
                resolved.put(entry.getKey(), value);
            }
        }
        return resolved;
    }

    private Object resolveStringArg(String value, Map<String, Object> context) {
        Matcher fullPlaceholder = FULL_PLACEHOLDER.matcher(value);
        if (fullPlaceholder.matches()) {
            return context.get(fullPlaceholder.group(1));
        }

        Matcher inlinePlaceholder = INLINE_PLACEHOLDER.matcher(value);
        if (!inlinePlaceholder.find()) {
            return value;
        }

        StringBuffer resolved = new StringBuffer();
        do {
            String key = inlinePlaceholder.group(1);
            Object replacement = context.get(key);
            String replacementText = replacement == null ? "" : String.valueOf(replacement);
            inlinePlaceholder.appendReplacement(resolved, Matcher.quoteReplacement(replacementText));
        } while (inlinePlaceholder.find());
        inlinePlaceholder.appendTail(resolved);
        return resolved.toString();
    }
}
