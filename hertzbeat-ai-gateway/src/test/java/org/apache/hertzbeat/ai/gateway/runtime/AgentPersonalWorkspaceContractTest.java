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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.conversation.AgentApprovalSummary;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorWorkspaceToolService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.manager.MetricsFavorite;
import org.apache.hertzbeat.common.entity.manager.MonitorMetricLayoutEntity;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.MetricsFavoriteDao;
import org.apache.hertzbeat.manager.dao.MonitorMetricLayoutDao;
import org.apache.hertzbeat.manager.service.impl.MetricsFavoriteServiceImpl;
import org.apache.hertzbeat.manager.service.impl.MonitorMetricLayoutServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * Real personal services + Spring callbacks + approval ledger; isolated repository doubles, no live
 * data.
 */
class AgentPersonalWorkspaceContractTest {
    private final MetricsFavoriteDao favorites = mock(MetricsFavoriteDao.class);
    private final MonitorMetricLayoutDao layouts = mock(MonitorMetricLayoutDao.class);
    private final Map<String, MetricsFavorite> favoriteRows = new HashMap<>();
    private final Map<String, MonitorMetricLayoutEntity> layoutRows = new HashMap<>();
    private AgentMonitorWorkspaceToolService service;
    private int favoriteWrites;
    private int layoutWrites;
    private static final String APP = "website";

    private String key(String user, Object id, Object name) {
        return user + "|" + id + "|" + name;
    }

    private String layoutKey(String user, String app) {
        return user + "|" + app;
    }

    private MonitorMetricLayoutEntity copy(MonitorMetricLayoutEntity e) {
        return JsonUtil.fromJson(JsonUtil.toJson(e), MonitorMetricLayoutEntity.class);
    }

    @BeforeEach
    void setup() {
        when(favorites.findByCreatorAndMonitorIdAndMetricsName(anyString(), any(), anyString()))
                .thenAnswer(
                        i ->
                                Optional.ofNullable(
                                        favoriteRows.get(
                                                key(
                                                        i.getArgument(0),
                                                        i.getArgument(1),
                                                        i.getArgument(2)))));
        when(favorites.findByCreatorAndMonitorId(anyString(), any()))
                .thenAnswer(
                        i ->
                                favoriteRows.values().stream()
                                        .filter(
                                                v ->
                                                        v.getCreator().equals(i.getArgument(0))
                                                                && v.getMonitorId()
                                                                        .equals(i.getArgument(1)))
                                        .toList());
        when(favorites.save(any()))
                .thenAnswer(
                        i -> {
                            MetricsFavorite value = i.getArgument(0);
                            value.setId((long) ++favoriteWrites);
                            favoriteRows.put(
                                    key(
                                            value.getCreator(),
                                            value.getMonitorId(),
                                            value.getMetricsName()),
                                    value);
                            return value;
                        });
        doAnswer(
                        i -> {
                            favoriteWrites++;
                            favoriteRows.remove(
                                    key(i.getArgument(0), i.getArgument(1), i.getArgument(2)));
                            return null;
                        })
                .when(favorites)
                .deleteByUserIdAndMonitorIdAndMetricsName(anyString(), any(), anyString());
        when(layouts.findByCreatorAndApplication(anyString(), anyString()))
                .thenAnswer(
                        i ->
                                Optional.ofNullable(
                                                layoutRows.get(
                                                        layoutKey(
                                                                i.getArgument(0),
                                                                i.getArgument(1))))
                                        .map(this::copy));
        when(layouts.saveAndFlush(any()))
                .thenAnswer(
                        i -> {
                            MonitorMetricLayoutEntity value = i.getArgument(0);
                            value.setId((long) ++layoutWrites);
                            layoutRows.put(
                                    layoutKey(value.getCreator(), value.getApplication()),
                                    copy(value));
                            return value;
                        });
        when(layouts.updateLayoutIfRevision(
                        anyString(), anyString(), anyString(), anyInt(), anyString(), anyString()))
                .thenAnswer(
                        i -> {
                            var value =
                                    layoutRows.get(layoutKey(i.getArgument(0), i.getArgument(1)));
                            if (value == null || !value.getRevision().equals(i.getArgument(5)))
                                return 0;
                            value.setLayoutDocument(i.getArgument(2));
                            value.setSchemaVersion(i.getArgument(3));
                            value.setRevision(i.getArgument(4));
                            layoutWrites++;
                            return 1;
                        });
        when(layouts.deleteByCreatorAndApplicationAndRevision(
                        anyString(), anyString(), anyString()))
                .thenAnswer(
                        i -> {
                            String key = layoutKey(i.getArgument(0), i.getArgument(1));
                            var value = layoutRows.get(key);
                            if (value == null || !value.getRevision().equals(i.getArgument(2)))
                                return 0;
                            layoutRows.remove(key);
                            layoutWrites++;
                            return 1;
                        });
        service =
                new AgentMonitorWorkspaceToolService(
                        new MetricsFavoriteServiceImpl(favorites),
                        new MonitorMetricLayoutServiceImpl(layouts));
    }

