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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.stream.LongStream;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.apache.hertzbeat.manager.pojo.dto.MonitorSignalView;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository.MonitorCollectionEvent;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository.MonitorCollectionEventQuery;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository.MonitorCollectionEventQueryResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class MonitorInvestigationReadModelServiceTest {

    private static final long START = 1_777_000_000_000L;
    private static final long END = START + 3_600_000L;

    @InjectMocks
    private MonitorInvestigationReadModelService readModelService;

    @Mock
    private EntityMonitorBindQueryService entityMonitorBindQueryService;

    @Mock
    private EntityDetailObservabilityReadModelService entityDetailObservabilityReadModelService;

    @Mock
    private EntityAlertEvidenceReadModelService entityAlertEvidenceReadModelService;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Mock
    private ObjectProvider<MonitorCollectionEventQueryRepository> collectionRepositoryProvider;

    @Mock
    private MonitorCollectionEventQueryRepository collectionRepository;

    @Test
    void composesReadyCollectionCurrentAlertsAndExactObservedBinding() {
        Monitor monitor = monitor(42L);
        MonitorCollectionEvent event = new MonitorCollectionEvent(
                START + 60_000L, 700L, "SUCCESS", "collector-1", "db:3306",
                "availability", "NONE", "QUERY", 2, 4);
        when(collectionRepositoryProvider.getIfAvailable()).thenReturn(collectionRepository);
        when(collectionRepository.query(new MonitorCollectionEventQuery(42L, START, END)))
                .thenReturn(MonitorCollectionEventQueryResult.available(event));
        when(entityWorkspaceAccessService.currentRequestWorkspaceId()).thenReturn("team-a");
        List<SingleAlert> alertRows = LongStream.rangeClosed(701L, 706L)
                .mapToObj(this::alert)
                .toList();
        when(entityAlertEvidenceReadModelService.queryActiveAlertPage(List.of(monitor), 0, 5, "team-a"))
                .thenReturn(new PageImpl<>(alertRows, PageRequest.of(0, 5), 6));
        when(entityMonitorBindQueryService.findMonitorBindsByMonitorId(42L))
                .thenReturn(List.of(activeBind(42L, 7L)));
        when(entityDetailObservabilityReadModelService.buildEntityDetail(7L))
                .thenReturn(detail(42L, 7L, true, true, true));

        MonitorSignalView view = readModelService.query(monitor, START, END);

        assertEquals(42L, view.monitorId());
        assertEquals(START, view.window().start());
        assertEquals(END, view.window().end());
        assertEquals(MonitorSignalView.EvidenceState.READY, view.collection().state());
        assertEquals(event.observedAt(), view.collection().event().observedAt());
        assertEquals(MonitorSignalView.EvidenceState.READY, view.alerts().state());
        assertEquals("current", view.alerts().scope());
        assertEquals(6L, view.alerts().activeCount());
        assertEquals(5, view.alerts().previews().size());
        assertEquals("critical", view.alerts().previews().getFirst().severity());
        assertEquals(MonitorSignalView.EvidenceState.READY, view.binding().state());
        assertEquals(List.of("metrics", "logs", "traces"), view.binding().identity().signals());
        verify(entityAlertEvidenceReadModelService).queryActiveAlertPage(List.of(monitor), 0, 5, "team-a");
    }

    @Test
    void keepsValidZeroEvidenceDistinctlyEmpty() {
        Monitor monitor = monitor(42L);
        when(collectionRepositoryProvider.getIfAvailable()).thenReturn(collectionRepository);
        when(collectionRepository.query(new MonitorCollectionEventQuery(42L, START, END)))
                .thenReturn(MonitorCollectionEventQueryResult.available(null));
        when(entityWorkspaceAccessService.currentRequestWorkspaceId()).thenReturn("team-a");
        when(entityAlertEvidenceReadModelService.queryActiveAlertPage(List.of(monitor), 0, 5, "team-a"))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 5), 0));
        when(entityMonitorBindQueryService.findMonitorBindsByMonitorId(42L)).thenReturn(List.of());

        MonitorSignalView view = readModelService.query(monitor, START, END);

        assertEquals(MonitorSignalView.EvidenceState.EMPTY, view.collection().state());
        assertNull(view.collection().event());
        assertEquals(MonitorSignalView.EvidenceState.EMPTY, view.alerts().state());
        assertEquals(0L, view.alerts().activeCount());
        assertEquals(List.of(), view.alerts().previews());
        assertEquals(MonitorSignalView.EvidenceState.EMPTY, view.binding().state());
        assertNull(view.binding().identity());
    }

    @Test
    void failuresStayUnavailablePerEvidenceBlock() {
        Monitor monitor = monitor(42L);
        when(collectionRepositoryProvider.getIfAvailable()).thenThrow(new IllegalStateException("bean failure"));
        when(entityWorkspaceAccessService.currentRequestWorkspaceId()).thenReturn("team-a");
        when(entityAlertEvidenceReadModelService.queryActiveAlertPage(any(), anyInt(), anyInt(), anyString()))
                .thenThrow(new IllegalStateException("alert database failure"));
        when(entityMonitorBindQueryService.findMonitorBindsByMonitorId(42L))
                .thenThrow(new IllegalStateException("binding database failure"));

        MonitorSignalView view = readModelService.query(monitor, START, END);

        assertEquals(MonitorSignalView.EvidenceState.UNAVAILABLE, view.collection().state());
        assertNull(view.collection().event());
        assertEquals(MonitorSignalView.EvidenceState.UNAVAILABLE, view.alerts().state());
        assertNull(view.alerts().activeCount());
        assertEquals(MonitorSignalView.EvidenceState.UNAVAILABLE, view.binding().state());
        assertNull(view.binding().identity());
    }

    @Test
    void currentAlertPreviewKeepsOptionalFieldsNullWithoutFallbacks() {
        Monitor monitor = monitor(42L);
        when(collectionRepositoryProvider.getIfAvailable()).thenReturn(null);
        when(entityWorkspaceAccessService.currentRequestWorkspaceId()).thenReturn("team-a");
        SingleAlert alert = SingleAlert.builder()
                .id(701L)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .labels(Map.of())
                .annotations(Map.of())
                .activeAt(null)
                .build();
        when(entityAlertEvidenceReadModelService.queryActiveAlertPage(List.of(monitor), 0, 5, "team-a"))
                .thenReturn(new PageImpl<>(List.of(alert), PageRequest.of(0, 5), 1));
        when(entityMonitorBindQueryService.findMonitorBindsByMonitorId(42L)).thenReturn(List.of());

        MonitorSignalView view = readModelService.query(monitor, START, END);

        assertEquals(MonitorSignalView.EvidenceState.READY, view.alerts().state());
        assertNull(view.alerts().previews().getFirst().severity());
        assertNull(view.alerts().previews().getFirst().summary());
        assertNull(view.alerts().previews().getFirst().activeAt());
    }

    @Test
    void bindingSignalsOnlyReflectNonemptyObservedOtlpEvidence() {
        Monitor monitor = monitor(42L);
        unavailableCollectionAndEmptyAlerts(monitor);
        when(entityMonitorBindQueryService.findMonitorBindsByMonitorId(42L))
                .thenReturn(List.of(activeBind(42L, 7L)));
        when(entityDetailObservabilityReadModelService.buildEntityDetail(7L))
                .thenReturn(detail(42L, 7L, false, true, false));

        MonitorSignalView view = readModelService.query(monitor, START, END);

        assertEquals(List.of("logs"), view.binding().identity().signals());
        assertEquals(MonitorSignalView.EvidenceState.READY, view.binding().state());
    }

    @Test
    void duplicateExactActiveBindingsAreUnavailable() {
        Monitor monitor = monitor(42L);
        unavailableCollectionAndEmptyAlerts(monitor);
        when(entityMonitorBindQueryService.findMonitorBindsByMonitorId(42L))
                .thenReturn(List.of(activeBind(42L, 7L), activeBind(42L, 8L)));

        MonitorSignalView view = readModelService.query(monitor, START, END);

        assertEquals(MonitorSignalView.EvidenceState.UNAVAILABLE, view.binding().state());
        assertNull(view.binding().identity());
        verifyNoInteractions(entityDetailObservabilityReadModelService);
    }

    @Test
    void entityIdentityMismatchIsUnavailable() {
        Monitor monitor = monitor(42L);
        unavailableCollectionAndEmptyAlerts(monitor);
        when(entityMonitorBindQueryService.findMonitorBindsByMonitorId(42L))
                .thenReturn(List.of(activeBind(42L, 7L)));
        when(entityDetailObservabilityReadModelService.buildEntityDetail(7L))
                .thenReturn(detail(42L, 8L, true, true, true));

        MonitorSignalView view = readModelService.query(monitor, START, END);

        assertEquals(MonitorSignalView.EvidenceState.UNAVAILABLE, view.binding().state());
        assertNull(view.binding().identity());
    }

    @Test
    void boundMonitorIdentityMismatchIsUnavailable() {
        Monitor monitor = monitor(42L);
        unavailableCollectionAndEmptyAlerts(monitor);
        when(entityMonitorBindQueryService.findMonitorBindsByMonitorId(42L))
                .thenReturn(List.of(activeBind(42L, 7L)));
        when(entityDetailObservabilityReadModelService.buildEntityDetail(7L))
                .thenReturn(detail(41L, 7L, true, true, true));

        MonitorSignalView view = readModelService.query(monitor, START, END);

        assertEquals(MonitorSignalView.EvidenceState.UNAVAILABLE, view.binding().state());
        assertNull(view.binding().identity());
    }

    @Test
    void rejectsInvalidWindowBeforeReadingEvidence() {
        Monitor monitor = monitor(42L);

        assertThrows(IllegalArgumentException.class, () -> readModelService.query(monitor, 0L, END));
        assertThrows(IllegalArgumentException.class, () -> readModelService.query(monitor, START, START));
        assertThrows(IllegalArgumentException.class,
                () -> readModelService.query(monitor, START, START + 86_400_001L));

        verifyNoInteractions(collectionRepositoryProvider, entityAlertEvidenceReadModelService,
                entityMonitorBindQueryService);
        verify(entityWorkspaceAccessService, never()).currentRequestWorkspaceId();
    }

    private void unavailableCollectionAndEmptyAlerts(Monitor monitor) {
        when(collectionRepositoryProvider.getIfAvailable()).thenReturn(null);
        when(entityWorkspaceAccessService.currentRequestWorkspaceId()).thenReturn("team-a");
        when(entityAlertEvidenceReadModelService.queryActiveAlertPage(List.of(monitor), 0, 5, "team-a"))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 5), 0));
    }

    private Monitor monitor(long id) {
        return Monitor.builder()
                .id(id)
                .name("checkout-monitor")
                .instance("db:3306")
                .build();
    }

    private SingleAlert alert(long id) {
        return SingleAlert.builder()
                .id(id)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .labels(Map.of("severity", "critical"))
                .annotations(Map.of("summary", "Checkout failed"))
                .activeAt(START + 30_000L)
                .build();
    }

    private EntityMonitorBind activeBind(long monitorId, long entityId) {
        return EntityMonitorBind.builder()
                .monitorId(monitorId)
                .entityId(entityId)
                .status("active")
                .build();
    }

    private EntityDetailDto detail(long monitorId,
                                   long entityId,
                                   boolean metrics,
                                   boolean logs,
                                   boolean traces) {
        ObserveEntity entity = new ObserveEntity();
        entity.setId(entityId);
        entity.setType("service");
        entity.setName("checkout");
        entity.setNamespace("commerce");
        entity.setEnvironment("production");
        EntityDto entityDto = new EntityDto();
        entityDto.setEntity(entity);

        EntityDetailDto detail = new EntityDetailDto();
        detail.setEntity(entityDto);
        MonitorInfo boundMonitor = new MonitorInfo();
        boundMonitor.setId(monitorId);
        detail.setBoundMonitors(List.of(boundMonitor));
        detail.setMetricEvidence(metrics ? List.of(new MetricEvidence()) : List.of());
        detail.setLogEvidence(logs ? List.of(new LogEvidence()) : List.of());
        detail.setTraceEvidence(traces ? List.of(new TraceEvidence()) : List.of());
        return detail;
    }
}
