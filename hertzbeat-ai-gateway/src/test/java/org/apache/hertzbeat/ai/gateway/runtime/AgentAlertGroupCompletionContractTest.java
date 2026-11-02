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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.validation.Validator;

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertGroupToolService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.alert.dao.AlertGroupConvergeDao;
import org.apache.hertzbeat.alert.reduce.AlarmGroupReduce;
import org.apache.hertzbeat.alert.service.impl.AlertGroupConvergeServiceImpl;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.alerter.AlertGroupConverge;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Actual grouping policy service/cache refresh + Spring callbacks; isolated DAO/cache and no
 * notifications.
 */
class AgentAlertGroupCompletionContractTest {
    private final AlertGroupConvergeDao dao = mock(AlertGroupConvergeDao.class);
    private final AlarmGroupReduce cache = mock(AlarmGroupReduce.class);
    private final Map<Long, AlertGroupConverge> rows = new HashMap<>();
    private AgentAlertGroupToolService tools;

    @BeforeEach
    void setup() {
        var service = new AlertGroupConvergeServiceImpl();
        ReflectionTestUtils.setField(service, "alertGroupConvergeDao", dao);
        ReflectionTestUtils.setField(service, "alarmGroupReduce", cache);
        var validator = mock(Validator.class);
        when(validator.validate(any())).thenReturn(Set.of());
        tools = new AgentAlertGroupToolService(service, validator);
        when(dao.findAlertGroupConvergesByName(any()))
                .thenAnswer(
                        i ->
                                rows.values().stream()
                                        .filter(v -> v.getName().equals(i.getArgument(0)))
                                        .toList());
        when(dao.save(any()))
                .thenAnswer(
                        i -> {
                            AlertGroupConverge value = i.getArgument(0);
                            if (value.getId() == null) value.setId(7L);
                            rows.put(value.getId(), cloneValue(value));
                            return value;
                        });
        when(dao.findById(anyLong()))
                .thenAnswer(
                        i -> Optional.ofNullable(rows.get(i.getArgument(0))).map(this::cloneValue));
        when(dao.findAlertGroupConvergesByEnableIsTrue())
                .thenAnswer(
                        i ->
                                rows.values().stream()
                                        .filter(v -> Boolean.TRUE.equals(v.getEnable()))
                                        .toList());
        doAnswer(
                        i -> {
                            for (Long id : (Set<Long>) i.getArgument(0)) rows.remove(id);
                            return null;
                        })
                .when(dao)
                .deleteAlertGroupConvergesByIdIn(any());
    }

    private AlertGroupConverge cloneValue(AlertGroupConverge value) {
        return JsonUtil.fromJson(JsonUtil.toJson(value), AlertGroupConverge.class);
    }

    private Map<String, Object> config() {
        return Map.of(
                "name",
                "AI grouping",
                "groupLabels",
                List.of("service"),
                "groupWait",
                0,
                "groupInterval",
                60,
                "repeatInterval",
                600,
                "enable",
                true);
    }

