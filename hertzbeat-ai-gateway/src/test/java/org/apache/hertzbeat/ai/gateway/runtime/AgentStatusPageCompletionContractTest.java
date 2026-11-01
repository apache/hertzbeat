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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.status.AgentStatusPageToolService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.manager.StatusPageComponent;
import org.apache.hertzbeat.common.entity.manager.StatusPageIncident;
import org.apache.hertzbeat.common.entity.manager.StatusPageOrg;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.StatusPageComponentDao;
import org.apache.hertzbeat.manager.dao.StatusPageIncidentComponentBindDao;
import org.apache.hertzbeat.manager.dao.StatusPageIncidentDao;
import org.apache.hertzbeat.manager.dao.StatusPageOrgDao;
import org.apache.hertzbeat.manager.service.impl.StatusPageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

class AgentStatusPageCompletionContractTest {
    private final StatusPageOrgDao organizations = mock(StatusPageOrgDao.class);
    private final StatusPageComponentDao components = mock(StatusPageComponentDao.class);
    private final StatusPageIncidentDao incidents = mock(StatusPageIncidentDao.class);
    private final StatusPageIncidentComponentBindDao bindings =
            mock(StatusPageIncidentComponentBindDao.class);
    private final Map<Long, StatusPageOrg> orgRows = new HashMap<>();
    private final Map<Long, StatusPageComponent> componentRows = new HashMap<>();
    private final Map<Long, StatusPageIncident> incidentRows = new HashMap<>();
    private final StatusPageServiceImpl nativeService = new StatusPageServiceImpl(bindings);
    private AgentStatusPageToolService tools;

    @BeforeEach
    void setup() {
        ReflectionTestUtils.setField(nativeService, "statusPageOrgDao", organizations);
        ReflectionTestUtils.setField(nativeService, "statusPageComponentDao", components);
        ReflectionTestUtils.setField(nativeService, "statusPageIncidentDao", incidents);
        var validator = mock(Validator.class);
        when(validator.validate(any())).thenReturn(Set.of());
        tools = new AgentStatusPageToolService(nativeService, validator);
        when(organizations.findAll()).thenAnswer(i -> List.copyOf(orgRows.values()));
        when(organizations.save(any()))
                .thenAnswer(
                        i -> {
                            StatusPageOrg v = i.getArgument(0);
                            if (v.getId() == null) v.setId(1L);
                            orgRows.put(v.getId(), v);
                            return v;
                        });
        when(components.findById(anyLong()))
                .thenAnswer(i -> Optional.ofNullable(componentRows.get(i.getArgument(0))));
        when(components.findAll()).thenAnswer(i -> List.copyOf(componentRows.values()));
        when(components.save(any()))
                .thenAnswer(
                        i -> {
                            StatusPageComponent v = i.getArgument(0);
                            if (v.getId() == null) v.setId(7L);
                            componentRows.put(v.getId(), v);
                            return v;
                        });
        when(incidents.findById(anyLong()))
                .thenAnswer(i -> Optional.ofNullable(incidentRows.get(i.getArgument(0))));
        when(incidents.save(any()))
                .thenAnswer(
                        i -> {
                            StatusPageIncident v = i.getArgument(0);
                            if (v.getId() == null) v.setId(9L);
                            incidentRows.put(v.getId(), v);
                            return v;
                        });
        when(bindings.countByComponentId(anyLong()))
                .thenAnswer(i -> incidentRows.isEmpty() ? 0L : 1L);
        doAnswer(
                        i -> {
                            componentRows.remove(i.getArgument(0));
                            return null;
                        })
                .when(components)
                .deleteById(anyLong());
        doAnswer(
                        i -> {
                            incidentRows.remove(i.getArgument(0));
                            return null;
                        })
                .when(incidents)
                .deleteById(anyLong());
    }

    private Map<String, Object> orgConfig() {
        return Map.of(
                "name",
                "AI status",
                "description",
                "test",
                "home",
                "https://example.org",
                "logo",
                "https://example.org/logo.svg",
                "state",
                "0");
    }

