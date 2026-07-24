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

package org.apache.hertzbeat.ai.gateway.tool.discovery;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

/**
 * Discovers tools that are registered for model use on demand.
 */
@Service
public class AgentToolDiscoveryService {

    private final ObjectProvider<AgentToolRegistry> registryProvider;

    public AgentToolDiscoveryService(ObjectProvider<AgentToolRegistry> registryProvider) {
        this.registryProvider = registryProvider;
    }

    @Tool(name = "tool.search",
            description = "Search and load up to 10 registered on-demand tools for direct model invocation. "
                    + "Provide a narrow namespace or query.")
    @AgentToolPolicy
    public Map<String, Object> search(
            @ToolParam(required = false,
                    description = "Exact tool namespace such as alert_rule, collector, database, http, jdbc, monitor, or ssh.")
            String namespace,
            @ToolParam(required = false,
                    description = "Text matched against tool names and descriptions; required when namespace is omitted.")
            String query,
            @ToolParam(required = false,
                    description = "Whether to include each input schema in this search result; default false. "
                            + "Loaded tools receive structured schemas on the next model request.")
            Boolean includeSchema) {
        boolean schemas = Boolean.TRUE.equals(includeSchema);
        List<Map<String, Object>> tools = registryProvider.getObject()
            .discoverableDescriptors(namespace, query).stream()
            .map(descriptor -> toolRow(descriptor, schemas))
            .toList();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("namespace", namespace);
        result.put("query", query);
        result.put("tools", tools);
        result.put("count", tools.size());
        return result;
    }

    private Map<String, Object> toolRow(AgentToolDescriptor descriptor, boolean includeSchema) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("name", descriptor.getName());
        row.put("description", descriptor.getDescription());
        row.put("namespace", descriptor.getNamespace());
        row.put("risk", descriptor.getRisk());
        if (includeSchema) {
            row.put("inputSchema", descriptor.getInputSchema());
        }
        return row;
    }
}
