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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.grafana.GrafanaDashboard;
import org.apache.hertzbeat.grafana.service.DashboardService;
import org.apache.hertzbeat.manager.pojo.dto.ActionCatalogItemInfo;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.action.ActionCatalogService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

class AgentApplicationGapToolsTest {
    private <T> T scoped(Supplier<T> action) {
        var request =
                AgentToolExecutionRequest.builder()
                        .sessionUid("gap-session")
                        .runUid("gap-run")
                        .runId(1L)
                        .runSessionId(1L)
                        .actor(
                                org.apache.hertzbeat.ai.gateway.identity.AgentActor.builder()
                                        .type("user")
                                        .id("gap-user")
                                        .roles(List.of("user"))
                                        .build())
                        .entryType(
                                org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType
                                        .USER_INPUT)
                        .approvalHandling(
                                org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling
                                        .WAIT_FOR_DECISION)
                        .toolName("action_catalog.save")
                        .toolCallId("gap-call")
                        .workspaceId("gap-test")
                        .arguments(Map.of())
                        .build();
        return AgentToolContextSupport.withInvocation(
                new AgentToolExecutionContext(request, new AgentToolCall()), action);
    }

    @Test
    void actionCatalogUsesTrustedWorkspaceAndCannotEnableExecution() {
        var nativeService = mock(ActionCatalogService.class);
        var service = new AgentActionCatalogToolService(nativeService);
        var saved = new ActionCatalogItemInfo();
        saved.setWorkspaceId("gap-test");
        saved.setCatalogId("ai-e2e-action");
        saved.setExecutionAllowed(false);
        saved.setExecutionMode("manual-approval-draft-only");
        when(nativeService.saveCatalogItem(any(), eq("gap-test"))).thenReturn(saved);
        scoped(
                () ->
                        service.save(
                                new AgentActionCatalogToolService.Entry(
                                        "ai-e2e-action",
                                        "Test",
                                        "runbook",
                                        "service",
                                        "test-owner",
                                        "high",
                                        Map.of("playbook", "documentation-only"))));
        var arg = ArgumentCaptor.forClass(ActionCatalogItemInfo.class);
        verify(nativeService).saveCatalogItem(arg.capture(), eq("gap-test"));
        assertFalse(arg.getValue().getExecutionAllowed());
        assertEquals("manual-approval-draft-only", arg.getValue().getExecutionMode());
        assertEquals(null, arg.getValue().getCreator());
        assertEquals(null, arg.getValue().getWorkspaceId());
    }

    @Test
    void catalogRejectsSecretsOversizedMetadataAndForeignReadRows() {
        var nativeService = mock(ActionCatalogService.class);
        var service = new AgentActionCatalogToolService(nativeService);
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        scoped(
                                () ->
                                        service.save(
                                                new AgentActionCatalogToolService.Entry(
                                                        "test",
                                                        "Test",
                                                        null,
                                                        null,
                                                        null,
                                                        "high",
                                                        Map.of("password", "do-not-store")))));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        scoped(
                                () ->
                                        service.save(
                                                new AgentActionCatalogToolService.Entry(
                                                        "test",
                                                        "Test",
                                                        null,
                                                        null,
                                                        null,
                                                        "high",
                                                        Map.of(
                                                                "description",
                                                                "x".repeat(20000))))));
        verifyNoInteractions(nativeService);
        var other = new ActionCatalogItemInfo();
        other.setWorkspaceId("foreign");
        when(nativeService.listCatalogItems(10, "gap-test")).thenReturn(List.of(other));
        assertThrows(IllegalStateException.class, () -> scoped(() -> service.list(10)));
    }

    @Test
    void catalogRejectsMissingContextAndUnboundedPage() {
        var nativeService = mock(ActionCatalogService.class);
        var service = new AgentActionCatalogToolService(nativeService);
        assertThrows(IllegalArgumentException.class, () -> service.list(10));
        assertThrows(IllegalArgumentException.class, () -> scoped(() -> service.list(51)));
        verifyNoInteractions(nativeService);
    }

    @Test
    void i18nReadsOnlyBoundedLanguageResources() {
        var apps = mock(AppService.class);
        var service = new AgentApplicationMetadataToolService(apps);
        when(apps.getI18nResources("en-US")).thenReturn(Map.of("a", "Alpha", "b", "Beta"));
        var value = service.i18nResources("en-US", 1, 1);
        assertEquals(2, value.get("total"));
        assertEquals(1, ((List<?>) value.get("items")).size());
        assertThrows(
                IllegalArgumentException.class, () -> service.i18nResources("unsupported", 0, 10));
        assertThrows(IllegalArgumentException.class, () -> service.i18nResources("en-US", 0, 101));
    }

    @Test
    void grafanaReadsMetadataWithoutCallingExternalWritesOrReturningTemplate() {
        var nativeService = mock(DashboardService.class);
        var service = new AgentGrafanaMetadataToolService(nativeService);
        when(nativeService.getDashboardByMonitorId(3L))
                .thenReturn(
                        GrafanaDashboard.builder()
                                .monitorId(3L)
                                .uid("test")
                                .version(2L)
                                .enabled(true)
                                .template("private-template")
                                .url("http://user:password@invalid/")
                                .build());
        var value = service.get(3L);
        assertEquals("test", value.get("uid"));
        assertFalse(value.containsKey("template"));
        assertFalse(value.containsKey("url"));
        assertThrows(IllegalArgumentException.class, () -> service.get(0L));
        when(nativeService.getDashboardByMonitorId(4L)).thenReturn(null);
        assertEquals(false, service.get(4L).get("found"));
        verify(nativeService).getDashboardByMonitorId(3L);
        verify(nativeService).getDashboardByMonitorId(4L);
    }
}
