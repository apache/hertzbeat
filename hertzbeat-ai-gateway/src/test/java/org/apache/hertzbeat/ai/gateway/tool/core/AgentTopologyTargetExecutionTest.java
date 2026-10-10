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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.ai.gateway.application.AgentEntityTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.application.AgentSingleAlertTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.application.AgentTopologyTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTopologyRef;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry.RegisteredTool;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Exact pre-ledger and post-handler authority checks for canonical Topology reads. */
@ExtendWith(MockitoExtension.class)
class AgentTopologyTargetExecutionTest {

    @Mock
    private AgentPolicyService policyService;
    @Mock
    private AgentToolCallLedgerService ledgerService;
    @Mock
    private AgentInteractionInputService interactionInputService;
    @Mock
    private AgentEntityMonitorMetricAuthorityVerifier metricVerifier;
    @Mock
    private AgentSingleAlertTargetAuthorityService alertVerifier;
    @Mock
    private AgentEntityTargetAuthorityService entityVerifier;
    @Mock
    private AgentTopologyTargetAuthorityService topologyVerifier;

    private final AtomicInteger handlerCalls = new AtomicInteger();
    private AgentToolExecutionOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        AgentToolRegistry registry = new AgentToolRegistry();
        registry.register(new RegisteredTool(descriptor(), ignored -> {
            handlerCalls.incrementAndGet();
            return AgentToolOutput.builder().status(AgentToolStatus.SUCCEEDED)
                    .modelContent("{\"focusEntityId\":42,\"depth\":2,\"nodes\":[{\"id\":\"entity:42\"}],"
                            + "\"edges\":[]}")
                    .build();
        }));
        lenient().when(topologyVerifier.isCanonicalTarget(any())).thenReturn(true);
        lenient().when(interactionInputService.validateReference(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(interactionInputService.mergeAndTake(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(policyService.decide(any(), any())).thenReturn(AgentPolicyResult.builder()
                .decision(AgentPolicyDecision.ALLOW).risk(AgentToolRisk.READ).reason("allowed").build());
        lenient().when(ledgerService.recordToolStarted(any(), any(), any()))
                .thenReturn(call(AgentToolStatus.RUNNING));
        lenient().when(ledgerService.completeToolCall(any(), any(), any(Long.class)))
                .thenReturn(call(AgentToolStatus.SUCCEEDED));
        lenient().when(ledgerService.failToolCall(any(), any(), any(Long.class)))
                .thenReturn(call(AgentToolStatus.FAILED));
        orchestrator = new AgentToolExecutionOrchestrator(registry, policyService, ledgerService,
                interactionInputService,
                new AgentTargetToolAuthorizer(metricVerifier, alertVerifier, entityVerifier, topologyVerifier));
    }

    @Test
    void exactTopologyReadShouldPassBothAuthorityChecksAndComplete() {
        when(topologyVerifier.verify("workspace-a", target())).thenReturn(true);

        AgentToolExecutionResult result = orchestrator.execute(request(arguments()));

        assertEquals(AgentToolStatus.SUCCEEDED, result.getStatus());
        assertEquals(1, handlerCalls.get());
        verify(topologyVerifier, org.mockito.Mockito.times(2)).verify("workspace-a", target());
        verify(ledgerService).completeToolCall(any(), any(), any(Long.class));
    }

    @Test
    void scopeMismatchOrOverlayShouldDenyBeforeAuthorityLedgerAndHandler() {
        for (Map<String, Object> mismatched : List.of(
                changed("entityId", 43L), changed("depth", 1), changed("environment", "stage"),
                changed("sourceKind", "entity-relation"), changed("start", 1_001L), changed("end", 2_001L),
                changed("relationType", "depends-on"), changed("hideInternal", false),
                changed("pageIndex", 1), changed("pageSize", 25), changed("inputRef", "air-foreign"),
                without("sourceKind"))) {
            assertEquals(AgentToolStatus.DENIED, orchestrator.execute(request(mismatched)).getStatus());
        }

        assertEquals(0, handlerCalls.get());
        verify(topologyVerifier, never()).verify(any(), any());
        verify(interactionInputService, never()).validateReference(any());
        verify(ledgerService, never()).recordToolStarted(any(), any(), any());
    }

    @Test
    void stalePreAuthorityShouldDenyBeforeLedgerAndHandler() {
        when(topologyVerifier.verify("workspace-a", target())).thenReturn(false);

        AgentToolExecutionResult result = orchestrator.execute(request(arguments()));

        assertEquals(AgentToolStatus.DENIED, result.getStatus());
        assertEquals(0, handlerCalls.get());
        verify(interactionInputService, never()).validateReference(any());
        verify(ledgerService, never()).recordToolStarted(any(), any(), any());
    }

    @Test
    void authorityChangeDuringReadShouldDiscardOutputAndFailLedger() {
        when(topologyVerifier.verify("workspace-a", target())).thenReturn(true, false);

        AgentToolExecutionResult result = orchestrator.execute(request(arguments()));

        assertEquals(AgentToolStatus.FAILED, result.getStatus());
        assertEquals(null, result.getOutput());
        assertEquals(1, handlerCalls.get());
        verify(ledgerService).failToolCall(any(), any(), any(Long.class));
        verify(ledgerService, never()).completeToolCall(any(), any(), any(Long.class));
    }

    @Test
    void canonicalTopologyShouldAllowDiscoveryButDenyOtherCapabilitiesAndNonUserRuns() {
        AgentTargetToolAuthorizer authorizer =
                new AgentTargetToolAuthorizer(metricVerifier, alertVerifier, entityVerifier, topologyVerifier);
        AgentToolExecutionRequest discovery = request(arguments()).toBuilder()
                .toolName("tool.search").arguments(Map.of("query", "topology")).build();
        AgentToolExecutionRequest sibling = request(arguments()).toBuilder()
                .toolName("entity.get").arguments(Map.of("entityId", 42L)).build();
        AgentToolExecutionRequest change = request(arguments()).toBuilder()
                .toolName("entity.update").build();
        AgentToolExecutionRequest scheduled = request(arguments()).toBuilder()
                .entryType(AgentRuntimeEntryType.SCHEDULE_TRIGGER).build();

        assertEquals(true, authorizer.denialReason(
                discovery, descriptor("tool.search", AgentToolRisk.READ)).isEmpty());
        assertEquals(AgentTargetToolAuthorizer.TARGET_DENIAL_REASON, authorizer.denialReason(
                sibling, descriptor("entity.get", AgentToolRisk.READ)).orElseThrow());
        assertEquals(AgentTargetToolAuthorizer.TARGET_DENIAL_REASON, authorizer.denialReason(
                change, descriptor("entity.update", AgentToolRisk.CHANGE)).orElseThrow());
        assertEquals(AgentTargetToolAuthorizer.TARGET_DENIAL_REASON, authorizer.denialReason(
                scheduled, descriptor("topology.query", AgentToolRisk.READ)).orElseThrow());
        verify(topologyVerifier, never()).verify(any(), any());
    }

    private AgentTargetRef target() {
        return AgentTargetRef.builder()
                .version(AgentTopologyTargetAuthorityService.TARGET_VERSION)
                .entityId(42L)
                .topology(AgentTopologyRef.builder()
                        .rootEntityId(42L).nodeId("entity:42").depth(2)
                        .environment("prod").sourceKind("otlp-trace-call")
                        .start(1_000L).end(2_000L).relationType("trace-call")
                        .hideInternal(true).pageIndex(0).pageSize(50).build())
                .authority(AgentTargetAuthority.builder().bindingId(42L)
                        .version(AgentTopologyTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + "a".repeat(64)).build())
                .build();
    }

    private Map<String, Object> arguments() {
        Map<String, Object> arguments = new LinkedHashMap<>();
        arguments.put("entityId", 42L);
        arguments.put("depth", 2);
        arguments.put("environment", "prod");
        arguments.put("sourceKind", "otlp-trace-call");
        arguments.put("start", 1_000L);
        arguments.put("end", 2_000L);
        arguments.put("relationType", "trace-call");
        arguments.put("hideInternal", true);
        arguments.put("pageIndex", 0);
        arguments.put("pageSize", 50);
        return arguments;
    }

    private Map<String, Object> changed(String field, Object value) {
        Map<String, Object> changed = new LinkedHashMap<>(arguments());
        changed.put(field, value);
        return changed;
    }

    private Map<String, Object> without(String field) {
        Map<String, Object> changed = new LinkedHashMap<>(arguments());
        changed.remove(field);
        return changed;
    }

    private AgentToolExecutionRequest request(Map<String, Object> arguments) {
        return AgentToolExecutionRequest.builder().sessionUid("ags-1").runId(2L).runUid("run-1")
                .runSessionId(1L).workspaceId("workspace-a")
                .actor(AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION).effectiveTarget(target())
                .toolName("topology.query").toolCallId("call-1").arguments(arguments).build();
    }

    private AgentToolDescriptor descriptor() {
        return descriptor("topology.query", AgentToolRisk.READ);
    }

    private AgentToolDescriptor descriptor(String name, AgentToolRisk risk) {
        return AgentToolDescriptor.builder().name(name).namespace(name.substring(0, name.indexOf('.')))
                .description("Read exact topology").inputSchema("{\"type\":\"object\"}")
                .risk(risk).exposure(AgentToolExposure.MODEL_VISIBLE).build();
    }

    private AgentToolCall call(AgentToolStatus status) {
        return AgentToolCall.builder().id(3L).sessionId(1L).sessionUid("ags-1").runId(2L).runUid("run-1")
                .toolCallId("call-1").toolName("topology.query").risk(AgentToolRisk.READ.name())
                .policyDecision(AgentPolicyDecision.ALLOW.name()).status(status.name())
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED.name()).inputJson("{}").build();
    }
}
