package org.apache.hertzbeat.ai.agent.service;

import org.springframework.ai.tool.ToolCallbackProvider;

/**
 * Service interface for MCP server operations.
 */
public interface McpServerService {
    public ToolCallbackProvider monitorTools();
}