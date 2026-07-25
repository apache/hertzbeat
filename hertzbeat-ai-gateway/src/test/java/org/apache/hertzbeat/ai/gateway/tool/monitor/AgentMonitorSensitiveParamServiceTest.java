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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolCallLedgerService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.apache.hertzbeat.manager.service.AppService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link AgentMonitorSensitiveParamService}.
 */
@ExtendWith(MockitoExtension.class)
class AgentMonitorSensitiveParamServiceTest {

    @Mock
    private AppService appService;

    @Mock
    private AgentToolCallLedgerService ledgerService;

    @Mock
    private AgentSessionService sessionService;

    private AgentMonitorSensitiveParamService service;
    private AgentActor actor;

    @BeforeEach
    void setUp() {
        service = new AgentMonitorSensitiveParamService(appService, ledgerService, sessionService);
        actor = AgentActor.builder().type("user").id("admin").roles(List.of("admin")).build();
    }

    @Test
    void shouldKeepPasswordOutOfLedgerAndMergeItOnlyOnceAfterApproval() {
        when(appService.getAppParamDefines("mysql")).thenReturn(List.of(
                definition("host", "host", true), definition("password", "password", true)));
        AgentToolExecutionRequest original = request(Map.of(
                "app", "mysql", "params", Map.of("host", "db.internal", "password", "secret")));

        AgentToolExecutionRequest sanitized = service.removeSensitiveArguments(original);

        Map<?, ?> sanitizedParams = (Map<?, ?>) sanitized.getArguments().get("params");
        assertEquals("db.internal", sanitizedParams.get("host"));
        assertFalse(sanitizedParams.containsKey("password"));

        stubOwnedApproval();
        service.submit("approval-1", actor, Map.of("password", "submitted-secret"));
        AgentToolExecutionRequest merged = service.mergeAndTake(sanitized.toBuilder()
                .approvalId("approval-1")
                .build());

        assertEquals("submitted-secret", ((Map<?, ?>) merged.getArguments().get("params")).get("password"));
        AgentToolExecutionRequest secondMerge = service.mergeAndTake(sanitized.toBuilder()
                .approvalId("approval-1")
                .build());
        assertFalse(((Map<?, ?>) secondMerge.getArguments().get("params")).containsKey("password"));
    }

    @Test
    void shouldRejectMissingRequiredPassword() {
        when(appService.getAppParamDefines("mysql"))
                .thenReturn(List.of(definition("password", "password", true)));
        stubOwnedApproval();

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.submit("approval-1", actor, Map.of()));

        assertEquals("Required sensitive monitor parameter is missing: password", exception.getMessage());
    }

    private void stubOwnedApproval() {
        AgentToolCall approval = AgentToolCall.builder()
                .approvalId("approval-1")
                .sessionUid("session-1")
                .toolName("monitor.create")
                .inputJson("{\"app\":\"mysql\",\"params\":{\"host\":\"db.internal\"}}")
                .build();
        when(ledgerService.findApproval("approval-1")).thenReturn(Optional.of(approval));
        when(sessionService.findSession("session-1")).thenReturn(Optional.of(AgentSession.builder()
                .actorType("user")
                .actorId("admin")
                .build()));
    }

    private AgentToolExecutionRequest request(Map<String, Object> arguments) {
        return AgentToolExecutionRequest.builder()
                .sessionUid("session-1")
                .runId(1L)
                .runUid("run-1")
                .runSessionId(1L)
                .actor(actor)
                .entryType(AgentRuntimeEntryType.USER_INPUT)
                .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .toolName("monitor.create")
                .toolCallId("call-1")
                .arguments(arguments)
                .build();
    }

    private ParamDefineInfo definition(String field, String type, boolean required) {
        ParamDefineInfo definition = new ParamDefineInfo();
        definition.setField(field);
        definition.setName(Map.of("en-US", field));
        definition.setType(type);
        definition.setRequired(required);
        return definition;
    }
}
