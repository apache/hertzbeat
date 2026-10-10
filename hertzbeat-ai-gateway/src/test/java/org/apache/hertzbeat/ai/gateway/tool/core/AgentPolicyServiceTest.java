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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.junit.jupiter.api.Test;

/**
 * Agent policy service tests.
 */
class AgentPolicyServiceTest {

    private final AgentPolicyService service = new AgentPolicyService();

    @Test
    void readRiskShouldAllowReadCapableActor() {
        AgentPolicyResult result = service.decide(actor(ActorSupport.ROLE_USER), descriptor(AgentToolRisk.READ));

        assertEquals(AgentPolicyDecision.ALLOW, result.getDecision());
        assertEquals(AgentToolRisk.READ, result.getRisk());
        assertFalse(result.requiresApproval());
    }

    @Test
    void readRiskShouldAllowOtherRole() {
        AgentPolicyResult result = service.decide(actor(ActorSupport.ROLE_GUEST), descriptor(AgentToolRisk.READ));

        assertEquals(AgentPolicyDecision.ALLOW, result.getDecision());
        assertEquals(AgentToolRisk.READ, result.getRisk());
        assertFalse(result.requiresApproval());
    }

    @Test
    void changeRiskShouldRequireApprovalForChangeCapableActor() {
        AgentPolicyResult result = service.decide(actor(ActorSupport.ROLE_USER), descriptor(AgentToolRisk.CHANGE));

        assertEquals(AgentPolicyDecision.REQUIRE_APPROVAL, result.getDecision());
        assertEquals(AgentToolRisk.CHANGE, result.getRisk());
        assertTrue(result.requiresApproval());
    }

    @Test
    void adminShouldAllowChangeAndRequireApprovalForDangerous() {
        AgentPolicyResult change = service.decide(actor(ActorSupport.ROLE_ADMIN),
            descriptor(AgentToolRisk.CHANGE));
        AgentPolicyResult dangerous = service.decide(actor(ActorSupport.ROLE_ADMIN),
            descriptor(AgentToolRisk.DANGEROUS));

        assertEquals(AgentPolicyDecision.ALLOW, change.getDecision());
        assertFalse(change.requiresApproval());
        assertEquals(AgentPolicyDecision.REQUIRE_APPROVAL, dangerous.getDecision());
        assertTrue(dangerous.requiresApproval());
    }

    @Test
    void changeRiskShouldDenyGuestActor() {
        AgentPolicyResult result = service.decide(actor(ActorSupport.ROLE_GUEST), descriptor(AgentToolRisk.CHANGE));

        assertEquals(AgentPolicyDecision.DENY, result.getDecision());
        assertEquals(AgentToolRisk.CHANGE, result.getRisk());
        assertFalse(result.requiresApproval());
    }

    @Test
    void dangerousRiskShouldDenyUser() {
        AgentPolicyResult result = service.decide(actor(ActorSupport.ROLE_USER), descriptor(AgentToolRisk.DANGEROUS));

        assertEquals(AgentPolicyDecision.DENY, result.getDecision());
        assertEquals(AgentToolRisk.DANGEROUS, result.getRisk());
        assertFalse(result.requiresApproval());
    }

    @Test
    void missingToolShouldDefaultDenyAsDangerous() {
        AgentPolicyResult result = service.decide(actor(ActorSupport.ROLE_ADMIN), null);

        assertEquals(AgentPolicyDecision.DENY, result.getDecision());
        assertEquals(AgentToolRisk.DANGEROUS, result.getRisk());
    }

    @Test
    void missingRiskShouldFailAtDescriptorBoundary() {
        NullPointerException exception = assertThrows(NullPointerException.class, () -> AgentToolDescriptor.builder()
            .name("tool_missing_risk")
            .description("test")
            .inputSchema("{\"type\":\"object\"}")
            .namespace("tool")
            .exposure(AgentToolExposure.MODEL_VISIBLE)
            .build());

        assertTrue(exception.getMessage().contains("risk is required"));
    }

    @Test
    void missingActorShouldDenyWithDescriptorRisk() {
        AgentPolicyResult result = service.decide((AgentActor) null, descriptor(AgentToolRisk.READ));

        assertEquals(AgentPolicyDecision.DENY, result.getDecision());
        assertEquals(AgentToolRisk.READ, result.getRisk());
    }

    @Test
    void missingActorRolesShouldDenyWithDescriptorRisk() {
        AgentPolicyResult result = service.decide(AgentActor.builder()
            .type(ActorSupport.TYPE_USER)
            .id("actor-1")
            .build(), descriptor(AgentToolRisk.CHANGE));

        assertEquals(AgentPolicyDecision.DENY, result.getDecision());
        assertEquals(AgentToolRisk.CHANGE, result.getRisk());
    }

    @Test
    void emptyActorRolesShouldDenyRead() {
        AgentPolicyResult result = service.decide(AgentActor.builder()
            .type(ActorSupport.TYPE_USER)
            .id("actor-1")
            .roles(List.of())
            .build(), descriptor(AgentToolRisk.READ));

        assertEquals(AgentPolicyDecision.DENY, result.getDecision());
    }

    @Test
    void alertAnalysisActorShouldAllowOnlyReadTools() {
        AgentActor actor = AgentActor.alertAnalysisActor();

        assertEquals(ActorSupport.TYPE_SYSTEM, actor.getType());
        assertEquals(List.of(ActorSupport.ROLE_ALERT_ANALYSIS), actor.getRoles());
        assertEquals(AgentPolicyDecision.ALLOW,
            service.decide(actor, descriptor(AgentToolRisk.READ)).getDecision());
        assertEquals(AgentPolicyDecision.DENY,
            service.decide(actor, descriptor(AgentToolRisk.CHANGE)).getDecision());
        assertEquals(AgentPolicyDecision.DENY,
            service.decide(actor, descriptor(AgentToolRisk.DANGEROUS)).getDecision());
    }

    private AgentActor actor(String role) {
        return AgentActor.builder()
            .type(ActorSupport.TYPE_USER)
            .id("actor-1")
            .roles(List.of(role))
            .build();
    }

    private AgentToolDescriptor descriptor(AgentToolRisk risk) {
        return AgentToolDescriptor.builder()
            .name("tool_" + risk.name().toLowerCase())
            .description("test")
            .inputSchema("{\"type\":\"object\"}")
            .risk(risk)
            .namespace("tool")
            .exposure(AgentToolExposure.MODEL_VISIBLE)
            .build();
    }
}
