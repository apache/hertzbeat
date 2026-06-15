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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.pojo.dto.EntityMonitorBindingCandidate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the entity monitor binding component extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityMonitorBindServiceTest {

    @InjectMocks
    private EntityMonitorBindService monitorBindService;

    @Mock
    private EntityMonitorBindWriteModelService entityMonitorBindWriteModelService;

    @Mock
    private EntityMonitorBindQueryService entityMonitorBindQueryService;

    @Mock
    private EntityMonitorQueryService entityMonitorQueryService;

    @Test
    void deleteMonitorBindsDeletesAndFlushesBeforeCallerRemovesEntity() {
        monitorBindService.deleteMonitorBinds(301L);

        verify(entityMonitorBindWriteModelService).deleteMonitorBinds(301L);
    }

    @Test
    void deleteMonitorBindsByMonitorIdsDelegatesToWriteBoundary() {
        Set<Long> monitorIds = Set.of(501L, 502L);

        monitorBindService.deleteMonitorBindsByMonitorIds(monitorIds);

        verify(entityMonitorBindWriteModelService).deleteMonitorBindsByMonitorIds(monitorIds);
    }

    @Test
    void findMonitorBindsReturnsPersistedBindsInDaoOrder() {
        EntityMonitorBind monitorBind = EntityMonitorBind.builder()
                .id(401L)
                .entityId(301L)
                .monitorId(501L)
                .build();
        when(entityMonitorBindQueryService.findMonitorBinds(301L)).thenReturn(List.of(monitorBind));

        List<EntityMonitorBind> binds = monitorBindService.findMonitorBinds(301L);

        assertEquals(List.of(monitorBind), binds);
    }

    @Test
    void countMonitorBindsReturnsPersistedBindCount() {
        when(entityMonitorBindQueryService.countMonitorBinds(301L)).thenReturn(2L);

        assertEquals(2L, monitorBindService.countMonitorBinds(301L));
    }

    @Test
    @SuppressWarnings("unchecked")
    void replaceMonitorBindsDeletesThenPersistsNormalizedExistingMonitorBinds() {
        EntityMonitorBind validBind = EntityMonitorBind.builder()
                .monitorId(501L)
                .bindSource("otel_resource")
                .matchContext(Map.of("service.name", List.of("checkout-api")))
                .build();
        EntityMonitorBind missingMonitorBind = EntityMonitorBind.builder()
                .monitorId(502L)
                .build();
        EntityMonitorBind missingMonitorId = EntityMonitorBind.builder().build();
        when(entityMonitorQueryService.monitorExists(501L)).thenReturn(true);
        when(entityMonitorQueryService.monitorExists(502L)).thenReturn(false);

        monitorBindService.replaceMonitorBinds(301L, List.of(validBind, missingMonitorBind, missingMonitorId));

        ArgumentCaptor<List<EntityMonitorBind>> rowsCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityMonitorBindWriteModelService).replaceMonitorBinds(eq(301L), rowsCaptor.capture());
        List<EntityMonitorBind> rows = rowsCaptor.getValue();
        assertEquals(1, rows.size());
        EntityMonitorBind saved = rows.getFirst();
        assertEquals(301L, saved.getEntityId());
        assertEquals(501L, saved.getMonitorId());
        assertEquals("manual", saved.getBindType());
        assertEquals("otel_resource", saved.getBindSource());
        assertEquals("active", saved.getStatus());
        assertEquals(100, saved.getScore());
        assertEquals(Map.of("service.name", List.of("checkout-api")), saved.getMatchContext());
    }

    @Test
    @SuppressWarnings("unchecked")
    void replaceAutoMonitorBindsRefreshesAutoRowsAndKeepsManualBindsProtected() {
        EntityMonitorBind manualBind = EntityMonitorBind.builder()
                .entityId(401L)
                .monitorId(801L)
                .bindType("manual")
                .build();
        EntityMonitorBind staleAutoBind = EntityMonitorBind.builder()
                .entityId(402L)
                .monitorId(801L)
                .bindType("auto")
                .build();
        when(entityMonitorBindQueryService.findMonitorBindsByMonitorId(801L))
                .thenReturn(List.of(manualBind, staleAutoBind));
        EntityMonitorBindingCandidate manualDuplicate = new EntityMonitorBindingCandidate(
                401L, "Checkout API", "service", 130, "direct", true,
                Map.of("service.name", List.of("checkout-api"))
        );
        EntityMonitorBindingCandidate freshAuto = new EntityMonitorBindingCandidate(
                403L, "Checkout Worker", "service", 120, "direct", false,
                Map.of("service.name", List.of("checkout-worker"))
        );

        monitorBindService.replaceAutoMonitorBinds(801L, List.of(manualDuplicate, freshAuto));

        ArgumentCaptor<List<EntityMonitorBind>> rowsCaptor = ArgumentCaptor.forClass(List.class);
        verify(entityMonitorBindWriteModelService).replaceAutoMonitorBinds(eq(801L), rowsCaptor.capture());
        List<EntityMonitorBind> rows = rowsCaptor.getValue();
        assertEquals(1, rows.size());
        EntityMonitorBind saved = rows.getFirst();
        assertEquals(403L, saved.getEntityId());
        assertEquals(801L, saved.getMonitorId());
        assertEquals("auto", saved.getBindType());
        assertEquals("monitor_identity", saved.getBindSource());
        assertEquals("active", saved.getStatus());
        assertEquals(120, saved.getScore());
        assertEquals(Map.of("service.name", List.of("checkout-worker")), saved.getMatchContext());
    }

    @Test
    void findEntityMonitorsPreservesBindOrderAndSkipsMissingMonitors() {
        EntityMonitorBind firstBind = EntityMonitorBind.builder()
                .entityId(301L)
                .monitorId(702L)
                .build();
        EntityMonitorBind secondBind = EntityMonitorBind.builder()
                .entityId(301L)
                .monitorId(701L)
                .build();
        EntityMonitorBind missingBind = EntityMonitorBind.builder()
                .entityId(301L)
                .monitorId(703L)
                .build();
        when(entityMonitorBindQueryService.findMonitorBinds(301L))
                .thenReturn(List.of(firstBind, secondBind, missingBind));
        Monitor firstMonitor = Monitor.builder().id(701L).name("first-returned").build();
        Monitor secondMonitor = Monitor.builder().id(702L).name("second-returned").build();
        when(entityMonitorQueryService.findMonitorsByIds(java.util.Set.of(701L, 702L, 703L)))
                .thenReturn(List.of(firstMonitor, secondMonitor));

        List<Monitor> monitors = monitorBindService.findEntityMonitors(301L);

        assertEquals(List.of(702L, 701L), monitors.stream().map(Monitor::getId).toList());
    }

    @Test
    void findEntityMonitorsReturnsEmptyWithoutMonitorDaoLookupWhenNoBindsExist() {
        when(entityMonitorBindQueryService.findMonitorBinds(302L)).thenReturn(List.of());

        List<Monitor> monitors = monitorBindService.findEntityMonitors(302L);

        assertEquals(List.of(), monitors);
        verify(entityMonitorQueryService, never()).findMonitorsByIds(java.util.Set.of());
        verifyNoInteractions(entityMonitorQueryService);
    }
}
