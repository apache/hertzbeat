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
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import jakarta.validation.Validator;

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertGroupToolService;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertInhibitToolService;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertSilenceToolService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.notice.AgentNoticeToolService;
import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.alert.dto.AlertInhibitPageResponse;
import org.apache.hertzbeat.alert.dto.AlertInhibitResponse;
import org.apache.hertzbeat.alert.dto.AlertSilencePageResponse;
import org.apache.hertzbeat.alert.dto.AlertSilenceResponse;
import org.apache.hertzbeat.alert.service.AlertGroupConvergeService;
import org.apache.hertzbeat.alert.service.AlertInhibitService;
import org.apache.hertzbeat.alert.service.AlertSilenceService;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.alert.service.NoticeReceiverContractService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.alerter.AlertGroupConverge;
import org.apache.hertzbeat.common.entity.alerter.NoticeRule;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Real Spring callbacks with isolated native services; never sends a notification. */
class AgentNotificationMetadataReadTest {
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

    private Map<String, Object> row(String family) {
        var row = new HashMap<String, Object>(Map.of("id", 7L, "name", "ai-contract-test"));
        switch (family) {
            case "alert_group" ->
                    row.putAll(
                            Map.of(
                                    "groupLabels",
                                    List.of("app"),
                                    "enable",
                                    false,
                                    "groupWait",
                                    0,
                                    "groupInterval",
                                    60,
                                    "repeatInterval",
                                    60));
            case "alert_inhibit" ->
                    row.putAll(
                            Map.of(
                                    "enable",
                                    false,
                                    "sourceLabels",
                                    Map.of(),
                                    "targetLabels",
                                    Map.of(),
                                    "equalLabels",
                                    List.of("app")));
            case "alert_silence" -> {
                row.remove("id");
                row.putAll(
                        Map.of(
                                "silenceId",
                                7L,
                                "enabled",
                                false,
                                "matchAll",
                                false,
                                "type",
                                "once",
                                "labels",
                                Map.of("app", "test"),
                                "days",
                                List.of()));
            }
            case "notice.rule" ->
                    row.putAll(
                            Map.of("enable", false, "filterAll", false, "receiverId", List.of(8L)));
            case "notice.template" ->
                    row.putAll(Map.of("type", 1, "preset", false, "content", "Test"));
            default -> throw new IllegalArgumentException();
        }
        return row;
    }

    private void setup() {
        var group =
                JsonUtil.fromJson(JsonUtil.toJson(row("alert_group")), AlertGroupConverge.class);
        when(groups.getAlertGroupConverge(7L)).thenReturn(group);
        when(groups.getAlertGroupConverges(
                        isNull(), isNull(), anyString(), anyString(), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(group), PageRequest.of(0, 1), 3));
        var inhibit =
                JsonUtil.fromJson(
                        JsonUtil.toJson(row("alert_inhibit")), AlertInhibitResponse.class);
        when(inhibits.get(7L)).thenReturn(inhibit);
        when(inhibits.list(isNull(), isNull(), anyString(), anyString(), anyInt(), anyInt()))
                .thenReturn(new AlertInhibitPageResponse(List.of(inhibit), 3, 3, 0, 1));
        var silence =
                new AlertSilenceResponse(
                        7L,
                        "ai-contract-test",
                        false,
                        false,
                        (byte) 0,
                        null,
                        Map.of("app", "test"),
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null);
        when(silences.get(7L)).thenReturn(silence);
        when(silences.list(isNull(), isNull(), anyString(), anyString(), anyInt(), anyInt()))
                .thenReturn(new AlertSilencePageResponse(List.of(silence), 3, 3, 0, 1));
        var rule = JsonUtil.fromJson(JsonUtil.toJson(row("notice.rule")), NoticeRule.class);
        when(notices.getNoticeRulesById(7L)).thenReturn(rule);
        when(notices.getNoticeRules(isNull(), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(rule), PageRequest.of(0, 1), 3));
        var template =
                JsonUtil.fromJson(JsonUtil.toJson(row("notice.template")), NoticeTemplate.class);
        when(notices.getNoticeTemplatesById(7L)).thenReturn(java.util.Optional.of(template));
        when(notices.getNoticeTemplates(
                        isNull(), org.mockito.ArgumentMatchers.eq(false), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(template), PageRequest.of(0, 1), 3));
    }

