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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the entity identity-resolution component extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityIdentityResolutionServiceTest {

    @InjectMocks
    private EntityIdentityResolutionService identityResolutionService;

    @Mock
    private EntityIdentityReadModelService entityIdentityReadModelService;

    @Mock
    private EntityMonitorBindService entityMonitorBindService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Test
    void resolveMonitorBindingCandidatesFiltersWorkspaceAndScoresCanonicalIdentities() {
        Monitor monitor = Monitor.builder()
                .id(501L)
                .app("springboot3")
                .name("checkout-api")
                .labels(Map.of(
                        "service.name", "checkout-api",
                        "service.namespace", "payments"
                ))
                .build();
        EntityIdentity serviceName = EntityIdentity.builder()
                .entityId(201L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .normalizedValue("checkout-api")
                .priority(90)
                .primaryIdentity(true)
                .build();
        EntityIdentity namespace = EntityIdentity.builder()
                .entityId(201L)
                .identityKey("service.namespace")
                .identityValue("payments")
                .normalizedValue("payments")
                .priority(30)
                .primaryIdentity(false)
                .build();
        EntityIdentity shadow = EntityIdentity.builder()
                .entityId(202L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .normalizedValue("checkout-api")
                .priority(90)
                .primaryIdentity(true)
                .build();
        when(entityIdentityReadModelService.findMatchingIdentities(anySet(), anySet()))
                .thenReturn(List.of(serviceName, namespace, shadow));
        when(entityMonitorBindService.findMonitorBindsByMonitorId(501L)).thenReturn(List.of(EntityMonitorBind.builder()
                .entityId(201L)
                .monitorId(501L)
                .bindType("manual")
                .bindSource("manual")
                .status("active")
                .score(100)
                .build()));
        ObserveEntity teamAlphaEntity = ObserveEntity.builder()
                .id(201L)
                .type("service")
                .name("checkout-api")
                .displayName("Checkout API")
                .workspaceId("team-a")
                .build();
        ObserveEntity teamBetaEntity = ObserveEntity.builder()
                .id(202L)
                .type("service")
                .name("checkout-api")
                .displayName("Checkout API Shadow")
                .workspaceId("team-b")
                .build();
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIds(anyCollection(), eq("team-a")))
                .thenReturn(List.of(teamAlphaEntity));

        List<EntityMonitorBindingCandidate> candidates =
                identityResolutionService.resolveMonitorBindingCandidates(monitor, "team-a");

        assertEquals(1, candidates.size());
        EntityMonitorBindingCandidate candidate = candidates.getFirst();
        assertEquals(201L, candidate.getEntityId());
        assertEquals("Checkout API", candidate.getEntityName());
        assertEquals("direct", candidate.getRecommendation());
        assertEquals(160, candidate.getScore());
        assertTrue(candidate.isAlreadyBound());
        assertEquals(Set.of("service.name", "service.namespace"), candidate.getMatchedIdentities().keySet());
    }

    @Test
    void resolveMonitorBindingCandidatesUsesWorkspaceAccessBoundaryForHintCalls() {
        Monitor monitor = Monitor.builder()
                .id(502L)
                .app("springboot3")
                .name("checkout-api")
                .labels(Map.of("service.name", "checkout-api"))
                .build();
        EntityIdentity teamAlphaIdentity = EntityIdentity.builder()
                .entityId(301L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .normalizedValue("checkout-api")
                .priority(90)
                .primaryIdentity(true)
                .build();
        EntityIdentity teamBetaIdentity = EntityIdentity.builder()
                .entityId(302L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .normalizedValue("checkout-api")
                .priority(90)
                .primaryIdentity(true)
                .build();
        when(entityIdentityReadModelService.findMatchingIdentities(anySet(), anySet()))
                .thenReturn(List.of(teamAlphaIdentity, teamBetaIdentity));
        when(entityMonitorBindService.findMonitorBindsByMonitorId(502L)).thenReturn(List.of());
        ObserveEntity teamAlphaEntity = ObserveEntity.builder()
                .id(301L)
                .type("service")
                .name("checkout-api")
                .displayName("Checkout API")
                .workspaceId("team-a")
                .build();
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(anyCollection()))
                .thenReturn(List.of(teamAlphaEntity));

        List<EntityMonitorBindingCandidate> candidates =
                identityResolutionService.resolveMonitorBindingCandidates(monitor);

        assertEquals(1, candidates.size());
        assertEquals(301L, candidates.getFirst().getEntityId());
        verify(entityWorkspaceAccessService).findAccessibleEntitiesByIdsForRequestWorkspace(Set.of(301L, 302L));
        verify(entityWorkspaceAccessService, never()).currentRequestWorkspaceId();
    }

    @Test
    void resolveMonitorBindingCandidatesKeepsRuntimeSignalDimensionsOutOfIdentityLookup() {
        Monitor monitor = Monitor.builder()
                .id(503L)
                .app("springboot3")
                .name("checkout-api")
                .labels(Map.of(
                        "service.name", "checkout-api",
                        "http.route", "/checkout",
                        "trace_id", "6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b",
                        "span.name", "POST /checkout"
                ))
                .build();
        when(entityIdentityReadModelService.findMatchingIdentities(anySet(), anySet()))
                .thenReturn(List.of());

        List<EntityMonitorBindingCandidate> candidates =
                identityResolutionService.resolveMonitorBindingCandidates(monitor);

        assertTrue(candidates.isEmpty());
        ArgumentCaptor<Set<String>> identityKeysCaptor = ArgumentCaptor.forClass(Set.class);
        verify(entityIdentityReadModelService).findMatchingIdentities(identityKeysCaptor.capture(), anySet());
        Set<String> identityKeys = identityKeysCaptor.getValue();
        assertTrue(identityKeys.contains("service.name"));
        assertTrue(identityKeys.contains("monitor.name"));
        assertTrue(identityKeys.contains("monitor.app"));
        assertTrue(identityKeys.stream().noneMatch("http.route"::equals));
        assertTrue(identityKeys.stream().noneMatch("trace_id"::equals));
        assertTrue(identityKeys.stream().noneMatch("span.name"::equals));
        assertEquals(0, identityResolutionService.defaultIdentityPriority("http.route"));
        assertEquals(0, identityResolutionService.defaultIdentityPriority("trace_id"));
    }
}
