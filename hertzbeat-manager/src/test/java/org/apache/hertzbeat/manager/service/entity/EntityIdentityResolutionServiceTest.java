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

import java.util.Collections;
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
    void refreshAutoMonitorBindsPersistsOnlyUniqueDirectCandidate() {
        Monitor monitor = Monitor.builder()
                .id(504L)
                .app("springboot3")
                .name("checkout-api")
                .labels(Map.of("service.name", "checkout-api"))
                .build();
        EntityIdentity serviceName = EntityIdentity.builder()
                .entityId(401L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .normalizedValue("checkout-api")
                .priority(90)
                .primaryIdentity(true)
                .build();
        when(entityIdentityReadModelService.findMatchingIdentities(anySet(), anySet()))
                .thenReturn(List.of(serviceName));
        when(entityMonitorBindService.findMonitorBindsByMonitorId(504L)).thenReturn(List.of());
        ObserveEntity entity = ObserveEntity.builder()
                .id(401L)
                .type("service")
                .name("checkout-api")
                .displayName("Checkout API")
                .build();
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(Set.of(401L)))
                .thenReturn(List.of(entity));

        identityResolutionService.refreshAutoMonitorBinds(monitor);

        ArgumentCaptor<List<EntityMonitorBindingCandidate>> candidatesCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityMonitorBindService).replaceAutoMonitorBinds(eq(504L), candidatesCaptor.capture());
        List<EntityMonitorBindingCandidate> persistedCandidates = candidatesCaptor.getValue();
        assertEquals(1, persistedCandidates.size());
        assertEquals(401L, persistedCandidates.getFirst().getEntityId());
        assertEquals("direct", persistedCandidates.getFirst().getRecommendation());
    }

    @Test
    void refreshAutoMonitorBindsClearsAutoBindsWhenDirectCandidatesConflict() {
        Monitor monitor = Monitor.builder()
                .id(505L)
                .app("springboot3")
                .name("checkout-api")
                .labels(Map.of("service.name", "checkout-api"))
                .build();
        EntityIdentity first = EntityIdentity.builder()
                .entityId(501L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .normalizedValue("checkout-api")
                .priority(90)
                .primaryIdentity(true)
                .build();
        EntityIdentity second = EntityIdentity.builder()
                .entityId(502L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .normalizedValue("checkout-api")
                .priority(90)
                .primaryIdentity(true)
                .build();
        when(entityIdentityReadModelService.findMatchingIdentities(anySet(), anySet()))
                .thenReturn(List.of(first, second));
        when(entityMonitorBindService.findMonitorBindsByMonitorId(505L)).thenReturn(List.of());
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(Set.of(501L, 502L)))
                .thenReturn(List.of(
                        ObserveEntity.builder().id(501L).type("service").name("checkout-api").build(),
                        ObserveEntity.builder().id(502L).type("service").name("checkout-api-shadow").build()
                ));

        identityResolutionService.refreshAutoMonitorBinds(monitor);

        verify(entityMonitorBindService).replaceAutoMonitorBinds(505L, Collections.emptyList());
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

    @Test
    void resolveMonitorBindingCandidatesBatchesPageIdentityBindAndWorkspaceReads() {
        Monitor checkout = Monitor.builder()
                .id(601L)
                .app("springboot3")
                .name("checkout-api")
                .labels(Map.of("service.name", "checkout-api"))
                .build();
        Monitor inventory = Monitor.builder()
                .id(602L)
                .app("springboot3")
                .name("inventory-api")
                .labels(Map.of("service.name", "inventory-api"))
                .build();
        EntityIdentity checkoutIdentity = EntityIdentity.builder()
                .entityId(701L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .normalizedValue("checkout-api")
                .priority(100)
                .build();
        EntityIdentity inventoryIdentity = EntityIdentity.builder()
                .entityId(702L)
                .identityKey("service.name")
                .identityValue("inventory-api")
                .normalizedValue("inventory-api")
                .priority(100)
                .build();
        EntityMonitorBind checkoutBind = EntityMonitorBind.builder()
                .monitorId(601L)
                .entityId(701L)
                .build();
        EntityMonitorBind unmatchedInventoryBind = EntityMonitorBind.builder()
                .monitorId(602L)
                .entityId(703L)
                .build();
        when(entityIdentityReadModelService.findMatchingIdentities(anySet(), anySet()))
                .thenReturn(List.of(checkoutIdentity, inventoryIdentity));
        when(entityMonitorBindService.findMonitorBindsByMonitorIds(List.of(601L, 602L)))
                .thenReturn(Map.of(601L, List.of(checkoutBind), 602L, List.of(unmatchedInventoryBind)));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(Set.of(701L, 702L, 703L)))
                .thenReturn(List.of(
                        ObserveEntity.builder().id(701L).name("checkout-api").type("service").build(),
                        ObserveEntity.builder().id(702L).name("inventory-api").type("service").build(),
                        ObserveEntity.builder().id(703L).name("bound-inventory").type("service").build()));

        Map<Long, List<EntityMonitorBindingCandidate>> result =
                identityResolutionService.resolveMonitorBindingCandidates(List.of(checkout, inventory));

        assertEquals(List.of(601L, 602L), List.copyOf(result.keySet()));
        assertEquals(1, result.get(601L).size());
        assertTrue(result.get(601L).getFirst().isAlreadyBound());
        assertEquals(2, result.get(602L).size());
        assertEquals("direct", result.get(602L).getFirst().getRecommendation());
        assertEquals("already_bound", result.get(602L).get(1).getRecommendation());
        verify(entityIdentityReadModelService).findMatchingIdentities(anySet(), anySet());
        verify(entityMonitorBindService).findMonitorBindsByMonitorIds(List.of(601L, 602L));
        verify(entityMonitorBindService, never()).findMonitorBindsByMonitorId(org.mockito.ArgumentMatchers.anyLong());
        verify(entityWorkspaceAccessService)
                .findAccessibleEntitiesByIdsForRequestWorkspace(Set.of(701L, 702L, 703L));
    }
}
