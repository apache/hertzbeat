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

package org.apache.hertzbeat.ai.gateway.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrowsExactly;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTopologyRef;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Exact workspace-owned authority for one focused Topology investigation scope. */
@ExtendWith(MockitoExtension.class)
class AgentTopologyTargetAuthorityServiceTest {

    @Mock
    private AgentEntityTargetAuthorityService entityAuthorityService;

    @Test
    void focusedTopologyShouldPreserveTheExactNormalizedScopeAndEntityAuthority() {
        when(entityAuthorityService.canonicalize("team-a", 42L)).thenReturn(entityTarget("a".repeat(64)));
        when(entityAuthorityService.isCanonicalTarget(any())).thenReturn(true);

        AgentTargetRef canonical = service().canonicalize("team-a", sourceTopology());

        assertEquals("topology.v1", canonical.getVersion());
        assertEquals(42L, canonical.getEntityId());
        assertEquals(42L, canonical.getAuthority().getBindingId());
        assertEquals("topology-authority.v1", canonical.getAuthority().getVersion());
        assertTrue(canonical.getAuthority().getHash().matches("sha256:[0-9a-f]{64}"));
        assertEquals(sourceTopology(), canonical.getTopology());
        assertNull(canonical.getMonitorId());
        assertNull(canonical.getAlertId());
        assertNull(canonical.getSignal());
        assertNull(canonical.getService());
    }

    @Test
    void topologyAuthorityShouldChangeWhenTheEntityOrExactScopeChanges() {
        when(entityAuthorityService.canonicalize("team-a", 42L))
                .thenReturn(entityTarget("a".repeat(64)), entityTarget("b".repeat(64)), entityTarget("b".repeat(64)));
        when(entityAuthorityService.isCanonicalTarget(any())).thenReturn(true);

        AgentTargetRef original = service().canonicalize("team-a", sourceTopology());
        AgentTargetRef entityChanged = service().canonicalize("team-a", sourceTopology());
        AgentTargetRef scopeChanged = service().canonicalize("team-a", sourceTopology().toBuilder()
                .relationType("depends-on").build());

        assertFalse(original.getAuthority().getHash().equals(entityChanged.getAuthority().getHash()));
        assertFalse(entityChanged.getAuthority().getHash().equals(scopeChanged.getAuthority().getHash()));
        assertFalse(service().verify("team-a", original));
    }

    @Test
    void invalidOrUnownedTopologyMustFailCauseFreeBeforeClaimingAuthority() {
        List<AgentTopologyRef> invalid = List.of(
                sourceTopology().toBuilder().rootEntityId(0L).build(),
                sourceTopology().toBuilder().depth(3).build(),
                sourceTopology().toBuilder().nodeId("node").edgeId("edge").build(),
                sourceTopology().toBuilder().start(null).build(),
                sourceTopology().toBuilder().end(1_000L).build(),
                sourceTopology().toBuilder().end(1_000L + 8L * 24 * 60 * 60 * 1_000).build(),
                sourceTopology().toBuilder().sourceKind("unknown-source").build(),
                sourceTopology().toBuilder().pageSize(101).build());

        for (AgentTopologyRef topology : invalid) {
            AgentTopologyTargetAuthorityService.UnavailableException failure = assertThrowsExactly(
                    AgentTopologyTargetAuthorityService.UnavailableException.class,
                    () -> service().canonicalize("team-a", topology));
            assertNull(failure.getCause());
        }
        verifyNoInteractions(entityAuthorityService);

        when(entityAuthorityService.canonicalize("team-a", 42L))
                .thenThrow(new AgentEntityTargetAuthorityService.UnavailableException());
        AgentTopologyTargetAuthorityService.UnavailableException failure = assertThrowsExactly(
                AgentTopologyTargetAuthorityService.UnavailableException.class,
                () -> service().canonicalize("team-a", sourceTopology()));
        assertNull(failure.getCause());
    }

    private AgentTopologyTargetAuthorityService service() {
        return new AgentTopologyTargetAuthorityService(entityAuthorityService);
    }

    private AgentTopologyRef sourceTopology() {
        return AgentTopologyRef.builder()
                .rootEntityId(42L)
                .nodeId("entity:42")
                .depth(2)
                .environment("prod")
                .sourceKind("otlp-trace-call")
                .start(1_000L)
                .end(2_000L)
                .relationType("trace-call")
                .hideInternal(true)
                .pageIndex(0)
                .pageSize(50)
                .build();
    }

    private AgentTargetRef entityTarget(String hash) {
        return AgentTargetRef.builder()
                .version(AgentEntityTargetAuthorityService.TARGET_VERSION)
                .entityId(42L)
                .authority(AgentTargetAuthority.builder()
                        .bindingId(42L)
                        .version(AgentEntityTargetAuthorityService.AUTHORITY_VERSION)
                        .hash("sha256:" + hash)
                        .build())
                .build();
    }
}
