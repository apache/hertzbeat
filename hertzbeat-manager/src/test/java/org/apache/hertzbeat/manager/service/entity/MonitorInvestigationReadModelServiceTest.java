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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.manager.pojo.dto.MonitorInvestigationBindingInfo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Exact Monitor-to-Entity investigation binding contract.
 */
@ExtendWith(MockitoExtension.class)
class MonitorInvestigationReadModelServiceTest {

    @InjectMocks
    private MonitorInvestigationReadModelService readModelService;

    @Mock
    private EntityMonitorBindQueryService entityMonitorBindQueryService;

    @Mock
    private EntityDetailObservabilityReadModelService entityDetailObservabilityReadModelService;

    @Test
    void resolvesOneActiveWorkspaceVisibleServiceBindingAndOnlyObservedSignals() {
        when(entityMonitorBindQueryService.findMonitorBindsByMonitorId(42L))
                .thenReturn(List.of(activeBind(42L, 7L)));
        when(entityDetailObservabilityReadModelService.buildEntityDetail(7L))
                .thenReturn(detail(42L, "service", "checkout", true, true));

        Optional<MonitorInvestigationBindingInfo> result = readModelService.resolve(42L);

        assertEquals(Optional.of(new MonitorInvestigationBindingInfo(
                42L, 7L, "service", "checkout", "commerce", "production",
                List.of("metrics", "logs", "traces"))), result);
        verify(entityDetailObservabilityReadModelService).buildEntityDetail(7L);
    }

    @Test
    void keepsUnobservedSignalsOutOfTheBinding() {
        when(entityMonitorBindQueryService.findMonitorBindsByMonitorId(42L))
                .thenReturn(List.of(activeBind(42L, 7L)));
        when(entityDetailObservabilityReadModelService.buildEntityDetail(7L))
                .thenReturn(detail(42L, "service", "checkout", false, false));

        assertEquals(List.of("metrics"), readModelService.resolve(42L).orElseThrow().signals());
    }

    @ParameterizedTest
    @MethodSource("ambiguousOrInactiveBindings")
    void rejectsMissingAmbiguousOrInactivePersistedBindings(List<EntityMonitorBind> bindings) {
        when(entityMonitorBindQueryService.findMonitorBindsByMonitorId(42L)).thenReturn(bindings);

        assertTrue(readModelService.resolve(42L).isEmpty());
        verifyNoInteractions(entityDetailObservabilityReadModelService);
    }

    @Test
    void rejectsInaccessibleNonServiceOrStaleEntityDetails() {
        when(entityMonitorBindQueryService.findMonitorBindsByMonitorId(42L))
                .thenReturn(List.of(activeBind(42L, 7L)));
        when(entityDetailObservabilityReadModelService.buildEntityDetail(7L))
                .thenReturn(null, detail(42L, "host", "checkout", true, true),
                        detail(41L, "service", "checkout", true, true));

        assertTrue(readModelService.resolve(42L).isEmpty());
        assertTrue(readModelService.resolve(42L).isEmpty());
        assertTrue(readModelService.resolve(42L).isEmpty());
    }

    @Test
    void rejectsInvalidMonitorIdentityWithoutReadingPersistedState() {
        assertTrue(readModelService.resolve(null).isEmpty());
        assertTrue(readModelService.resolve(0L).isEmpty());
        verify(entityMonitorBindQueryService, never()).findMonitorBindsByMonitorId(org.mockito.ArgumentMatchers.any());
        verifyNoInteractions(entityDetailObservabilityReadModelService);
    }

    private static Stream<List<EntityMonitorBind>> ambiguousOrInactiveBindings() {
        return Stream.of(
                List.of(),
                List.of(EntityMonitorBind.builder()
                        .monitorId(42L)
                        .entityId(7L)
                        .status("inactive")
                        .build()),
                List.of(activeBind(42L, 7L), activeBind(42L, 8L)),
                List.of(activeBind(41L, 7L))
        );
    }

    private static EntityMonitorBind activeBind(long monitorId, long entityId) {
        return EntityMonitorBind.builder()
                .monitorId(monitorId)
                .entityId(entityId)
                .status("active")
                .build();
    }

    private static EntityDetailDto detail(long monitorId,
                                          String entityType,
                                          String serviceName,
                                          boolean logs,
                                          boolean traces) {
        ObserveEntity entity = new ObserveEntity();
        entity.setId(7L);
        entity.setType(entityType);
        entity.setName(serviceName);
        entity.setNamespace("commerce");
        entity.setEnvironment("production");
        EntityDto entityDto = new EntityDto();
        entityDto.setEntity(entity);

        EntityDetailDto detail = new EntityDetailDto();
        detail.setEntity(entityDto);
        MonitorInfo monitor = new MonitorInfo();
        monitor.setId(monitorId);
        detail.setBoundMonitors(List.of(monitor));
        detail.setLogEvidence(logs ? List.of(new LogEvidence()) : List.of());
        detail.setTraceEvidence(traces ? List.of(new TraceEvidence()) : List.of());
        return detail;
    }
}
