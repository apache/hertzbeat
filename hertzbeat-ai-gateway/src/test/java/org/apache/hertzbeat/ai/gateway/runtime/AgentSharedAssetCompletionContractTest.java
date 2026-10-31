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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.dashboard.AgentDashboardToolService;
import org.apache.hertzbeat.ai.gateway.tool.savedview.AgentSavedViewToolService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.manager.SignalDashboardEntity;
import org.apache.hertzbeat.common.entity.manager.SignalSavedViewEntity;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.SignalDashboardDao;
import org.apache.hertzbeat.manager.dao.SignalSavedViewDao;
import org.apache.hertzbeat.manager.service.impl.PersesDashboardDocumentValidator;
import org.apache.hertzbeat.manager.service.impl.SignalDashboardServiceImpl;
import org.apache.hertzbeat.manager.service.impl.SignalSavedViewServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

class AgentSharedAssetCompletionContractTest {
    private final SignalDashboardDao dashboards = mock(SignalDashboardDao.class);
    private final SignalSavedViewDao views = mock(SignalSavedViewDao.class);
    private final Map<String, SignalDashboardEntity> dashboardRows = new HashMap<>();
    private final Map<String, SignalSavedViewEntity> viewRows = new HashMap<>();
    private static final String DOCUMENT =
            "{\"kind\":\"Dashboard\",\"metadata\":{\"name\":\"ai-contract\",\"project\":\"hertzbeat\",\"tags\":[]},\"spec\":{\"display\":{\"name\":\"AI"
                + " contract\"},\"duration\":\"30m\",\"variables\":[],\"panels\":{},\"layouts\":[{\"kind\":\"Grid\",\"spec\":{\"items\":[]}}]}}";

    private Map<String, Object> invoke(String name, Map<String, Object> args) {
        try (var spring = new GenericApplicationContext()) {
            spring.registerBean(
                    AgentDashboardToolService.class,
                    () ->
                            new AgentDashboardToolService(
                                    new SignalDashboardServiceImpl(
                                            dashboards, new PersesDashboardDocumentValidator())));
            spring.registerBean(
                    AgentSavedViewToolService.class,
                    () -> new AgentSavedViewToolService(new SignalSavedViewServiceImpl(views)));
            spring.refresh();
            var registry =
                    new AgentToolConfiguration()
                            .agentToolRegistry(spring.getDefaultListableBeanFactory());
            var req =
                    AgentToolExecutionRequest.builder()
                            .sessionUid("label-test")
                            .runId(1L)
                            .runUid("run-label")
                            .runSessionId(1L)
                            .actor(
                                    org.apache.hertzbeat.ai.gateway.identity.AgentActor.builder()
                                            .type("user")
                                            .id("metadata-user")
                                            .roles(List.of("admin"))
                                            .build())
                            .entryType(AgentRuntimeEntryType.USER_INPUT)
                            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                            .toolCallId("call-label")
                            .toolName(name)
                            .arguments(args)
                            .build();
            return JsonUtil.fromJson(
                    registry.find(name)
                            .orElseThrow()
                            .execute(
                                    new AgentToolExecutionContext(
                                            req, AgentToolCall.builder().build()))
                            .getModelContent(),
                    Map.class);
        }
    }

    private void setup() {
        when(dashboards.findByDashboardKey(org.mockito.ArgumentMatchers.anyString()))
                .thenAnswer(
                        i -> java.util.Optional.ofNullable(dashboardRows.get(i.getArgument(0))));
        when(dashboards.findAllByOrderByUpdateTimeDesc())
                .thenAnswer(i -> List.copyOf(dashboardRows.values()));
        when(dashboards.saveAndFlush(any()))
                .thenAnswer(
                        i -> {
                            SignalDashboardEntity value = i.getArgument(0);
                            value.setRevision(value.getId() == null ? 0 : value.getRevision() + 1);
                            value.setId(7L);
                            dashboardRows.put(value.getDashboardKey(), value);
                            return value;
                        });
        doAnswer(
                        i -> {
                            SignalDashboardEntity value = i.getArgument(0);
                            dashboardRows.remove(value.getDashboardKey());
                            return null;
                        })
                .when(dashboards)
                .delete(any(SignalDashboardEntity.class));
        when(views.findBySignalAndViewKey(
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyString()))
                .thenAnswer(
                        i ->
                                java.util.Optional.ofNullable(
                                        viewRows.get(i.getArgument(0) + ":" + i.getArgument(1))));
        when(views.findBySignalOrderByUpdateTimeDesc(org.mockito.ArgumentMatchers.anyString()))
                .thenAnswer(
                        i ->
                                viewRows.values().stream()
                                        .filter(v -> v.getSignal().equals(i.getArgument(0)))
                                        .toList());
        when(views.saveAndFlush(any()))
                .thenAnswer(
                        i -> {
                            SignalSavedViewEntity value = i.getArgument(0);
                            value.setRevision(value.getId() == null ? 0 : value.getRevision() + 1);
                            value.setId(8L);
                            viewRows.put(value.getSignal() + ":" + value.getViewKey(), value);
                            return value;
                        });
        doAnswer(
                        i -> {
                            SignalSavedViewEntity value = i.getArgument(0);
                            viewRows.remove(value.getSignal() + ":" + value.getViewKey());
                            return null;
                        })
                .when(views)
                .delete(any(SignalSavedViewEntity.class));
    }

