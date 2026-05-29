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

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

import java.util.List;
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
}
