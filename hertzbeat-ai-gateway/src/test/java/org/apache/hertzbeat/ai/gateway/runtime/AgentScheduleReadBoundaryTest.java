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

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.schedule.AgentScheduleExecutor;
import org.apache.hertzbeat.ai.gateway.schedule.AgentScheduleService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolOutput;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.schedule.AgentScheduleToolService;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Map;

/** Schedule tools must match the ADMIN boundary of the native API and page. */
class AgentScheduleReadBoundaryTest {
    @Test
    void scheduleListRequiresAdminWithoutChangingReadRisk() throws Exception {
        var policy =
                AgentScheduleToolService.class
                        .getMethod("listSchedules")
                        .getAnnotation(AgentToolPolicy.class);
        assertEquals(AgentToolAccess.ADMIN, policy.access());
        assertEquals(AgentToolRisk.READ, policy.risk());
        assertEquals(
                AgentPolicyDecision.DENY,
                new AgentPolicyService()
                        .decide(ControlledMonitorTools.USER, descriptor("schedule.list", policy))
                        .getDecision());
    }

    @Test
    void everyScheduleToolRequiresAdminWhilePreservingRiskApprovalMatrix() {
        int count = 0;
        for (var method : AgentScheduleToolService.class.getMethods()) {
            var tool = method.getAnnotation(Tool.class);
            if (tool == null) {
                continue;
            }
            count++;
            var policy = method.getAnnotation(AgentToolPolicy.class);
            assertEquals(AgentToolAccess.ADMIN, policy.access());
            var descriptor = descriptor(tool.name(), policy);
            for (var actor :
                    List.of(
                            ControlledMonitorTools.USER,
                            AgentActor.builder()
                                    .type("user")
                                    .id("guest")
                                    .roles(List.of("guest"))
                                    .build())) {
                assertEquals(
                        AgentPolicyDecision.DENY,
                        new AgentPolicyService().decide(actor, descriptor).getDecision());
            }
            assertEquals(
                    policy.risk() == AgentToolRisk.DANGEROUS
                            ? AgentPolicyDecision.REQUIRE_APPROVAL
                            : AgentPolicyDecision.ALLOW,
                    new AgentPolicyService()
                            .decide(ControlledMonitorTools.ADMIN, descriptor)
                            .getDecision());
        }
        assertEquals(6, count);
    }

    @Test
    void userIsDeniedBeforeScheduleHandlerButAdminReadCanReachIt() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var schedules = mock(AgentScheduleService.class);
            var service =
                    new AgentScheduleToolService(schedules, mock(AgentScheduleExecutor.class));
            var policy =
                    AgentScheduleToolService.class
                            .getMethod("listSchedules")
                            .getAnnotation(AgentToolPolicy.class);
            tools.registry.register(
                    new AgentToolRegistry.RegisteredTool(
                            descriptor("schedule.list", policy),
                            context ->
                                    AgentToolOutput.builder()
                                            .status(AgentToolStatus.SUCCEEDED)
                                            .modelContent(JsonUtil.toJson(service.listSchedules()))
                                            .build()));
            var denied =
                    tools.orchestrator.execute(
                            tools.request("schedule.list", Map.of(), ControlledMonitorTools.USER));
            assertEquals(AgentToolStatus.DENIED, denied.getStatus());
            verifyNoInteractions(schedules);
            when(schedules.list(org.mockito.ArgumentMatchers.any())).thenReturn(Page.empty());
            var allowed =
                    tools.orchestrator.execute(
                            tools.request("schedule.list", Map.of(), ControlledMonitorTools.ADMIN));
            assertEquals(AgentToolStatus.SUCCEEDED, allowed.getStatus());
        }
    }

    private static AgentToolDescriptor descriptor(String name, AgentToolPolicy policy) {
        return AgentToolDescriptor.builder()
                .name(name)
                .description("System-level schedule operation")
                .inputSchema("{\"type\":\"object\"}")
                .namespace("schedule")
                .exposure(policy.exposure())
                .access(policy.access())
                .risk(policy.risk())
                .build();
    }
}
