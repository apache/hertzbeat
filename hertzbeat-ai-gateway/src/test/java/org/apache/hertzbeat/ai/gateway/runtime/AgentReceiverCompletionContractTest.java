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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.notice.AgentNoticeToolService;
import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.alert.service.NoticeReceiverContractMapper;
import org.apache.hertzbeat.alert.service.NoticeReceiverContractService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;

import java.util.List;
import java.util.Map;
import java.util.Set;

class AgentReceiverCompletionContractTest {
    private final NoticeConfigService nativeService = mock(NoticeConfigService.class);
    private final Validator validator = mock(Validator.class);
    private final NoticeReceiverContractService contract =
            new NoticeReceiverContractService(nativeService, new NoticeReceiverContractMapper());
    private final Map<Long, NoticeReceiver> rows = new java.util.concurrent.ConcurrentHashMap<>();

    private Map<String, Object> invoke(String name, Map<String, Object> args) {
        try (var spring = new GenericApplicationContext()) {
            spring.registerBean(
                    AgentNoticeToolService.class,
                    () ->
                            new AgentNoticeToolService(
                                    nativeService, contract, validator, new AlerterProperties()));
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
        when(nativeService.getReceiverById(org.mockito.ArgumentMatchers.anyLong()))
                .thenAnswer(i -> rows.get(i.getArgument(0)));
        doAnswer(
                        i -> {
                            NoticeReceiver value = i.getArgument(0);
                            value.setId(7L);
                            rows.put(
                                    7L,
                                    JsonUtil.fromJson(
                                            JsonUtil.toJson(value), NoticeReceiver.class));
                            return null;
                        })
                .when(nativeService)
                .addReceiver(any());
        doAnswer(
                        i -> {
                            NoticeReceiver value = i.getArgument(0);
                            rows.put(
                                    value.getId(),
                                    JsonUtil.fromJson(
                                            JsonUtil.toJson(value), NoticeReceiver.class));
                            return null;
                        })
                .when(nativeService)
                .editReceiver(any());
        doAnswer(
                        i -> {
                            rows.remove(i.getArgument(0));
                            return null;
                        })
                .when(nativeService)
                .deleteReceiver(org.mockito.ArgumentMatchers.anyLong());
    }

    private AgentTaskAssessment.Goal goal(
            AgentTaskAssessment.Operation operation, Map<String, Object> changes) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                operation,
                "notice_receiver",
                1,
                operation == AgentTaskAssessment.Operation.CREATE ? List.of() : List.of(7L),
                changes);
    }

    private AgentTaskEvidence evidence(
            String tool, Map<String, Object> args, Map<String, Object> output) {
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "receiver",
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
    void actualNativeMapperCreateUpdateAndDeleteVerifyWithoutSending() {
        setup();
        var args =
                Map.<String, Object>of(
                        "name", "ai-receiver", "type", "1", "destination", "fixture@example.test");
        var created = invoke("notice.receiver_create", args);
        assertTrue(
                evidence("notice.receiver_create", args, created)
                        .completes(
                                goal(
                                        AgentTaskAssessment.Operation.CREATE,
                                        Map.of(
                                                "name",
                                                "ai-receiver",
                                                "type",
                                                1,
                                                "destination",
                                                "fixture@example.test"))));
        var update =
                Map.<String, Object>of(
                        "id",
                        7L,
                        "name",
                        "ai-renamed",
                        "fields",
                        Map.of("email", "changed@example.test"));
        assertTrue(
                evidence(
                                "notice.receiver_update_metadata",
                                update,
                                invoke("notice.receiver_update_metadata", update))
                        .completes(
                                goal(
                                        AgentTaskAssessment.Operation.UPDATE,
                                        Map.of(
                                                "name",
                                                "ai-renamed",
                                                "email",
                                                "changed@example.test"))));
        var deletion = Map.<String, Object>of("id", 7L);
        assertTrue(
                evidence(
                                "notice.receiver_delete",
                                deletion,
                                invoke("notice.receiver_delete", deletion))
                        .completes(goal(AgentTaskAssessment.Operation.DELETE, Map.of())));
        var missing = invoke("notice.receiver_delete", deletion);
        assertEquals(0, evidence("notice.receiver_delete", deletion, missing).verifiedCount());
        org.mockito.Mockito.verify(nativeService, org.mockito.Mockito.never()).sendTestMsg(any());
    }

    @Test
    void metadataUpdateRetainsCredentialMarkersAndNeverExposesOrAcceptsSecrets() {
        setup();
        var existing = new NoticeReceiver();
        existing.setId(7L);
        existing.setName("ai-bot");
        existing.setType((byte) 7);
        existing.setTgUserId("old");
        existing.setTgBotToken("fixture-bot-secret");
        rows.put(7L, existing);
        var update = Map.<String, Object>of("id", 7L, "fields", Map.of("tgUserId", "new"));
        var result = invoke("notice.receiver_update_metadata", update);
        assertTrue(
                evidence("notice.receiver_update_metadata", update, result)
                        .completes(
                                goal(
                                        AgentTaskAssessment.Operation.UPDATE,
                                        Map.of("tgUserId", "new"))));
        assertEquals("fixture-bot-secret", rows.get(7L).getTgBotToken());
        assertFalse(JsonUtil.toJson(result).contains("fixture-bot-secret"));
        assertThrows(
                RuntimeException.class,
                () ->
                        invoke(
                                "notice.receiver_update_metadata",
                                Map.of(
                                        "id",
                                        7L,
                                        "fields",
                                        Map.of("tgBotToken", "never-accepted"))));
        assertFalse(
                AgentReceiverMutationSemantics.permits(
                        goal(
                                AgentTaskAssessment.Operation.UPDATE,
                                Map.of("tgBotToken", "never-accepted")),
                        "notice.receiver_update_metadata",
                        Map.of("id", 7L, "fields", Map.of("tgBotToken", "never-accepted"))));
    }

    @Test
    void wrongTargetFailedReadbackAndMissingDestinationNeverProduceSuccess() {
        setup();
        var args =
                Map.<String, Object>of(
                        "name", "ai-receiver", "type", "1", "destination", "fixture@example.test");
        var output = invoke("notice.receiver_create", args);
        output.put("id", 8L);
        assertEquals(0, evidence("notice.receiver_create", args, output).receiptCount());
        assertEquals(
                0,
                evidence(
                                "notice.receiver_delete",
                                Map.of("id", 7),
                                Map.of("id", 7, "status", "missing"))
                        .receiptCount());
        assertFalse(
                AgentReceiverMutationSemantics.permits(
                        goal(AgentTaskAssessment.Operation.CREATE, Map.of("name", "ai-receiver")),
                        "notice.receiver_create",
                        args));
        when(nativeService.getReceiverById(7L)).thenReturn(null);
        assertThrows(RuntimeException.class, () -> invoke("notice.receiver_create", args));
    }
}