    private Map<String, Object> config() {
        return Map.of(
                "orgId",
                1,
                "name",
                "AI component",
                "description",
                "test",
                "labels",
                Map.of(),
                "method",
                "0",
                "configState",
                "0");
    }

    private void createOrg() {
        invoke("status_page.organization.save", Map.of("configuration", orgConfig()));
    }

    private Map<String, Object> data(Map<String, Object> value) {
        return (Map<String, Object>) value.get("data");
    }

    private void verifyReceipt(String tool, Map<String, Object> result, long id) {
        var row = data(result);
        assertEquals(id, ((Number) row.get("id")).longValue());
        var receipt = (Map<?, ?>) row.get("mutationReceipt");
        assertEquals(tool, receipt.get("toolName"));
        assertEquals(true, receipt.get("verified"));
        assertEquals(false, receipt.get("atomicVersionPrecondition"));
    }

    @Test
    void createUsesGeneratedIdAndIndependentNativeRead() {
        createOrg();
        var result = invoke("status_page.component.create", Map.of("configuration", config()));
        verifyReceipt("status_page.component.create", result, 7);
        verify(components).findById(7L);
        assertEquals(1, componentRows.size());
    }

    @Test
    void incidentRetainsHistoryAndDeletesOnlyExactReadbackTarget() {
        createOrg();
        invoke("status_page.component.create", Map.of("configuration", config()));
        var args =
                Map.<String, Object>of(
                        "configuration",
                        Map.of(
                                "orgId",
                                1,
                                "name",
                                "AI incident",
                                "state",
                                "0",
                                "componentIds",
                                List.of(7),
                                "message",
                                "Investigating"));
        verifyReceipt(
                "status_page.incident.create", invoke("status_page.incident.create", args), 9);
        String hash =
                (String)
                        invoke("status_page.incident.get", Map.of("incidentId", 9))
                                .get("sourceHash");
        var updated =
                invoke(
                        "status_page.incident.update",
                        Map.of(
                                "incidentId",
                                9,
                                "sourceHash",
                                hash,
                                "configuration",
                                Map.of(
                                        "orgId",
                                        1,
                                        "name",
                                        "AI incident",
                                        "state",
                                        "3",
                                        "componentIds",
                                        List.of(7),
                                        "message",
                                        "Resolved")));
        verifyReceipt("status_page.incident.update", updated, 9);
        assertEquals(2, nativeService.queryStatusPageIncident(9L).getContents().size());
        String componentHash =
                (String)
                        invoke("status_page.component.get", Map.of("componentId", 7))
                                .get("sourceHash");
        assertThrows(
                RuntimeException.class,
                () ->
                        invoke(
                                "status_page.component.delete",
                                Map.of(
                                        "componentId",
                                        7,
                                        "sourceHash",
                                        componentHash,
                                        "reason",
                                        "test")));
        hash =
                (String)
                        invoke("status_page.incident.get", Map.of("incidentId", 9))
                                .get("sourceHash");
        invoke(
                "status_page.incident.delete",
                Map.of("incidentId", 9, "sourceHash", hash, "reason", "test"));
        invoke(
                "status_page.component.delete",
                Map.of("componentId", 7, "sourceHash", componentHash, "reason", "test"));
        assertTrue(componentRows.isEmpty());
        assertTrue(incidentRows.isEmpty());
    }

    @Test
    void staleSnapshotRejectsBeforeNativeWrite() {
        createOrg();
        invoke("status_page.component.create", Map.of("configuration", config()));
        String hash =
                (String)
                        invoke("status_page.component.get", Map.of("componentId", 7))
                                .get("sourceHash");
        componentRows.get(7L).setDescription("Concurrent change");
        clearInvocations(components);
        assertThrows(
                RuntimeException.class,
                () ->
                        invoke(
                                "status_page.component.update",
                                Map.of(
                                        "componentId",
                                        7,
                                        "sourceHash",
                                        hash,
                                        "configuration",
                                        config())));
        verify(components, never()).save(any());
    }

