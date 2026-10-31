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

package org.apache.hertzbeat.ai.gateway.tool.core;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Map;
import org.apache.hertzbeat.ai.gateway.application.AgentEntityInvestigationAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.junit.jupiter.api.Test;

class AgentEntityInvestigationToolAuthorizationTest {
    @Test
    void verifiesManualReadScopeBeforeAndAfterEveryToolIncludingDiscovery() {
        AgentEntityInvestigationAuthorityService verifier = mock(AgentEntityInvestigationAuthorityService.class);
        AgentTargetToolAuthorizer authorizer = new AgentTargetToolAuthorizer(null, null, null, null, null, null, null, verifier);
        AgentTargetRef target = AgentTargetRef.builder().version("entity-investigation.v1").entityId(7L).build();
        AgentToolExecutionRequest request = AgentToolExecutionRequest.builder().sessionUid("s").runId(1L).runUid("r").runSessionId(1L)
                .toolName("tool.search").toolCallId("call").workspaceId("workspace-a")
                .actor(org.apache.hertzbeat.ai.gateway.identity.AgentActor.builder().type("user").id("owner")
                        .roles(java.util.List.of("user")).build())
                .approvalHandling(org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling.WAIT_FOR_DECISION)
                .entryType(AgentRuntimeEntryType.USER_INPUT).effectiveTarget(target).arguments(Map.of()).build();
        AgentToolDescriptor descriptor = AgentToolDescriptor.builder().name("tool.search").namespace("tool")
                .description("discover").inputSchema("{}").risk(AgentToolRisk.READ)
                .exposure(AgentToolExposure.MODEL_VISIBLE).build();
        when(verifier.verify("workspace-a", target)).thenReturn(true);
        when(verifier.permits("workspace-a", target, "tool.search", Map.of())).thenReturn(true);
        assertTrue(authorizer.denialReason(request, descriptor).isEmpty());
        assertTrue(authorizer.denialReason(request.toBuilder().entryType(AgentRuntimeEntryType.ALERT_TRIGGER).build(), descriptor).isPresent());
        when(verifier.permits("workspace-a", target, "tool.search", Map.of())).thenReturn(false);
        assertTrue(authorizer.postExecutionDenialReason(request, descriptor).isPresent());
        assertTrue(new AgentTargetToolAuthorizer().denialReason(request, descriptor).isPresent());
    }
}
