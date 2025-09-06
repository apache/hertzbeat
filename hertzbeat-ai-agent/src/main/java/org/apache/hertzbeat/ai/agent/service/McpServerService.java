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


package org.apache.hertzbeat.ai.agent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hertzbeat.ai.agent.config.CustomSseServerTransport;
import org.springframework.ai.mcp.server.autoconfigure.McpServerProperties;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

/**
 * Service interface for MCP server operations.
 */
public interface McpServerService {
    
    /**
     * Provides the HertzBeat tools for the MCP server
     * @return ToolCallbackProvider with all HertzBeat monitoring tools
     */
    ToolCallbackProvider hertzbeatTools();

    /**
     * Provides a custom SSE server transport for the MCP server
     * @param objectMapper the ObjectMapper instance for JSON serialization
     * @param serverProperties the properties for the MCP server configuration
     * @return a CustomSseServerTransport instance configured with the provided properties
     */
    CustomSseServerTransport webMvcSseServerTransportProvider(
            ObjectMapper objectMapper,
            McpServerProperties serverProperties
    );

    /**
     * Provides the MCP server router function for web MVC
     * @param transport Custom SSE server transport
     * @return RouterFunction for handling MCP server requests
     */
    RouterFunction<ServerResponse> mvcMcpRouterFunction(CustomSseServerTransport transport);
}
