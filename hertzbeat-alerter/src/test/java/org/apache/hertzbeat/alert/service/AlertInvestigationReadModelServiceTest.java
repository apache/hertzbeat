/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.alert.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView.TraceStatus;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationEvidenceState;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationLogRecord;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationReason;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.IdentityQuery;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.RowsResult;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.TraceSummaryRow;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository.MonitorCollectionEvent;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository.MonitorCollectionEventQuery;
import org.apache.hertzbeat.warehouse.repository.MonitorCollectionEventQueryRepository.MonitorCollectionEventQueryResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

@ExtendWith(MockitoExtension.class)
class AlertInvestigationReadModelServiceTest {

    private static final long START = 1_787_934_874_000L;
    private static final long END = START + 60_000L;

    @Mock
    private AlertService alertService;
    @Mock
    private ObjectProvider<InvestigationQueryRepository> signalProvider;
    @Mock
    private InvestigationQueryRepository signalRepository;
    @Mock
    private ObjectProvider<MonitorCollectionEventQueryRepository> collectionProvider;
    @Mock
    private MonitorCollectionEventQueryRepository collectionRepository;

    private AlertInvestigationReadModelService service;

    @BeforeEach
    void setUp() {
        service = new AlertInvestigationReadModelService(alertService, signalProvider, collectionProvider);
    }

    @Test
    void composesExactWorkspaceScopedEvidenceAndPreservesUnknownCollectionDuration() {
        when(alertService.findSingleAlert("team-a", 7L)).thenReturn(Optional.of(alert(Map.of(
                "alertname", "High latency",
                "severity", "critical",
                "service.name", "checkout",
                "service.namespace", "payments",
                "deployment.environment.name", "prod",
                CommonConstants.LABEL_ENTITY_ID, "11",
                CommonConstants.LABEL_MONITOR_ID, "22"))));
        when(signalProvider.getIfAvailable()).thenReturn(signalRepository);
        when(signalRepository.identityLogs(any())).thenReturn(RowsResult.available(List.of(log()), false));
        when(signalRepository.identityTraces(any())).thenReturn(RowsResult.available(List.of(
                new TraceSummaryRow("0123456789abcdef0123456789abcdef", "1787934874782123456",
                        "42000", "error", 2, "checkout")), false));
        when(collectionProvider.getIfAvailable()).thenReturn(collectionRepository);
        when(collectionRepository.query(any())).thenReturn(MonitorCollectionEventQueryResult.available(
                new MonitorCollectionEvent(START + 1L, -1L, "unknown", null, null, null, null, null, 0, 0)));

        var view = service.query("team-a", 7L, START, END);

        assertEquals(START + 10L, view.window().anchor());
        assertEquals(InvestigationEvidenceState.READY, view.identity().state());
        assertEquals(11L, view.identity().identity().entityId());
        assertEquals(InvestigationEvidenceState.READY, view.logs().state());
        assertEquals(TraceStatus.ERROR, view.traces().traces().getFirst().status());
        assertEquals(-1L, view.collection().event().durationMillis());
        assertEquals(InvestigationReason.QUERY_STRATEGY_UNAVAILABLE, view.metrics().reason());
        assertEquals(InvestigationReason.IDENTITY_UNAVAILABLE, view.topology().reason());
        verify(signalRepository).identityLogs(new IdentityQuery(
                "team-a", "11", "checkout", "payments", "prod", START, END));
        verify(collectionRepository).query(new MonitorCollectionEventQuery(22L, START, END));
    }

    @Test
    void absentCanonicalLabelsDoNotGuessFromInstanceContentOrUnknownAliases() {
        SingleAlert alert = alert(Map.of("instance", "checkout", "monitor.id", "22",
                "hertzbeat.entity_id", "11"));
        alert.setContent("service.name=checkout monitor=22");
        when(alertService.findSingleAlert("team-a", 7L)).thenReturn(Optional.of(alert));

        var view = service.query("team-a", 7L, START, END);

        assertEquals(InvestigationReason.IDENTITY_UNAVAILABLE, view.identity().reason());
        assertEquals(InvestigationReason.IDENTITY_UNAVAILABLE, view.logs().reason());
        assertEquals(InvestigationReason.IDENTITY_UNAVAILABLE, view.traces().reason());
        assertEquals(InvestigationReason.IDENTITY_UNAVAILABLE, view.collection().reason());
        verify(signalProvider, never()).getIfAvailable();
        verify(collectionProvider, never()).getIfAvailable();
    }