    private Map<String, Object> body(String revision) {
        return Map.of(
                "expectedRevision",
                revision,
                "schemaVersion",
                1,
                "mode",
                "custom",
                "columns",
                12,
                "items",
                List.of(
                        Map.of(
                                "group",
                                "cpu",
                                "x",
                                0,
                                "y",
                                0,
                                "w",
                                12,
                                "h",
                                8,
                                "collapsed",
                                false,
                                "order",
                                0)),
                "historyDock",
                Map.of("collapsed", false, "height", 12));
    }

    private Map<String, Object> favorite(boolean value) {
        return Map.of("monitorId", 7L, "metricsName", "cpu", "favorite", value);
    }

    private Map<String, Object> save(String revision) {
        return Map.of("application", APP, "request", body(revision));
    }

    private void register(ControlledMonitorTools env) {
        try (var spring = new GenericApplicationContext()) {
            spring.registerBean(AgentMonitorWorkspaceToolService.class, () -> service);
            var beans = new org.springframework.beans.factory.support.StaticListableBeanFactory();
            beans.addBean("registry", env.registry);
            spring.registerBean(
                    org.apache.hertzbeat.ai.gateway.tool.discovery.AgentToolDiscoveryService.class,
                    () -> new org.apache.hertzbeat.ai.gateway.tool.discovery.AgentToolDiscoveryService(
                            beans.getBeanProvider(org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry.class)));
            spring.refresh();
            var registry =
                    new AgentToolConfiguration()
                            .agentToolRegistry(spring.getDefaultListableBeanFactory());
            for (var descriptor : registry.descriptors())
                env.registry.register(registry.find(descriptor.getName()).orElseThrow());
        }
    }

    private Map<String, Object> data(
            org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult r) {
        assertEquals(AgentToolStatus.SUCCEEDED, r.getStatus(), r.getErrorMessage() + " " + r.getOutput());
        return JsonUtil.fromJson(r.getOutput(), Map.class);
    }

