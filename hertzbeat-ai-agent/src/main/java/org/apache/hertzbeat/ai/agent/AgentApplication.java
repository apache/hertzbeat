package org.apache.hertzbeat.ai.agent;

import org.apache.hertzbeat.ai.agent.tools.impl.MonitorToolsImpl;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
/**
 * Configuration class for Spring AI agent application.
 * Provides the necessary beans for monitoring tools and tool callback providers.
 */

@Configuration
public class AgentApplication {
	@Autowired
	private MonitorToolsImpl monitorTools;

	@Bean
	public ToolCallbackProvider monitorTools() {
		return MethodToolCallbackProvider.builder().toolObjects(monitorTools).build();
	}
}