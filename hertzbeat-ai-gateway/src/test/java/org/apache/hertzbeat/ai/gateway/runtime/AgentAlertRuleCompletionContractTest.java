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

import jakarta.validation.Validator;

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertRuleToolService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.Hierarchy;
import org.apache.hertzbeat.manager.service.AppService;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

class AgentAlertRuleCompletionContractTest {
    private final AlertDefineService nativeService = mock(AlertDefineService.class);
    private final AppService apps = mock(AppService.class);
    private final Validator validator = mock(Validator.class);
    private final Map<Long, AlertDefine> rows = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.concurrent.atomic.AtomicLong sequence =
            new java.util.concurrent.atomic.AtomicLong(7);

    private Map<String, Object> invoke(String name, Map<String, Object> args) {
        try (var spring = new GenericApplicationContext()) {
            spring.registerBean(
                    AgentAlertRuleToolService.class,
                    () -> new AgentAlertRuleToolService(nativeService, apps, validator));
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
        when(validator.validate(any())).thenReturn(Set.of());
        when(nativeService.getAlertDefine(org.mockito.ArgumentMatchers.anyLong()))
                .thenAnswer(i -> rows.get(i.getArgument(0)));
        doAnswer(
                        i -> {
                            AlertDefine value = i.getArgument(0);
                            value.setId(sequence.getAndIncrement());
                            rows.put(
                                    value.getId(),
                                    JsonUtil.fromJson(JsonUtil.toJson(value), AlertDefine.class));
                            return null;
                        })
                .when(nativeService)
                .addAlertDefine(any());
        doAnswer(
                        i -> {
                            AlertDefine value = i.getArgument(0);
                            rows.put(
                                    value.getId(),
                                    JsonUtil.fromJson(JsonUtil.toJson(value), AlertDefine.class));
                            return null;
                        })
                .when(nativeService)
                .modifyAlertDefine(any());
        doAnswer(
                        i -> {
                            rows.remove(i.getArgument(0));
                            return null;
                        })
                .when(nativeService)
                .deleteAlertDefine(org.mockito.ArgumentMatchers.anyLong());
        when(apps.getAppHierarchy("linux", "en-US"))
                .thenReturn(
                        List.of(
                                new Hierarchy(
                                        "metrics", "cpu", "CPU", true, null, null, null,
                                        List.of())));
    }

    private AgentTaskAssessment.Goal goal(
            AgentTaskAssessment.Operation operation, long id, Map<String, Object> changes) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                operation,
                "alert_rule",
                1,
                operation == AgentTaskAssessment.Operation.CREATE ? List.of() : List.of(id),
                changes);
    }

    private AgentTaskEvidence evidence(
            String tool, Map<String, Object> args, Map<String, Object> output, boolean durable) {
        var proof = new AgentTaskEvidence();
        proof.observe(
                "rule",
                tool,
                AgentToolRisk.CHANGE,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(output),
                durable,
                AgentToolPayloadHasher.normalizedArgumentsHash(args));
        return proof;
    }

    private Map<String, Object> config() {
        return Map.of(
                "name",
                "configured-rule",
                "type",
                "periodic_log",
                "expression",
                "count > 10",
                "period",
                300,
                "times",
                1,
                "datasource",
                "log",
                "enabled",
                false);
    }

    @Test
    void sixSpringCallbacksCompleteOnlyOriginalNativeRuleChanges() {
        setup();
        var create =
                Map.<String, Object>of(
                        "name",
                        "legacy-rule",
                        "app",
                        "LINUX",
                        "metrics",
                        "cpu",
                        "fieldConditions",
                        "usage > 90",
                        "enable",
                        false);
        var result = invoke("alert_rule.create", create);
        assertTrue(
                evidence("alert_rule.create", create, result, true)
                        .completes(
                                goal(
                                        AgentTaskAssessment.Operation.CREATE,
                                        0,
                                        Map.of(
                                                "name",
                                                "legacy-rule",
                                                "app",
                                                "linux",
                                                "enabled",
                                                false,
                                                "type",
                                                "realtime_metric"))));
        var configured = Map.<String, Object>of("configuration", config());
        var created = invoke("alert_rule.create_configured", configured);
        assertTrue(
                evidence("alert_rule.create_configured", configured, created, true)
                        .completes(goal(AgentTaskAssessment.Operation.CREATE, 0, config())));
        var updates = Map.<String, Object>of("expression", "count > 20", "times", 2);
        var update = Map.<String, Object>of("ruleId", 8L, "updates", updates);
        assertTrue(
                evidence("alert_rule.update", update, invoke("alert_rule.update", update), true)
                        .completes(goal(AgentTaskAssessment.Operation.UPDATE, 8, updates)));
        var toggle = Map.<String, Object>of("ruleId", 8L, "enabled", false);
        assertTrue(
                evidence("alert_rule.toggle", toggle, invoke("alert_rule.toggle", toggle), true)
                        .completes(
                                goal(
                                        AgentTaskAssessment.Operation.UPDATE,
                                        8,
                                        Map.of("enabled", false))));
        var bind =
                Map.<String, Object>of(
                        "ruleId", 7L, "monitorIds", List.of(2L, 3L), "replaceExisting", true);
        assertTrue(
                evidence(
                                "alert_rule.bind_monitors",
                                bind,
                                invoke("alert_rule.bind_monitors", bind),
                                true)
                        .completes(
                                goal(
                                        AgentTaskAssessment.Operation.UPDATE,
                                        7,
                                        Map.of(
                                                "monitorIds",
                                                List.of(2L, 3L),
                                                "replaceExisting",
                                                true))));
        var delete = Map.<String, Object>of("ruleId", 8L, "reason", "isolated test");
        assertTrue(
                evidence("alert_rule.delete", delete, invoke("alert_rule.delete", delete), true)
                        .completes(goal(AgentTaskAssessment.Operation.DELETE, 8, Map.of())));
    }

    @Test
    void unknownReadbackMissingTranscriptForeignIdAndPartialResultCannotComplete() {
        setup();
        var args = Map.<String, Object>of("configuration", config());
        var output = invoke("alert_rule.create_configured", args);
        assertEquals(
                0, evidence("alert_rule.create_configured", args, output, false).verifiedCount());
        var partial = new HashMap<>(output);
        partial.put("partial", true);
        assertTrue(evidence("alert_rule.create_configured", args, partial, true).uncertain());
        var fake = new HashMap<String, Object>((Map<String, Object>) output.get("data"));
        fake.put("ruleId", 99L);
        assertEquals(
                0,
                evidence("alert_rule.create", Map.of("name", "configured-rule"), fake, true)
                        .receiptCount());
        assertEquals(
                0,
                evidence(
                                "alert_rule.create",
                                Map.of("name", "configured-rule"),
                                Map.of("success", true),
                                true)
                        .receiptCount());
        when(nativeService.getAlertDefine(8L))
                .thenReturn(
                        AlertDefine.builder()
                                .id(8L)
                                .name("wrong")
                                .type("periodic_log")
                                .expr("bad")
                                .build());
        assertThrows(RuntimeException.class, () -> invoke("alert_rule.create_configured", args));
    }

    @Test
    void fixedOriginalScopeRejectsExtraChangesAndBindingExpansion() {
        assertFalse(
                AgentAlertRuleMutationSemantics.permits(
                        goal(AgentTaskAssessment.Operation.UPDATE, 7, Map.of("enabled", false)),
                        "alert_rule.update",
                        Map.of(
                                "ruleId",
                                7,
                                "updates",
                                Map.of("enabled", false, "expression", "changed"))));
        assertFalse(
                AgentAlertRuleMutationSemantics.permits(
                        goal(
                                AgentTaskAssessment.Operation.UPDATE,
                                7,
                                Map.of("monitorIds", List.of(2))),
                        "alert_rule.bind_monitors",
                        Map.of("ruleId", 7, "monitorIds", List.of(2, 3))));
        assertFalse(
                AgentAlertRuleMutationSemantics.permits(
                        goal(AgentTaskAssessment.Operation.UPDATE, 8, Map.of("enabled", false)),
                        "alert_rule.toggle",
                        Map.of("ruleId", 7, "enabled", false)));
    }
}