    private AgentTaskAssessment.Goal goal(
            AgentTaskAssessment.Operation operation, Map<String, Object> changes) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                operation,
                "alert_group",
                1,
                operation == AgentTaskAssessment.Operation.CREATE ? List.of() : List.of(7L),
                changes);
    }

    private AgentTaskEvidence receipt(
            String tool, Map<String, Object> args, Map<String, Object> output) {
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "write",
                tool,
                AgentToolRisk.CHANGE,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(output),
                true,
                AgentToolPayloadHasher.normalizedArgumentsHash(args));
        return evidence;
    }

    @Test
    void nativeGeneratedIdAndIndependentReadCompleteAllThreeOperations() {
        String tool = "alert_group.create";
        var args = Map.<String, Object>of("configuration", config());
        var result = invoke(tool, args);
        assertTrue(
                receipt(tool, args, result)
                        .completes(
                                goal(
                                        AgentTaskAssessment.Operation.CREATE,
                                        Map.of("name", "AI grouping"))));
        verify(dao).findById(7L);
        var source = invoke("alert_group.get", Map.of("groupId", 7));
        var changed = new HashMap<>(config());
        changed.put("enable", false);
        args =
                Map.of(
                        "groupId",
                        7,
                        "configuration",
                        changed,
                        "sourceHash",
                        source.get("sourceHash"));
        tool = "alert_group.update";
        var goal = goal(AgentTaskAssessment.Operation.UPDATE, Map.of("enable", false));
        assertTrue(AgentAlertGroupMutationSemantics.permits(goal, tool, args));
        assertTrue(AgentAlertGroupMutationSemantics.preserves(goal, tool, args, source));
        result = invoke(tool, args);
        assertTrue(receipt(tool, args, result).completes(goal));
        assertEquals(false, rows.get(7L).getEnable());
        source = invoke("alert_group.get", Map.of("groupId", 7));
        args =
                Map.of(
                        "groupId",
                        7,
                        "reason",
                        "isolated test",
                        "sourceHash",
                        source.get("sourceHash"));
        tool = "alert_group.delete";
        result = invoke(tool, args);
        assertTrue(
                receipt(tool, args, result)
                        .completes(goal(AgentTaskAssessment.Operation.DELETE, Map.of())));
        assertTrue(rows.isEmpty());
        verify(cache, times(3)).refreshGroupDefines(any());
    }

    @Test
    void staleSourceRejectsBeforeNativeWriteAndWrongIdCannotBeRead() {
        invoke("alert_group.create", Map.of("configuration", config()));
        var source = invoke("alert_group.get", Map.of("groupId", 7));
        rows.get(7L).setGroupWait(99L);
        clearInvocations(dao);
        assertThrows(
                RuntimeException.class,
                () ->
                        invoke(
                                "alert_group.update",
                                Map.of(
                                        "groupId",
                                        7,
                                        "configuration",
                                        config(),
                                        "sourceHash",
                                        source.get("sourceHash"))));
        verify(dao, never()).save(any());
        when(dao.findById(7L))
                .thenReturn(
                        Optional.of(AlertGroupConverge.builder().id(8L).name("foreign").build()));
        assertThrows(RuntimeException.class, () -> invoke("alert_group.get", Map.of("groupId", 7)));
    }

    @Test
    void unknownPostReadAndDeleteRemainingAreNeverSuccessOrAutomaticRetry() {
        when(dao.findById(7L)).thenReturn(Optional.empty());
        assertThrows(
                RuntimeException.class,
                () -> invoke("alert_group.create", Map.of("configuration", config())));
        verify(dao, times(1)).save(any());
        assertEquals(1, rows.size());
    }

    @Test
    void sourceMustBeDurableAndOnlyOriginalRequestedFieldsMayChange() {
        invoke("alert_group.create", Map.of("configuration", config()));
        var source = invoke("alert_group.get", Map.of("groupId", 7));
        var changed = new HashMap<>(config());
        changed.put("enable", false);
        var args =
                Map.<String, Object>of(
                        "groupId",
                        7,
                        "configuration",
                        changed,
                        "sourceHash",
                        source.get("sourceHash"));
        var goal = goal(AgentTaskAssessment.Operation.UPDATE, Map.of("enable", false));
        var evidence = new AgentTaskEvidence();
        assertFalse(evidence.alertGroupBaseline(goal, "alert_group.update", args));
        evidence.observe(
                "read",
                "alert_group.get",
                AgentToolRisk.READ,
                AgentToolStatus.SUCCEEDED,
                Map.of("groupId", 7),
                JsonUtil.toJson(source),
                true,
                AgentToolPayloadHasher.normalizedArgumentsHash(Map.of("groupId", 7)));
        assertTrue(evidence.alertGroupBaseline(goal, "alert_group.update", args));
        changed.put("groupWait", 99);
        assertFalse(
                AgentAlertGroupMutationSemantics.preserves(
                        goal, "alert_group.update", args, source));
        assertFalse(AgentApplicationMutationAuthority.allowsFullMode("alert_group.update"));
    }

    @Test
    void unboundGoalPartialReceiptAndAlteredInputDoNotComplete() {
        var args = Map.<String, Object>of("configuration", config());
        var output = invoke("alert_group.create", args);
        String hash = AgentToolPayloadHasher.normalizedArgumentsHash(args);
        assertTrue(
                AgentAlertGroupMutationSemantics.verified(
                        "alert_group.create", args, output, hash));
        assertFalse(
                AgentAlertGroupMutationSemantics.verified(
                        "alert_group.create", args, Map.of("success", true), hash));
        var partial = new HashMap<>(output);
        partial.put("partial", true);
        assertFalse(
                AgentAlertGroupMutationSemantics.verified(
                        "alert_group.create", args, partial, hash));
        assertFalse(
                receipt("alert_group.create", args, output)
                        .completes(
                                goal(
                                        AgentTaskAssessment.Operation.CREATE,
                                        Map.of("name", "foreign"))));
        assertFalse(
                AgentAlertGroupMutationSemantics.verified(
                        "alert_group.create", args, output, "0".repeat(64)));
    }

    @Test
    void deletionThatDidNotPersistAndWriteReadFailureNeverComplete() {
        invoke("alert_group.create", Map.of("configuration", config()));
        var source = invoke("alert_group.get", Map.of("groupId", 7));
        doAnswer(i -> null).when(dao).deleteAlertGroupConvergesByIdIn(any());
        assertThrows(
                RuntimeException.class,
                () ->
                        invoke(
                                "alert_group.delete",
                                Map.of(
                                        "groupId",
                                        7,
                                        "reason",
                                        "isolated test",
                                        "sourceHash",
                                        source.get("sourceHash"))));
        assertEquals(1, rows.size());
        when(dao.findById(7L)).thenThrow(new IllegalStateException("isolated read unavailable"));
        assertThrows(
                RuntimeException.class,
                () ->
                        invoke(
                                "alert_group.create",
                                Map.of(
                                        "configuration",
                                        Map.of(
                                                "name",
                                                "Second",
                                                "groupLabels",
                                                List.of("service"),
                                                "groupWait",
                                                0,
                                                "groupInterval",
                                                60,
                                                "repeatInterval",
                                                600,
                                                "enable",
                                                true))));
    }

    @Test
    void nativePostReadContradictionCannotProduceReceipt() {
        doAnswer(
                        i -> {
                            AlertGroupConverge value = i.getArgument(0);
                            value.setId(7L);
                            var changed = cloneValue(value);
                            changed.setGroupWait(999L);
                            rows.put(7L, changed);
                            return value;
                        })
                .when(dao)
                .save(any());
        assertThrows(
                RuntimeException.class,
                () -> invoke("alert_group.create", Map.of("configuration", config())));
        verify(dao, times(1)).save(any());
    }

    @Test
    void oneResourceIntentCannotBeExtendedIntoAnotherWriteByChangingArguments() {
        var args = Map.<String, Object>of("configuration", config());
        var proof = receipt("alert_group.create", args, invoke("alert_group.create", args));
        assertTrue(
                proof.alreadyReceipted(
                        "alert_group.update",
                        Map.of("groupId", 7, "configuration", Map.of("name", "changed"))));
        var two =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.CREATE,
                        "alert_group",
                        2,
                        List.of(),
                        Map.of("name", "AI grouping"));
        assertFalse(AgentAlertGroupMutationSemantics.permits(two, "alert_group.create", args));
    }

    private Map<String, Object> invoke(String name, Map<String, Object> args) {
        try (var spring = new GenericApplicationContext()) {
            spring.registerBean(AgentAlertGroupToolService.class, () -> tools);
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
