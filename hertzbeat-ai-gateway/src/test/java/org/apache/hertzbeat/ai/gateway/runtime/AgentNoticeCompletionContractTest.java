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
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import jakarta.validation.Validator;

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertGroupToolService;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitToolService;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertSilenceToolService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.notice.AgentNoticeToolService;
import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.alert.service.AlertGroupConvergeService;
import org.apache.hertzbeat.alert.service.AlertInhibitService;
import org.apache.hertzbeat.alert.service.AlertSilenceService;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.alert.service.NoticeReceiverContractService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.alerter.NoticeRule;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Real Spring callbacks with isolated native services; never sends a notification. */
class AgentNoticeCompletionContractTest {
    private final AlertGroupConvergeService groups = mock(AlertGroupConvergeService.class);
    private final AlertInhibitService inhibits = mock(AlertInhibitService.class);
    private final AlertSilenceService silences = mock(AlertSilenceService.class);
    private final NoticeConfigService notices = mock(NoticeConfigService.class);

    private Map<String, Object> invoke(String tool, Map<String, Object> args) {
        try (var ctx = new GenericApplicationContext()) {
            ctx.registerBean(
                    AgentAlertGroupToolService.class,
                    () -> new AgentAlertGroupToolService(groups, mock(Validator.class)));
            ctx.registerBean(
                    AgentAlertInhibitToolService.class,
                    () -> new AgentAlertInhibitToolService(inhibits));
            ctx.registerBean(
                    AgentAlertSilenceToolService.class,
                    () -> new AgentAlertSilenceToolService(silences));
            ctx.registerBean(
                    AgentNoticeToolService.class,
                    () ->
                            new AgentNoticeToolService(
                                    notices,
                                    mock(NoticeReceiverContractService.class),
                                    mock(Validator.class),
                                    new AlerterProperties()));
            ctx.refresh();
            var registry =
                    new AgentToolConfiguration()
                            .agentToolRegistry(ctx.getDefaultListableBeanFactory());
            var request =
                    AgentToolExecutionRequest.builder()
                            .sessionUid("metadata-test")
                            .runId(1L)
                            .runUid("metadata-run")
                            .runSessionId(1L)
                            .actor(
                                    org.apache.hertzbeat.ai.gateway.identity.AgentActor.builder()
                                            .type("user")
                                            .id("metadata-user")
                                            .roles(List.of("admin"))
                                            .build())
                            .entryType(AgentRuntimeEntryType.USER_INPUT)
                            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                            .toolCallId("metadata-call")
                            .toolName(tool)
                            .arguments(args)
                            .build();
            return JsonUtil.fromJson(
                    registry.find(tool)
                            .orElseThrow()
                            .execute(
                                    new AgentToolExecutionContext(
                                            request, AgentToolCall.builder().build()))
                            .getModelContent(),
                    Map.class);
        }
    }

    private AgentReadObservationClassifier.Observation classify(
            String tool, Map<String, Object> args, Object output) {
        return new AgentReadObservationClassifier()
                .classify(
                        AgentRuntimeToolCall.builder()
                                .toolCallId("metadata")
                                .toolName(tool)
                                .arguments(args)
                                .build(),
                        JsonUtil.toJson(output));
    }

