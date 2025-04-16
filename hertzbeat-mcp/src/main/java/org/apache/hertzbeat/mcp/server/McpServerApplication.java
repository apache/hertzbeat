package org.apache.hertzbeat.mcp.server;


import org.apache.hertzbeat.mcp.server.service.LogService;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
 * MCP 服务器示例
 */
@SpringBootApplication
public class McpServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(McpServerApplication.class, args);
    }

    @Bean
    public ToolCallbackProvider tools(
            LogService logService) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(logService)
                .build();
    }
}
