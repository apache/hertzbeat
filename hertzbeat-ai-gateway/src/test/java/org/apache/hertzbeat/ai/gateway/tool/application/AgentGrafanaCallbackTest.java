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

package org.apache.hertzbeat.ai.gateway.tool.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.grafana.config.GrafanaProperties;
import org.apache.hertzbeat.grafana.service.ConditionalDashboardService;
import org.apache.hertzbeat.grafana.service.DashboardService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Actual Spring method-tool callbacks with isolated native services, not a browser or external
 * Grafana test.
 */
class AgentGrafanaCallbackTest {
    private final ConditionalDashboardService nativeService =
            mock(ConditionalDashboardService.class);
    private final DashboardService bindings = mock(DashboardService.class);
    private final MonitorService monitors = mock(MonitorService.class);
    private static final String DOCUMENT = "{\"title\":\"AI fixture\",\"panels\":[]}";

    @AfterEach
    void clearScope() {
        AuthTokenRequestContext.clear();
    }

    private Map<String, Object> input() {
        return new HashMap<>(
                Map.of("operation", "create", "monitorId", 7L, "dashboardJson", DOCUMENT));
    }

    private Map<String, Object> invoke(String tool, Map<String, Object> args, boolean approved) {
        AuthTokenRequestContext.bindWorkspaceId("grafana-test");
        try (var ctx = new GenericApplicationContext()) {
            ctx.registerBean(
                    AgentGrafanaToolService.class,
                    () ->
                            new AgentGrafanaToolService(
                                    nativeService,
                                    bindings,
                                    monitors,
                                    new GrafanaProperties(
                                            true,
                                            "http://grafana.invalid",
                                            "http://grafana.invalid",
                                            "fixture",
                                            "fixture")));
            ctx.refresh();
            var registry =
                    new AgentToolConfiguration()
                            .agentToolRegistry(ctx.getDefaultListableBeanFactory());
            var entry = registry.find(tool).orElseThrow();
            var actor =
                    AgentActor.builder()
                            .type("user")
                            .id("grafana-test-user")
                            .roles(List.of("admin"))
                            .build();
            if (tool.equals("grafana.dashboard_save") || tool.equals("grafana.dashboard_delete"))
                assertEquals(
                        AgentPolicyDecision.REQUIRE_APPROVAL,
                        new AgentPolicyService().decide(actor, entry.descriptor()).getDecision());
            var request =
                    AgentToolExecutionRequest.builder()
                            .sessionUid("grafana-session")
                            .runId(1L)
                            .runUid("grafana-run")
                            .runSessionId(1L)
                            .workspaceId("grafana-test")
                            .actor(actor)
                            .entryType(AgentRuntimeEntryType.USER_INPUT)
                            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                            .approvalStatus(approved ? "APPROVED" : "NOT_REQUIRED")
                            .toolName(tool)
                            .toolCallId("grafana-call")
                            .arguments(args)
                            .build();
            var ledger =
                    AgentToolCall.builder()
                            .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(args))
                            .approvalStatus(approved ? "APPROVED" : "NOT_REQUIRED")
                            .build();
            return JsonUtil.fromJson(
                    entry.execute(new AgentToolExecutionContext(request, ledger)).getModelContent(),
                    Map.class);
        }
    }

    @Test
    void previewCannotWriteAndSaveRequiresApprovalThenIndependentExactReadback() {
        when(monitors.getMonitor(7L)).thenReturn(Monitor.builder().id(7L).build());
        var args = input();
        var preview = invoke("grafana.dashboard_preview", args, false);
        assertEquals(false, preview.get("persisted"));
        verify(nativeService, never()).save(any(), any(), any(), any(), any());
        args.put("previewHash", preview.get("previewHash"));
        assertThrows(RuntimeException.class, () -> invoke("grafana.dashboard_save", args, false));
        when(nativeService.save(eq(7L), eq(DOCUMENT), eq(null), eq(null), any()))
                .thenReturn(
                        new ConditionalDashboardService.SaveReceipt(
                                7L, "hb-monitor-7", 1L, true, true, false));
        when(nativeService.inspect(7L, "hb-monitor-7", 1L))
                .thenReturn(
                        new ConditionalDashboardService.Snapshot(
                                7L,
                                "hb-monitor-7",
                                1L,
                                "{\"id\":19,\"uid\":\"hb-monitor-7\",\"version\":1,\"title\":\"AI"
                                        + " fixture\",\"panels\":[]}"));
        var result = invoke("grafana.dashboard_save", args, true);
        assertEquals(true, result.get("verified"));
        assertEquals("CREATE", result.get("operation"));
        assertEquals("hb-monitor-7", result.get("uid"));
    }

    @Test
    void providerAckWithoutMatchingReadbackCannotBecomeVerifiedReceipt() {
        when(monitors.getMonitor(7L)).thenReturn(Monitor.builder().id(7L).build());
        var args = input();
        args.put(
                "previewHash",
                AgentGrafanaDraft.fromArguments("grafana.dashboard_save", args).previewHash());
        when(nativeService.save(eq(7L), eq(DOCUMENT), eq(null), eq(null), any()))
                .thenReturn(
                        new ConditionalDashboardService.SaveReceipt(
                                7L, "hb-monitor-7", 1L, true, true, false));
        when(nativeService.inspect(7L, "hb-monitor-7", 1L))
                .thenReturn(
                        new ConditionalDashboardService.Snapshot(
                                7L,
                                "hb-monitor-7",
                                1L,
                                "{\"id\":19,\"uid\":\"hb-monitor-7\",\"version\":1,\"title\":\"wrong"
                                    + " title\",\"panels\":[]}"));
        var failure = invoke("grafana.dashboard_save", args, true);
        assertEquals(false, failure.get("verified"));
        assertEquals(true, failure.get("outcomeUnknown"));
        verify(nativeService).save(eq(7L), eq(DOCUMENT), eq(null), eq(null), any());
    }

    @Test
    void sharedDetachIsDistinctFromRemoteDeletionAndNeedsApproval() {
        var args =
                new HashMap<String, Object>(
                        Map.of("monitorId", 7L, "expectedUid", "bound-uid", "expectedVersion", 3L));
        args.put(
                "previewHash",
                AgentGrafanaDraft.fromArguments("grafana.dashboard_delete", args).previewHash());
        when(nativeService.delete(eq(7L), eq("bound-uid"), eq(3L), any()))
                .thenReturn(
                        new ConditionalDashboardService.DeleteReceipt(
                                7L, "bound-uid", true, false, false));
        var result = invoke("grafana.dashboard_delete", args, true);
        assertEquals(true, result.get("verified"));
        assertEquals(false, result.get("remoteDashboardRemoved"));
        assertEquals(false, result.get("atomicRemoteVersionPrecondition"));
        verify(nativeService, never()).verifyAbsent(any());
    }

    @Test
    void unsafeSourceIsBlockedRatherThanReturningRedactedEditableContent() {
        when(nativeService.inspect(7L, "bound-uid", 3L))
                .thenReturn(
                        new ConditionalDashboardService.Snapshot(
                                7L,
                                "bound-uid",
                                3L,
                                "{\"id\":19,\"uid\":\"bound-uid\",\"version\":3,\"title\":\"AI"
                                    + " fixture\",\"panels\":[],\"token\":\"private-sentinel\"}"));
        var result =
                invoke(
                        "grafana.dashboard_source",
                        Map.of("monitorId", 7L, "expectedUid", "bound-uid", "expectedVersion", 3L),
                        false);
        assertEquals(false, result.get("available"));
        assertFalse(JsonUtil.toJson(result).contains("private-sentinel"));
        assertFalse(result.containsKey("dashboardJson"));
    }

    @Test
    void foreignSnapshotCannotVerifyTheRequestedBinding() {
        when(nativeService.inspect(7L, "bound-uid", 3L))
                .thenReturn(
                        new ConditionalDashboardService.Snapshot(
                                8L,
                                "bound-uid",
                                3L,
                                "{\"id\":19,\"uid\":\"bound-uid\",\"version\":3,\"title\":\"AI"
                                    + " fixture\",\"panels\":[]}"));
        var result =
                invoke(
                        "grafana.dashboard_source",
                        Map.of("monitorId", 7L, "expectedUid", "bound-uid", "expectedVersion", 3L),
                        false);
        assertEquals(false, result.get("available"));
        assertFalse(result.containsKey("dashboardJson"));
    }
}
