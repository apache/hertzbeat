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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.entity.AgentEntityManagementToolService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.apache.hertzbeat.manager.service.ObserveEntityService;
import org.apache.hertzbeat.manager.service.entity.EntityAlertEvidenceQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityAlertEvidenceReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityEvidenceReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorBindService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorEvidenceReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityWorkspaceAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.context.support.GenericApplicationContext;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * Real native alert/monitor read models and actual Spring callbacks, isolated access/query
 * services.
 */
class AgentEntityEvidenceContractTest {
    private final ObserveEntityService entities = mock(ObserveEntityService.class);
    private final EntityWorkspaceAccessService access = mock(EntityWorkspaceAccessService.class);
    private final EntityMonitorBindService bindings = mock(EntityMonitorBindService.class);
    private final EntityAlertEvidenceQueryService alerts =
            mock(EntityAlertEvidenceQueryService.class);
    private AgentEntityManagementToolService tools;
    private boolean empty;
    private List<SingleAlert> alertRows;

    static Stream<String> tools() {
        return Stream.of(
                "entity.editable", "entity.alerts", "entity.monitors", "entity.binding_candidates");
    }

    @BeforeEach
    void setup() {
        var info = new EntityInfo();
        info.setId(10L);
        info.setName("checkout");
        info.setType("service");
        var dto = new EntityDto();
        dto.setEntityInfo(info);
        when(entities.getEntityDto(anyLong()))
                .thenAnswer(
                        i ->
                                Long.valueOf(10L).equals(i.getArgument(0))
                                        ? JsonUtil.fromJson(JsonUtil.toJson(dto), EntityDto.class)
                                        : null);
        when(access.isEntityAccessibleForRequestWorkspace(anyLong())).thenReturn(true);
        when(bindings.findEntityMonitors(anyLong()))
                .thenAnswer(
                        i ->
                                empty
                                        ? List.of()
                                        : List.of(
                                                Monitor.builder()
                                                        .id(21L)
                                                        .name("checkout-site")
                                                        .app("website")
                                                        .status((byte) 2)
                                                        .build(),
                                                Monitor.builder()
                                                        .id(22L)
                                                        .name("checkout-jvm")
                                                        .app("jvm")
                                                        .status((byte) 1)
                                                        .build()));
        alertRows =
                List.of(
                        SingleAlert.builder()
                                .id(31L)
                                .fingerprint("critical-fp")
                                .status("firing")
                                .labels(Map.of("severity", "critical"))
                                .build(),
                        SingleAlert.builder()
                                .id(32L)
                                .fingerprint("info-fp")
                                .status("resolved")
                                .labels(Map.of("severity", "info"))
                                .build());
        when(alerts.findAlerts(any(), any()))
                .thenAnswer(
                        i ->
                                empty
                                        ? List.of()
                                        : alertRows.stream()
                                                .filter(v -> v.getStatus().equals(i.getArgument(1)))
                                                .toList());
        var nativeService =
                new EntityEvidenceReadModelService(
                        access,
                        bindings,
                        new EntityAlertEvidenceReadModelService(alerts),
                        new EntityMonitorEvidenceReadModelService());
        when(entities.getEntityAlerts(anyLong(), any(), any(), anyInt(), anyInt()))
                .thenAnswer(
                        i ->
                                nativeService.getEntityAlerts(
                                        i.getArgument(0),
                                        i.getArgument(1),
                                        i.getArgument(2),
                                        i.getArgument(3),
                                        i.getArgument(4)));
        when(entities.getEntityMonitors(anyLong(), any(), any(), anyInt(), anyInt()))
                .thenAnswer(
                        i ->
                                nativeService.getEntityMonitors(
                                        i.getArgument(0),
                                        i.getArgument(1),
                                        i.getArgument(2),
                                        i.getArgument(3),
                                        i.getArgument(4)));
        when(entities.getMonitorBindingCandidates(any(List.class)))
                .thenAnswer(
                        i ->
                                Map.of(
                                        21L,
                                        empty
                                                ? List.of()
                                                : List.of(
                                                        new EntityMonitorBindingCandidate(
                                                                10L,
                                                                "checkout",
                                                                "service",
                                                                90,
                                                                "candidate",
                                                                false,
                                                                Map.of(
                                                                        "instance",
                                                                        List.of(
                                                                                "PRIVATE_IDENTITY_FIXTURE")))),
                                        22L,
                                        List.of()));
        tools = new AgentEntityManagementToolService(entities, null);
    }

