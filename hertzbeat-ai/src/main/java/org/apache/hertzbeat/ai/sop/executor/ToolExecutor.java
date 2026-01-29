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
                String strValue = (String) value;
                for (Map.Entry<String, Object> ctxEntry : context.entrySet()) {
                    String placeholder = "${" + ctxEntry.getKey() + "}";
                    if (strValue.contains(placeholder)) {
                        strValue = strValue.replace(placeholder, String.valueOf(ctxEntry.getValue()));
                    }
                }
                resolved.put(entry.getKey(), strValue);
            } else {
                resolved.put(entry.getKey(), value);
            }
        }
        return resolved;
    }
}