    @Test
    void emptyOrWrongIdCannotProveWrite() {
        createOrg();
        when(components.findById(7L)).thenReturn(Optional.empty());
        assertThrows(
                RuntimeException.class,
                () -> invoke("status_page.component.create", Map.of("configuration", config())));
        assertEquals(1, componentRows.size());
        var foreign = new StatusPageComponent();
        foreign.setId(8L);
        when(components.findById(7L)).thenReturn(Optional.of(foreign));
        assertThrows(
                RuntimeException.class,
                () -> invoke("status_page.component.get", Map.of("componentId", 7)));
    }

    @Test
    void unknownPostReadFailureIsNotSuccessOrAutomaticRetry() {
        createOrg();
        when(components.findById(7L)).thenThrow(new IllegalStateException("read unavailable"));
        assertThrows(
                RuntimeException.class,
                () -> invoke("status_page.component.create", Map.of("configuration", config())));
        verify(components, times(1)).save(any());
    }

    @Test
    void organizationRequiresExactExistingIdAndSnapshot() {
        verifyReceipt(
                "status_page.organization.save",
                invoke("status_page.organization.save", Map.of("configuration", orgConfig())),
                1);
        clearInvocations(organizations);
        assertThrows(
                RuntimeException.class,
                () ->
                        invoke(
                                "status_page.organization.save",
                                Map.of("configuration", orgConfig())));
        verify(organizations, never()).save(any());
        var source = invoke("status_page.organization.get", Map.of());
        verifyReceipt(
                "status_page.organization.save",
                invoke(
                        "status_page.organization.save",
                        Map.of(
                                "configuration",
                                orgConfig(),
                                "expectedOrgId",
                                1,
                                "sourceHash",
                                source.get("sourceHash"))),
                1);
    }

