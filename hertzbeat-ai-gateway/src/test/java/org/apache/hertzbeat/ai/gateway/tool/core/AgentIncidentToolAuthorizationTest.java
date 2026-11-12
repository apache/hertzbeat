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

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.application.AgentIncidentTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentIncidentScope;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.junit.jupiter.api.Test;

class AgentIncidentToolAuthorizationTest {

    @Test
    void onlyVerifiedIncidentFactsAndDiscoveryAreAllowedAndRechecked() {
        AgentIncidentTargetAuthorityService verifier = mock(AgentIncidentTargetAuthorityService.class);
        AgentTargetToolAuthorizer authorizer = new AgentTargetToolAuthorizer(null, null, null, null, null, null, verifier);
        AgentToolExecutionRequest request = request("alert.get", Map.of("alertId", 7L, "alertType", "single"));
        when(verifier.verify("workspace-a", request.getEffectiveTarget())).thenReturn(true);
        assertTrue(authorizer.denialReason(request, descriptor("alert.get", AgentToolRisk.READ)).isEmpty());
        assertTrue(authorizer.denialReason(request.toBuilder().arguments(Map.of("alertId", 8L, "alertType", "single"))
                .build(), descriptor("alert.get", AgentToolRisk.READ)).isPresent());
        assertTrue(authorizer.denialReason(request.toBuilder().entryType(AgentRuntimeEntryType.USER_INPUT).build(),
                descriptor("alert.get", AgentToolRisk.READ)).isPresent());
        assertTrue(authorizer.denialReason(request, descriptor("alert.get", AgentToolRisk.CHANGE)).isPresent());
        assertTrue(authorizer.denialReason(request("logs.analysis", Map.of()),
                descriptor("logs.analysis", AgentToolRisk.READ)).isPresent());
        assertTrue(authorizer.denialReason(request("tool.search", Map.of("query", "alert")),
                descriptor("tool.search", AgentToolRisk.READ)).isEmpty());
        when(verifier.verify("workspace-a", request.getEffectiveTarget())).thenReturn(false);
        assertTrue(authorizer.postExecutionDenialReason(request, descriptor("alert.get", AgentToolRisk.READ)).isPresent());
        assertTrue(new AgentTargetToolAuthorizer().denialReason(request,
                descriptor("alert.get", AgentToolRisk.READ)).isPresent());
    }

    private AgentToolExecutionRequest request(String name, Map<String, Object> arguments) {
        AgentTargetRef target = AgentTargetRef.builder().version("incident.v1").alertId(7L).alertType("single")
                .incident(new AgentIncidentScope(1L, List.of(7L), 1000, 2000))
                .authority(AgentTargetAuthority.builder().bindingId(1L).version("incident-authority.v1")
                        .hash("sha256:" + "a".repeat(64)).build()).build();
        return AgentToolExecutionRequest.builder().sessionUid("s").runId(1L).runUid("r").runSessionId(1L)
                .workspaceId("workspace-a").actor(AgentActor.alertAnalysisActor())
                .entryType(AgentRuntimeEntryType.ALERT_TRIGGER).approvalHandling(AgentApprovalHandling.DENY)
                .effectiveTarget(target).toolName(name).toolCallId("call").arguments(arguments).build();
    }

    private AgentToolDescriptor descriptor(String name, AgentToolRisk risk) {
        return AgentToolDescriptor.builder().name(name).namespace("alert").description("Incident facts")
                .inputSchema("{}").risk(risk).exposure(AgentToolExposure.MODEL_ON_DEMAND).build();
    }
}
