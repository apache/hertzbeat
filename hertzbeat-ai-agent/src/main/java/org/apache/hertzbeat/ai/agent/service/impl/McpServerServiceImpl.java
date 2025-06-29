package org.apache.hertzbeat.ai.agent.service.impl;

import org.apache.hertzbeat.ai.agent.service.McpServerService;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.ai.agent.tools.impl.MonitorToolsImpl;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Implementation of the McpServerService interface.
 * This service provides functionality for handling MCP server operations.
 */
@Service
@Configuration
public class McpServerServiceImpl implements McpServerService {
    @Autowired
    private MonitorToolsImpl monitorTools;

    @Bean
    public ToolCallbackProvider hertzbeatTools() {
        return MethodToolCallbackProvider.builder().toolObjects(monitorTools).build();
    }
}