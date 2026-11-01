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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

/**
 * Controlled native tools exercise the real role/approval/ledger chain; storage and collector are
 * isolated adapters.
 */
class AgentMonitorControlledLifecycleTest {
    @Test
    void singleWebsiteNeedsConfirmationBeforeProbeAndCreateThenVerifiesFullReadback()
            throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var types =
                    tools.orchestrator.execute(
                            tools.request("monitor.types", Map.of(), ControlledMonitorTools.USER));
            var params =
                    tools.orchestrator.execute(
                            tools.request(
                                    "monitor.type_params",
                                    Map.of("app", "website"),
                                    ControlledMonitorTools.USER));
            assertEquals(AgentToolStatus.SUCCEEDED, types.getStatus());
            assertTrue(params.getOutput().contains("defaultValue"));
            var probeRequest =
                    tools.request(
                            "monitor.detect_draft",
                            Map.of("app", "website", "parameters", tools.params()),
                            ControlledMonitorTools.USER);
            var pendingProbe = tools.orchestrator.execute(probeRequest);
            assertEquals(AgentToolStatus.WAITING_APPROVAL, pendingProbe.getStatus());
            assertEquals(0, tools.probes);
            assertEquals(0, tools.effects);
            tools.ledger.decideApproval(
                    pendingProbe.getApprovalId(),
                    tools.envelope(),
                    AgentRuntimeEntryType.USER_INPUT,
                    AgentApprovalDecision.APPROVED);
            var probe =
                    tools.orchestrator.execute(
                            probeRequest.toBuilder()
                                    .approvalId(pendingProbe.getApprovalId())
                                    .approvalStatus(AgentApprovalStatus.APPROVED.name())
                                    .build());
            assertEquals(AgentToolStatus.SUCCEEDED, probe.getStatus());
            assertEquals(1, tools.probes);
            assertEquals(0, tools.effects);
            var request =
                    tools.request(
                            "monitor.create", tools.createArguments(), ControlledMonitorTools.USER);
            var pending = tools.orchestrator.execute(request);
            assertEquals(AgentToolStatus.WAITING_APPROVAL, pending.getStatus());
            assertEquals(0, tools.effects);
            tools.ledger.decideApproval(
                    pending.getApprovalId(),
                    tools.envelope(),
                    AgentRuntimeEntryType.USER_INPUT,
                    AgentApprovalDecision.APPROVED);
            var created =
                    tools.orchestrator.execute(
                            request.toBuilder()
                                    .approvalId(pending.getApprovalId())
                                    .approvalStatus(AgentApprovalStatus.APPROVED.name())
                                    .build());
            assertEquals(AgentToolStatus.SUCCEEDED, created.getStatus());
            assertEquals(1, tools.effects);
            var contract =
                    AgentMonitorMutationSemantics.parse(
                            "monitor.create",
                            JsonUtil.fromJson(created.getOutput(), Map.class),
                            AgentToolPayloadHasher.normalizedArgumentsHash(request.getArguments()));
            org.junit.jupiter.api.Assertions.assertNotNull(contract);
            var read =
                    tools.orchestrator.execute(
                            tools.request(
                                    "monitor.get",
                                    Map.of("monitorId", 1),
                                    ControlledMonitorTools.USER));
            assertTrue(
                    AgentMonitorMutationSemantics.matchesReadback(
                            contract.targets().getFirst(),
                            JsonUtil.fromJson(read.getOutput(), Map.class)));
            assertEquals(1, tools.monitors.size());
        }
    }

    @Test
    void exactIntervalUpdatePauseAndResumeKeepOtherMonitorUntouchedAndRespectRole()
            throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            tools.approved(
                    tools.request(
                            "monitor.create",
                            tools.createArguments(),
                            ControlledMonitorTools.USER));
            tools.approved(
                    tools.request(
                            "monitor.create",
                            Map.of(
                                    "name",
                                    "untouched",
                                    "app",
                                    "website",
                                    "intervals",
                                    90,
                                    "params",
                                    tools.params()),
                            ControlledMonitorTools.USER));
            var updateArgs =
                    Map.<String, Object>of("monitorId", 1, "updates", Map.of("intervals", 45));
            var updated =
                    tools.approved(
                            tools.request(
                                    "monitor.update", updateArgs, ControlledMonitorTools.USER));
            assertEquals(AgentToolStatus.SUCCEEDED, updated.getStatus());
            assertEquals(45, tools.monitors.get(1L).getMonitor().getIntervals());
            assertEquals(90, tools.monitors.get(2L).getMonitor().getIntervals());
            var denied =
                    tools.orchestrator.execute(
                            tools.request(
                                    "monitor.pause",
                                    Map.of("monitorIds", List.of(1)),
                                    ControlledMonitorTools.USER));
            assertEquals(AgentToolStatus.DENIED, denied.getStatus());
            assertEquals((byte) 1, tools.monitors.get(1L).getMonitor().getStatus());
            var paused =
                    tools.orchestrator.execute(
                            tools.request(
                                    "monitor.pause",
                                    Map.of("monitorIds", List.of(1)),
                                    ControlledMonitorTools.ADMIN));
            assertEquals(AgentToolStatus.SUCCEEDED, paused.getStatus());
            assertEquals((byte) 0, tools.monitors.get(1L).getMonitor().getStatus());
            assertEquals((byte) 1, tools.monitors.get(2L).getMonitor().getStatus());
            var resumed =
                    tools.approved(
                            tools.request(
                                    "monitor.resume",
                                    Map.of("monitorIds", List.of(1)),
                                    ControlledMonitorTools.USER));
            assertEquals(AgentToolStatus.SUCCEEDED, resumed.getStatus());
            assertEquals((byte) 1, tools.monitors.get(1L).getMonitor().getStatus());
            for (var result : List.of(updated, paused, resumed)) {
                var receipt =
                        AgentMonitorMutationSemantics.parse(
                                result.getToolName(),
                                JsonUtil.fromJson(result.getOutput(), Map.class),
                                tools.rows.values().stream()
                                        .filter(
                                                row ->
                                                        row.getToolCallId()
                                                                .equals(result.getToolCallId()))
                                        .findFirst()
                                        .orElseThrow()
                                        .getInputHash());
                org.junit.jupiter.api.Assertions.assertNotNull(receipt);
            }
        }
    }

    @Test
    void rejectedOrChangedApprovalHasNoCreationSideEffect() throws Exception {
        try (var tools = new ControlledMonitorTools()) {
            var request =
                    tools.request(
                            "monitor.create", tools.createArguments(), ControlledMonitorTools.USER);
            var pending = tools.orchestrator.execute(request);
            tools.ledger.decideApproval(
                    pending.getApprovalId(),
                    tools.envelope(),
                    AgentRuntimeEntryType.USER_INPUT,
                    AgentApprovalDecision.REJECTED);
            var rejected =
                    tools.orchestrator.execute(
                            request.toBuilder().approvalId(pending.getApprovalId()).build());
            assertEquals(AgentToolStatus.DENIED, rejected.getStatus());
            assertEquals(0, tools.effects);
            var other =
                    tools.request(
                            "monitor.create", tools.createArguments(), ControlledMonitorTools.USER);
            var waiting = tools.orchestrator.execute(other);
            tools.ledger.decideApproval(
                    waiting.getApprovalId(),
                    tools.envelope(),
                    AgentRuntimeEntryType.USER_INPUT,
                    AgentApprovalDecision.APPROVED);
            assertThrows(
                    IllegalStateException.class,
                    () ->
                            tools.orchestrator.execute(
                                    other.toBuilder()
                                            .approvalId(waiting.getApprovalId())
                                            .arguments(
                                                    Map.of(
                                                            "name",
                                                            "changed",
                                                            "app",
                                                            "website",
                                                            "params",
                                                            tools.params()))
                                            .build()));
            assertEquals(0, tools.effects);
            assertTrue(tools.monitors.isEmpty());
        }
    }
}
