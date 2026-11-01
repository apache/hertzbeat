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

package org.apache.hertzbeat.ai.gateway.tool.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.savedview.AgentSavedViewToolService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.dto.SignalDashboard;
import org.apache.hertzbeat.common.entity.dto.SignalDashboardPanelDraft;
import org.apache.hertzbeat.common.entity.dto.SignalSavedView;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.SignalDashboardDao;
import org.apache.hertzbeat.manager.dao.SignalDashboardPanelDraftDao;
import org.apache.hertzbeat.manager.dao.SignalSavedViewDao;
import org.apache.hertzbeat.manager.service.SignalDashboardPanelDraftService;
import org.apache.hertzbeat.manager.service.SignalDashboardService;
import org.apache.hertzbeat.manager.service.SignalSavedViewService;
import org.apache.hertzbeat.manager.service.impl.PersesDashboardDocumentValidator;
import org.apache.hertzbeat.manager.service.impl.SignalDashboardConflictException;
import org.apache.hertzbeat.manager.service.impl.SignalDashboardPanelDraftServiceImpl;
import org.apache.hertzbeat.manager.service.impl.SignalDashboardServiceImpl;
import org.apache.hertzbeat.manager.service.impl.SignalSavedViewConflictException;
import org.apache.hertzbeat.manager.service.impl.SignalSavedViewServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.annotation.Tool;

import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.stream.IntStream;

/** Creator isolation, shared-asset permissions, pagination and revision contracts. */
class SignalAssetToolsTest {

    private final SignalDashboardService dashboards = mock(SignalDashboardService.class);
    private final SignalSavedViewService views = mock(SignalSavedViewService.class);
    private final SignalDashboardPanelDraftService drafts = mock(SignalDashboardPanelDraftService.class);
    private final AgentDashboardToolService dashboardTool = new AgentDashboardToolService(dashboards);
    private final AgentSavedViewToolService viewTool = new AgentSavedViewToolService(views);
    private final AgentDashboardPanelDraftToolService draftTool = new AgentDashboardPanelDraftToolService(drafts);

    @Test
    void sharedReadUsesTrustedActorAndReturnsBoundedPageWithoutWorkspaceFiltering() {
        List<SignalDashboard> all = IntStream.range(0, 14)
                .mapToObj(i -> SignalDashboard.builder().dashboardKey("d" + i).build()).toList();
        when(dashboards.listSignalDashboards("alice")).thenReturn(all);
        Map<String, Object> result = as("user", "alice", List.of("guest"),
                () -> dashboardTool.listSignalDashboards(2, 10));
        assertEquals(all.subList(2, 12), result.get("items"));
        assertEquals(true, result.get("hasMore"));
        assertEquals("shared", result.get("scope"));
        verify(dashboards).listSignalDashboards("alice");
    }

