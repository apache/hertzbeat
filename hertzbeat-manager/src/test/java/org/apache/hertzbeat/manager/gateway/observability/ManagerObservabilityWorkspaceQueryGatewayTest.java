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

package org.apache.hertzbeat.manager.gateway.observability;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDiscoveryGovernanceActivityInfo;
import org.apache.hertzbeat.manager.service.entity.EntityGovernanceStateService;
import org.apache.hertzbeat.manager.service.entity.EntityIdentityQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorBindQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityWorkspaceQueryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ManagerObservabilityWorkspaceQueryGatewayTest {

    @Mock
    private EntityIdentityQueryService entityIdentityQueryService;

    @Mock
    private EntityWorkspaceQueryService entityWorkspaceQueryService;

    @Mock
    private EntityMonitorBindQueryService entityMonitorBindQueryService;

    @Mock
    private ManagerObservabilityInventoryQueryService inventoryQueryService;

    @Mock
    private EntityGovernanceStateService entityGovernanceStateService;

    private ManagerObservabilityWorkspaceQueryGateway gateway;

    @BeforeEach
    void setUp() {
        gateway = new ManagerObservabilityWorkspaceQueryGateway(
                entityIdentityQueryService,
                entityWorkspaceQueryService,
                entityMonitorBindQueryService,
                inventoryQueryService,
                entityGovernanceStateService
        );
    }

    @Test
    void delegatesWorkspaceQueriesToBoundaries() {
        Monitor latestMonitor = Monitor.builder().id(1L).name("checkout").gmtUpdate(LocalDateTime.now()).build();
        EntityIdentity identity = EntityIdentity.builder().id(11L).entityId(7L).identityKey("service.name").identityValue("checkout").build();
        ObserveEntity entity = ObserveEntity.builder().id(7L).name("checkout").build();
        Set<String> identityKeys = Set.of("service.name", "service.namespace");
        Set<String> normalizedValues = Set.of("checkout");

        when(inventoryQueryService.countMonitors()).thenReturn(3L);
        when(inventoryQueryService.countCollectors()).thenReturn(4L);
        when(inventoryQueryService.countCollectorsByStatus(CommonConstants.COLLECTOR_STATUS_ONLINE)).thenReturn(2L);
        when(inventoryQueryService.findLatestMonitor()).thenReturn(Optional.of(latestMonitor));
        when(entityIdentityQueryService.countDistinctEntityIdsByIdentityKeys(identityKeys)).thenReturn(2L);
        when(entityIdentityQueryService.findMatchingIdentities(identityKeys, normalizedValues)).thenReturn(List.of(identity));
        when(entityWorkspaceQueryService.findEntitiesByIds(Set.of(7L))).thenReturn(List.of(entity));
        when(entityMonitorBindQueryService.countMonitorBinds(7L)).thenReturn(5L);
        when(entityWorkspaceQueryService.findEntityById(7L)).thenReturn(Optional.of(entity));
        when(entityIdentityQueryService.findIdentities(7L)).thenReturn(List.of(identity));

        assertEquals(3L, gateway.countMonitors());
        assertEquals(4L, gateway.countCollectors());
        assertEquals(2L, gateway.countCollectorsByStatus(CommonConstants.COLLECTOR_STATUS_ONLINE));
        assertEquals(Optional.of(latestMonitor), gateway.findLatestMonitor());
        assertEquals(2L, gateway.countDistinctBoundEntityIdsByIdentityKeys(identityKeys));
        assertEquals(List.of(identity), gateway.findIdentitiesByKeysAndNormalizedValues(identityKeys, normalizedValues));
        assertEquals(Map.of(7L, entity), gateway.findEntitiesByIds(Set.of(7L)));
        assertEquals(5L, gateway.countMonitorBindsByEntityId(7L));
        assertEquals(Optional.of(entity), gateway.findEntityById(7L));
        assertEquals(List.of(identity), gateway.findIdentitiesByEntityId(7L));

        verify(inventoryQueryService).countMonitors();
        verify(inventoryQueryService).countCollectors();
        verify(inventoryQueryService).countCollectorsByStatus(CommonConstants.COLLECTOR_STATUS_ONLINE);
        verify(inventoryQueryService).findLatestMonitor();
        verify(entityIdentityQueryService).countDistinctEntityIdsByIdentityKeys(identityKeys);
        verify(entityIdentityQueryService).findMatchingIdentities(identityKeys, normalizedValues);
        verify(entityWorkspaceQueryService).findEntitiesByIds(Set.of(7L));
        verify(entityMonitorBindQueryService).countMonitorBinds(7L);
        verify(entityWorkspaceQueryService).findEntityById(7L);
        verify(entityIdentityQueryService).findIdentities(7L);
    }

    @Test
    void returnsEmptyEntityMapWhenIdsAreEmpty() {
        assertTrue(gateway.findEntitiesByIds(Set.of()).isEmpty());
        verify(entityWorkspaceQueryService, org.mockito.Mockito.never()).findEntitiesByIds(org.mockito.Mockito.anyCollection());
    }

    @Test
    void recordsDiscoveryGovernanceActivityThroughStateBoundary() {
        gateway.recordEntityDiscoveryGovernanceActivity(
                "team-a",
                "identity_conflict",
                "needs_governance",
                "OTLP resource identity matched multiple entities",
                "service.name=checkout",
                Map.of(7L, "Checkout API"));

        ArgumentCaptor<EntityDiscoveryGovernanceActivityInfo> activityCaptor =
                ArgumentCaptor.forClass(EntityDiscoveryGovernanceActivityInfo.class);
        verify(entityGovernanceStateService).saveDiscoveryGovernanceActivity(activityCaptor.capture(), eq("team-a"));
        EntityDiscoveryGovernanceActivityInfo activity = activityCaptor.getValue();
        assertTrue(activity.getId().startsWith("otlp-identity_conflict-"));
        assertEquals("identity_conflict", activity.getAction());
        assertEquals("needs_governance", activity.getStatus());
        assertEquals("OTLP resource identity matched multiple entities", activity.getSummary());
        assertEquals("service.name=checkout", activity.getDetail());
        assertEquals(1, activity.getEntityRefs().size());
        assertEquals(7L, activity.getEntityRefs().getFirst().getEntityId());
        assertEquals("Checkout API", activity.getEntityRefs().getFirst().getEntityName());
    }
}
