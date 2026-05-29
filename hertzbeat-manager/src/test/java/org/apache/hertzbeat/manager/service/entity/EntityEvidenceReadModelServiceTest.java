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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;

/**
 * Contract for the entity evidence facade that owns access checks and bound-monitor lookup.
 */
@ExtendWith(MockitoExtension.class)
class EntityEvidenceReadModelServiceTest {

    @InjectMocks
    private EntityEvidenceReadModelService entityEvidenceReadModelService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Mock
    private EntityMonitorBindService entityMonitorBindService;

    @Mock
    private EntityAlertEvidenceReadModelService entityAlertEvidenceReadModelService;

    @Mock
    private EntityMonitorEvidenceReadModelService entityMonitorEvidenceReadModelService;

    @Test
    void getEntityAlertsReturnsEmptyPageWithoutEvidenceLookupWhenEntityIsInaccessible() {
        when(entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace(1001L)).thenReturn(false);

        Page<SingleAlert> page = entityEvidenceReadModelService.getEntityAlerts(
                1001L, "firing", "critical", -1, 0);

        assertTrue(page.isEmpty());
        assertEquals(0, page.getNumber());
        assertEquals(10, page.getSize());
        verify(entityWorkspaceAccessService).isEntityAccessibleForRequestWorkspace(1001L);
        verifyNoInteractions(entityMonitorBindService, entityAlertEvidenceReadModelService,
                entityMonitorEvidenceReadModelService);
    }

    @Test
    void getEntityAlertsLoadsBoundMonitorsAndDelegatesWorkspaceToAlertEvidence() {
        Monitor monitor = Monitor.builder().id(2001L).name("checkout-api").build();
        Page<SingleAlert> expectedPage = new PageImpl<>(List.of(
                SingleAlert.builder().id(3001L).content("checkout-api down").build()));
        when(entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace(1002L)).thenReturn(true);
        when(entityMonitorBindService.findEntityMonitors(1002L)).thenReturn(List.of(monitor));
        when(entityAlertEvidenceReadModelService.buildEntityAlertPage(
                List.of(monitor), "firing", "critical", 1, 25)).thenReturn(expectedPage);

        Page<SingleAlert> page = entityEvidenceReadModelService.getEntityAlerts(
                1002L, "firing", "critical", 1, 25);

        assertSame(expectedPage, page);
        verify(entityMonitorBindService).findEntityMonitors(1002L);
        verify(entityAlertEvidenceReadModelService).buildEntityAlertPage(
                List.of(monitor), "firing", "critical", 1, 25);
    }

    @Test
    void getEntityMonitorsReturnsEmptyPageWithoutMonitorLookupWhenEntityIsInaccessible() {
        when(entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace(1003L)).thenReturn(false);

        Page<MonitorInfo> page = entityEvidenceReadModelService.getEntityMonitors(
                1003L, (byte) 2, "mysql", -1, 0);

        assertTrue(page.isEmpty());
        assertEquals(0, page.getNumber());
        assertEquals(10, page.getSize());
        verify(entityWorkspaceAccessService).isEntityAccessibleForRequestWorkspace(1003L);
        verifyNoInteractions(entityMonitorBindService, entityAlertEvidenceReadModelService,
                entityMonitorEvidenceReadModelService);
    }

    @Test
    void getEntityMonitorsLoadsBoundMonitorsThroughMonitorEvidenceReadModel() {
        Monitor monitor = Monitor.builder().id(2002L).name("order-db").app("mysql").build();
        Page<MonitorInfo> expectedPage = new PageImpl<>(List.of(MonitorInfo.fromEntity(monitor)));
        when(entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace(1004L)).thenReturn(true);
        when(entityMonitorBindService.findEntityMonitors(1004L)).thenReturn(List.of(monitor));
        when(entityMonitorEvidenceReadModelService.buildEntityMonitorPage(
                List.of(monitor), (byte) 2, "mysql", 0, 10)).thenReturn(expectedPage);

        Page<MonitorInfo> page = entityEvidenceReadModelService.getEntityMonitors(
                1004L, (byte) 2, "mysql", 0, 10);

        assertSame(expectedPage, page);
        verify(entityMonitorBindService).findEntityMonitors(1004L);
        verify(entityMonitorEvidenceReadModelService).buildEntityMonitorPage(
                List.of(monitor), (byte) 2, "mysql", 0, 10);
    }
}
