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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.legacy.LegacyToolService;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.context.support.GenericApplicationContext;

/**
 * Test case for {@link AgentToolConfiguration}.
 */
class AgentToolConfigurationTest {

    @Test
    void shouldRegisterSpringAiTools() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(SampleToolService.class);
            context.refresh();

            AgentToolRegistry registry = new AgentToolConfiguration()
                .agentToolRegistry(context.getDefaultListableBeanFactory());

            assertEquals(List.of("sample.one", "sample.two"),
                registry.descriptors().stream().map(AgentToolDescriptor::getName).toList());
            AgentToolDescriptor first = registry.find("sample.one").orElseThrow().descriptor();
            assertEquals("sample", first.getNamespace());
            assertEquals(AgentToolRisk.READ, first.getRisk());
            assertTrue(first.getInputSchema().contains("\"monitorId\""));
            assertFalse(first.getInputSchema().contains("agentToolExecutionContext"));

            AgentToolOutput output = registry.find("sample.one").orElseThrow()
                .execute(context(first, Map.of("monitorId", 10L)));

            assertEquals(AgentToolStatus.SUCCEEDED, output.getStatus());
            assertTrue(output.getModelContent().contains("monitorId"));
            assertTrue(output.getModelContent().contains("10"));
        }
    }

    @Test
    void shouldWrapPlainToolReturnValue() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(PlainToolService.class);
            context.refresh();

            AgentToolRegistry registry = new AgentToolConfiguration()
                .agentToolRegistry(context.getDefaultListableBeanFactory());
            AgentToolRegistry.RegisteredTool handler = registry.find("sample.plain").orElseThrow();
            AgentToolOutput output = handler.execute(context(handler.descriptor(), Map.of()));

            assertEquals(AgentToolStatus.SUCCEEDED, output.getStatus());
            assertTrue(output.getModelContent().contains("plain"));
        }
    }

    @Test
    void shouldPreserveStructuredToolOutput() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(StructuredToolService.class);
            context.refresh();

            AgentToolRegistry registry = new AgentToolConfiguration()
                .agentToolRegistry(context.getDefaultListableBeanFactory());
            AgentToolRegistry.RegisteredTool handler = registry.find("sample.structured").orElseThrow();
            AgentToolOutput output = handler.execute(context(handler.descriptor(), Map.of()));

            assertEquals(AgentToolStatus.FAILED, output.getStatus());
            assertEquals("diagnostic output", output.getModelContent());
            assertEquals("diagnostic error", output.getErrorMessage());
        }
    }

    @Test
    void shouldIgnoreToolBeansOutsideGatewayToolPackage() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(SampleToolService.class);
            context.registerBean(LegacyToolService.class);
            context.refresh();

            AgentToolRegistry registry = new AgentToolConfiguration()
                .agentToolRegistry(context.getDefaultListableBeanFactory());

            assertEquals(List.of("sample.one", "sample.two"),
                registry.descriptors().stream().map(AgentToolDescriptor::getName).toList());
        }
    }

    private AgentToolExecutionContext context(AgentToolDescriptor descriptor, Map<String, Object> arguments) {
        AgentToolExecutionRequest request = AgentToolExecutionRequest.builder()
            .sessionUid("ags_1")
            .runId(2L)
            .runUid("run_1")
            .runSessionId(1L)
            .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
            .entryType(AgentRuntimeEntryType.USER_INPUT)
            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
            .toolName(descriptor.getName())
            .toolCallId("agc_sample")
            .arguments(arguments)
            .build();
        return new AgentToolExecutionContext(request,
            AgentToolCall.builder().toolCallId("agc_sample").build());
    }

    static class SampleToolService {

        @Tool(name = "sample.one", description = "Sample tool one.")
        @AgentToolPolicy
        public Map<String, Object> one(
            @ToolParam(description = "Monitor id.")
            Long monitorId) {
            return Map.of("monitorId", monitorId);
        }

        @Tool(name = "sample.two", description = "Sample tool two.")
        @AgentToolPolicy
        public String two(
            @ToolParam(required = false, description = "Optional filter.")
            String filter) {
            return filter;
        }
    }

    static class PlainToolService {

        @Tool(name = "sample.plain", description = "Plain return tool.")
        @AgentToolPolicy
        public String execute() {
            return "plain";
        }
    }

    static class StructuredToolService {

        @Tool(name = "sample.structured", description = "Structured return tool.")
        @AgentToolPolicy
        public AgentToolOutput execute() {
            return AgentToolOutput.builder()
                .status(AgentToolStatus.FAILED)
                .modelContent("diagnostic output")
                .errorMessage("diagnostic error")
                .build();
        }
    }
}
