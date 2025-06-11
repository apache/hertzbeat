package org.apache.hertzbeat;

import org.apache.hertzbeat.ai.agent.tools.MonitorService;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class HertzbeatAiAgentApplication {
	@Autowired
	private MonitorService service;
	@Bean
	public ToolCallbackProvider weatherTools() {
		return MethodToolCallbackProvider.builder().toolObjects(service).build();
	}
}