    private Map<String, Object> args(String tool) {
        return tool.equals("entity.binding_candidates")
                ? Map.of("monitorIds", List.of(21, 22))
                : Map.of("entityId", 10);
    }

    private AgentReadObservationClassifier.Observation classify(
            String tool, Map<String, Object> args, Map<String, Object> output) {
        return new AgentReadObservationClassifier()
                .classify(
                        AgentRuntimeToolCall.builder()
                                .toolCallId("read")
                                .toolName(tool)
                                .arguments(args)
                                .build(),
                        JsonUtil.toJson(output));
    }

    @ParameterizedTest
    @MethodSource("tools")
    void actualNativeReadAndEmptyPageAreEvidence(String tool) {
        var args = args(tool);
        var output = invoke(tool, args);
        assertNotNull(classify(tool, args, output), tool);
        assertFalse(JsonUtil.toJson(output).contains("PRIVATE_IDENTITY_FIXTURE"));
        empty = true;
        var result = classify(tool, args, invoke(tool, args));
        assertNotNull(result);
        assertEquals(tool.equals("entity.editable") ? 1 : 0, result.count());
    }

    @ParameterizedTest
    @MethodSource("tools")
    void wrongScopePartialAndFailedShapeAreNotEvidence(String tool) {
        var args = args(tool);
        var output = invoke(tool, args);
        assertNull(classify(tool, args, Map.of("success", true)));
        var partial = new HashMap<>(output);
        partial.put("partial", true);
        assertNull(classify(tool, args, partial));
        Map<String, Object> changed =
                tool.equals("entity.binding_candidates")
                        ? Map.of("monitorIds", List.of(21))
                        : Map.of("entityId", 11);
        assertNull(classify(tool, changed, output));
    }

    @Test
    void nativeFiltersAndNonFirstPageRemainBound() {
        var args =
                Map.<String, Object>of(
                        "entityId",
                        10,
                        "app",
                        "WEBSITE",
                        "status",
                        "2",
                        "pageIndex",
                        0,
                        "pageSize",
                        1);
        var output = invoke("entity.monitors", args);
        assertEquals(1, classify("entity.monitors", args, output).count());
        args = Map.of("entityId", 10, "status", "resolved", "severity", "info");
        assertEquals(1, classify("entity.alerts", args, invoke("entity.alerts", args)).count());
        args = Map.of("entityId", 10, "pageIndex", 1, "pageSize", 1);
        output = invoke("entity.monitors", args);
        assertEquals(1, classify("entity.monitors", args, output).count());
        var wrong = new HashMap<>(args);
        wrong.put("pageIndex", 0);
        assertNull(classify("entity.monitors", wrong, output));
    }

    @Test
    void inaccessibleOrForeignEntityNeverBecomesSuccessfulEmptyPage() {
        assertThrows(
                RuntimeException.class, () -> invoke("entity.alerts", Map.of("entityId", 999)));
        var dto = new EntityDto();
        var info = new EntityInfo();
        info.setId(11L);
        info.setName("foreign");
        info.setType("service");
        dto.setEntityInfo(info);
        doReturn(dto).when(entities).getEntityDto(10);
        for (String tool : List.of("entity.editable", "entity.alerts", "entity.monitors"))
            assertThrows(RuntimeException.class, () -> invoke(tool, Map.of("entityId", 10)));
    }

    @Test
    void nullAndMissingCandidateScopeAreNotEmptySuccess() {
        doReturn(null).when(entities).getEntityAlerts(anyLong(), any(), any(), anyInt(), anyInt());
        assertThrows(RuntimeException.class, () -> invoke("entity.alerts", args("entity.alerts")));
        doReturn(Map.of(21L, List.of()))
                .when(entities)
                .getMonitorBindingCandidates(any(List.class));
        var args = args("entity.binding_candidates");
        var result = invoke("entity.binding_candidates", args);
        assertEquals(true, result.get("partial"));
        assertNull(classify("entity.binding_candidates", args, result));
        doReturn(Map.of(99L, List.of()))
                .when(entities)
                .getMonitorBindingCandidates(any(List.class));
        assertThrows(RuntimeException.class, () -> invoke("entity.binding_candidates", args));
    }

