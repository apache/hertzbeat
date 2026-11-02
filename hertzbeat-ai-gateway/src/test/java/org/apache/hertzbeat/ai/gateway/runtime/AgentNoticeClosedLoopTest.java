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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.notice.AgentNoticeToolService;
import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.alert.service.NoticeReceiverContractService;
import org.apache.hertzbeat.base.dao.LabelDao;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.alerter.NoticeRule;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Real runtime and Spring callbacks with a fake human decision and isolated native service; no live
 * model/Grafana.
 */
class AgentNoticeClosedLoopTest {
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-10-21T00:00:00Z"), ZoneOffset.UTC);
    private final NoticeConfigService nativeService = mock(NoticeConfigService.class);
    private final LabelDao dao = mock(LabelDao.class);
    private final jakarta.validation.Validator validator = mock(jakarta.validation.Validator.class);

    private AgentTaskAssessment.Goal goal(String name) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                AgentTaskAssessment.Operation.CREATE,
                "notice_rule",
                1,
                List.of(),
                Map.of("name", name));
    }

    private AgentRuntimeModelResponse tool(String name, Map<String, Object> args, String id) {
        return AgentRuntimeModelResponse.toolCalls(
                "",
                List.of(
                        AgentRuntimeToolCall.builder()
                                .toolName(name)
                                .arguments(args)
                                .toolCallId(id)
                                .build()),
                null);
    }

    private void arrangeNative() {
        when(validator.validate(any())).thenReturn(java.util.Set.of());
        org.mockito.Mockito.doAnswer(
                        i -> {
                            ((NoticeRule) i.getArgument(0)).setId(7L);
                            return null;
                        })
                .when(nativeService)
                .addNoticeRule(any());
        when(nativeService.getNoticeRulesById(7L))
                .thenReturn(
                        NoticeRule.builder()
                                .id(7L)
                                .name("ai-label")
                                .receiverId(List.of(8L))
                                .enable(false)
                                .filterAll(false)
                                .build());
    }

    @Test
    void approvedNativeReadbackCompletesWithoutModelSuccessProse() {
        arrangeNative();
        var result = terminal(execute(true, false, goal("ai-label"), false));
        assertEquals(AgentRuntimeEventType.RUN_COMPLETED, result.getType());
        assertTrue(result.getResult().contains("7"));
        verify(nativeService).addNoticeRule(any());
    }

    @Test
    void deniedAndForeignOriginalNameNeverWrite() {
        arrangeNative();
        assertEquals(
                AgentRuntimeEventType.ERROR,
                terminal(execute(false, false, goal("ai-label"), false)).getType());
        assertEquals(
                AgentRuntimeEventType.ERROR,
                terminal(execute(true, false, goal("other"), false)).getType());
        verify(nativeService, never()).addNoticeRule(any());
    }

    private List<AgentRuntimeEvent> execute(
            boolean approved,
            boolean dropCheckpoint,
            AgentTaskAssessment.Goal goal,
            boolean preview) {
        try (var spring = new GenericApplicationContext()) {
            spring.registerBean(
                    AgentNoticeToolService.class,
                    () ->
                            new AgentNoticeToolService(
                                    nativeService,
                                    mock(NoticeReceiverContractService.class),
                                    validator,
                                    new AlerterProperties()));
            spring.refresh();
            var registry =
                    new AgentToolConfiguration()
                            .agentToolRegistry(spring.getDefaultListableBeanFactory());
            var bridge = mock(AgentToolBridge.class);
            when(bridge.visibleTools()).thenReturn(registry.descriptors());
            when(bridge.discoverableTools(any(), any())).thenReturn(List.of());
            when(bridge.execute(any(), any(), any(), any(), any()))
                    .thenAnswer(
                            invocation -> {
                                AgentRuntimeContext context = invocation.getArgument(0);
                                AgentRuntimeToolCall call = invocation.getArgument(2);
                                var handler = registry.find(call.getToolName()).orElseThrow();
                                var descriptor = handler.descriptor();
                                var policy =
                                        new AgentPolicyService()
                                                .decide(context.getActor(), descriptor);
                                boolean dangerous = descriptor.getRisk() != AgentToolRisk.READ;
                                if (dangerous && !approved)
                                    return AgentToolExecutionResult.builder()
                                            .toolCallId(call.getToolCallId())
                                            .toolName(call.getToolName())
                                            .status(AgentToolStatus.DENIED)
                                            .risk(descriptor.getRisk())
                                            .decision(AgentPolicyDecision.DENY)
                                            .approvalStatus(AgentApprovalStatus.REJECTED)
                                            .build();
                                if (dangerous)
                                    assertEquals(
                                            descriptor.getRisk() == AgentToolRisk.DANGEROUS
                                                    ? AgentPolicyDecision.REQUIRE_APPROVAL
                                                    : AgentPolicyDecision.ALLOW,
                                            policy.getDecision());
                                var request =
                                        AgentToolExecutionRequest.builder()
                                                .sessionUid(context.getSessionUid())
                                                .runId(context.getRunId())
                                                .runUid(context.getRunUid())
                                                .runSessionId(context.getRunSessionId())
                                                .workspaceId(context.getWorkspaceId())
                                                .actor(context.getActor())
                                                .entryType(context.getEntryType())
                                                .approvalHandling(
                                                        AgentApprovalHandling.WAIT_FOR_DECISION)
                                                .approvalStatus(
                                                        dangerous ? "APPROVED" : "NOT_REQUIRED")
                                                .toolName(call.getToolName())
                                                .toolCallId(call.getToolCallId())
                                                .arguments(call.getArguments())
                                                .build();
                                var ledger =
                                        AgentToolCall.builder()
                                                .inputHash(
                                                        AgentToolPayloadHasher
                                                                .normalizedArgumentsHash(
                                                                        call.getArguments()))
                                                .approvalStatus(
                                                        dangerous ? "APPROVED" : "NOT_REQUIRED")
                                                .build();
                                AuthTokenRequestContext.bindWorkspaceId(context.getWorkspaceId());
                                try {
                                    var result =
                                            handler.execute(
                                                    new AgentToolExecutionContext(request, ledger));
                                    return AgentToolExecutionResult.builder()
                                            .toolCallId(call.getToolCallId())
                                            .toolName(call.getToolName())
                                            .status(result.getStatus())
                                            .risk(descriptor.getRisk())
                                            .decision(AgentPolicyDecision.ALLOW)
                                            .approvalStatus(
                                                    dangerous
                                                            ? AgentApprovalStatus.APPROVED
                                                            : AgentApprovalStatus.NOT_REQUIRED)
                                            .output(result.getModelContent())
                                            .errorMessage(result.getErrorMessage())
                                            .build();
                                } finally {
                                    AuthTokenRequestContext.clear();
                                }
                            });
            var replies = new ArrayDeque<AgentRuntimeModelResponse>();
            replies.add(
                    tool(
                            "notice.rule_create",
                            Map.of(
                                    "value",
                                    Map.of(
                                            "name",
                                            "ai-label",
                                            "receiverId",
                                            List.of(8L),
                                            "enable",
                                            false,
                                            "filterAll",
                                            false)),
                            "save"));
            AgentRuntimeModelClient client =
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
                                    .contains("ORIGINAL_TASK_COMPLETION_REVIEW"))
                                return AgentRuntimeModelResponse.finalAnswer(
                                        JsonUtil.toJson(
                                                new AgentTaskAssessment(
                                                        goal,
                                                        AgentTaskOutcome.Stage.COMPLETE,
                                                        true,
                                                        List.of())),
                                        null);
                            return replies.isEmpty()
                                    ? AgentRuntimeModelResponse.finalAnswer(
                                            "No verified write is available.", null)
                                    : replies.remove();
                        }
                    };
            var context =
                    AgentRuntimeContext.builder()
                            .entryType(AgentRuntimeEntryType.USER_INPUT)
                            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                            .channelId("web-ui")
                            .workspaceId("grafana-test")
                            .receivedAt(CLOCK.millis())
                            .preferredLanguage("en")
                            .actor(
                                    AgentActor.builder()
                                            .type("user")
                                            .id("grafana-test-user")
                                            .roles(List.of("admin"))
                                            .build())
                            .userMessage("Create one label named ai-label.")
                            .sessionUid("grafana-session")
                            .runId(2L)
                            .runUid("grafana-run")
                            .runSessionId(1L)
                            .currentTimeIso(CLOCK.instant().toString())
                            .timezone("UTC")
                            .traceId("grafana-trace")
                            .chatHistory(List.of())
                            .build();
            List<AgentRuntimeEvent> events = new ArrayList<>();
            List<TranscriptMessage> transcript = new ArrayList<>();
            try (var control = AgentRuntimeControl.forContext(context, CLOCK)) {
                new AgentRuntimeLoop(new AgentRuntimeProperties(), client, bridge, CLOCK)
                        .run(
                                context,
                                control,
                                events::add,
                                message -> {
                                    transcript.add(message);
                                    return dropCheckpoint && message.getTaskCheckpoint() != null
                                            ? null
                                            : (long) transcript.size();
                                });
            }
            return events;
        }
    }

    private AgentRuntimeEvent terminal(List<AgentRuntimeEvent> events) {
        return events.stream()
                .filter(
                        e ->
                                e.getType() == AgentRuntimeEventType.RUN_COMPLETED
                                        || e.getType() == AgentRuntimeEventType.ERROR)
                .reduce((a, b) -> b)
                .orElseThrow();
    }
}