    @Test
    void malformedCanonicalLabelFailsIdentityClosed() {
        when(alertService.findSingleAlert("team-a", 7L)).thenReturn(Optional.of(alert(Map.of(
                "service.name", "checkout", CommonConstants.LABEL_ENTITY_ID, "not-positive"))));

        var view = service.query("team-a", 7L, START, END);

        assertEquals(InvestigationReason.MALFORMED_DATA, view.identity().reason());
        assertEquals(InvestigationReason.MALFORMED_DATA, view.logs().reason());
        assertEquals(InvestigationReason.MALFORMED_DATA, view.traces().reason());
        assertEquals(InvestigationReason.MALFORMED_DATA, view.collection().reason());
        assertEquals(InvestigationReason.QUERY_STRATEGY_UNAVAILABLE, view.metrics().reason());
        assertEquals(InvestigationReason.IDENTITY_UNAVAILABLE, view.topology().reason());
        verify(signalProvider, never()).getIfAvailable();
        verify(collectionProvider, never()).getIfAvailable();
    }

    @Test
    void distinguishesEmptyStorageFailureAndTruncatedReadyEvidence() {
        when(alertService.findSingleAlert("team-a", 7L)).thenReturn(Optional.of(alert(Map.of(
                "service.name", "checkout"))));
        when(signalProvider.getIfAvailable()).thenReturn(signalRepository);
        when(signalRepository.identityLogs(any())).thenReturn(RowsResult.available(List.of(log()), true));
        when(signalRepository.identityTraces(any())).thenReturn(RowsResult.available(List.of(), false));

        var view = service.query("team-a", 7L, START, END);

        assertEquals(InvestigationEvidenceState.READY, view.logs().state());
        assertEquals(true, view.logs().truncated());
        assertEquals(InvestigationEvidenceState.EMPTY, view.traces().state());

        when(signalProvider.getIfAvailable()).thenThrow(new IllegalStateException("bean failure"));
        view = service.query("team-a", 7L, START, END);
        assertEquals(InvestigationReason.STORAGE_UNAVAILABLE, view.logs().reason());
        assertEquals(InvestigationReason.STORAGE_UNAVAILABLE, view.traces().reason());
    }

    @Test
    void rejectsMissingMismatchedOrOutOfWindowAnchors() {
        when(alertService.findSingleAlert("team-a", 7L)).thenReturn(Optional.empty());
        assertThrows(AlertInvestigationNotFoundException.class,
                () -> service.query("team-a", 7L, START, END));

        SingleAlert wrongWorkspace = alert(Map.of());
        wrongWorkspace.setWorkspaceId("team-b");
        when(alertService.findSingleAlert("team-a", 7L)).thenReturn(Optional.of(wrongWorkspace));
        assertThrows(AlertInvestigationNotFoundException.class,
                () -> service.query("team-a", 7L, START, END));

        SingleAlert outside = alert(Map.of());
        outside.setActiveAt(END);
        outside.setStartAt(START + 1L);
        when(alertService.findSingleAlert("team-a", 7L)).thenReturn(Optional.of(outside));
        assertThrows(AlertInvestigationRequestException.class,
                () -> service.query("team-a", 7L, START, END));
    }

    @Test
    void unexpectedSignalFailuresDegradeLogsAndTracesIndependently() {
        when(alertService.findSingleAlert("team-a", 7L)).thenReturn(Optional.of(alert(Map.of(
                "service.name", "checkout"))));
        when(signalProvider.getIfAvailable()).thenReturn(signalRepository);
        when(signalRepository.identityLogs(any())).thenThrow(new IllegalStateException("logs failed"));
        when(signalRepository.identityTraces(any())).thenReturn(RowsResult.available(List.of(), false));

        var view = service.query("team-a", 7L, START, END);

        assertEquals(InvestigationReason.STORAGE_UNAVAILABLE, view.logs().reason());
        assertEquals(InvestigationEvidenceState.EMPTY, view.traces().state());

        reset(signalRepository);
        when(signalRepository.identityLogs(any())).thenReturn(RowsResult.available(List.of(log()), false));
        when(signalRepository.identityTraces(any())).thenThrow(new IllegalStateException("traces failed"));

        view = service.query("team-a", 7L, START, END);

        assertEquals(InvestigationEvidenceState.READY, view.logs().state());
        assertEquals(InvestigationReason.STORAGE_UNAVAILABLE, view.traces().reason());
    }

    private SingleAlert alert(Map<String, String> labels) {
        return SingleAlert.builder()
                .workspaceId("team-a")
                .id(7L)
                .labels(labels)
                .annotations(Map.of("summary", "slow"))
                .status("firing")
                .content("persisted content")
                .activeAt(START + 10L)
                .startAt(START + 1L)
                .build();
    }

    private InvestigationLogRecord log() {
        return new InvestigationLogRecord("event-7", "1787934874782123456", null, 17, "ERROR",
                "slow", null, null, null, Map.of(), Map.of());
    }
}
