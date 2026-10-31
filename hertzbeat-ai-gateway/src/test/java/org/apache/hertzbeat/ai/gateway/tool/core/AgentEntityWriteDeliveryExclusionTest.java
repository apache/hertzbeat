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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

class AgentEntityWriteDeliveryExclusionTest {
    @Test
    void excludedWritesCannotBeDiscoveredResolvedOrReenabledByRegistration() {
        var registry = new AgentToolRegistry();
        var executions = new AtomicInteger();
        for (var exposure :
                List.of(AgentToolExposure.MODEL_VISIBLE, AgentToolExposure.MODEL_ON_DEMAND)) {
            for (String name : List.of("entity.create", "entity.update", "entity.delete")) {
                var descriptor =
                        AgentToolDescriptor.builder()
                                .name(name)
                                .namespace("entity")
                                .description("Not an enabled delivery operation")
                                .inputSchema("{\"type\":\"object\",\"properties\":{}}")
                                .risk(AgentToolRisk.CHANGE)
                                .access(AgentToolAccess.ADMIN)
                                .exposure(exposure)
                                .build();
                registry.register(
                        new AgentToolRegistry.RegisteredTool(
                                descriptor,
                                context -> {
                                    executions.incrementAndGet();
                                    throw new AssertionError("Excluded write executed");
                                }));
                assertTrue(registry.find(name).isEmpty());
            }
        }
        assertTrue(registry.descriptors().isEmpty());
        assertTrue(registry.discoverablePage("entity", null, 0).tools().isEmpty());
        assertEquals(0, executions.get());
    }

    @Test
    void independentEntityReadAndWebsiteBatchRegistrationArePreserved() {
        var registry = new AgentToolRegistry();
        for (String name : List.of("entity.get", "entity.editable", "monitor.create_batch")) {
            var descriptor =
                    AgentToolDescriptor.builder()
                            .name(name)
                            .namespace(name.split("\\.")[0])
                            .description("Retained scoped native operation")
                            .inputSchema("{\"type\":\"object\",\"properties\":{}}")
                            .risk(
                                    name.equals("monitor.create_batch")
                                            ? AgentToolRisk.CHANGE
                                            : AgentToolRisk.READ)
                            .access(AgentToolAccess.USER)
                            .exposure(AgentToolExposure.MODEL_ON_DEMAND)
                            .build();
            registry.register(
                    new AgentToolRegistry.RegisteredTool(
                            descriptor,
                            context -> {
                                throw new AssertionError("Metadata only");
                            }));
            assertTrue(registry.find(name).isPresent());
        }
        assertEquals(3, registry.descriptors().size());
        assertFalse(registry.discoverablePage("entity", null, 0).tools().isEmpty());
    }

    @Test
    void directOrchestratorInvocationCannotExecuteAnExcludedWrite() {
        assertExcludedAtExecutionBoundary(null);
    }

    @Test
    void approvalResumeCannotRestoreAnExcludedWriteHandler() {
        assertExcludedAtExecutionBoundary("persisted-approval-fixture");
    }

    private void assertExcludedAtExecutionBoundary(String approvalId) {
        var registry = new AgentToolRegistry();
        var policy = mock(AgentPolicyService.class);
        var ledger = mock(AgentToolCallLedgerService.class);
        var inputs = mock(org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService.class);
        var targets = mock(AgentTargetToolAuthorizer.class);
        var orchestrator = new AgentToolExecutionOrchestrator(registry, policy, ledger, inputs, targets);
        for (String name : List.of("entity.create", "entity.update", "entity.delete")) {
            registry.register(new AgentToolRegistry.RegisteredTool(
                    AgentToolDescriptor.builder().name(name).namespace("entity")
                            .description("Excluded test operation")
                            .inputSchema("{\"type\":\"object\",\"properties\":{}}")
                            .risk(AgentToolRisk.CHANGE).access(AgentToolAccess.ADMIN)
                            .exposure(AgentToolExposure.MODEL_ON_DEMAND).build(),
                    context -> { throw new AssertionError("Excluded handler executed"); }));
            var request = AgentToolExecutionRequest.builder()
                    .sessionUid("isolated-session").runId(1L).runUid("isolated-run").runSessionId(1L)
                    .actor(org.apache.hertzbeat.ai.gateway.identity.AgentActor.builder()
                            .type("user").id("isolated-actor").roles(List.of("admin")).build())
                    .entryType(org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType.USER_INPUT)
                    .approvalHandling(org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling.WAIT_FOR_DECISION)
                    .toolName(name).toolCallId("isolated-call").approvalId(approvalId)
                    .approvalStatus(approvalId == null ? null : "APPROVED")
                    .arguments(java.util.Map.of()).build();
            var error = assertThrows(IllegalArgumentException.class, () -> orchestrator.execute(request));
            assertEquals("Agent tool is not registered: " + name, error.getMessage());
        }
        // Lookup must fail before approval validation/consumption, policy evaluation or input merging.
        verifyNoInteractions(policy, ledger, inputs, targets);
    }

}