    private AgentTaskAssessment.Goal goal(
            AgentTaskAssessment.Operation op, String resource, Map<String, Object> args) {
        boolean favorite = resource.equals("monitor_favorite");
        Map<String, Object> fields =
                favorite
                        ? Map.of(
                                "metricsName",
                                args.get("metricsName"),
                                "favorite",
                                args.get("favorite"))
                        : args;
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                op,
                resource,
                1,
                favorite ? List.of(7L) : List.of(),
                fields);
    }

    private AgentTaskEvidence evidence(
            String tool, Map<String, Object> args, Map<String, Object> value, boolean durable) {
        var e = new AgentTaskEvidence();
        e.observe(
                "personal-write",
                tool,
                AgentToolRisk.CHANGE,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(value),
                durable,
                AgentToolPayloadHasher.normalizedArgumentsHash(args));
        return e;
    }

    @Test
    void favoriteNeedsApprovalThenReceiptsOnlyTheRequestedNativePostcondition() throws Exception {
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var args = favorite(true);
            var req = env.request("monitor.favorite_set", args, ControlledMonitorTools.USER);
            var pending = env.orchestrator.execute(req);
            assertEquals(AgentToolStatus.WAITING_APPROVAL, pending.getStatus());
            assertEquals(0, favoriteWrites);
            var result = env.approved(req);
            var receipt = data(result);
            assertEquals(1, favoriteWrites);
            assertEquals(true, receipt.get("observedFavorite"));
            var goal = goal(AgentTaskAssessment.Operation.UPDATE, "monitor_favorite", args);
            assertTrue(goal.valid());
            assertTrue(
                    AgentPersonalWorkspaceMutationSemantics.permits(
                            goal, "monitor.favorite_set", args));
            var proof = evidence("monitor.favorite_set", args, receipt, true);
            assertTrue(proof.completes(goal));
            assertEquals(1, proof.verifiedCount());
            assertFalse(evidence("monitor.favorite_set", args, receipt, false).completes(goal));
            assertTrue(proof.alreadyReceipted("monitor.layout_save", save("missing")));
            env.orchestrator.execute(
                    req.toBuilder()
                            .approvalId(pending.getApprovalId())
                            .approvalStatus("APPROVED")
                            .build());
            assertEquals(1, favoriteWrites);
        }
    }

    @Test
    void nativeDuplicateFavoriteIsNotRepeatedOrMisreportedAsCreation() throws Exception {
        try (var env = new ControlledMonitorTools()) {
            register(env);
            data(
                    env.approved(
                            env.request(
                                    "monitor.favorite_set",
                                    favorite(true),
                                    ControlledMonitorTools.USER)));
            var second =
                    env.approved(
                            env.request(
                                    "monitor.favorite_set",
                                    favorite(true),
                                    ControlledMonitorTools.USER));
            assertEquals(AgentToolStatus.FAILED, second.getStatus());
            assertEquals(1, favoriteWrites);
            var off =
                    data(
                            env.approved(
                                    env.request(
                                            "monitor.favorite_set",
                                            favorite(false),
                                            ControlledMonitorTools.USER)));
            assertEquals(false, off.get("observedFavorite"));
            assertEquals(2, favoriteWrites);
            assertTrue(favoriteRows.isEmpty());
        }
    }

    @Test
    void layoutCreateUpdateAndResetUseNativeConditionalRevisionAndIndependentReads()
            throws Exception {
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var create = save("missing");
            var receipt =
                    data(
                            env.approved(
                                    env.request(
                                            "monitor.layout_save",
                                            create,
                                            ControlledMonitorTools.USER)));
            assertTrue(
                    evidence("monitor.layout_save", create, receipt, true)
                            .completes(
                                    goal(
                                            AgentTaskAssessment.Operation.CREATE,
                                            "monitor_layout",
                                            create)));
            String first = (String) receipt.get("revision");
            assertEquals(1, layoutWrites);
            var update = save(first);
            var after =
                    data(
                            env.approved(
                                    env.request(
                                            "monitor.layout_save",
                                            update,
                                            ControlledMonitorTools.USER)));
            assertFalse(first.equals(after.get("revision")));
            assertEquals(2, layoutWrites);
            assertTrue(
                    evidence("monitor.layout_save", update, after, true)
                            .completes(
                                    goal(
                                            AgentTaskAssessment.Operation.UPDATE,
                                            "monitor_layout",
                                            update)));
            var stale =
                    env.approved(
                            env.request(
                                    "monitor.layout_save", update, ControlledMonitorTools.USER));
            assertEquals(AgentToolStatus.FAILED, stale.getStatus());
            assertEquals(2, layoutWrites);
            var reset =
                    Map.<String, Object>of(
                            "application", APP, "expectedRevision", after.get("revision"));
            var deleted =
                    data(
                            env.approved(
                                    env.request(
                                            "monitor.layout_delete",
                                            reset,
                                            ControlledMonitorTools.USER)));
            assertEquals(3, layoutWrites);
            assertTrue(layoutRows.isEmpty());
            assertTrue(
                    evidence("monitor.layout_delete", reset, deleted, true)
                            .completes(
                                    goal(
                                            AgentTaskAssessment.Operation.DELETE,
                                            "monitor_layout",
                                            reset)));
        }
    }

    @Test
    void runtimeLoopStopsAfterApprovedNativeReceiptWithoutAnotherModelPlan() throws Exception {
        for (String tool : List.of("monitor.favorite_set", "monitor.layout_save")) {
            try (var env = new ControlledMonitorTools()) {
                register(env);
                var args = tool.equals("monitor.favorite_set") ? favorite(true) : save("missing");
                var goal =
                        goal(
                                tool.equals("monitor.favorite_set")
                                        ? AgentTaskAssessment.Operation.UPDATE
                                        : AgentTaskAssessment.Operation.CREATE,
                                tool.equals("monitor.favorite_set")
                                        ? "monitor_favorite"
                                        : "monitor_layout",
                                args);
                var calls = new java.util.concurrent.atomic.AtomicInteger();
                AgentRuntimeModelClient model =
                        new AgentRuntimeModelClient() {
                            public boolean supportsReplyReview() {
                                return true;
                            }

                            public AgentRuntimeModelResponse stream(
                                    AgentRuntimeModelRequest request,
                                    AgentRuntimeControl control,
                                    java.util.function.Consumer<String> delta) {
                                if (request.getPrompt()
                                        .getInstructions()
                                        .contains("ORIGINAL_TASK_GOAL_ONLY"))
                                    return AgentRuntimeModelResponse.finalAnswer(
                                            JsonUtil.toJson(goal), null);
                                int n = calls.incrementAndGet();
                                if (n > 2)
                                    throw new IllegalStateException(
                                            "No model continuation is permitted after native"
                                                + " proof");
                                return AgentRuntimeModelResponse.toolCalls(
                                        "",
                                        List.of(
                                                AgentRuntimeToolCall.builder()
                                                        .toolCallId(
                                                                n == 1
                                                                        ? "discover"
                                                                        : "personal-action")
                                                        .toolName(n == 1 ? "tool.search" : tool)
                                                        .arguments(
                                                                n == 1
                                                                        ? Map.of(
                                                                                "namespace",
                                                                                "monitor",
                                                                                "query",
                                                                                tool)
                                                                        : args)
                                                        .build()),
                                        null);
                            }
                        };
                var context =
                        AgentRuntimeContext.builder()
                                .runSessionId(1L)
                                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                                .channelId("web-ui")
                                .traceId("trace")
                                .currentTimeIso("2026-10-22T06:00:00Z")
                                .sessionUid("session")
                                .runId(2L)
                                .runUid("run")
                                .workspaceId("isolated")
                                .entryType(AgentRuntimeEntryType.USER_INPUT)
                                .actor(ControlledMonitorTools.USER)
                                .receivedAt(System.currentTimeMillis())
                                .userMessage(
                                        "Execute exactly this personal setting: "
                                                + JsonUtil.toJson(args))
                                .preferredLanguage("en")
                                .timezone("UTC")
                                .chatHistory(List.of())
                                .build();
                var approvals = new AgentRuntimeApprovalRegistry();
                var messages =
                        new java.util.ArrayList<
                                TranscriptMessage>();
                try (var control =
                        AgentRuntimeControl.forContext(context, java.time.Clock.systemUTC())) {
                    new AgentRuntimeLoop(
                                    new AgentRuntimeProperties(),
                                    model,
                                    new AgentToolBridge(env.registry, env.orchestrator, approvals),
                                    java.time.Clock.systemUTC())
                            .run(
                                    context,
                                    control,
                                    event -> {
                                        if (event.getType()
                                                == AgentRuntimeEventType.REQUESTED_ACTION) {
                                            env.ledger.decideApproval(
                                                    event.getApprovalId(),
                                                    env.envelope(),
                                                    AgentRuntimeEntryType.USER_INPUT,
                                                    AgentApprovalDecision.APPROVED);
                                            approvals.complete(
                                                    event.getApprovalId(),
                                                    AgentApprovalDecision.APPROVED);
                                        }
                                    },
                                    message -> {
                                        messages.add(message);
                                        return (long) messages.size();
                                    });
                }
                assertEquals(2, calls.get(), JsonUtil.toJson(messages));
                assertNotNull(messages.getLast().getTaskOutcome());
                assertEquals(
                        AgentTaskOutcome.Stage.COMPLETE,
                        messages.getLast().getTaskOutcome().stage());
                assertEquals(1, messages.getLast().getTaskOutcome().verifiedCount());
            }
        }
    }

    @Test
    void originalGoalCannotChangeIdentityParametersOperationOrResourceCount() {
        var args = favorite(true);
        var goal = goal(AgentTaskAssessment.Operation.UPDATE, "monitor_favorite", args);
        assertFalse(
                AgentPersonalWorkspaceMutationSemantics.permits(
                        goal,
                        "monitor.favorite_set",
                        Map.of("monitorId", 8, "metricsName", "cpu", "favorite", true)));
        assertFalse(
                AgentPersonalWorkspaceMutationSemantics.permits(
                        goal, "monitor.favorite_set", favorite(false)));
        var create = save("missing");
        var layout = goal(AgentTaskAssessment.Operation.CREATE, "monitor_layout", create);
        assertFalse(
                AgentPersonalWorkspaceMutationSemantics.permits(
                        layout,
                        "monitor.layout_delete",
                        Map.of(
                                "application",
                                APP,
                                "expectedRevision",
                                "12345678-1234-1234-1234-123456789abc")));
        assertFalse(
                AgentPersonalWorkspaceMutationSemantics.permits(
                        layout,
                        "monitor.layout_save",
                        Map.of("application", "linux", "request", body("missing"))));
        var wrong =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.CREATE,
                        "monitor_layout",
                        2,
                        List.of(),
                        create);
        assertFalse(wrong.valid());
        assertFalse(
                new AgentTaskAssessment.Goal(
                                AgentTaskAssessment.Type.CHANGE,
                                AgentTaskAssessment.Operation.UPDATE,
                                "unreviewed_named_kind",
                                1,
                                List.of(),
                                Map.of("name", "x"))
                        .valid());
    }

    @Test
    void unknownPostReadCannotCompleteOrTriggerAnotherNativeWrite() throws Exception {
        try (var env = new ControlledMonitorTools()) {
            register(env);
            when(favorites.findByCreatorAndMonitorId(anyString(), any()))
                    .thenThrow(new IllegalStateException("synthetic storage outage"));
            var args = favorite(true);
            var receipt =
                    data(
                            env.approved(
                                    env.request(
                                            "monitor.favorite_set",
                                            args,
                                            ControlledMonitorTools.USER)));
            assertEquals(false, receipt.get("verified"));
            assertEquals(1, favoriteWrites);
            var proof = evidence("monitor.favorite_set", args, receipt, true);
            assertTrue(proof.uncertain());
            assertFalse(
                    proof.completes(
                            goal(AgentTaskAssessment.Operation.UPDATE, "monitor_favorite", args)));
            assertEquals(1, favoriteWrites);
        }
    }

    private <T> T direct(
            Map<String, Object> approvedArgs,
            String rowActor,
            String status,
            boolean active,
            Supplier<T> action) {
        var req =
                AgentToolExecutionRequest.builder()
                        .sessionUid("session")
                        .runId(2L)
                        .runUid("run")
                        .runSessionId(1L)
                        .workspaceId("isolated")
                        .actor(ControlledMonitorTools.USER)
                        .entryType(AgentRuntimeEntryType.USER_INPUT)
                        .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                        .toolName("monitor.favorite_set")
                        .toolCallId("call")
                        .arguments(approvedArgs)
                        .approvalId("approval")
                        .approvalStatus("APPROVED")
                        .executionGuard(() -> active)
                        .build();
        var row =
                AgentToolCall.builder()
                        .sessionUid("session")
                        .runId(2L)
                        .runUid("run")
                        .sessionId(1L)
                        .toolName("monitor.favorite_set")
                        .toolCallId("call")
                        .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(approvedArgs))
                        .status("RUNNING")
                        .approvalStatus(status)
                        .approvalId("approval")
                        .approvalActorType("user")
                        .approvalActorId(rowActor)
                        .build();
        return AgentToolContextSupport.withInvocation(
                new AgentToolExecutionContext(req, row), action);
    }

    @Test
    void directCallbackCannotBypassPendingForeignActorParameterHashOrCancellation() {
        String actor = ControlledMonitorTools.USER.getId();
        assertThrows(
                IllegalStateException.class,
                () ->
                        direct(
                                favorite(true),
                                actor,
                                "PENDING",
                                true,
                                () -> service.favoriteWrite(7L, "cpu", true)));
        assertThrows(
                IllegalStateException.class,
                () ->
                        direct(
                                favorite(true),
                                "foreign-user",
                                "APPROVED",
                                true,
                                () -> service.favoriteWrite(7L, "cpu", true)));
        assertThrows(
                IllegalStateException.class,
                () ->
                        direct(
                                favorite(true),
                                actor,
                                "APPROVED",
                                false,
                                () -> service.favoriteWrite(7L, "cpu", true)));
        assertThrows(
                IllegalStateException.class,
                () ->
                        direct(
                                favorite(true),
                                actor,
                                "APPROVED",
                                true,
                                () -> service.favoriteWrite(8L, "cpu", true)));
        assertEquals(0, favoriteWrites);
        assertEquals(0, layoutWrites);
    }

    @Test
    void receiptAndApprovalSummaryBindExactNonsecretPersonalParameters() throws Exception {
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var args = favorite(true);
            var req = env.request("monitor.favorite_set", args, ControlledMonitorTools.USER);
            var pending = env.orchestrator.execute(req);
            var row =
                    env.rows.values().stream()
                            .filter(v -> pending.getApprovalId().equals(v.getApprovalId()))
                            .findFirst()
                            .orElseThrow();
            var summary = AgentApprovalSummary.from(row);
            assertTrue(summary.complete());
            assertNotNull(summary.personal());
            assertEquals("7", summary.personal().monitorId());
            assertEquals("cpu", summary.personal().metricsName());
            assertEquals(true, summary.personal().favorite());
            var output = data(env.approved(req));
            var forged = new HashMap<>(output);
            forged.put("monitorId", 8);
            assertFalse(
                    AgentPersonalWorkspaceMutationSemantics.verified(
                            "monitor.favorite_set",
                            args,
                            forged,
                            AgentToolPayloadHasher.normalizedArgumentsHash(args)));
            assertFalse(
                    AgentPersonalWorkspaceMutationSemantics.verified(
                            "monitor.favorite_set",
                            args,
                            Map.of("success", true),
                            AgentToolPayloadHasher.normalizedArgumentsHash(args)));
            var create = save("missing");
            var request = env.request("monitor.layout_save", create, ControlledMonitorTools.USER);
            var proposal = env.orchestrator.execute(request);
            row =
                    env.rows.values().stream()
                            .filter(v -> proposal.getApprovalId().equals(v.getApprovalId()))
                            .findFirst()
                            .orElseThrow();
            summary = AgentApprovalSummary.from(row);
            assertTrue(summary.complete());
            assertEquals("website", summary.personal().application());
            assertEquals("missing", summary.personal().expectedRevision());
            assertEquals(1, summary.personal().request().items().size());
        }
    }

    @Test
    void malformedLayoutAndSystemIdentityHaveNoNativeEffects() throws Exception {
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var invalid = new HashMap<>(body("missing"));
            invalid.put("columns", 48);
            var result =
                    env.approved(
                            env.request(
                                    "monitor.layout_save",
                                    Map.of("application", APP, "request", invalid),
                                    ControlledMonitorTools.USER));
            assertEquals(AgentToolStatus.FAILED, result.getStatus());
            assertEquals(0, layoutWrites);
            var actor =
                    AgentActor.builder().type("system").id("system").roles(List.of("user")).build();
            result =
                    env.orchestrator.execute(
                            env.request("monitor.favorite_set", favorite(true), actor));
            assertFalse(result.getStatus() == AgentToolStatus.SUCCEEDED);
            assertEquals(0, favoriteWrites);
        }
    }
}
