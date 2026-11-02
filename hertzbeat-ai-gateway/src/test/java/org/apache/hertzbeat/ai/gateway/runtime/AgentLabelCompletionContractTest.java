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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.validation.Validator;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentLabelToolService;
import org.apache.hertzbeat.base.dao.LabelDao;
import org.apache.hertzbeat.base.service.LabelService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.manager.Label;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

class AgentLabelCompletionContractTest {
    private final LabelService nativeService = mock(LabelService.class);
    private final LabelDao dao = mock(LabelDao.class);
    private final Validator validator = mock(Validator.class);

    private Map<String, Object> invoke(String name, Map<String, Object> args) {
        try (var spring = new GenericApplicationContext()) {
            spring.registerBean(
                    AgentLabelToolService.class,
                    () -> new AgentLabelToolService(nativeService, validator, dao));
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

    private AgentTaskAssessment.Goal goal(
            AgentTaskAssessment.Operation operation, long id, String name) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                operation,
                "label",
                1,
                id == 0 ? List.of() : List.of(id),
                name == null ? Map.of() : Map.of("name", name));
    }

    private AgentTaskEvidence evidence(
            String tool,
            Map<String, Object> args,
            Object output,
            boolean durable,
            AgentToolStatus status) {
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "label",
                tool,
                AgentToolRisk.CHANGE,
                status,
                args,
                JsonUtil.toJson(output),
                durable,
                AgentToolPayloadHasher.normalizedArgumentsHash(args));
        return evidence;
    }

    @Test
    void callbackCreateRequiresNativeReadbackAndCompletesOnlyOriginalName() {
        when(validator.validate(any())).thenReturn(Set.of());
        var stored =
                Label.builder().id(7L).name("ai-label").tagValue("test").type((byte) 1).build();
        doAnswer(
                        i -> {
                            ((Label) i.getArgument(0)).setId(7L);
                            return null;
                        })
                .when(nativeService)
                .addLabel(any());
        when(dao.findById(7L)).thenReturn(Optional.of(stored));
        var args = Map.<String, Object>of("name", "ai-label", "value", "test");
        var output = invoke("label.create", args);
        var evidence = evidence("label.create", args, output, true, AgentToolStatus.SUCCEEDED);
        assertEquals(1, evidence.verifiedCount());
        assertTrue(evidence.completes(goal(AgentTaskAssessment.Operation.CREATE, 0, "ai-label")));
        assertFalse(evidence.completes(goal(AgentTaskAssessment.Operation.CREATE, 0, "different")));
        assertTrue(evidence.alreadyReceipted("label.create", args));
        assertTrue(
                evidence.alreadyReceipted(
                        "label.create", Map.of("name", "ai-label", "value", "different")));
        assertFalse(
                evidence("label.create", args, output, false, AgentToolStatus.SUCCEEDED)
                        .completes(goal(AgentTaskAssessment.Operation.CREATE, 0, "ai-label")));
        verify(dao).findById(7L);
    }

    @Test
    void wrongReadbackNeverProducesReceiptAndFailedOrForgedOutputsRemainUncertain() {
        when(validator.validate(any())).thenReturn(Set.of());
        doAnswer(
                        i -> {
                            ((Label) i.getArgument(0)).setId(7L);
                            return null;
                        })
                .when(nativeService)
                .addLabel(any());
        when(dao.findById(7L))
                .thenReturn(
                        Optional.of(Label.builder().id(7L).name("other").type((byte) 1).build()));
        assertThrows(
                RuntimeException.class, () -> invoke("label.create", Map.of("name", "ai-label")));
        var args = Map.<String, Object>of("name", "ai-label");
        assertEquals(
                0,
                evidence(
                                "label.create",
                                args,
                                Map.of("success", true),
                                true,
                                AgentToolStatus.SUCCEEDED)
                        .receiptCount());
        assertTrue(
                evidence(
                                "label.create",
                                args,
                                Map.of("success", true),
                                true,
                                AgentToolStatus.FAILED)
                        .failed());
    }

    @Test
    void deleteRequiresAuthoritativeAbsenceAndExactOriginalIdentity() {
        var stored = Label.builder().id(7L).name("ai-label").type((byte) 1).build();
        when(dao.findById(7L)).thenReturn(Optional.of(stored));
        when(dao.existsById(7L)).thenReturn(false);
        var args = Map.<String, Object>of("labelId", 7L, "reason", "isolated test");
        var output = invoke("label.delete", args);
        var evidence = evidence("label.delete", args, output, true, AgentToolStatus.SUCCEEDED);
        assertTrue(evidence.completes(goal(AgentTaskAssessment.Operation.DELETE, 7, null)));
        assertFalse(evidence.completes(goal(AgentTaskAssessment.Operation.DELETE, 8, null)));
        when(dao.existsById(7L)).thenReturn(true);
        assertThrows(RuntimeException.class, () -> invoke("label.delete", args));
    }

    @Test
    void updateBindsEveryRequestedFieldAndRejectsPartialForeignOrChangedInputProof() {
        var args = Map.<String, Object>of("labelId", 7L, "name", "new", "value", "test");
        var output =
                new HashMap<String, Object>(
                        Map.of(
                                "receiptVersion",
                                "label-mutation.v1",
                                "toolName",
                                "label.update",
                                "labelId",
                                7L,
                                "verified",
                                true,
                                "deleted",
                                false,
                                "partial",
                                false,
                                "redactionApplied",
                                true,
                                "inputHash",
                                AgentToolPayloadHasher.normalizedArgumentsHash(args),
                                "data",
                                Map.of("id", 7L, "type", 1, "name", "new", "tagValue", "test")));
        assertTrue(
                evidence("label.update", args, output, true, AgentToolStatus.SUCCEEDED)
                        .completes(goal(AgentTaskAssessment.Operation.UPDATE, 7, "new")));
        assertFalse(
                AgentLabelMutationSemantics.permits(
                        goal(AgentTaskAssessment.Operation.UPDATE, 8, "new"),
                        "label.update",
                        args));
        output.put("partial", true);
        assertTrue(
                evidence("label.update", args, output, true, AgentToolStatus.SUCCEEDED)
                        .uncertain());
        output.put("partial", false);
        output.put("labelId", 8L);
        assertEquals(
                0,
                evidence("label.update", args, output, true, AgentToolStatus.SUCCEEDED)
                        .verifiedCount());
        assertFalse(
                AgentLabelMutationSemantics.permits(
                        goal(AgentTaskAssessment.Operation.CREATE, 0, null),
                        "label.create",
                        Map.of("name", "invented")));
    }

    @Test
    void optionalUpdateFieldsArePreservedByActualCallback() {
        when(validator.validate(any())).thenReturn(Set.of());
        var stored =
                Label.builder()
                        .id(7L)
                        .name("old")
                        .tagValue("keep-value")
                        .description("keep-description")
                        .type((byte) 0)
                        .build();
        when(dao.findById(7L)).thenReturn(Optional.of(stored));
        var args = Map.<String, Object>of("labelId", 7L, "name", "new");
        var result = invoke("label.update", args);
        assertEquals("keep-value", stored.getTagValue());
        assertEquals("keep-description", stored.getDescription());
        assertTrue(
                evidence("label.update", args, result, true, AgentToolStatus.SUCCEEDED)
                        .completes(goal(AgentTaskAssessment.Operation.UPDATE, 7, "new")));
    }
}
