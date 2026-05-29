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

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.Monitor;
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

    @BeforeEach
    void setUp() {
        integrationHintService = new EntityIntegrationHintService(
                entityMonitorQueryService, entityIdentityResolutionService);
    }

    @Test
    void getMonitorBindingCandidatesReturnsEmptyWhenMonitorIsMissing() {
        when(entityMonitorQueryService.findMonitor(501L)).thenReturn(Optional.empty());

        List<EntityMonitorBindingCandidate> candidates =
                integrationHintService.getMonitorBindingCandidates(501L);

        assertTrue(candidates.isEmpty());
        verifyNoInteractions(entityIdentityResolutionService);
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

        List<EntityMonitorBindingCandidate> candidates =
                integrationHintService.getMonitorBindingCandidates(502L);

        assertEquals(List.of(candidate), candidates);
        InOrder inOrder = inOrder(entityMonitorQueryService, entityIdentityResolutionService);
        inOrder.verify(entityMonitorQueryService).findMonitor(502L);
        inOrder.verify(entityIdentityResolutionService).resolveMonitorBindingCandidates(monitor);
    }
}
