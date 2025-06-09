package org.apache.hertzbeat;

import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class HertzbeatAiAgentApplication {

	public static void main(String[] args) {
		SpringApplication.run(HertzbeatAiAgentApplication.class, args);
	}

	@Bean
	public ToolCallbackProvider mathTools() {
		return MethodToolCallbackProvider.builder().toolObjects(new MathTools()).build();
	}

	@Bean
	public ToolCallbackProvider dateTimeTools() {
		return MethodToolCallbackProvider.builder().toolObjects(new DateTimeTools()).build();
	}
}
