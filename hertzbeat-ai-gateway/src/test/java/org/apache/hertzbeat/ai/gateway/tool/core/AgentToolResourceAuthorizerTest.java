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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.junit.jupiter.api.Test;

class AgentToolResourceAuthorizerTest {

    @Test
    void adminOnlyReadsRejectUsersGuestsAndBackgroundActors() {
        for (AgentActor actor : List.of(actor("user", "user"), actor("user", "guest"),
                actor("system", "admin"), AgentActor.scheduleActor(), AgentActor.alertAnalysisActor())) {
            assertTrue(AgentToolResourceAuthorizer.denialReason(actor, descriptor(AgentToolAccess.ADMIN)).isPresent());
        }
        assertTrue(AgentToolResourceAuthorizer.denialReason(null, descriptor(AgentToolAccess.ADMIN)).isPresent());
        assertFalse(AgentToolResourceAuthorizer.denialReason(actor("user", "admin"),
                descriptor(AgentToolAccess.ADMIN)).isPresent());
    }

    @Test
    void sharedWritersRequireUserRoleAndIdentity() {
        AgentToolDescriptor descriptor = descriptor(AgentToolAccess.USER);
        assertFalse(AgentToolResourceAuthorizer.denialReason(actor("user", "user"), descriptor).isPresent());
        assertFalse(AgentToolResourceAuthorizer.denialReason(actor("user", "admin"), descriptor).isPresent());
        assertTrue(AgentToolResourceAuthorizer.denialReason(actor("user", "guest"), descriptor).isPresent());
        assertTrue(AgentToolResourceAuthorizer.denialReason(actor("system", "user"), descriptor).isPresent());
        AgentActor missingIdentity = actor("user", "admin");
        missingIdentity.setId(null);
        assertTrue(AgentToolResourceAuthorizer.denialReason(missingIdentity, descriptor).isPresent());
    }

    @Test
    void resourceAccessCannotBeOverriddenByReadRiskPolicy() {
        assertTrue(new AgentPolicyService().decide(actor("user", "user"), descriptor(AgentToolAccess.ADMIN)).denied());
        assertFalse(new AgentPolicyService().decide(actor("user", "admin"), descriptor(AgentToolAccess.ADMIN)).denied());
    }

    private AgentActor actor(String type, String role) {
        return AgentActor.builder().type(type).id("operator").roles(List.of(role)).build();
    }

    private AgentToolDescriptor descriptor(AgentToolAccess access) {
        return AgentToolDescriptor.builder().name("admin.read").description("Read protected resource")
                .inputSchema("{}").namespace("admin").risk(AgentToolRisk.READ)
                .exposure(AgentToolExposure.MODEL_ON_DEMAND).access(access).build();
    }
}
