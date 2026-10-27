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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.manager.monitor.collection.InlineCollectionPlanService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

class AgentInlineCollectionToolServiceTest {
    @Test
    void operationIsAdminDangerousAndCannotInheritFullChangeMode() throws Exception {
        var p =
                AgentInlineCollectionToolService.class
                        .getMethod("detect", Long.class, String.class, String.class)
                        .getAnnotation(AgentToolPolicy.class);
        assertEquals(AgentToolRisk.DANGEROUS, p.risk());
        assertEquals(AgentToolAccess.ADMIN, p.access());
    }

    @Test
    void
            directInvocationWithoutOriginalApprovalOrWithChangedMethodArgumentsNeverReachesNativeExecution() {
        var nativePlans = mock(InlineCollectionPlanService.class);
        var service = new AgentInlineCollectionToolService(nativePlans, null, null);
        Map<String, Object> args =
                Map.of("monitorId", 7L, "planId", "plan-a", "planHash", "a".repeat(64));
        var request =
                AgentToolExecutionRequest.builder()
                        .sessionUid("session")
                        .runId(1L)
                        .runUid("run")
                        .runSessionId(2L)
                        .actor(
                                AgentActor.builder()
                                        .type("user")
                                        .id("owner")
                                        .roles(List.of("admin"))
                                        .build())
                        .entryType(AgentRuntimeEntryType.USER_INPUT)
                        .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                        .toolName(AgentInlineCollectionToolService.EXECUTE)
                        .toolCallId("call")
                        .approvalId("approval")
                        .arguments(args)
                        .approvalStatus("APPROVED")
                        .build();
        var row =
                AgentToolCall.builder()
                        .toolName(AgentInlineCollectionToolService.EXECUTE)
                        .sessionUid("session")
                        .runId(1L)
                        .runUid("run")
                        .sessionId(2L)
                        .toolCallId("call")
                        .approvalId("approval")
                        .status("RUNNING")
                        .approvalStatus("PENDING")
                        .inputHash(AgentToolPayloadHasher.normalizedArgumentsHash(args))
                        .build();
        assertThrows(
                IllegalStateException.class,
                () ->
                        AgentToolContextSupport.withInvocation(
                                new AgentToolExecutionContext(request, row),
                                () -> service.detect(7L, "plan-a", "a".repeat(64))));
        row.setApprovalStatus("APPROVED");
        assertThrows(
                IllegalStateException.class,
                () ->
                        AgentToolContextSupport.withInvocation(
                                new AgentToolExecutionContext(request, row),
                                () -> service.detect(7L, "plan-b", "b".repeat(64))));
        verifyNoInteractions(nativePlans);
    }
}