    @Test
    void everyReadNeedsTrustedInvocationAndUserIdentity() {
        assertThrows(IllegalArgumentException.class, () -> dashboardTool.listSignalDashboards(null, null));
        assertThrows(
                IllegalArgumentException.class,
                () -> viewTool.listSignalSavedViews("logs", null, null));
        assertThrows(
                IllegalArgumentException.class,
                () -> draftTool.listSignalDashboardPanelDrafts("logs", null, null));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        as(
                                "system",
                                "schedule",
                                List.of("admin"),
                                () -> dashboardTool.listSignalDashboards(null, null)));
        assertThrows(IllegalArgumentException.class, () -> as("user", " ", List.of("user"),
                () -> viewTool.listSignalSavedViews("logs", null, null)));
        assertThrows(IllegalArgumentException.class, () -> as("user", "alice", List.of(),
                () -> draftTool.listSignalDashboardPanelDrafts("logs", null, null)));
        verifyNoInteractions(dashboards, views, drafts);
    }

    @Test
    void guestCannotReadPrivatePanelDrafts() {
        assertThrows(IllegalArgumentException.class, () -> as("user", "alice", List.of("guest"),
                () -> draftTool.listSignalDashboardPanelDrafts("logs", null, null)));
        verifyNoInteractions(drafts);
    }

    @Test
    void guestCannotWriteOrDeleteAnyAssetEvenWithInvocationContext() {
        as(
                "user",
                "alice",
                List.of("guest"),
                () -> {
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> dashboardTool.upsertSignalDashboard(null));
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> viewTool.upsertSignalSavedView(null));
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> draftTool.upsertSignalDashboardPanelDraft(null));
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> dashboardTool.deleteSignalDashboard("d", 0L, "old"));
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> viewTool.deleteSignalSavedView("logs", "v", 0L, "old"));
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> draftTool.deleteSignalDashboardPanelDraft("logs", "p", "old"));
                    return null;
                });
        verifyNoInteractions(dashboards, views, drafts);
    }

    @Test
    void sharedUpdatesPassExactRevisionAndActorToExistingCasService() {
        SignalDashboard dashboard = SignalDashboard.builder().dashboardKey("d").revision(9L)
                .document(JsonUtil.fromJson("{}", JsonNode.class)).build();
        SignalSavedView view =
                SignalSavedView.builder().signal("logs").viewKey("v").revision(7L).build();
        var persistedDashboard =
                SignalDashboard.builder()
                        .id(7L)
                        .dashboardKey("d")
                        .revision(10L)
                        .document(dashboard.getDocument())
                        .build();
        var persistedView =
                SignalSavedView.builder().id(8L).signal("logs").viewKey("v").revision(8L).build();
        when(dashboards.upsertSignalDashboard("alice", dashboard)).thenReturn(persistedDashboard);
        when(dashboards.listSignalDashboards("alice"))
                .thenReturn(List.of(persistedDashboard), List.of());
        when(views.listSignalSavedViews("alice", "logs"))
                .thenReturn(List.of(persistedView), List.of());
        when(views.upsertSignalSavedView("alice", view)).thenReturn(persistedView);
        as(
                "user",
                "alice",
                List.of("user"),
                () -> {
                    assertSame(persistedDashboard, dashboardTool.upsertSignalDashboard(dashboard));
                    assertSame(persistedView, viewTool.upsertSignalSavedView(view));
                    dashboardTool.deleteSignalDashboard("d", 10L, "obsolete dashboard");
                    viewTool.deleteSignalSavedView("logs", "v", 8L, "obsolete view");
                    return null;
                });
        verify(dashboards).upsertSignalDashboard("alice", dashboard);
        verify(views).upsertSignalSavedView("alice", view);
        verify(dashboards).deleteSignalDashboard("alice", "d", 10L);
        verify(views).deleteSignalSavedView("alice", "logs", "v", 8L);
    }

    @Test
    void staleRevisionConflictsPropagateWithoutBlindRetry() {
        SignalDashboard dashboard = SignalDashboard.builder().dashboardKey("d").revision(9L)
                .document(JsonUtil.fromJson("{}", JsonNode.class)).build();
        SignalSavedView view =
                SignalSavedView.builder().signal("logs").viewKey("v").revision(7L).build();
        when(dashboards.upsertSignalDashboard("alice", dashboard))
                .thenThrow(new SignalDashboardConflictException());
        when(views.upsertSignalSavedView("alice", view))
                .thenThrow(new SignalSavedViewConflictException());
        doThrow(new SignalDashboardConflictException())
                .when(dashboards)
                .deleteSignalDashboard("alice", "d", 9L);
        doThrow(new SignalSavedViewConflictException())
                .when(views)
                .deleteSignalSavedView("alice", "logs", "v", 7L);
        as(
                "user",
                "alice",
                List.of("admin"),
                () -> {
                    assertThrows(
                            SignalDashboardConflictException.class,
                            () -> dashboardTool.upsertSignalDashboard(dashboard));
                    assertThrows(
                            SignalSavedViewConflictException.class,
                            () -> viewTool.upsertSignalSavedView(view));
                    assertThrows(
                            SignalDashboardConflictException.class,
                            () -> dashboardTool.deleteSignalDashboard("d", 9L, "old"));
                    assertThrows(
                            SignalSavedViewConflictException.class,
                            () -> viewTool.deleteSignalSavedView("logs", "v", 7L, "old"));
                    return null;
                });
        verify(dashboards).upsertSignalDashboard("alice", dashboard);
        verify(views).upsertSignalSavedView("alice", view);
    }

    @Test
    void privateDraftsAlwaysUseActorIncludingAdminAndNeverWorkspaceAsCreator() {
        SignalDashboardPanelDraft draft =
                SignalDashboardPanelDraft.builder().signal("alerts").draftKey("p").build();
        as(
                "user",
                "bob",
                List.of("admin"),
                () -> {
                    Map<String, Object> result =
                            draftTool.listSignalDashboardPanelDrafts("alerts", null, null);
                    assertEquals("creator-private", result.get("scope"));
                    draftTool.upsertSignalDashboardPanelDraft(draft);
                    draftTool.deleteSignalDashboardPanelDraft("alerts", "p", "old");
                    return null;
                });
        verify(drafts).listSignalDashboardPanelDrafts("bob", "alerts");
        verify(drafts).upsertSignalDashboardPanelDraft("bob", draft);
        verify(drafts).deleteSignalDashboardPanelDraft("bob", "alerts", "p");
    }

    @Test
    void invalidBoundsKeysSignalsRevisionsAndAuditFieldsFailBeforeServiceAccess() {
        as(
                "user",
                "alice",
                List.of("user"),
                () -> {
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> dashboardTool.listSignalDashboards(-1, 5));
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> viewTool.listSignalSavedViews("logs", 0, 11));
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> draftTool.listSignalDashboardPanelDrafts("logs", 10001, 1));
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> viewTool.listSignalSavedViews("alerts", null, null));
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> dashboardTool.deleteSignalDashboard("../d", 0L, "old"));
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> dashboardTool.deleteSignalDashboard("d", null, "old"));
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> viewTool.deleteSignalSavedView("logs", "v", -1L, "old"));
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> draftTool.deleteSignalDashboardPanelDraft("logs", "p", " "));
                    assertThrows(
                            IllegalArgumentException.class,
                            () ->
                                    viewTool.upsertSignalSavedView(
                                            SignalSavedView.builder()
                                                    .signal("logs")
                                                    .viewKey("v")
                                                    .creator("victim")
                                                    .build()));
                    assertThrows(
                            IllegalArgumentException.class,
                            () ->
                                    dashboardTool.upsertSignalDashboard(
                                            SignalDashboard.builder()
                                                    .id(1L)
                                                    .dashboardKey("d")
                                                    .build()));
                    assertThrows(
                            IllegalArgumentException.class,
                            () ->
                                    draftTool.upsertSignalDashboardPanelDraft(
                                            SignalDashboardPanelDraft.builder()
                                                    .id(1L)
                                                    .signal("logs")
                                                    .draftKey("p")
                                                    .build()));
                    return null;
                });
        verifyNoInteractions(dashboards, views, drafts);
    }

    @Test
    void legacyRawDashboardWritesAreExplicitlyUnsupported() {
        as(
                "user",
                "alice",
                List.of("admin"),
                () -> {
                    IllegalArgumentException failure =
                            assertThrows(
                                    IllegalArgumentException.class,
                                    () ->
                                            dashboardTool.upsertSignalDashboard(
                                                    SignalDashboard.builder()
                                                            .dashboardKey("legacy")
                                                            .revision(1L)
                                                            .layout("[]")
                                                            .widgets(
                                                                    "[{\"url\":\"https://evil.example\"}]")
                                                            .build()));
                    assertEquals(
                            "Legacy dashboard edits are unsupported by AI tools; use the dashboard"
                                + " page",
                            failure.getMessage());
                    return null;
                });
        verifyNoInteractions(dashboards);
    }

    @Test
    void delegatesToRealServiceValidationBeforeUnsafeRoutesOrDocumentsReachStorage() {
        SignalDashboardDao dashboardDao = mock(SignalDashboardDao.class);
        SignalSavedViewDao viewDao = mock(SignalSavedViewDao.class);
        SignalDashboardPanelDraftDao draftDao = mock(SignalDashboardPanelDraftDao.class);
        AgentDashboardToolService checkedDashboard = new AgentDashboardToolService(
                new SignalDashboardServiceImpl(dashboardDao, new PersesDashboardDocumentValidator()));
        AgentSavedViewToolService checkedView = new AgentSavedViewToolService(new SignalSavedViewServiceImpl(viewDao));
        AgentDashboardPanelDraftToolService checkedDraft = new AgentDashboardPanelDraftToolService(
                new SignalDashboardPanelDraftServiceImpl(draftDao));
        as(
                "user",
                "alice",
                List.of("user"),
                () -> {
                    for (String route :
                            List.of(
                                    "https://evil.example/log/manage",
                                    "//evil.example/log/manage",
                                    "/log/manage/../admin",
                                    "/trace/manage")) {
                        assertThrows(
                                IllegalArgumentException.class,
                                () ->
                                        checkedView.upsertSignalSavedView(
                                                SignalSavedView.builder()
                                                        .signal("logs")
                                                        .viewKey("v")
                                                        .label("view")
                                                        .route(route)
                                                        .build()));
                        assertThrows(
                                IllegalArgumentException.class,
                                () ->
                                        checkedDraft.upsertSignalDashboardPanelDraft(
                                                SignalDashboardPanelDraft.builder()
                                                        .signal("logs")
                                                        .draftKey("d")
                                                        .title("draft")
                                                        .visualization("table")
                                                        .route(route)
                                                        .build()));
                    }
                    assertThrows(
                            IllegalArgumentException.class,
                            () ->
                                    checkedDashboard.upsertSignalDashboard(
                                            SignalDashboard.builder()
                                                    .dashboardKey("d")
                                                    .version("hertzbeat-perses-v1")
                                                    .document(
                                                            JsonUtil.fromJson(
                                                                    "{\"kind\":\"Dashboard\",\"url\":\"https://evil.example\"}",
                                                                    JsonNode.class))
                                                    .build()));
                    return null;
                });
        verifyNoInteractions(dashboardDao, viewDao, draftDao);
    }

    @Test
    void allNineOperationsKeepReadChangeAndDangerousPolicy() {
        int count = 0;
        for (Class<?> type : List.of(AgentDashboardToolService.class, AgentSavedViewToolService.class,
                AgentDashboardPanelDraftToolService.class)) {
            for (var method : type.getDeclaredMethods()) {
                Tool tool = method.getAnnotation(Tool.class);
                if (tool == null) {
                    continue;
                }
                count++;
                AgentToolRisk expected =
                        method.getName().startsWith("list")
                                ? AgentToolRisk.READ
                                : method.getName().startsWith("upsert")
                                        ? AgentToolRisk.CHANGE
                                        : AgentToolRisk.DANGEROUS;
                assertEquals(expected, method.getAnnotation(AgentToolPolicy.class).risk());
                assertEquals(expected == AgentToolRisk.READ && type != AgentDashboardPanelDraftToolService.class
                        ? AgentToolAccess.STANDARD : AgentToolAccess.USER,
                        method.getAnnotation(AgentToolPolicy.class).access());
            }
        }
        assertEquals(9, count);
    }

    private <T> T as(String type, String actorId, List<String> roles, Supplier<T> call) {
        AgentToolExecutionRequest request =
                AgentToolExecutionRequest.builder()
                        .sessionUid("s")
                        .runId(1L)
                        .runUid("r")
                        .runSessionId(1L)
                        .workspaceId("workspace-not-creator")
                        .actor(AgentActor.builder().type(type).id(actorId).roles(roles).build())
                        .entryType(AgentRuntimeEntryType.USER_INPUT)
                        .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                        .toolName("test")
                        .toolCallId("call")
                        .arguments(Map.of())
                        .build();
        return AgentToolContextSupport.withInvocation(new AgentToolExecutionContext(request,
                AgentToolCall.builder().toolCallId("call").build()), call);
    }
}
