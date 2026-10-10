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
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.junit.jupiter.api.Test;

/**
 * Tests target-correlated authorization before any tool side effect.
 */
class AgentTargetToolAuthorizationTest {

    private final AgentTargetToolAuthorizer authorizer = new AgentTargetToolAuthorizer();

    @Test
    void exactMonitorMetricTargetShouldAllowOnlyCorrelatedReadsAndDiscovery() {
        AgentTargetRef target = exactTarget();

        assertAllowed(request("metrics.history", exactMetricsArguments(), target), AgentToolRisk.READ);
        assertAllowed(request("monitor.get", Map.of("monitorId", 42L), target), AgentToolRisk.READ);
        assertAllowed(request("tool.search", Map.of("query", "metrics"), target), AgentToolRisk.READ);
        assertAllowed(request("skill.load", Map.of("name", "monitoring"), target), AgentToolRisk.READ);
    }

    @Test
    void exactMonitorMetricTargetShouldRejectMismatchedOrUnrelatedReads() {
        AgentTargetRef target = exactTarget();

        assertDenied(request("metrics.history", with("monitorId", 43L), target), AgentToolRisk.READ);
        assertDenied(request("metrics.history", with("metricKey", "basic.memory"), target), AgentToolRisk.READ);
        assertDenied(request("metrics.history", with("start", 99L), target), AgentToolRisk.READ);
        assertDenied(request("metrics.history", with("end", 201L), target), AgentToolRisk.READ);
        assertDenied(request("metrics.history", with("inputRef", "air-foreign"), target), AgentToolRisk.READ);
        assertDenied(request("metrics.history", with("unexpected", "overlay"), target), AgentToolRisk.READ);
        assertDenied(request("monitor.get", Map.of("monitorId", 43L), target), AgentToolRisk.READ);
        assertDenied(request("monitor.get", Map.of("monitorId", 42L, "inputRef", "air-foreign"), target),
                AgentToolRisk.READ);
        assertDenied(request("monitor.query", Map.of(), target), AgentToolRisk.READ);
        assertDenied(request("entity.get", Map.of("entityId", 42L), target), AgentToolRisk.READ);
        assertDenied(request("alert.summary", Map.of(), target), AgentToolRisk.READ);
        assertDenied(request("topology.query", Map.of(), target), AgentToolRisk.READ);
        assertDenied(request("logs.query", Map.of(), target), AgentToolRisk.READ);
        assertDenied(request("traces.query", Map.of(), target), AgentToolRisk.READ);
    }

    @Test
    void targetShouldNotGrantChangeOrNonUserRunsAdditionalAccess() {
        AgentTargetRef target = exactTarget();

        assertDenied(request("ops.alert_silence", Map.of("alertId", 1L), target), AgentToolRisk.CHANGE);
        AgentToolExecutionRequest scheduled = request("metrics.history", exactMetricsArguments(), target).toBuilder()
                .entryType(AgentRuntimeEntryType.SCHEDULE_TRIGGER)
                .build();
        assertDenied(scheduled, AgentToolRisk.READ);
    }

    @Test
    void unsupportedTargetShouldFailClosedWhileUntargetedChatKeepsExistingPolicy() {
        AgentTargetRef entityTarget = AgentTargetRef.builder().entityId(9L).build();

        assertDenied(request("entity.get", Map.of("entityId", 9L), entityTarget), AgentToolRisk.READ);
        assertAllowed(request("monitor.query", Map.of(), null), AgentToolRisk.READ);
    }

    private void assertAllowed(AgentToolExecutionRequest request, AgentToolRisk risk) {
        assertTrue(authorizer.denialReason(request, descriptor(request.getToolName(), risk)).isEmpty());
    }

    private void assertDenied(AgentToolExecutionRequest request, AgentToolRisk risk) {
        Optional<String> denial = authorizer.denialReason(request, descriptor(request.getToolName(), risk));
        assertEquals(Optional.of(AgentTargetToolAuthorizer.TARGET_DENIAL_REASON), denial);
    }

    private AgentToolExecutionRequest request(String toolName, Map<String, Object> arguments, AgentTargetRef target) {
        return AgentToolExecutionRequest.builder()
                .sessionUid("ags_1")
                .runId(2L)
                .runUid("run_1")
                .runSessionId(1L)
                .workspaceId("workspace-a")
                .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .effectiveTarget(target)
                .toolName(toolName)
                .toolCallId("call_1")
                .arguments(arguments)
                .build();
    }

    private AgentTargetRef exactTarget() {
        return AgentTargetRef.builder()
                .monitorId(42L)
                .signal(AgentSignalRef.builder()
                        .type("metrics")
                        .query("basic.cpu")
                        .start(100L)
                        .end(200L)
                        .build())
                .build();
    }

    private Map<String, Object> exactMetricsArguments() {
        return Map.of("monitorId", 42L, "metricKey", "basic.cpu", "start", 100L, "end", 200L);
    }

    private Map<String, Object> with(String key, Object value) {
        java.util.LinkedHashMap<String, Object> arguments = new java.util.LinkedHashMap<>(exactMetricsArguments());
        arguments.put(key, value);
        return arguments;
    }

    private AgentToolDescriptor descriptor(String toolName, AgentToolRisk risk) {
        return AgentToolDescriptor.builder()
                .name(toolName)
                .namespace(toolName.substring(0, toolName.indexOf('.')))
                .description("Test tool")
                .inputSchema("{\"type\":\"object\"}")
                .risk(risk)
                .exposure(AgentToolExposure.MODEL_VISIBLE)
                .build();
    }
}
