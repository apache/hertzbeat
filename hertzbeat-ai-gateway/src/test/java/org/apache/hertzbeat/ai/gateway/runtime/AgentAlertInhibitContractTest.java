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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitToolService;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitWriteProof;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.alert.dao.AlertInhibitDao;
import org.apache.hertzbeat.alert.reduce.AlarmInhibitReduce;
import org.apache.hertzbeat.alert.service.AlertInhibitContractMapper;
import org.apache.hertzbeat.alert.service.AlertInhibitNotFoundException;
import org.apache.hertzbeat.alert.service.impl.AlertInhibitServiceImpl;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;

/** Real native service, mapper and Spring callbacks over isolated repository doubles. No alerts. */
class AgentAlertInhibitContractTest {
    private final AlertInhibitDao dao = mock(AlertInhibitDao.class);
    private final Map<Long, AlertInhibit> rows = new LinkedHashMap<>();
    private AlertInhibitServiceImpl nativeService;
    private AgentAlertInhibitToolService tool;
    private int writes;

    @BeforeEach
    void setup() {
        when(dao.save(any()))
                .thenAnswer(
                        i -> {
                            AlertInhibit row = i.getArgument(0);
                            if (row.getId() == null) row.setId(100L + rows.size());
                            writes++;
                            rows.put(row.getId(), row);
                            return row;
                        });
        when(dao.findById(any()))
                .thenAnswer(i -> Optional.ofNullable(rows.get((Long) i.getArgument(0))));
        when(dao.findAllById(any()))
                .thenAnswer(
                        i -> {
                            Iterable<Long> ids = i.getArgument(0);
                            var result = new java.util.ArrayList<AlertInhibit>();
                            for (Long id : ids) if (rows.containsKey(id)) result.add(rows.get(id));
                            return result;
                        });
        org.mockito.Mockito.doAnswer(
                        i -> {
                            Set<Long> ids = i.getArgument(0);
                            ids.forEach(rows::remove);
                            writes++;
                            return null;
                        })
                .when(dao)
                .deleteAlertInhibitsByIdIn(any());
        when(dao.findAlertInhibitsByEnableIsTrue())
                .thenAnswer(
                        i ->
                                rows.values().stream()
                                        .filter(x -> Boolean.TRUE.equals(x.getEnable()))
                                        .toList());
        when(dao.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(
                        i -> {
                            Pageable page = i.getArgument(1);
                            return new PageImpl<>(
                                    rows.values().stream()
                                            .skip(page.getOffset())
                                            .limit(page.getPageSize())
                                            .toList(),
                                    page,
                                    rows.size());
                        });
        nativeService =
                spy(
                        new AlertInhibitServiceImpl(
                                dao,
                                mock(AlarmInhibitReduce.class),
                                new AlertInhibitContractMapper()));
        tool = new AgentAlertInhibitToolService(nativeService);
    }

    private Map<String, Object> config() {
        return Map.of(
                "name",
                "ai-isolated-policy",
                "sourceLabels",
                Map.of("severity", "critical"),
                "targetLabels",
                Map.of("severity", "warning"),
                "equalLabels",
                List.of("host"),
                "enable",
                false);
    }

    private void register(ControlledMonitorTools env) {
        try (var context = new GenericApplicationContext()) {
            context.registerBean(AgentAlertInhibitToolService.class, () -> tool);
            var beans = new org.springframework.beans.factory.support.StaticListableBeanFactory();
            beans.addBean("registry", env.registry);
            context.registerBean(
                    org.apache.hertzbeat.ai.gateway.tool.discovery.AgentToolDiscoveryService.class,
                    () ->
                            new org.apache.hertzbeat.ai.gateway.tool.discovery
                                    .AgentToolDiscoveryService(
                                    beans.getBeanProvider(
                                            org.apache.hertzbeat.ai.gateway.tool.core
                                                    .AgentToolRegistry.class)));
            context.refresh();
            var registry =
                    new AgentToolConfiguration()
                            .agentToolRegistry(context.getDefaultListableBeanFactory());
            for (var d : registry.descriptors())
                env.registry.register(registry.find(d.getName()).orElseThrow());
        }
    }

    private Map<String, Object> result(
            org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult r) {
        assertEquals(AgentToolStatus.SUCCEEDED, r.getStatus(), r.getErrorMessage());
        return JsonUtil.fromJson(r.getOutput(), Map.class);
    }

    private AgentTaskAssessment.Goal goal(
            AgentTaskAssessment.Operation op, Map<String, Object> changes) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                op,
                "alert_inhibit",
                1,
                op == AgentTaskAssessment.Operation.CREATE ? List.of() : List.of(100L),
                changes);
    }

    private boolean verified(String name, Map<String, Object> args, Map<String, Object> out) {
        return AgentAlertInhibitMutationSemantics.verified(
                name, args, out, AgentToolPayloadHasher.normalizedArgumentsHash(args));
    }

    @Test
    void nativeCreateIsApprovedThenIndependentlyReadAndBoundToOriginalGoal() throws Exception {
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var args = Map.<String, Object>of("configuration", config());
            var req = env.request("alert_inhibit.create", args, ControlledMonitorTools.USER);
            var pending = env.orchestrator.execute(req);
            assertEquals(AgentToolStatus.WAITING_APPROVAL, pending.getStatus());
            assertEquals(0, writes);
            assertTrue(pending.getApprovalSummary().complete());
            assertEquals(
                    "critical",
                    pending.getApprovalSummary()
                            .inhibition()
                            .configuration()
                            .sourceLabels()
                            .get("severity"));
            assertEquals(false, pending.getApprovalSummary().inhibition().configuration().enable());
            var out = result(env.approved(req.toBuilder().toolCallId("fresh-approved").build()));
            assertEquals(1, writes);
            assertTrue(verified("alert_inhibit.create", args, out));
            Map<String, Object> forged = JsonUtil.fromJson(JsonUtil.toJson(out), Map.class);
            var wrong = (Map<String, Object>) forged.get("data");
            wrong.put("enable", true);
            ((Map<String, Object>) wrong.get("mutationReceipt"))
                    .put("postReadHash", AgentAlertInhibitWriteProof.contentHash(wrong));
            assertFalse(verified("alert_inhibit.create", args, forged));

            assertTrue(
                    AgentAlertInhibitMutationSemantics.permits(
                            goal(AgentTaskAssessment.Operation.CREATE, config()),
                            "alert_inhibit.create",
                            args));
            var evidence = new AgentTaskEvidence();
            evidence.observe(
                    "create",
                    "alert_inhibit.create",
                    AgentToolRisk.CHANGE,
                    AgentToolStatus.SUCCEEDED,
                    args,
                    JsonUtil.toJson(out),
                    true,
                    AgentToolPayloadHasher.normalizedArgumentsHash(args));
            assertTrue(evidence.completes(goal(AgentTaskAssessment.Operation.CREATE, config())));
            assertEquals(100L, AgentAlertInhibitMutationSemantics.identity(out));
        }
    }

    private long seed() {
        var request =
                JsonUtil.fromJson(
                        JsonUtil.toJson(config()),
                        org.apache.hertzbeat.alert.dto.AlertInhibitRequest.class);
        return nativeService.create(request).id();
    }

    @Test
    void updatePreservesUnrequestedFieldsAndRejectsStaleSource() throws Exception {
        long id = seed();
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var source = tool.get(id);
            Map<String, Object> changed = new LinkedHashMap<>(config());
            changed.put("enable", true);
            var args =
                    Map.<String, Object>of(
                            "inhibitId",
                            id,
                            "configuration",
                            changed,
                            "sourceHash",
                            source.get("sourceHash"));
            var g = goal(AgentTaskAssessment.Operation.UPDATE, Map.of("enable", true));
            assertTrue(
                    AgentAlertInhibitMutationSemantics.preserves(
                            g, "alert_inhibit.update", args, source));
            var changedOther = new LinkedHashMap<>(changed);
            changedOther.put("targetLabels", Map.of("severity", "info"));
            assertFalse(
                    AgentAlertInhibitMutationSemantics.preserves(
                            g,
                            "alert_inhibit.update",
                            Map.of(
                                    "inhibitId",
                                    id,
                                    "configuration",
                                    changedOther,
                                    "sourceHash",
                                    source.get("sourceHash")),
                            source));
            var out =
                    result(
                            env.approved(
                                    env.request(
                                            "alert_inhibit.update",
                                            args,
                                            ControlledMonitorTools.USER)));
            assertTrue(verified("alert_inhibit.update", args, out));
            assertTrue(nativeService.get(id).enable());
            assertEquals(2, writes);
            var stale =
                    env.approved(
                            env.request("alert_inhibit.update", args, ControlledMonitorTools.USER));
            assertEquals(AgentToolStatus.FAILED, stale.getStatus());
            assertEquals(2, writes);
        }
    }

    @Test
    void deleteRetainsAdminGateAndNeedsExactNativeDeletionAndAbsence() throws Exception {
        long id = seed();
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var args =
                    Map.<String, Object>of(
                            "inhibitId",
                            id,
                            "reason",
                            "isolated test",
                            "sourceHash",
                            tool.get(id).get("sourceHash"));
            var denied =
                    env.orchestrator.execute(
                            env.request("alert_inhibit.delete", args, ControlledMonitorTools.USER));
            assertEquals(AgentToolStatus.DENIED, denied.getStatus());
            assertEquals(1, writes);
            var out = result(approvedAdmin(env, args));
            assertTrue(verified("alert_inhibit.delete", args, out));
            assertThrows(AlertInhibitNotFoundException.class, () -> nativeService.get(id));
            assertEquals(2, writes);
        }
    }

    private org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult approvedAdmin(
            ControlledMonitorTools env, Map<String, Object> args) {
        var request = env.request("alert_inhibit.delete", args, ControlledMonitorTools.ADMIN);
        var pending = env.orchestrator.execute(request);
        assertEquals(AgentToolStatus.WAITING_APPROVAL, pending.getStatus());
        env.ledger.decideApproval(
                pending.getApprovalId(),
                env.envelope(ControlledMonitorTools.ADMIN),
                AgentRuntimeEntryType.USER_INPUT,
                org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision.APPROVED);
        return env.orchestrator.execute(
                request.toBuilder()
                        .approvalId(pending.getApprovalId())
                        .approvalStatus("APPROVED")
                        .build());
    }

    @Test
    void wrongIdParametersAndGenericSuccessCannotComplete() {
        var args = Map.<String, Object>of("configuration", config());
        assertFalse(verified("alert_inhibit.create", args, Map.of("success", true)));
        assertFalse(
                AgentAlertInhibitMutationSemantics.permits(
                        goal(AgentTaskAssessment.Operation.DELETE, Map.of()),
                        "alert_inhibit.delete",
                        Map.of("inhibitId", 101L, "reason", "test", "sourceHash", "a".repeat(64))));
        var extra = new LinkedHashMap<>(args);
        extra.put("command", "echo fake");
        assertFalse(
                AgentAlertInhibitMutationSemantics.permits(
                        goal(AgentTaskAssessment.Operation.CREATE, config()),
                        "alert_inhibit.create",
                        extra));
    }

    @Test
    void postWriteReadFailureIsUnknownAndNeverAutomaticallyRewritten() throws Exception {
        doThrow(new IllegalStateException("isolated read unavailable"))
                .when(nativeService)
                .get(100L);
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var r =
                    env.approved(
                            env.request(
                                    "alert_inhibit.create",
                                    Map.of("configuration", config()),
                                    ControlledMonitorTools.USER));
            assertEquals(AgentToolStatus.FAILED, r.getStatus());
            assertEquals(1, writes);
            assertEquals(1, rows.size());
        }
    }

    @Test
    void malformedConfigurationAndDirectInvocationCannotWrite() throws Exception {
        var typed =
                new AgentAlertInhibitToolService.Configuration(
                        "test",
                        Map.of("severity", "critical"),
                        Map.of("severity", "warning"),
                        List.of("host"),
                        false);
        assertThrows(IllegalArgumentException.class, () -> tool.createPolicy(typed));
        assertEquals(0, writes);
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var invalid = new LinkedHashMap<>(config());
            invalid.put("sourceLabels", Map.of());
            var r =
                    env.approved(
                            env.request(
                                    "alert_inhibit.create",
                                    Map.of("configuration", invalid),
                                    ControlledMonitorTools.USER));
            assertEquals(AgentToolStatus.FAILED, r.getStatus());
            assertEquals(0, writes);
        }
    }

    private AgentReadObservationClassifier.Observation read(
            String name, Map<String, Object> args, Map<String, Object> out) {
        return new AgentAlertInhibitReadSemantics()
                .classify(
                        AgentRuntimeToolCall.builder()
                                .toolCallId("read")
                                .toolName(name)
                                .arguments(args)
                                .build(),
                        out);
    }

    @Test
    void exactReadsAndPaginationProveMetadataOnlyIncludingEmpty() {
        assertNotNull(read("alert_inhibit.list", Map.of(), tool.readList(null, null, 0, 20)));
        seed();
        assertNotNull(read("alert_inhibit.get", Map.of("inhibitId", 100L), tool.get(100L)));
        assertNull(read("alert_inhibit.get", Map.of("inhibitId", 101L), tool.get(100L)));
        assertNotNull(
                read(
                        "alert_inhibit.list",
                        Map.of("pageIndex", 0, "pageSize", 1),
                        tool.readList(null, null, 0, 1)));
        assertNotNull(
                read(
                        "alert_inhibit.list",
                        Map.of("pageIndex", 1, "pageSize", 1),
                        tool.readList(null, null, 1, 1)));
    }

    @Test
    void malformedPartialMismatchedFilterDuplicateAndPageCannotGround() {
        seed();
        var one = tool.get(100L);
        one.put("partial", true);
        assertNull(read("alert_inhibit.get", Map.of("inhibitId", 100L), one));
        var page = tool.readList(null, null, 0, 20);
        assertNull(read("alert_inhibit.list", Map.of("ids", List.of(101L)), page));
        assertNull(read("alert_inhibit.list", Map.of("search", "not-found"), page));
        assertNull(read("alert_inhibit.list", Map.of("pageSize", 1), page));
        assertThrows(
                IllegalArgumentException.class,
                () -> tool.readList(List.of(100L, 100L), null, 0, 20));
        assertThrows(IllegalArgumentException.class, () -> tool.readList(null, null, -1, 20));
        assertThrows(IllegalArgumentException.class, () -> tool.readList(null, null, 0, 101));
    }

    @Test
    void runtimeLoopCompletesInhibitionCreateAfterApprovalAndNativeReceipt() throws Exception {
        for (String tool : List.of("alert_inhibit.create")) {
            try (var env = new ControlledMonitorTools()) {
                register(env);
                var args = Map.<String, Object>of("configuration", config());
                var goal = goal(AgentTaskAssessment.Operation.CREATE, config());
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
                                                                                "alert_inhibit",
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
                var messages = new java.util.ArrayList<TranscriptMessage>();
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
    void mismatchedUpdateIsReplannedOnceThenStillRequiresApproval() throws Exception {
        runRejectedUpdateCorrection(true);
    }

    @Test
    void repeatedMismatchNeverGetsApprovalOrWrites() throws Exception {
        runRejectedUpdateCorrection(false);
    }

    private void runRejectedUpdateCorrection(boolean repair) throws Exception {
        long id = seed();
        var expected = new LinkedHashMap<>(config());
        expected.put("name", "ai-isolated-policy-revised");
        var wrong = new LinkedHashMap<>(expected);
        wrong.put("equalLabels", List.of("host=unexpected"));
        var goal = goal(AgentTaskAssessment.Operation.UPDATE, expected);
        String sourceHash = (String) tool.get(id).get("sourceHash");
        var calls = new java.util.concurrent.atomic.AtomicInteger();
        var requested = new java.util.concurrent.atomic.AtomicInteger();
        try (var env = new ControlledMonitorTools()) {
            register(env);
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
                            assertTrue(
                                    n <= 4,
                                    "Correction must be bounded and stop after exact native"
                                            + " receipt");
                            if (n == 4)
                                assertTrue(
                                        request.getPrompt()
                                                .getInstructions()
                                                .contains(
                                                        "ALERT_INHIBIT_PROPOSAL_REJECTED_NOT_EXECUTED"));
                            String name =
                                    n == 1
                                            ? "tool.search"
                                            : n == 2 ? "alert_inhibit.get" : "alert_inhibit.update";
                            Map<String, Object> args =
                                    n == 1
                                            ? Map.of(
                                                    "namespace", "alert_inhibit", "query", "update")
                                            : n == 2
                                                    ? Map.of("inhibitId", id)
                                                    : Map.of(
                                                            "inhibitId",
                                                            id,
                                                            "sourceHash",
                                                            sourceHash,
                                                            "configuration",
                                                            n == 4 && repair ? expected : wrong);
                            return AgentRuntimeModelResponse.toolCalls(
                                    "",
                                    List.of(
                                            AgentRuntimeToolCall.builder()
                                                    .toolCallId("proposal-" + n)
                                                    .toolName(name)
                                                    .arguments(args)
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
                            .currentTimeIso("2026-10-22T08:00:00Z")
                            .sessionUid("session")
                            .runId(2L)
                            .runUid("run")
                            .workspaceId("isolated")
                            .entryType(AgentRuntimeEntryType.USER_INPUT)
                            .actor(ControlledMonitorTools.USER)
                            .receivedAt(System.currentTimeMillis())
                            .userMessage(
                                    "Rename exact policy "
                                            + id
                                            + " to ai-isolated-policy-revised, preserve all other"
                                            + " fields")
                            .preferredLanguage("en")
                            .timezone("UTC")
                            .chatHistory(List.of())
                            .build();
            var approvals = new AgentRuntimeApprovalRegistry();
            var messages = new java.util.ArrayList<TranscriptMessage>();
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
                                    if (event.getType() == AgentRuntimeEventType.REQUESTED_ACTION) {
                                        requested.incrementAndGet();
                                        assertTrue(repair);
                                        assertEquals(
                                                1,
                                                writes,
                                                "Rejected payload must not reach native write");
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
            assertEquals(4, calls.get());
            assertEquals(repair ? 1 : 0, requested.get());
            assertEquals(repair ? 2 : 1, writes);
            assertEquals(List.of("host"), nativeService.get(id).equalLabels());
            assertFalse(nativeService.get(id).enable());
            if (repair) {
                assertEquals("ai-isolated-policy-revised", nativeService.get(id).name());
                assertEquals(
                        AgentTaskOutcome.Stage.COMPLETE,
                        messages.getLast().getTaskOutcome().stage());
            } else {
                assertEquals("ai-isolated-policy", nativeService.get(id).name());
            }
        }
    }

    @Test
    void validReviewOfPrematureFinalContinuesToNormalUpdateApproval() throws Exception {
        runPrematureFinalAfterRead(true);
    }

    @Test
    void malformedReviewAfterSuccessfulNativeReadCannotClaimOrPerformUpdate() throws Exception {
        runPrematureFinalAfterRead(false);
    }

    private void runPrematureFinalAfterRead(boolean validReview) throws Exception {
        long id = seed();
        var expected = new LinkedHashMap<>(config());
        expected.put("name", "ai-isolated-policy-revised");
        var wrong = new LinkedHashMap<>(expected);
        wrong.put("equalLabels", List.of("host=unexpected"));
        var goal = goal(AgentTaskAssessment.Operation.UPDATE, expected);
        String sourceHash = (String) tool.get(id).get("sourceHash");
        var calls = new java.util.concurrent.atomic.AtomicInteger();
        var requested = new java.util.concurrent.atomic.AtomicInteger();
        try (var env = new ControlledMonitorTools()) {
            register(env);
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
                            if (request.getPrompt()
                                    .getInstructions()
                                    .contains("ORIGINAL_TASK_COMPLETION_REVIEW")) {
                                return AgentRuntimeModelResponse.finalAnswer(
                                        validReview
                                                ? JsonUtil.toJson(
                                                        new AgentTaskAssessment(
                                                                goal,
                                                                AgentTaskOutcome.Stage.NOT_EXECUTED,
                                                                true,
                                                                List.of()))
                                                : "{malformed-review}",
                                        null);
                            }
                            int n = calls.incrementAndGet();
                            assertTrue(
                                    n <= 4,
                                    "Correction must be bounded and stop after exact native"
                                            + " receipt");
                            if (n == 4)
                                assertTrue(
                                        request.getPrompt()
                                                .getInstructions()
                                                .contains("ORIGINAL_TASK_NOT_COMPLETE"));
                            if (n == 3)
                                return AgentRuntimeModelResponse.finalAnswer(
                                        "The rename is complete.", null);
                            String name =
                                    n == 1
                                            ? "tool.search"
                                            : n == 2 ? "alert_inhibit.get" : "alert_inhibit.update";
                            Map<String, Object> args =
                                    n == 1
                                            ? Map.of(
                                                    "namespace", "alert_inhibit", "query", "update")
                                            : n == 2
                                                    ? Map.of("inhibitId", id)
                                                    : Map.of(
                                                            "inhibitId",
                                                            id,
                                                            "sourceHash",
                                                            sourceHash,
                                                            "configuration",
                                                            n == 4 && validReview
                                                                    ? expected
                                                                    : wrong);
                            return AgentRuntimeModelResponse.toolCalls(
                                    "",
                                    List.of(
                                            AgentRuntimeToolCall.builder()
                                                    .toolCallId("proposal-" + n)
                                                    .toolName(name)
                                                    .arguments(args)
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
                            .currentTimeIso("2026-10-22T08:00:00Z")
                            .sessionUid("session")
                            .runId(2L)
                            .runUid("run")
                            .workspaceId("isolated")
                            .entryType(AgentRuntimeEntryType.USER_INPUT)
                            .actor(ControlledMonitorTools.USER)
                            .receivedAt(System.currentTimeMillis())
                            .userMessage(
                                    "Rename exact policy "
                                            + id
                                            + " to ai-isolated-policy-revised, preserve all other"
                                            + " fields")
                            .preferredLanguage("en")
                            .timezone("UTC")
                            .chatHistory(List.of())
                            .build();
            var approvals = new AgentRuntimeApprovalRegistry();
            var messages = new java.util.ArrayList<TranscriptMessage>();
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
                                    if (event.getType() == AgentRuntimeEventType.REQUESTED_ACTION) {
                                        requested.incrementAndGet();
                                        assertTrue(validReview);
                                        assertEquals(
                                                1,
                                                writes,
                                                "Rejected payload must not reach native write");
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
            assertEquals(validReview ? 4 : 3, calls.get());
            assertTrue(
                    messages.stream()
                            .anyMatch(
                                    message ->
                                            "alert_inhibit.get".equals(message.getToolName())
                                                    && message.getToolStatus()
                                                            == AgentToolStatus.SUCCEEDED));
            assertEquals(validReview ? 1 : 0, requested.get());
            assertEquals(validReview ? 2 : 1, writes);
            assertEquals(List.of("host"), nativeService.get(id).equalLabels());
            assertFalse(nativeService.get(id).enable());
            if (validReview) {
                assertEquals("ai-isolated-policy-revised", nativeService.get(id).name());
                assertEquals(
                        AgentTaskOutcome.Stage.COMPLETE,
                        messages.getLast().getTaskOutcome().stage());
            } else {
                assertEquals("ai-isolated-policy", nativeService.get(id).name());
            }
        }
    }

    @Test
    void cancelledPendingApprovalPersistsNotExecutedResultAndCompletionEvent() throws Exception {
        runCancelledApproval(false);
    }

    @Test
    void decidedApprovalCancellationDoesNotInventNotExecutedProof() throws Exception {
        runCancelledApproval(true);
    }

    private void runCancelledApproval(boolean decisionAlreadyRecorded) throws Exception {
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var calls = new java.util.concurrent.atomic.AtomicInteger();
            var goal = goal(AgentTaskAssessment.Operation.CREATE, config());
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
                            assertTrue(n <= 2);
                            return AgentRuntimeModelResponse.toolCalls(
                                    "",
                                    List.of(
                                            AgentRuntimeToolCall.builder()
                                                    .toolCallId("cancel-proposal-" + n)
                                                    .toolName(
                                                            n == 1
                                                                    ? "tool.search"
                                                                    : "alert_inhibit.create")
                                                    .arguments(
                                                            n == 1
                                                                    ? Map.of(
                                                                            "namespace",
                                                                            "alert_inhibit",
                                                                            "query",
                                                                            "create")
                                                                    : Map.of(
                                                                            "configuration",
                                                                            config()))
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
                            .currentTimeIso("2026-10-22T09:00:00Z")
                            .sessionUid("session")
                            .runId(2L)
                            .runUid("run")
                            .workspaceId("isolated")
                            .entryType(AgentRuntimeEntryType.USER_INPUT)
                            .actor(ControlledMonitorTools.USER)
                            .receivedAt(System.currentTimeMillis())
                            .userMessage(
                                    "Create exactly this disabled policy: "
                                            + JsonUtil.toJson(config()))
                            .preferredLanguage("en")
                            .timezone("UTC")
                            .chatHistory(List.of())
                            .build();
            var approvals = new AgentRuntimeApprovalRegistry();
            var messages = new java.util.ArrayList<TranscriptMessage>();
            var events = new java.util.ArrayList<AgentRuntimeEvent>();
            var approvalId = new java.util.concurrent.atomic.AtomicReference<String>();
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
                                    events.add(event);
                                    if (event.getType() == AgentRuntimeEventType.REQUESTED_ACTION) {
                                        approvalId.set(event.getApprovalId());
                                        if (decisionAlreadyRecorded)
                                            env.ledger.decideApproval(
                                                    event.getApprovalId(),
                                                    env.envelope(),
                                                    AgentRuntimeEntryType.USER_INPUT,
                                                    AgentApprovalDecision.APPROVED);
                                        control.cancel("Cancelled while waiting for approval");
                                    }
                                },
                                message -> {
                                    messages.add(message);
                                    return (long) messages.size();
                                });
            }
            assertEquals(0, writes);
            assertTrue(rows.isEmpty());
            var row = env.ledger.findApproval(approvalId.get()).orElseThrow();
            assertEquals(decisionAlreadyRecorded ? "WAITING_APPROVAL" : "DENIED", row.getStatus());
            assertEquals(
                    decisionAlreadyRecorded ? "APPROVED" : "REJECTED", row.getApprovalStatus());
            assertFalse(approvals.complete(approvalId.get(), AgentApprovalDecision.APPROVED));
            boolean transcriptProof =
                    messages.stream()
                            .anyMatch(
                                    message ->
                                            "CANCELLED_BEFORE_APPROVAL_NOT_EXECUTED"
                                                            .equals(message.getErrorMessage())
                                                    && message.getToolStatus()
                                                            == AgentToolStatus.DENIED);
            assertEquals(!decisionAlreadyRecorded, transcriptProof);
            if (transcriptProof) assertTrue(messages.stream().filter(message -> "CANCELLED_BEFORE_APPROVAL_NOT_EXECUTED".equals(message.getErrorMessage()))
                    .allMatch(message -> "run".equals(message.getRecordedRunUid())));
            boolean completionProof =
                    events.stream()
                            .anyMatch(
                                    event ->
                                            event.getType() == AgentRuntimeEventType.ITEM_COMPLETED
                                                    && "CANCELLED_BEFORE_APPROVAL_NOT_EXECUTED"
                                                            .equals(event.getErrorMessage()));
            assertEquals(!decisionAlreadyRecorded, completionProof);
            assertTrue(
                    events.stream()
                            .anyMatch(
                                    event ->
                                            event.getType() == AgentRuntimeEventType.ERROR
                                                    && event.getStatus()
                                                            == AgentRuntimeEvent.EventStatus
                                                                    .CANCELLED));
        }
    }

    @Test
    void recordedPrematureFinalShapeRecoversToExactApprovalThenVerifiedUpdate() throws Exception {
        replayPrematureFinal("APPROVE");
    }

    @Test
    void recordedPrematureFinalShapeDoesNotExecuteWhenApprovalIsCancelled() throws Exception {
        replayPrematureFinal("CANCEL");
    }

    @Test
    void repeatedInvalidReviewStopsWithoutAnUnboundedPlanningLoop() throws Exception {
        replayPrematureFinal("REPEAT_FINAL");
    }

    @Test
    void correctionCannotExpandTheOriginalTargetOrBypassTheGoalCheckpoint() throws Exception {
        replayPrematureFinal("WRONG_TARGET");
        rows.clear();
        writes = 0;
        replayPrematureFinal("INVALID_CHECKPOINT");
    }

    /**
     * Replays only the recorded 19:14 response sequence and review field structure. Text and
     * field values below are synthetic: the original prose/arguments were intentionally not logged.
     * Uses real Spring tool callbacks, native service and approval ledger with an isolated DAO.
     */
    private void replayPrematureFinal(String mode) throws Exception {
        long id = seed();
        var changed = new LinkedHashMap<>(config());
        changed.put("name", "ai-isolated-policy-revised");
        var originalGoal = goal(AgentTaskAssessment.Operation.UPDATE, Map.of("name", changed.get("name")));
        var invalidReview = new AgentTaskAssessment(
                new AgentTaskAssessment.Goal(AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.UPDATE, "alert_inhibit", null,
                        List.of(id), changed),
                AgentTaskOutcome.Stage.WAITING_APPROVAL, true, List.of());
        assertFalse(invalidReview.valid());
        assertEquals("EXPECTED_COUNT_REQUIRED", invalidReview.goal().validationFailure().name());
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var planning = new java.util.concurrent.atomic.AtomicInteger();
            var reviews = new java.util.concurrent.atomic.AtomicInteger();
            var checkpoints = new java.util.concurrent.atomic.AtomicInteger();
            var approvalCount = new java.util.concurrent.atomic.AtomicInteger();
            AgentRuntimeModelClient model = new AgentRuntimeModelClient() {
                public boolean supportsReplyReview() { return true; }

                public AgentRuntimeModelResponse stream(AgentRuntimeModelRequest request,
                        AgentRuntimeControl control, java.util.function.Consumer<String> delta) {
                    String instructions = request.getPrompt().getInstructions();
                    if (instructions.contains("ORIGINAL_TASK_GOAL_ONLY")) {
                        checkpoints.incrementAndGet();
                        return AgentRuntimeModelResponse.finalAnswer(JsonUtil.toJson(
                                mode.equals("INVALID_CHECKPOINT") ? invalidReview.goal() : originalGoal), null);
                    }
                    if (instructions.contains("ORIGINAL_TASK_COMPLETION_REVIEW")) {
                        reviews.incrementAndGet();
                        return AgentRuntimeModelResponse.finalAnswer(JsonUtil.toJson(invalidReview), null);
                    }
                    int n = planning.incrementAndGet();
                    assertTrue(n <= 4, "bounded recovery must not loop");
                    if (n == 3 || mode.equals("REPEAT_FINAL") && n == 4)
                        return AgentRuntimeModelResponse.finalAnswer("Synthetic proposal, not an executed change", null);
                    String name = n == 1 ? "tool.search" : n == 2 ? "alert_inhibit.get" : "alert_inhibit.update";
                    Map<String, Object> args;
                    if (n == 1) args = Map.of("namespace", "alert_inhibit", "query", "update");
                    else if (n == 2) args = Map.of("inhibitId", id);
                    else {
                        assertTrue(instructions.contains("UNEXECUTED_PROPOSAL_REVIEW_INVALID"));
                        assertTrue(request.getAvailableTools().stream().anyMatch(d -> "alert_inhibit.update".equals(d.getName())));
                        args = Map.of("inhibitId", mode.equals("WRONG_TARGET") ? id + 1 : id,
                                "sourceHash", tool.get(id).get("sourceHash"),
                                "configuration", changed);
                    }
                    return AgentRuntimeModelResponse.toolCalls("", List.of(
                            AgentRuntimeToolCall.builder().toolCallId("replay-" + n)
                                    .toolName(name).arguments(args).build()), null);
                }
            };
            var context = AgentRuntimeContext.builder()
                    .runSessionId(1L).approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                    .channelId("web-ui").traceId("isolated-replay").currentTimeIso("2026-10-22T19:14:00Z")
                    .sessionUid("session").runId(2L).runUid("isolated-recorded-shape")
                    .workspaceId("isolated").entryType(AgentRuntimeEntryType.USER_INPUT)
                    .actor(ControlledMonitorTools.USER).receivedAt(System.currentTimeMillis())
                    .userMessage("Rename exactly inhibition policy 100 to ai-isolated-policy-revised; preserve all other fields")
                    .preferredLanguage("en").timezone("UTC").chatHistory(List.of()).build();
            var approvals = new AgentRuntimeApprovalRegistry();
            var messages = new java.util.ArrayList<TranscriptMessage>();
            try (var control = AgentRuntimeControl.forContext(context, java.time.Clock.systemUTC())) {
                new AgentRuntimeLoop(new AgentRuntimeProperties(), model,
                        new AgentToolBridge(env.registry, env.orchestrator, approvals), java.time.Clock.systemUTC())
                        .run(context, control, event -> {
                            if (event.getType() == AgentRuntimeEventType.REQUESTED_ACTION) {
                                approvalCount.incrementAndGet();
                                assertEquals(1, writes, "native update cannot precede approval");
                                assertEquals(config().get("name"), rows.get(id).getName());
                                if (mode.equals("CANCEL")) control.cancel("User cancelled the pending proposal");
                                else {
                                    assertEquals("APPROVE", mode);
                                    env.ledger.decideApproval(event.getApprovalId(), env.envelope(),
                                            AgentRuntimeEntryType.USER_INPUT, AgentApprovalDecision.APPROVED);
                                    approvals.complete(event.getApprovalId(), AgentApprovalDecision.APPROVED);
                                }
                            }
                        }, message -> {
                            messages.add(message);
                            return (long) messages.size();
                        });
            }
            assertEquals(4, planning.get());
            assertEquals(mode.equals("REPEAT_FINAL") ? 2 : 1, reviews.get());
            assertEquals(mode.equals("REPEAT_FINAL") ? 0 : 1, checkpoints.get(), JsonUtil.toJson(messages));
            assertEquals(mode.equals("APPROVE") || mode.equals("CANCEL") ? 1 : 0, approvalCount.get(), JsonUtil.toJson(messages));
            assertEquals(mode.equals("APPROVE") ? 2 : 1, writes);
            assertEquals(mode.equals("APPROVE") ? changed.get("name") : config().get("name"), rows.get(id).getName());
            assertEquals(false, rows.get(id).getEnable());
            assertEquals(config().get("equalLabels"), rows.get(id).getEqualLabels());
            if (mode.equals("APPROVE")) {
                assertEquals(AgentTaskOutcome.Stage.COMPLETE, messages.getLast().getTaskOutcome().stage());
                assertEquals(1, messages.getLast().getTaskOutcome().verifiedCount());
            }
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
                        .toolName("alert_inhibit.create")
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
                        .toolName("alert_inhibit.create")
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
    void pendingForeignActorCancellationAndChangedParametersCannotWrite() {
        var typed =
                JsonUtil.fromJson(
                        JsonUtil.toJson(config()),
                        AgentAlertInhibitToolService.Configuration.class);
        var args = Map.<String, Object>of("configuration", config());
        String actor = ControlledMonitorTools.USER.getId();
        assertThrows(
                IllegalStateException.class,
                () -> direct(args, actor, "PENDING", true, () -> tool.createPolicy(typed)));
        assertThrows(
                IllegalStateException.class,
                () ->
                        direct(
                                args,
                                "different-user",
                                "APPROVED",
                                true,
                                () -> tool.createPolicy(typed)));
        assertThrows(
                IllegalStateException.class,
                () -> direct(args, actor, "APPROVED", false, () -> tool.createPolicy(typed)));
        var changed = new LinkedHashMap<>(config());
        changed.put("enable", true);
        assertThrows(
                IllegalStateException.class,
                () ->
                        direct(
                                Map.of("configuration", changed),
                                actor,
                                "APPROVED",
                                true,
                                () -> tool.createPolicy(typed)));
        assertEquals(0, writes);
    }

    @Test
    void protectedOrNonCanonicalConfigIsRejectedBeforeNativeEffects() throws Exception {
        try (var env = new ControlledMonitorTools()) {
            register(env);
            for (var changed :
                    List.of(
                            Map.of("name", " leading"),
                            Map.of("sourceLabels", Map.of("password", "SYNTHETIC_NOT_REAL")))) {
                var config = new LinkedHashMap<>(config());
                config.putAll(changed);
                var request =
                        env.request(
                                "alert_inhibit.create",
                                Map.of("configuration", config),
                                ControlledMonitorTools.USER);
                var pending = env.orchestrator.execute(request);
                assertFalse(pending.getApprovalSummary().complete());
                var result =
                        env.approved(
                                request.toBuilder()
                                        .toolCallId("invalid-" + changed.keySet())
                                        .build());
                assertEquals(AgentToolStatus.FAILED, result.getStatus());
            }
            assertEquals(0, writes);
        }
    }

    @Test
    void legacyEmptyMatcherRowsRemainReadableButCannotBecomeNewWrites() throws Exception {
        long id = seed();
        rows.get(id).setSourceLabels(Map.of());
        rows.get(id).setTargetLabels(Map.of());
        assertNotNull(read("alert_inhibit.get", Map.of("inhibitId", id), tool.get(id)));
        try (var env = new ControlledMonitorTools()) {
            register(env);
            var invalid = new LinkedHashMap<>(config());
            invalid.put("sourceLabels", Map.of());
            var result =
                    env.approved(
                            env.request(
                                    "alert_inhibit.create",
                                    Map.of("configuration", invalid),
                                    ControlledMonitorTools.USER));
            assertEquals(AgentToolStatus.FAILED, result.getStatus());
            assertEquals(1, writes);
        }
    }
}
