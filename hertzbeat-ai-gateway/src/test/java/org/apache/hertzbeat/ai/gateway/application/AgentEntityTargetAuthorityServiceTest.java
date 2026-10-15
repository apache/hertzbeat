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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.service.entity.EntityWorkspaceQueryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Exact workspace-owned authority for one persisted Entity investigation target. */
@ExtendWith(MockitoExtension.class)
class AgentEntityTargetAuthorityServiceTest {

    @Mock
    private EntityWorkspaceQueryService entityWorkspaceQueryService;

    @Test
    void ownedEntityShouldProduceDeterministicCanonicalAuthority() {
        ObserveEntity entity = entity("healthy", "Checkout API", Map.of("team", "commerce", "region", "east"));
        when(entityWorkspaceQueryService.findEntityById("team-a", 42L)).thenReturn(Optional.of(entity));

        AgentTargetRef first = service().canonicalize("team-a", 42L);
        AgentTargetRef second = service().canonicalize("team-a", 42L);

        assertEquals("entity.v1", first.getVersion());
        assertEquals(42L, first.getEntityId());
        assertEquals(42L, first.getAuthority().getBindingId());
        assertEquals("entity-authority.v1", first.getAuthority().getVersion());
        assertTrue(first.getAuthority().getHash().matches("sha256:[0-9a-f]{64}"));
        assertEquals(first, second);
        assertNull(first.getMonitorId());
        assertNull(first.getAlertId());
        assertNull(first.getSignal());
        assertNull(first.getService());
        assertNull(first.getTopology());
    }

    @Test
    void missingForeignOrBlankWorkspaceMustFailCauseFreeBeforeLeakingEntityState() {
        when(entityWorkspaceQueryService.findEntityById("team-a", 42L)).thenReturn(Optional.empty());

        for (long entityId : List.of(42L, 404L)) {
            AgentEntityTargetAuthorityService.UnavailableException failure = assertThrowsExactly(
                    AgentEntityTargetAuthorityService.UnavailableException.class,
                    () -> service().canonicalize("team-a", entityId));
            assertNull(failure.getCause());
        }
        assertThrowsExactly(AgentEntityTargetAuthorityService.UnavailableException.class,
                () -> service().canonicalize(" ", 42L));
        assertThrowsExactly(AgentEntityTargetAuthorityService.UnavailableException.class,
                () -> service().canonicalize("team-a", 0L));

        verify(entityWorkspaceQueryService).findEntityById("team-a", 42L);
        verify(entityWorkspaceQueryService).findEntityById("team-a", 404L);
        verifyNoMoreInteractions(entityWorkspaceQueryService);
    }

    @Test
    void persistedEntityDriftMustInvalidateTheOriginalAuthority() {
        ObserveEntity before = entity("healthy", "Checkout API", Map.of("team", "commerce"));
        ObserveEntity after = entity("degraded", "Checkout API v2", Map.of("team", "platform"));
        when(entityWorkspaceQueryService.findEntityById("team-a", 42L))
                .thenReturn(Optional.of(before), Optional.of(after), Optional.of(after));

        AgentTargetRef original = service().canonicalize("team-a", 42L);
        AgentTargetRef changed = service().canonicalize("team-a", 42L);

        assertFalse(original.getAuthority().getHash().equals(changed.getAuthority().getHash()));
        assertFalse(service().verify("team-a", original));
        assertTrue(service().verify("team-a", changed));
    }

    private AgentEntityTargetAuthorityService service() {
        return new AgentEntityTargetAuthorityService(entityWorkspaceQueryService);
    }

    private ObserveEntity entity(String status, String displayName, Map<String, String> labels) {
        return ObserveEntity.builder()
                .id(42L)
                .workspaceId("team-a")
                .type("service")
                .name("checkout")
                .displayName(displayName)
                .subtype("web-service")
                .namespace("commerce")
                .environment("prod")
                .status(status)
                .criticality("high")
                .owner("sre")
                .lifecycle("production")
                .tier("tier1")
                .system("commerce")
                .source("manual")
                .description("Checkout service")
                .labels(labels)
                .tags(List.of("critical", "checkout"))
                .gmtUpdate(LocalDateTime.of(2026, 8, 15, 12, 0))
                .build();
    }
}
