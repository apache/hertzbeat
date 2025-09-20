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


package org.apache.hertzbeat.ai.agent.service.impl;

import org.apache.hertzbeat.ai.agent.config.CustomSseServerTransport;
import org.apache.hertzbeat.ai.agent.service.McpServerService;
import org.apache.hertzbeat.ai.agent.tools.AlertDefineTools;
import org.apache.hertzbeat.ai.agent.tools.AlertTools;
import org.apache.hertzbeat.ai.agent.tools.MetricsTools;
import org.apache.hertzbeat.ai.agent.tools.MonitorTools;
import org.springframework.ai.mcp.server.autoconfigure.McpServerProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

/**
 * Implementation of the McpServerService interface.
 * This service provides functionality for handling MCP server operations.
 */
@Service
@Configuration
public class McpServerServiceImpl implements McpServerService {
    @Autowired
    private MonitorTools monitorTools;
    @Autowired
    private AlertTools alertTools;
    @Autowired
    private MetricsTools metricsTools;
    @Autowired
    private AlertDefineTools alertDefineTools;

    @Bean
    public ToolCallbackProvider hertzbeatTools() {
        return MethodToolCallbackProvider.builder().toolObjects(monitorTools, alertTools, alertDefineTools, metricsTools).build();
    }
    /**
     * Provides a custom SSE server transport for the MCP server.
     *
     * @param objectMapper the ObjectMapper instance for JSON serialization
     * @param serverProperties the properties for the MCP server configuration
     * @return a CustomSseServerTransport instance configured with the provided properties
     */

    @Bean
    public CustomSseServerTransport webMvcSseServerTransportProvider(
            ObjectMapper objectMapper,
            McpServerProperties serverProperties
    ) {
        return new CustomSseServerTransport(
                objectMapper,
                serverProperties.getBaseUrl(),
                serverProperties.getSseMessageEndpoint(),
                serverProperties.getSseEndpoint()
        );
    }
    /**
     * Provides the MCP server transport bean.
     *
     * @param transport the custom SSE server transport
     * @return the MCP server transport instance
     */

    @Primary
    @Bean
    public RouterFunction<ServerResponse> mvcMcpRouterFunction(CustomSseServerTransport transport) {
        return transport.getRouterFunction();
    }
}
