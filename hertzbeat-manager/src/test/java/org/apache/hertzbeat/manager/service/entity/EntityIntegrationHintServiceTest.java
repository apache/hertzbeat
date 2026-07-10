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
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for monitor-to-entity integration hint lookup.
 */
@ExtendWith(MockitoExtension.class)
class EntityIntegrationHintServiceTest {

    private EntityIntegrationHintService integrationHintService;

    @Mock
    private EntityMonitorQueryService entityMonitorQueryService;

    @Mock
    private EntityIdentityResolutionService entityIdentityResolutionService;

    @Mock
    private EntityMonitorBindService entityMonitorBindService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @BeforeEach
    void setUp() {
        integrationHintService = new EntityIntegrationHintService(
                entityMonitorQueryService,
                entityIdentityResolutionService,
                entityMonitorBindService,
                entityWorkspaceAccessService);
    }

    @Test
    void getMonitorBindingCandidatesReturnsEmptyWhenMonitorIsMissing() {
        when(entityMonitorQueryService.findMonitor(501L)).thenReturn(Optional.empty());

        List<EntityMonitorBindingCandidate> candidates =
                integrationHintService.getMonitorBindingCandidates(501L);

        assertTrue(candidates.isEmpty());
        verifyNoInteractions(entityIdentityResolutionService);
        verifyNoInteractions(entityMonitorBindService);
        verifyNoInteractions(entityWorkspaceAccessService);
    }

    @Test
    void getMonitorBindingCandidatesDelegatesAcceptedMonitorAndWorkspaceToIdentityResolution() {
        Monitor monitor = new Monitor();
        monitor.setId(502L);
        monitor.setApp("springboot3");
        monitor.setName("checkout-api");
        monitor.setLabels(Map.of("service.name", "checkout-api"));
        EntityMonitorBindingCandidate candidate = new EntityMonitorBindingCandidate(
                90L,
                "Checkout API",
                "service",
                120,
                "direct",
                false,
                Map.of("service.name", List.of("checkout-api")));
        when(entityMonitorQueryService.findMonitor(502L)).thenReturn(Optional.of(monitor));
        when(entityIdentityResolutionService.resolveMonitorBindingCandidates(monitor))
                .thenReturn(List.of(candidate));
        when(entityMonitorBindService.findMonitorBindsByMonitorId(502L)).thenReturn(List.of());

        List<EntityMonitorBindingCandidate> candidates =
                integrationHintService.getMonitorBindingCandidates(502L);

        assertEquals(List.of(candidate), candidates);
        InOrder inOrder = inOrder(entityMonitorQueryService, entityIdentityResolutionService, entityMonitorBindService);
        inOrder.verify(entityMonitorQueryService).findMonitor(502L);
        inOrder.verify(entityIdentityResolutionService).resolveMonitorBindingCandidates(monitor);
        inOrder.verify(entityMonitorBindService).findMonitorBindsByMonitorId(502L);
    }

    @Test
    void getMonitorBindingCandidatesIncludesExistingBoundEntityWithoutIdentityMatch() {
        Monitor monitor = new Monitor();
        monitor.setId(503L);
        monitor.setApp("website");
        monitor.setName("checkout-probe");
        when(entityMonitorQueryService.findMonitor(503L)).thenReturn(Optional.of(monitor));
        when(entityIdentityResolutionService.resolveMonitorBindingCandidates(monitor)).thenReturn(List.of());
        when(entityMonitorBindService.findMonitorBindsByMonitorId(503L)).thenReturn(List.of(
                EntityMonitorBind.builder().entityId(91L).monitorId(503L).bindType("manual").build()
        ));
        when(entityWorkspaceAccessService.findAccessibleEntitiesByIdsForRequestWorkspace(java.util.Set.of(91L)))
                .thenReturn(List.of(ObserveEntity.builder()
                        .id(91L)
                        .type("service")
                        .name("checkout-api")
                        .displayName("Checkout API")
                        .build()));

        List<EntityMonitorBindingCandidate> candidates =
                integrationHintService.getMonitorBindingCandidates(503L);

        assertEquals(1, candidates.size());
        EntityMonitorBindingCandidate candidate = candidates.getFirst();
        assertEquals(91L, candidate.getEntityId());
        assertEquals("Checkout API", candidate.getEntityName());
        assertEquals("service", candidate.getEntityType());
        assertEquals(0, candidate.getScore());
        assertEquals("already_bound", candidate.getRecommendation());
        assertTrue(candidate.isAlreadyBound());
        assertEquals(Map.of(), candidate.getMatchedIdentities());
    }

    @Test
    void getMonitorBindingCandidatesBatchesDistinctMonitorIdsInOrder() {
        Monitor monitor502 = new Monitor();
        monitor502.setId(502L);
        monitor502.setApp("springboot3");
        monitor502.setName("checkout-api");
        EntityMonitorBindingCandidate candidate = new EntityMonitorBindingCandidate(
                90L,
                "Checkout API",
                "service",
                120,
                "direct",
                false,
                Map.of("service.name", List.of("checkout-api")));
        when(entityMonitorQueryService.findMonitor(502L)).thenReturn(Optional.of(monitor502));
        when(entityIdentityResolutionService.resolveMonitorBindingCandidates(monitor502))
                .thenReturn(List.of(candidate));
        when(entityMonitorBindService.findMonitorBindsByMonitorId(502L)).thenReturn(List.of());
        when(entityMonitorQueryService.findMonitor(503L)).thenReturn(Optional.empty());

        Map<Long, List<EntityMonitorBindingCandidate>> candidates =
                integrationHintService.getMonitorBindingCandidates(Arrays.asList(502L, 503L, 502L, null, -1L));

        assertEquals(List.of(502L, 503L), List.copyOf(candidates.keySet()));
        assertEquals(List.of(candidate), candidates.get(502L));
        assertTrue(candidates.get(503L).isEmpty());
    }
}