    private AgentTaskAssessment.Goal goal(
            String resource, AgentTaskAssessment.Operation operation, long id) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                operation,
                resource,
                1,
                operation == AgentTaskAssessment.Operation.CREATE ? List.of() : List.of(id),
                operation == AgentTaskAssessment.Operation.DELETE
                        ? Map.of()
                        : Map.of("name", "ai-notice"));
    }

    private AgentTaskEvidence evidence(
            String tool, Map<String, Object> args, Map<String, Object> output, boolean durable) {
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "native",
                tool,
                AgentToolRisk.CHANGE,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(output),
                durable,
                AgentToolPayloadHasher.normalizedArgumentsHash(args));
        return evidence;
    }

    @Test
    void sixRealSpringCallbacksCompleteOnlyExactNativeConfigurationAndAbsence() {
        var rule = new java.util.concurrent.atomic.AtomicReference<NoticeRule>();
        var template = new java.util.concurrent.atomic.AtomicReference<NoticeTemplate>();
        doAnswer(
                        i -> {
                            NoticeRule v = i.getArgument(0);
                            v.setId(7L);
                            rule.set(JsonUtil.fromJson(JsonUtil.toJson(v), NoticeRule.class));
                            return null;
                        })
                .when(notices)
                .addNoticeRule(org.mockito.ArgumentMatchers.any());
        doAnswer(
                        i -> {
                            NoticeTemplate v = i.getArgument(0);
                            v.setId(7L);
                            template.set(
                                    JsonUtil.fromJson(JsonUtil.toJson(v), NoticeTemplate.class));
                            return null;
                        })
                .when(notices)
                .addNoticeTemplate(org.mockito.ArgumentMatchers.any());
        when(notices.getNoticeRulesById(7L)).thenAnswer(i -> rule.get());
        when(notices.getNoticeTemplatesById(7L))
                .thenAnswer(i -> java.util.Optional.ofNullable(template.get()));
        doAnswer(
                        i -> {
                            rule.set(i.getArgument(0));
                            return null;
                        })
                .when(notices)
                .editNoticeRule(org.mockito.ArgumentMatchers.any());
        doAnswer(
                        i -> {
                            template.set(i.getArgument(0));
                            return null;
                        })
                .when(notices)
                .editNoticeTemplate(org.mockito.ArgumentMatchers.any());
        doAnswer(
                        i -> {
                            rule.set(null);
                            return null;
                        })
                .when(notices)
                .deleteNoticeRule(7L);
        doAnswer(
                        i -> {
                            template.set(null);
                            return null;
                        })
                .when(notices)
                .deleteNoticeTemplate(7L);
        for (String domain : List.of("rule", "template")) {
            var value = new HashMap<String, Object>(Map.of("name", "ai-notice"));
            if (domain.equals("rule"))
                value.putAll(
                        Map.of("receiverId", List.of(8L), "enable", false, "filterAll", false));
            else value.putAll(Map.of("type", "1", "preset", false, "content", "Test content"));
            for (var operation :
                    List.of(
                            AgentTaskAssessment.Operation.CREATE,
                            AgentTaskAssessment.Operation.UPDATE,
                            AgentTaskAssessment.Operation.DELETE)) {
                String tool =
                        "notice."
                                + domain
                                + "_"
                                + operation.name().toLowerCase(java.util.Locale.ROOT);
                if (operation == AgentTaskAssessment.Operation.UPDATE) value.put("id", 7L);
                Map<String, Object> args =
                        operation == AgentTaskAssessment.Operation.DELETE
                                ? Map.of("id", 7L)
                                : Map.of("value", new HashMap<>(value));
                var output = invoke(tool, args);
                var proof = evidence(tool, args, output, true);
                assertEquals(
                        1,
                        proof.verifiedCount(),
                        tool + " fixture output=" + output + " args=" + args);
                assertTrue(proof.completes(goal("notice_" + domain, operation, 7)), tool);
                assertFalse(
                        proof.completes(
                                goal(
                                        "notice_" + (domain.equals("rule") ? "template" : "rule"),
                                        operation,
                                        7)),
                        tool);
                if (operation != AgentTaskAssessment.Operation.CREATE)
                    assertFalse(proof.completes(goal("notice_" + domain, operation, 8)), tool);
                assertFalse(
                        evidence(tool, args, output, false)
                                .completes(goal("notice_" + domain, operation, 7)),
                        tool);
                assertTrue(proof.alreadyReceipted(tool, args), tool);
                assertTrue(proof.alreadyReceipted(tool, Map.of("differentArguments", true)), tool);
            }
        }
    }

    @Test
    void negativeDeleteAndUnknownWriteAcknowledgmentCannotBecomeReceipts() {
        var args = Map.<String, Object>of("id", 7);
        assertEquals(
                0,
                evidence("notice.rule_delete", args, Map.of("id", 7, "deleted", false), true)
                        .receiptCount());
        assertEquals(
                0,
                evidence("notice.rule_delete", args, Map.of("id", 8, "deleted", true), true)
                        .receiptCount());
        assertTrue(
                evidence(
                                "notice.rule_create",
                                Map.of("value", Map.of("name", "ai-notice")),
                                Map.of("success", true),
                                true)
                        .uncertain());
        var failure = new AgentTaskEvidence();
        failure.observe(
                "failure",
                "notice.rule_create",
                AgentToolRisk.CHANGE,
                AgentToolStatus.FAILED,
                args,
                "{}",
                true);
        assertTrue(failure.uncertain());
    }

    @Test
    void changedConfigurationExtraTargetsAndNoOriginalCreateNameAreRejected() {
        var args =
                Map.<String, Object>of(
                        "value", Map.of("id", 7, "name", "different", "enable", false));
        assertFalse(
                AgentNoticeMutationSemantics.permits(
                        goal("notice_rule", AgentTaskAssessment.Operation.UPDATE, 7),
                        "notice.rule_update",
                        args));
        var missingName =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.CREATE,
                        "notice_template",
                        1);
        assertFalse(
                AgentNoticeMutationSemantics.permits(
                        missingName,
                        "notice.template_create",
                        Map.of("value", Map.of("name", "invented"))));
        assertFalse(
                AgentNoticeMutationSemantics.permits(
                        goal("notice_rule", AgentTaskAssessment.Operation.DELETE, 7),
                        "notice.rule_delete",
                        Map.of("id", 7, "otherId", 8)));
    }

    @Test
    void declaredSundayByteInRuleConfigurationMatchesNativeNumericReadback() {
        var value =
                Map.<String, Object>of(
                        "name",
                        "ai-notice",
                        "receiverId",
                        List.of(8),
                        "enable",
                        false,
                        "filterAll",
                        false,
                        "days",
                        List.of("7"));
        var output = new HashMap<String, Object>(value);
        output.put("id", 7);
        output.put("days", List.of(7));
        var args = Map.<String, Object>of("value", value);
        assertEquals(1, evidence("notice.rule_create", args, output, true).verifiedCount());
    }

    @Test
    void templateByteSchemaIsExplicitAndForeignNativeGetterNeverVerifies() {
        var value =
                Map.<String, Object>of(
                        "name", "ai-notice", "type", "1", "preset", false, "content", "Test");
        var args = Map.<String, Object>of("value", value);
        var output =
                Map.<String, Object>of(
                        "id",
                        7,
                        "name",
                        "ai-notice",
                        "type",
                        1,
                        "preset",
                        false,
                        "content",
                        "Test");
        assertEquals(1, evidence("notice.template_create", args, output, true).verifiedCount());
        for (Object invalid : List.of("01", "1.5", true, "email", 128)) {
            var bad = new HashMap<>(value);
            bad.put("type", invalid);
            assertEquals(
                    0,
                    evidence("notice.template_create", Map.of("value", bad), output, true)
                            .verifiedCount());
        }
        when(notices.getNoticeRulesById(7L))
                .thenReturn(NoticeRule.builder().id(8L).name("foreign").build());
        assertThrows(RuntimeException.class, () -> invoke("notice.rule_get", Map.of("id", 7)));
        when(notices.getNoticeTemplatesById(7L))
                .thenReturn(
                        java.util.Optional.of(
                                NoticeTemplate.builder().id(8L).name("foreign").build()));
        assertThrows(RuntimeException.class, () -> invoke("notice.template_get", Map.of("id", 7)));
    }
}
