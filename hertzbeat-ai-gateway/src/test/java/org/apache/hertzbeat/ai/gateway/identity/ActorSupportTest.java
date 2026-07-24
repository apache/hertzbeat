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

package org.apache.hertzbeat.ai.gateway.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.PrincipalMap;
import com.usthe.sureness.subject.SubjectSum;
import java.util.Arrays;
import java.util.List;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link ActorSupport}.
 */
class ActorSupportTest {

    @Test
    void hasIdentityShouldRequireTypeAndIdText() {
        assertTrue(ActorSupport.hasIdentity(AgentActor.builder().type(" user ").id(" alice ").build()));
        assertFalse(ActorSupport.hasIdentity(null));
        assertFalse(ActorSupport.hasIdentity(AgentActor.builder().type("user").id(" ").build()));
        assertFalse(ActorSupport.hasIdentity(AgentActor.builder().type(" ").id("alice").build()));
    }

    @Test
    void shouldSerializeRolesAsJson() {
        AgentActor actor = AgentActor.builder().roles(List.of("admin", "user")).build();

        assertEquals("[\"admin\",\"user\"]", ActorSupport.rolesJson(actor));
        assertNull(ActorSupport.rolesJson(null));
    }

    @Test
    void rolesJsonShouldRemainDeserializableWhenRoleTextIsLong() {
        AgentActor actor = AgentActor.builder()
            .roles(List.of("long-role-a-with-long-name", "long-role-b-with-long-name"))
            .build();

        String rolesJson = ActorSupport.rolesJson(actor);

        assertEquals("[\"long-role-a-with-long-name\",\"long-role-b-with-long-name\"]", rolesJson);
        assertTrue(JsonUtil.isJsonStr(rolesJson));
    }

    @Test
    void requireSurenessActorShouldUsePrincipalAndNormalizedRoles() {
        SubjectSum subject = mock(SubjectSum.class);
        when(subject.getPrincipal()).thenReturn(" alice ");
        when(subject.getRoles()).thenReturn(Arrays.asList(" user ", "admin", "user", null, " "));
        when(subject.hasRole("guest")).thenReturn(true);

        AgentActor actor = ActorSupport.requireSurenessActor(subject);

        assertEquals("user", actor.getType());
        assertEquals("alice", actor.getId());
        assertEquals(List.of("user", "admin", "guest"), actor.getRoles());
    }

    @Test
    void requireSurenessActorShouldUsePrincipalMapRolesAsFallback() {
        SubjectSum subject = mock(SubjectSum.class);
        PrincipalMap principalMap = mock(PrincipalMap.class);
        when(subject.getPrincipal()).thenReturn("alice");
        when(subject.getPrincipalMap()).thenReturn(principalMap);
        when(principalMap.getPrincipal("roles")).thenReturn(List.of("admin"));

        AgentActor actor = ActorSupport.requireSurenessActor(subject);

        assertEquals("alice", actor.getId());
        assertEquals(List.of("admin"), actor.getRoles());
    }

    @Test
    void requireSurenessActorShouldRejectMissingSubjectPrincipalOrRoles() {
        SubjectSum blankPrincipal = mock(SubjectSum.class);
        when(blankPrincipal.getPrincipal()).thenReturn(" ");
        SubjectSum missingRoles = mock(SubjectSum.class);
        when(missingRoles.getPrincipal()).thenReturn("alice");

        assertThrows(IllegalStateException.class, () -> ActorSupport.requireSurenessActor(null));
        assertThrows(IllegalStateException.class, () -> ActorSupport.requireSurenessActor(blankPrincipal));
        assertThrows(IllegalStateException.class, () -> ActorSupport.requireSurenessActor(missingRoles));
    }
}
