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

import java.util.List;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.springframework.stereotype.Service;

/**
 * Tool policy matrix: admins allow READ/CHANGE and approve DANGEROUS; users allow READ, approve CHANGE, and deny
 * DANGEROUS; all other non-empty roles allow READ and deny CHANGE/DANGEROUS.
 */
@Service
public class AgentPolicyService {

    public AgentPolicyResult decide(AgentActor actor, AgentToolDescriptor descriptor) {
        if (descriptor == null) {
            return deny(AgentToolRisk.DANGEROUS, "Tool is not registered in Agent Gateway catalog");
        }
        AgentToolRisk risk = descriptor.getRisk();
        if (actor == null) {
            return deny(risk, "Actor is required for tool policy");
        }
        List<String> roles = actor.getRoles();
        if (roles == null) {
            return deny(risk, "Actor roles are required for tool policy");
        }
        if (roles.isEmpty()) {
            return deny(risk, "Actor roles are required for tool policy");
        }
        if (roles.contains(ActorSupport.ROLE_ADMIN)) {
            return decideAdmin(risk);
        }
        if (roles.contains(ActorSupport.ROLE_USER)) {
            return decideUser(risk);
        }
        return decideOtherRole(risk);
    }

    private AgentPolicyResult allow(AgentToolRisk risk, String reason) {
        return AgentPolicyResult.builder()
            .decision(AgentPolicyDecision.ALLOW)
            .risk(risk)
            .reason(reason)
            .build();
    }

    private AgentPolicyResult deny(AgentToolRisk risk, String reason) {
        return AgentPolicyResult.builder()
            .decision(AgentPolicyDecision.DENY)
            .risk(risk)
            .reason(reason)
            .build();
    }

    private AgentPolicyResult requireApproval(AgentToolRisk risk, String reason) {
        return AgentPolicyResult.builder()
            .decision(AgentPolicyDecision.REQUIRE_APPROVAL)
            .risk(risk)
            .reason(reason)
            .build();
    }

    private AgentPolicyResult decideAdmin(AgentToolRisk risk) {
        return switch (risk) {
            case READ -> allow(risk, "Admins may execute read tools");
            case CHANGE -> allow(risk, "Admins may execute change tools");
            case DANGEROUS -> requireApproval(risk, "Dangerous tools require explicit admin approval");
        };
    }

    private AgentPolicyResult decideUser(AgentToolRisk risk) {
        return switch (risk) {
            case READ -> allow(risk, "Users may execute read tools");
            case CHANGE -> requireApproval(risk, "Change tools require explicit admin approval");
            case DANGEROUS -> deny(risk, "Dangerous tools are denied for users");
        };
    }

    private AgentPolicyResult decideOtherRole(AgentToolRisk risk) {
        return switch (risk) {
            case READ -> allow(risk, "Authenticated roles may execute read tools");
            case CHANGE -> deny(risk, "Change tools are denied for this role");
            case DANGEROUS -> deny(risk, "Dangerous tools are denied for this role");
        };
    }

}
