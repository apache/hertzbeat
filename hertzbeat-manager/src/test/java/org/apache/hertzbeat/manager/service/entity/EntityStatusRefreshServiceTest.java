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
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the mutation-time runtime status refresh orchestration boundary.
 */
@ExtendWith(MockitoExtension.class)
class EntityStatusRefreshServiceTest {

    @InjectMocks
    private EntityStatusRefreshService statusRefreshService;

    @Mock
    private EntityMonitorBindService entityMonitorBindService;

    @Mock
    private EntityAlertEvidenceReadModelService entityAlertEvidenceReadModelService;

    @Mock
    private EntityRuntimeHealthService entityRuntimeHealthService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Test
    void refreshEntityStatusLoadsBoundMonitorsThenActiveAlertsThenPersistsRuntimeHealth() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(42L)
                .type("service")
                .name("checkout-api")
                .workspaceId("team-a")
                .build();
        List<Monitor> monitors = List.of(
                Monitor.builder().id(101L).name("checkout-instance").build());
        List<SingleAlert> activeAlerts = List.of(
                SingleAlert.builder().id(201L).status("firing").build());
        EntityStatusInfo expectedStatus = new EntityStatusInfo(
                "critical", "1 firing alerts", 1, 0, 1, 0, 1, null);
        when(entityMonitorBindService.findEntityMonitors(42L)).thenReturn(monitors);
        when(entityAlertEvidenceReadModelService.queryActiveAlerts(monitors, 20, "team-a"))
                .thenReturn(activeAlerts);
        when(entityRuntimeHealthService.refreshEntityStatus(entity, monitors, activeAlerts))
                .thenReturn(expectedStatus);

        EntityStatusInfo actualStatus = statusRefreshService.refreshEntityStatus(entity, "team-a");

        assertSame(expectedStatus, actualStatus);
        InOrder inOrder = inOrder(
                entityMonitorBindService, entityAlertEvidenceReadModelService, entityRuntimeHealthService);
        inOrder.verify(entityMonitorBindService).findEntityMonitors(42L);
        inOrder.verify(entityAlertEvidenceReadModelService).queryActiveAlerts(monitors, 20, "team-a");
        inOrder.verify(entityRuntimeHealthService).refreshEntityStatus(entity, monitors, activeAlerts);
    }

    @Test
    void refreshEntityStatusUsesDefaultActiveAlertWorkspaceBoundary() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(42L)
                .type("service")
                .name("checkout-api")
                .workspaceId("team-a")
                .build();
        List<Monitor> monitors = List.of(
                Monitor.builder().id(101L).name("checkout-instance").build());
        List<SingleAlert> activeAlerts = List.of(
                SingleAlert.builder().id(201L).status("firing").build());
        EntityStatusInfo expectedStatus = new EntityStatusInfo(
                "critical", "1 firing alerts", 1, 0, 1, 0, 1, null);
        when(entityMonitorBindService.findEntityMonitors(42L)).thenReturn(monitors);
        when(entityAlertEvidenceReadModelService.queryActiveAlerts(monitors, 20))
                .thenReturn(activeAlerts);
        when(entityRuntimeHealthService.refreshEntityStatus(entity, monitors, activeAlerts))
                .thenReturn(expectedStatus);

        EntityStatusInfo actualStatus = statusRefreshService.refreshEntityStatus(entity);

        assertSame(expectedStatus, actualStatus);
        InOrder inOrder = inOrder(
                entityMonitorBindService, entityAlertEvidenceReadModelService, entityRuntimeHealthService);
        inOrder.verify(entityMonitorBindService).findEntityMonitors(42L);
        inOrder.verify(entityAlertEvidenceReadModelService).queryActiveAlerts(monitors, 20);
        inOrder.verify(entityRuntimeHealthService).refreshEntityStatus(entity, monitors, activeAlerts);
    }

    @Test
    void refreshEntityStatusesWithEvidenceBatchesCurrentPageMonitorLookup() {
        ObserveEntity checkout = ObserveEntity.builder()
                .id(42L)
                .type("service")
                .name("checkout-api")
                .workspaceId("team-a")
                .build();
        ObserveEntity payments = ObserveEntity.builder()
                .id(43L)
                .type("service")
                .name("payments-api")
                .workspaceId("team-a")
                .build();
        Monitor monitor = Monitor.builder().id(101L).name("checkout-instance").build();
        List<SingleAlert> activeAlerts = List.of(SingleAlert.builder().id(201L).status("firing").build());
        EntityStatusInfo checkoutStatus = new EntityStatusInfo(
                "critical", "1 firing alerts", 1, 0, 1, 0, 1, null);
        EntityStatusInfo paymentsStatus = new EntityStatusInfo(
                "unknown", "no live evidence bound yet", 0, 0, 0, 0, 0, null);
        when(entityMonitorBindService.findEntityMonitorsByEntityIds(List.of(42L, 43L)))
                .thenReturn(Map.of(42L, List.of(monitor)));
        when(entityAlertEvidenceReadModelService.queryActiveAlerts(List.of(monitor), 20, "team-a"))
                .thenReturn(activeAlerts);
        when(entityRuntimeHealthService.refreshEntityStatus(checkout, List.of(monitor), activeAlerts))
                .thenReturn(checkoutStatus);
        when(entityRuntimeHealthService.refreshEntityStatus(payments, List.of(), List.of()))
                .thenReturn(paymentsStatus);

        Map<Long, EntityStatusRefreshService.EntityRuntimeStatusEvidence> evidenceByEntity =
                statusRefreshService.refreshEntityStatusesWithEvidence(List.of(checkout, payments), "team-a");

        assertSame(checkoutStatus, evidenceByEntity.get(42L).statusInfo());
        assertSame(paymentsStatus, evidenceByEntity.get(43L).statusInfo());
        assertEquals(List.of(monitor), evidenceByEntity.get(42L).monitors());
        assertEquals(List.of(), evidenceByEntity.get(43L).monitors());
        verify(entityMonitorBindService).findEntityMonitorsByEntityIds(List.of(42L, 43L));
        verify(entityMonitorBindService, never()).findEntityMonitors(42L);
        verify(entityMonitorBindService, never()).findEntityMonitors(43L);
        verify(entityAlertEvidenceReadModelService, never()).queryActiveAlerts(List.of(), 20, "team-a");
    }
}