    @Test
    void unknownAlertStatusAndDuplicateTargetsDoNotSilentlySelectAnotherScope() {
        assertThrows(
                RuntimeException.class,
                () -> invoke("entity.alerts", Map.of("entityId", 10, "status", "all")));
        assertThrows(
                RuntimeException.class,
                () -> invoke("entity.binding_candidates", Map.of("monitorIds", List.of(21, 21))));
    }

    @ParameterizedTest
    @MethodSource("tools")
    void durableEntityReadProofCannotCrossRunArgumentsOrResponse(String tool) {
        var args = args(tool);
        var call =
                AgentRuntimeToolCall.builder()
                        .toolCallId("read")
                        .toolName(tool)
                        .arguments(args)
                        .build();
        String output = JsonUtil.toJson(invoke(tool, args));
        var result =
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult.builder()
                        .toolCallId("read")
                        .toolName(tool)
                        .status(AgentToolStatus.SUCCEEDED)
                        .risk(AgentToolRisk.READ)
                        .decision(
                                org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision.ALLOW)
                        .approvalStatus(
                                org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus
                                        .NOT_REQUIRED)
                        .output(output)
                        .build();
        var evaluator = new AgentReadGroundingEvaluator();
        var proof = evaluator.evaluate("entity-run", call, result).orElseThrow();
        var message =
                TranscriptMessage.builder()
                        .role(TranscriptMessage.TranscriptRole.TOOL_RESULT)
                        .toolName(tool)
                        .toolCallId("read")
                        .content(List.of(TranscriptContent.text(output)))
                        .groundingProof(proof)
                        .build();
        assertTrue(evaluator.restores(message, "entity-run", args));
        assertFalse(evaluator.restores(message, "other-run", args));
        assertFalse(evaluator.restores(message, "entity-run", Map.of("entityId", 11)));
        assertFalse(
                evaluator.restores(
                        message.toBuilder().content(List.of(TranscriptContent.text("{}"))).build(),
                        "entity-run",
                        args));
        assertTrue(
                evaluator
                        .evaluate(
                                "entity-run",
                                call,
                                result.toBuilder().status(AgentToolStatus.FAILED).build())
                        .isEmpty());
    }

    @Test
    void filteredRowsCannotContradictStatusOrSeverityAndDuplicateCandidatesAreRejected() {
        var monitorArgs = Map.<String, Object>of("entityId", 10, "status", "2", "app", "website");
        var output = invoke("entity.monitors", monitorArgs);
        var data = (Map<String, Object>) output.get("data");
        var row = (Map<String, Object>) ((List<?>) data.get("content")).get(0);
        row.put("status", 1);
        assertNull(classify("entity.monitors", monitorArgs, output));
        var alertArgs = Map.<String, Object>of("entityId", 10, "severity", "critical");
        output = invoke("entity.alerts", alertArgs);
        data = (Map<String, Object>) output.get("data");
        row = (Map<String, Object>) ((List<?>) data.get("content")).get(0);
        row.put("labels", Map.of("severity", "info"));
        assertNull(classify("entity.alerts", alertArgs, output));
        var args = args("entity.binding_candidates");
        output = invoke("entity.binding_candidates", args);
        data = (Map<String, Object>) output.get("data");
        var candidates = (Map<String, Object>) data.get("candidates");
        var list = (List<?>) candidates.get("21");
        candidates.put("21", List.of(list.get(0), list.get(0)));
        assertNull(classify("entity.binding_candidates", args, output));
    }

    private Map<String, Object> invoke(String name, Map<String, Object> args) {
        try (var spring = new GenericApplicationContext()) {
            spring.registerBean(AgentEntityManagementToolService.class, () -> tools);
            spring.refresh();
            var registry =
                    new AgentToolConfiguration()
                            .agentToolRegistry(spring.getDefaultListableBeanFactory());
            var req =
                    AgentToolExecutionRequest.builder()
                            .workspaceId("signal-test")
                            .sessionUid("signal-test")
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
            AuthTokenRequestContext.bindWorkspaceId("signal-test");
            AuthTokenRequestContext.bindAuthenticatedWorkspaceId("signal-test");
            try {
                return JsonUtil.fromJson(
                        registry.find(name)
                                .orElseThrow()
                                .execute(
                                        new AgentToolExecutionContext(
                                                req, AgentToolCall.builder().build()))
                                .getModelContent(),
                        Map.class);
            } finally {
                AuthTokenRequestContext.clear();
            }
        }
    }
}
