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

package org.apache.hertzbeat.ai.gateway.tool.core;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry.RegisteredTool;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.ai.tool.method.MethodToolCallback;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.support.ToolDefinitions;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.ClassUtils;
import org.springframework.util.ReflectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.core.type.TypeReference;

/**
 * Agent tool registry configuration.
 */
@Configuration
public class AgentToolConfiguration {

    private static final String TOOL_PACKAGE_PREFIX = "org.apache.hertzbeat.ai.gateway.tool.";

    @Bean
    public AgentToolRegistry agentToolRegistry(ConfigurableListableBeanFactory beanFactory) {
        AgentToolRegistry registry = new AgentToolRegistry();
        handlers(beanFactory).forEach(registry::register);
        return registry;
    }

    private List<RegisteredTool> handlers(ConfigurableListableBeanFactory beanFactory) {
        List<RegisteredTool> handlers = new ArrayList<>();
        for (String beanName : beanFactory.getBeanDefinitionNames()) {
            Class<?> beanType = beanFactory.getType(beanName, false);
            if (beanType == null || !ClassUtils.getPackageName(ClassUtils.getUserClass(beanType))
                    .startsWith(TOOL_PACKAGE_PREFIX)) {
                continue;
            }
            for (Method method : ReflectionUtils.getUniqueDeclaredMethods(ClassUtils.getUserClass(beanType))) {
                Tool tool = method.getAnnotation(Tool.class);
                AgentToolPolicy policy = method.getAnnotation(AgentToolPolicy.class);
                if (tool == null && policy == null) {
                    continue;
                }
                if (tool == null || policy == null) {
                    throw new IllegalStateException("@Tool and @AgentToolPolicy must be declared together: " + method);
                }
                Object bean = beanFactory.getBean(beanName);
                Method invocableMethod = AopUtils.selectInvocableMethod(method, bean.getClass());
                ReflectionUtils.makeAccessible(invocableMethod);
                ToolDefinition definition = ToolDefinitions.from(method);
                ToolCallback callback = MethodToolCallback.builder()
                        .toolDefinition(definition)
                        .toolMethod(invocableMethod)
                        .toolObject(bean)
                        .build();
                boolean structuredOutput = AgentToolOutput.class.isAssignableFrom(method.getReturnType());
                handlers.add(new RegisteredTool(descriptor(definition, policy),
                        context -> invoke(callback, structuredOutput, context)));
            }
        }
        return handlers;
    }

    private AgentToolOutput invoke(ToolCallback callback, boolean structuredOutput,
                                   AgentToolExecutionContext context) {
        String toolInput = JsonUtil.toJson(context.getRequest().getArguments());
        String result = AgentToolContextSupport.withInvocation(context, () -> callback.call(toolInput));
        if (structuredOutput) {
            Map<String, Object> output = JsonUtil.fromJson(result, new TypeReference<>() {
            });
            if (output == null || !(output.get("status") instanceof String status)) {
                throw new IllegalStateException("Structured Agent tool output requires status");
            }
            return AgentToolOutput.builder()
                .status(AgentToolStatus.valueOf(status))
                .modelContent((String) output.get("modelContent"))
                .errorMessage((String) output.get("errorMessage"))
                .build();
        }
        return AgentToolOutput.builder()
                .status(AgentToolStatus.SUCCEEDED)
                .modelContent(result)
                .build();
    }

    private AgentToolDescriptor descriptor(ToolDefinition definition, AgentToolPolicy policy) {
        if (!StringUtils.hasText(definition.name())) {
            throw new IllegalArgumentException("Spring AI tool name is required");
        }
        return AgentToolDescriptor.builder()
            .name(definition.name())
            .description(definition.description())
            .inputSchema(definition.inputSchema())
            .risk(policy.risk())
            .namespace(namespace(definition.name()))
            .exposure(policy.exposure())
            .build();
    }

    private String namespace(String name) {
        int separator = name == null ? -1 : name.indexOf('.');
        return separator < 0 ? name : name.substring(0, separator);
    }
}
