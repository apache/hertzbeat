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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.usthe.sureness.provider.SurenessAccount;
import com.usthe.sureness.provider.SurenessAccountProvider;
import java.util.List;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.junit.jupiter.api.Test;

class AgentApprovalActorVerifierTest {
    @Test
    void verifiesCurrentRolesWithoutPromotingTheOriginalActor() {
        SurenessAccountProvider provider = mock(SurenessAccountProvider.class);
        SurenessAccount account = mock(SurenessAccount.class);
        when(provider.loadAccount("owner")).thenReturn(account);
        when(account.getOwnRoles()).thenReturn(List.of("user", "admin"));
        AgentActor actor = actor("user", List.of("user"));
        AgentApprovalActorVerifier verifier = new AgentApprovalActorVerifier(provider);
        assertTrue(verifier.isCurrent(actor));
        org.junit.jupiter.api.Assertions.assertEquals(List.of("user"), actor.getRoles());
        when(account.getOwnRoles()).thenReturn(List.of("guest"));
        assertFalse(verifier.isCurrent(actor));
        when(account.getOwnRoles()).thenReturn(List.of("user"));
        when(account.isDisabledAccount()).thenReturn(true);
        assertFalse(verifier.isCurrent(actor));
        when(account.isDisabledAccount()).thenReturn(false);
        when(account.isExcessiveAttempts()).thenReturn(true);
        assertFalse(verifier.isCurrent(actor));
    }

    @Test
    void missingGuestSystemAndProviderFailureAreClosed() {
        SurenessAccountProvider provider = mock(SurenessAccountProvider.class);
        AgentApprovalActorVerifier verifier = new AgentApprovalActorVerifier(provider);
        assertFalse(verifier.isCurrent(null));
        assertFalse(verifier.isCurrent(actor("user", List.of())));
        assertFalse(verifier.isCurrent(actor("user", List.of("guest"))));
        assertFalse(verifier.isCurrent(actor("system", List.of("admin"))));
        assertFalse(verifier.isCurrent(actor("user", List.of("user"))));
        when(provider.loadAccount("owner")).thenThrow(new IllegalStateException("provider unavailable"));
        assertFalse(verifier.isCurrent(actor("user", List.of("user"))));
    }

    private AgentActor actor(String type, List<String> roles) {
        return AgentActor.builder().type(type).id("owner").roles(roles).build();
    }
}
