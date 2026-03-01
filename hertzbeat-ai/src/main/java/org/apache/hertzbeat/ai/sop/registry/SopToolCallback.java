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

import org.apache.hertzbeat.ai.sop.engine.SopEngine;
import org.apache.hertzbeat.ai.sop.model.SopDefinition;
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
        // TODO: Parse arguments and execute SOP
        return "SOP " + definition.getName() + " execution started.";
    }

    private String buildInputSchema() {
        // Build JSON Schema for SOP parameters
        StringBuilder schema = new StringBuilder();
        schema.append("{\"type\":\"object\",\"properties\":{");
        
        if (definition.getParameters() != null && !definition.getParameters().isEmpty()) {
            boolean first = true;
            for (var param : definition.getParameters()) {
                if (!first) {
                    schema.append(",");
                }
                schema.append("\"").append(param.getName()).append("\":");
                schema.append("{\"type\":\"").append(mapType(param.getType())).append("\"");
                if (param.getDescription() != null) {
                    schema.append(",\"description\":\"").append(param.getDescription()).append("\"");
                }
                schema.append("}");
                first = false;
            }
        }
        
        schema.append("}}");
        return schema.toString();
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