    @Test
    void tenNativeCallbacksProduceExactMetadataWithoutMutationProof() {
        setup();
        for (String family :
                List.of(
                        "alert_group",
                        "alert_inhibit",
                        "alert_silence",
                        "notice.rule",
                        "notice.template")) {
            boolean notice = family.startsWith("notice.");
            String get = family + (notice ? "_get" : ".get");
            String list = family + (notice ? "_list" : ".list");
            String id =
                    notice
                            ? "id"
                            : family.equals("alert_group")
                                    ? "groupId"
                                    : family.equals("alert_inhibit") ? "inhibitId" : "silenceId";
            var args = Map.<String, Object>of(id, 7L);
            var output = invoke(get, args);
            assertNotNull(classify(get, args, output), get);
            assertNull(classify(get, Map.of(id, 8L), output), get);
            var pageArgs =
                    new HashMap<String, Object>(
                            Map.of(
                                    notice ? "page" : "pageIndex",
                                    0,
                                    notice ? "size" : "pageSize",
                                    1));
            if (family.equals("notice.template")) pageArgs.put("preset", false);
            var page = invoke(list, pageArgs);
            assertEquals(1, classify(list, pageArgs, page).count(), list);
            var evidence = new AgentTaskEvidence();
            evidence.observe(
                    "read",
                    list,
                    AgentToolRisk.READ,
                    AgentToolStatus.SUCCEEDED,
                    pageArgs,
                    JsonUtil.toJson(page),
                    true);
            assertEquals(0, evidence.receiptCount());
            assertFalse(evidence.mutationAttempted());
            pageArgs.put(notice ? "size" : "pageSize", 2);
            assertNull(classify(list, pageArgs, page), list);
        }
    }

    @Test
    void partialFailureAndWrongDomainCannotProduceObservations() {
        setup();
        var output = invoke("alert_group.get", Map.of("groupId", 7));
        output.put("partial", true);
        assertNull(classify("alert_group.get", Map.of("groupId", 7), output));
        assertNull(classify("notice.rule_get", Map.of("id", 7), Map.of("success", true)));
        assertNull(classify("notice.rule_get", Map.of("id", 7), row("notice.template")));
        assertNull(classify("notice.template_get", Map.of("id", 7), Map.of("error", "failed")));
        assertThrows(RuntimeException.class, () -> invoke("notice.rule_get", Map.of("id", 999)));
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "failed",
                "notice.rule_get",
                AgentToolRisk.READ,
                AgentToolStatus.FAILED,
                Map.of("id", 7),
                JsonUtil.toJson(row("notice.rule")),
                true);
        assertFalse(evidence.hasObservation());
    }

    @Test
    void emptyPageIsNegativeEvidenceAndIncompleteDuplicateFractionalPagesAreRejected() {
        var args = Map.<String, Object>of("page", 0, "size", 2, "preset", false);
        var page =
                new HashMap<String, Object>(
                        Map.of(
                                "content",
                                List.of(),
                                "number",
                                0,
                                "size",
                                2,
                                "totalElements",
                                0,
                                "totalPages",
                                0));
        assertEquals(0, classify("notice.template_list", args, page).count());
        page.put("totalElements", 3);
        page.put("totalPages", 2);
        assertNull(classify("notice.template_list", args, page));
        page.put("content", List.of(row("notice.template"), row("notice.template")));
        assertNull(classify("notice.template_list", args, page));
        var fractional = row("notice.template");
        fractional.put("id", 7.5);
        assertNull(classify("notice.template_get", Map.of("id", 7), fractional));
        assertNull(classify("notice.template_create", Map.of(), row("notice.template")));
    }
}