    private AgentTaskAssessment.Goal goal(
            AgentTaskAssessment.Operation operation, List<Long> ids, Map<String, Object> changes) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                operation,
                "status_page_component",
                1,
                ids,
                changes);
    }

    @Test
    void typedReceiptBindsOriginalGoalAndRejectsUnprovenOrForeignOutcomes() {
        createOrg();
        String tool = "status_page.component.create";
        var args = Map.<String, Object>of("configuration", config());
        var result = invoke(tool, args);
        var goal =
                goal(
                        AgentTaskAssessment.Operation.CREATE,
                        List.of(),
                        Map.of("name", "AI component"));
        assertTrue(goal.valid());
        assertTrue(AgentStatusPageMutationSemantics.permits(goal, tool, args));
        String hash = AgentToolPayloadHasher.normalizedArgumentsHash(args);
        assertTrue(AgentStatusPageMutationSemantics.verified(tool, args, result, hash));
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "create",
                tool,
                AgentToolRisk.DANGEROUS,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(result),
                true,
                hash);
        assertTrue(evidence.completes(goal));
        assertFalse(
                evidence.completes(
                        goal(
                                AgentTaskAssessment.Operation.CREATE,
                                List.of(),
                                Map.of("name", "Other"))));
        assertFalse(
                AgentStatusPageMutationSemantics.verified(
                        tool, args, Map.of("success", true), hash));
        var partial = new HashMap<>(result);
        partial.put("partial", true);
        assertFalse(AgentStatusPageMutationSemantics.verified(tool, args, partial, hash));
        var foreign = JsonUtil.fromJson(JsonUtil.toJson(result), Map.class);
        data(foreign).put("id", 8);
        assertFalse(AgentStatusPageMutationSemantics.verified(tool, args, foreign, hash));
        assertFalse(AgentApplicationMutationAuthority.allowsFullMode(tool));
    }

    @Test
    void durableBaselineMustMatchIdHashAndPreserveUnrequestedFields() {
        createOrg();
        invoke("status_page.component.create", Map.of("configuration", config()));
        var source = invoke("status_page.component.get", Map.of("componentId", 7));
        var config = new HashMap<>(config());
        config.put("name", "Renamed");
        String tool = "status_page.component.update";
        var args =
                Map.<String, Object>of(
                        "componentId",
                        7,
                        "configuration",
                        config,
                        "sourceHash",
                        source.get("sourceHash"));
        var goal =
                goal(AgentTaskAssessment.Operation.UPDATE, List.of(7L), Map.of("name", "Renamed"));
        assertTrue(AgentStatusPageMutationSemantics.permits(goal, tool, args));
        assertTrue(AgentStatusPageMutationSemantics.preserves(goal, tool, args, source));
        var evidence = new AgentTaskEvidence();
        assertFalse(evidence.statusPageBaseline(goal, tool, args));
        evidence.observe(
                "source",
                "status_page.component.get",
                AgentToolRisk.READ,
                AgentToolStatus.SUCCEEDED,
                Map.of("componentId", 7),
                JsonUtil.toJson(source),
                true,
                AgentToolPayloadHasher.normalizedArgumentsHash(Map.of("componentId", 7)));
        assertTrue(evidence.statusPageBaseline(goal, tool, args));
        config.put("description", "Unexpected wipe");
        assertFalse(AgentStatusPageMutationSemantics.preserves(goal, tool, args, source));
        var partial = new HashMap<>(source);
        partial.put("partial", true);
        assertFalse(AgentStatusPageMutationSemantics.preserves(goal, tool, args, partial));
        var foreign = new HashMap<>(args);
        foreign.put("componentId", 8);
        assertFalse(AgentStatusPageMutationSemantics.permits(goal, tool, foreign));
    }

    private void typed(String tool, Map<String, Object> args, Map<String, Object> result) {
        String hash = AgentToolPayloadHasher.normalizedArgumentsHash(args);
        assertTrue(AgentStatusPageMutationSemantics.verified(tool, args, result, hash), tool);
        assertFalse(
                AgentStatusPageMutationSemantics.verified(tool, args, result, "0".repeat(64)),
                tool);
    }

    @Test
    void allSevenNativeOperationsReturnBoundPostReadReceipts() {
        var orgArgs = Map.<String, Object>of("configuration", orgConfig());
        typed(
                "status_page.organization.save",
                orgArgs,
                invoke("status_page.organization.save", orgArgs));
        var create = Map.<String, Object>of("configuration", config());
        typed(
                "status_page.component.create",
                create,
                invoke("status_page.component.create", create));
        var source = invoke("status_page.component.get", Map.of("componentId", 7));
        var update =
                Map.<String, Object>of(
                        "componentId",
                        7,
                        "configuration",
                        config(),
                        "sourceHash",
                        source.get("sourceHash"));
        typed(
                "status_page.component.update",
                update,
                invoke("status_page.component.update", update));
        var incident =
                Map.<String, Object>of(
                        "configuration",
                        Map.of(
                                "orgId",
                                1,
                                "name",
                                "Incident",
                                "state",
                                "0",
                                "componentIds",
                                List.of(7),
                                "message",
                                "Investigating"));
        typed(
                "status_page.incident.create",
                incident,
                invoke("status_page.incident.create", incident));
        source = invoke("status_page.incident.get", Map.of("incidentId", 9));
        var incidentUpdate =
                Map.<String, Object>of(
                        "incidentId",
                        9,
                        "sourceHash",
                        source.get("sourceHash"),
                        "configuration",
                        Map.of(
                                "orgId",
                                1,
                                "name",
                                "Incident",
                                "state",
                                "3",
                                "componentIds",
                                List.of(7),
                                "message",
                                "Resolved"));
        typed(
                "status_page.incident.update",
                incidentUpdate,
                invoke("status_page.incident.update", incidentUpdate));
        source = invoke("status_page.incident.get", Map.of("incidentId", 9));
        var delete =
                Map.<String, Object>of(
                        "incidentId",
                        9,
                        "sourceHash",
                        source.get("sourceHash"),
                        "reason",
                        "isolated test");
        typed("status_page.incident.delete", delete, invoke("status_page.incident.delete", delete));
        source = invoke("status_page.component.get", Map.of("componentId", 7));
        delete =
                Map.of(
                        "componentId",
                        7,
                        "sourceHash",
                        source.get("sourceHash"),
                        "reason",
                        "isolated test");
        typed(
                "status_page.component.delete",
                delete,
                invoke("status_page.component.delete", delete));
    }

    private Map<String, Object> invoke(String name, Map<String, Object> args) {
        try (var spring = new GenericApplicationContext()) {
            spring.registerBean(AgentStatusPageToolService.class, () -> tools);
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
}