    private AgentTaskAssessment.Goal goal(
            boolean dashboard,
            AgentTaskAssessment.Operation operation,
            Map<String, Object> fields) {
        var changes = new HashMap<String, Object>(fields);
        changes.put(dashboard ? "dashboardKey" : "viewKey", "ai-contract");
        if (!dashboard) changes.put("signal", "logs");
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                operation,
                dashboard ? "signal_dashboard" : "saved_query",
                1,
                List.of(),
                changes);
    }

    private AgentTaskEvidence evidence(
            String tool, Map<String, Object> args, Map<String, Object> result) {
        var proof = new AgentTaskEvidence();
        proof.observe(
                "write",
                tool,
                AgentToolRisk.CHANGE,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(result),
                true,
                AgentToolPayloadHasher.normalizedArgumentsHash(args));
        return proof;
    }

    private Map<String, Object> dashboard(String title, Long revision) {
        var value = new HashMap<String, Object>();
        value.put("dashboardKey", "ai-contract");
        value.put("version", "hertzbeat-perses-v1");
        value.put("document", JsonUtil.fromJson(DOCUMENT.replace("AI contract", title), Map.class));
        if (revision != null) value.put("revision", revision);
        return value;
    }

    private Map<String, Object> view(String label, Long revision) {
        var value =
                new HashMap<String, Object>(
                        Map.of(
                                "signal",
                                "logs",
                                "viewKey",
                                "ai-contract",
                                "label",
                                label,
                                "route",
                                "/log/manage",
                                "querySnapshot",
                                "keep-query"));
        if (revision != null) value.put("revision", revision);
        return value;
    }

    @Test
    void createUpdateDeleteUseActualNativeValidationCasAndReadback() {
        setup();
        for (boolean dashboard : List.of(true, false)) {
            String upsert =
                    dashboard
                            ? "dashboard.upsert_signal_dashboard"
                            : "saved_query.upsert_signal_saved_view";
            String delete =
                    dashboard
                            ? "dashboard.delete_signal_dashboard"
                            : "saved_query.delete_signal_saved_view";
            var create =
                    Map.<String, Object>of(
                            dashboard ? "dashboard" : "value",
                            dashboard ? dashboard("AI contract", null) : view("AI contract", null));
            var created = invoke(upsert, create);
            var createGoal =
                    goal(
                            dashboard,
                            AgentTaskAssessment.Operation.CREATE,
                            Map.of(dashboard ? "title" : "label", "AI contract"));
            assertTrue(createGoal.valid());
            assertTrue(AgentSharedAssetMutationSemantics.permits(createGoal, upsert, create));
            assertTrue(evidence(upsert, create, created).completes(createGoal));
            var update =
                    Map.<String, Object>of(
                            dashboard ? "dashboard" : "value",
                            dashboard ? dashboard("Renamed", 0L) : view("Renamed", 0L));
            var updateGoal =
                    goal(
                            dashboard,
                            AgentTaskAssessment.Operation.UPDATE,
                            Map.of(dashboard ? "title" : "label", "Renamed"));
            assertTrue(updateGoal.valid());
            assertTrue(AgentSharedAssetMutationSemantics.permits(updateGoal, upsert, update));
            assertTrue(
                    AgentSharedAssetMutationSemantics.preserves(
                            updateGoal, upsert, update, created));
            var changed = invoke(upsert, update);
            assertTrue(evidence(upsert, update, changed).completes(updateGoal));
            assertThrows(RuntimeException.class, () -> invoke(upsert, update));
            var deletion =
                    new HashMap<String, Object>(
                            Map.of(
                                    dashboard ? "dashboardKey" : "viewKey",
                                    "ai-contract",
                                    "revision",
                                    1L,
                                    "reason",
                                    "isolated test"));
            if (!dashboard) deletion.put("signal", "logs");
            var deleteGoal = goal(dashboard, AgentTaskAssessment.Operation.DELETE, Map.of());
            assertTrue(deleteGoal.valid());
            assertTrue(AgentSharedAssetMutationSemantics.permits(deleteGoal, delete, deletion));
            assertTrue(evidence(delete, deletion, invoke(delete, deletion)).completes(deleteGoal));
        }
    }

    @Test
    void titleOnlyUpdateCannotWipeOtherDocumentOrSavedQueryFieldsAndNeedsRealBaseline() {
        setup();
        var created =
                invoke(
                        "dashboard.upsert_signal_dashboard",
                        Map.of("dashboard", dashboard("AI contract", null)));
        var args = Map.<String, Object>of("dashboard", dashboard("Renamed", 0L));
        var original = goal(true, AgentTaskAssessment.Operation.UPDATE, Map.of("title", "Renamed"));
        var proof = new AgentTaskEvidence();
        assertFalse(proof.sharedAssetBaseline(original, "dashboard.upsert_signal_dashboard", args));
        var sourceArgs = Map.<String, Object>of("limit", 1);
        var output = invoke("dashboard.list_signal_dashboards", sourceArgs);
        proof.observe(
                "source",
                "dashboard.list_signal_dashboards",
                AgentToolRisk.READ,
                AgentToolStatus.SUCCEEDED,
                sourceArgs,
                JsonUtil.toJson(output),
                true);
        assertTrue(proof.sharedAssetBaseline(original, "dashboard.upsert_signal_dashboard", args));
        var modified = dashboard("Renamed", 0L);
        var document = (Map<String, Object>) modified.get("document");
        ((Map<String, Object>) document.get("spec")).put("duration", "1h");
        assertFalse(
                AgentSharedAssetMutationSemantics.preserves(
                        original,
                        "dashboard.upsert_signal_dashboard",
                        Map.of("dashboard", modified),
                        created));
        var saved =
                invoke(
                        "saved_query.upsert_signal_saved_view",
                        Map.of("value", view("AI contract", null)));
        var missing = view("Renamed", 0L);
        missing.remove("querySnapshot");
        assertFalse(
                AgentSharedAssetMutationSemantics.preserves(
                        goal(
                                false,
                                AgentTaskAssessment.Operation.UPDATE,
                                Map.of("label", "Renamed")),
                        "saved_query.upsert_signal_saved_view",
                        Map.of("value", missing),
                        saved));
    }

    @Test
    void wrongKeysRedactedSourceMalformedRevisionAndAckOnlyAreRejected() {
        var args = Map.<String, Object>of("value", view("AI contract", null));
        var original =
                goal(false, AgentTaskAssessment.Operation.CREATE, Map.of("label", "AI contract"));
        assertFalse(
                AgentSharedAssetMutationSemantics.permits(
                        new AgentTaskAssessment.Goal(
                                AgentTaskAssessment.Type.CHANGE,
                                AgentTaskAssessment.Operation.CREATE,
                                "saved_query",
                                1,
                                List.of(),
                                Map.of(
                                        "viewKey",
                                        "foreign",
                                        "signal",
                                        "logs",
                                        "label",
                                        "AI contract")),
                        "saved_query.upsert_signal_saved_view",
                        args));
        var fake = Map.<String, Object>of("success", true);
        assertEquals(
                0, evidence("saved_query.upsert_signal_saved_view", args, fake).receiptCount());
        var unsafe = view("AI contract", null);
        unsafe.put("payload", "[REDACTED]");
        assertFalse(
                AgentSharedAssetMutationSemantics.permits(
                        original, "saved_query.upsert_signal_saved_view", Map.of("value", unsafe)));
        var fractional = view("AI contract", 0L);
        fractional.put("revision", 0.5);
        assertFalse(
                AgentSharedAssetMutationSemantics.permits(
                        goal(
                                false,
                                AgentTaskAssessment.Operation.UPDATE,
                                Map.of("label", "AI contract")),
                        "saved_query.upsert_signal_saved_view",
                        Map.of("value", fractional)));
    }

    @Test
    void singleOperationReceiptCannotAuthorizeAnotherRevisionOrPayload() {
        setup();
        var args = Map.<String, Object>of("value", view("AI contract", null));
        var result = invoke("saved_query.upsert_signal_saved_view", args);
        var proof = evidence("saved_query.upsert_signal_saved_view", args, result);
        assertEquals(1, proof.verifiedCount());
        assertTrue(
                proof.alreadyReceipted(
                        "saved_query.upsert_signal_saved_view",
                        Map.of("value", view("Other", 0L))));
        assertTrue(
                proof.alreadyReceipted(
                        "saved_query.delete_signal_saved_view",
                        Map.of("signal", "logs", "viewKey", "ai-contract", "revision", 0)));
    }
}
