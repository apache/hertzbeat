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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.sop.engine.SopEngine;
import org.apache.hertzbeat.ai.sop.model.SopDefinition;
import org.apache.hertzbeat.ai.sop.model.SopParameter;
import org.apache.hertzbeat.ai.sop.model.SopResult;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;

/**
 * ToolCallback implementation for executing AI SOPs.
 * Wraps a SOP definition as a Spring AI tool.
 */
public class SopToolCallback implements ToolCallback {

    private final SopDefinition definition;
    private final SopEngine sopEngine;
    private final ToolDefinition toolDefinition;

    public SopToolCallback(SopDefinition definition, SopEngine sopEngine) {
        this.definition = definition;
        this.sopEngine = sopEngine;
        this.toolDefinition = ToolDefinition.builder()
                .name(definition.getName())
                .description(definition.getDescription())
                .inputSchema(buildInputSchema())
                .build();
    }

    @Override
    public ToolDefinition getToolDefinition() {
        return toolDefinition;
    }

    @Override
    public String call(String arguments) {
        Map<String, Object> inputParams = parseArguments(arguments);
        SopResult result = sopEngine.executeSync(definition, inputParams);
        return result.toAiResponse();
    }

    private String buildInputSchema() {
        Map<String, Object> schema = new LinkedHashMap<>();
        Map<String, Object> properties = new LinkedHashMap<>();
        List<String> required = new ArrayList<>();

        if (definition.getParameters() != null) {
            for (SopParameter parameter : definition.getParameters()) {
                Map<String, Object> property = new LinkedHashMap<>();
                property.put("type", mapType(parameter.getType()));
                if (parameter.getDescription() != null) {
                    property.put("description", parameter.getDescription());
                }
                if (parameter.getDefaultValue() != null) {
                    property.put("default", convertDefaultValue(parameter));
                }
                properties.put(parameter.getName(), property);
                if (parameter.isRequired()) {
                    required.add(parameter.getName());
                }
            }
        }

        schema.put("type", "object");
        schema.put("properties", properties);
        if (!required.isEmpty()) {
            schema.put("required", required);
        }
        schema.put("additionalProperties", false);
        return JsonUtil.toJson(schema);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseArguments(String arguments) {
        if (arguments == null || arguments.isBlank()) {
            return new HashMap<>();
        }
        Map<String, Object> inputParams = JsonUtil.fromJson(arguments, Map.class);
        if (inputParams == null) {
            throw new IllegalArgumentException("SOP tool arguments must be a valid JSON object");
        }
        return inputParams;
    }

    private Object convertDefaultValue(SopParameter parameter) {
        String defaultValue = parameter.getDefaultValue();
        try {
            return switch (mapType(parameter.getType())) {
                case "boolean" -> Boolean.valueOf(defaultValue);
                case "integer" -> Long.valueOf(defaultValue);
                case "number" -> Double.valueOf(defaultValue);
                default -> defaultValue;
            };
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid default value for SOP parameter: " + parameter.getName(), e);
        }
    }

    private String mapType(String type) {
        if (type == null) {
            return "string";
        }
        switch (type.toLowerCase()) {
            case "boolean":
                return "boolean";
            case "integer":
            case "int":
            case "long":
                return "integer";
            case "number":
            case "double":
            case "float":
                return "number";
            default:
                return "string";
        }
    }
}
