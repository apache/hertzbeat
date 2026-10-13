/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.observability.investigation.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationEvidenceState;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationLogRecord;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationReason;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationServiceIdentity;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.warehouse.repository.ApmRedQueryRepository;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.NearbyQuery;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.RowsResult;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.Status;
import org.apache.hertzbeat.warehouse.repository.InvestigationQueryRepository.TraceSpanRow;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class InvestigationReadModelServiceTest {

    private static final long START = 1_787_934_874_000L;
    private static final long END = START + 60_000L;
    private static final String TRACE_ID = "0123456789abcdef0123456789abcdef";
    private static final String SPAN_ID = "0123456789abcdef";

    @Mock
    private ObjectProvider<InvestigationQueryRepository> repositoryProvider;

    @Mock
    private ObjectProvider<ApmRedQueryRepository> redRepositoryProvider;

    @Mock
    private InvestigationQueryRepository repository;

    private TraceInvestigationReadModelService traceService;
    private LogInvestigationReadModelService logService;

    @BeforeEach
    void setUp() {
        traceService = new TraceInvestigationReadModelService(repositoryProvider, redRepositoryProvider);
        logService = new LogInvestigationReadModelService(repositoryProvider);
    }

    @Test
    void completeTraceKeepsIndependentEmptyAndUnavailableEvidenceHonest() throws Exception {
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.trace(new InvestigationQueryRepository.TraceQuery("team-a", TRACE_ID, START, END)))
                .thenReturn(RowsResult.available(List.of(rootSpan()), false));
        when(repository.sameTraceLogs(new InvestigationQueryRepository.TraceLogsQuery(
                "team-a", TRACE_ID, START, END))).thenReturn(RowsResult.available(List.of(), false));
        when(redRepositoryProvider.getIfAvailable()).thenReturn(null);

        var view = traceService.query("team-a", TRACE_ID, null, START, END);

        assertEquals(InvestigationEvidenceState.READY, view.gantt().state());
        assertEquals(InvestigationEvidenceState.EMPTY, view.sameTraceLogs().state());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.red().state());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.metrics().state());
        assertEquals(InvestigationEvidenceState.EMPTY, view.dependencies().state());
        var json = JsonMapper.builder().build().readTree(JsonMapper.builder().build().writeValueAsString(view));
        assertTrue(json.path("gantt").path("detail").path("durationNanos").isString());
        assertEquals("2000000", json.path("gantt").path("detail").path("durationNanos").asText());
        assertTrue(json.path("gantt").path("detail").path("spans").path(0).path("durationNanos").isString());
    }

    @Test
    void absentSpansStillReturnIndependentlyObservedLogsWithoutInventingTraceIdentity() {
        InvestigationLogRecord log = new InvestigationLogRecord(
                "event-7", "1787934874782123456", null, 17, "ERROR", "failed", TRACE_ID, null,
                identity(), Map.of(), Map.of());
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.trace(new InvestigationQueryRepository.TraceQuery("team-a", TRACE_ID, START, END)))
                .thenReturn(RowsResult.available(List.of(), false));
        when(repository.sameTraceLogs(new InvestigationQueryRepository.TraceLogsQuery(
                "team-a", TRACE_ID, START, END))).thenReturn(RowsResult.available(List.of(log), true));

        var view = traceService.query("team-a", TRACE_ID, null, START, END);

        assertEquals(InvestigationEvidenceState.EMPTY, view.gantt().state());
        assertEquals(InvestigationEvidenceState.READY, view.sameTraceLogs().state());
        assertEquals(List.of(log), view.sameTraceLogs().logs());
        assertTrue(view.sameTraceLogs().truncated());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.red().state());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.metrics().state());
        assertEquals(InvestigationEvidenceState.EMPTY, view.dependencies().state());
        verifyNoInteractions(redRepositoryProvider);
    }

    @Test
    void absentSpansDoNotTurnFailedLogReadIntoEmptyEvidence() {
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.trace(new InvestigationQueryRepository.TraceQuery("team-a", TRACE_ID, START, END)))
                .thenReturn(RowsResult.available(List.of(), false));
        when(repository.sameTraceLogs(new InvestigationQueryRepository.TraceLogsQuery(
                "team-a", TRACE_ID, START, END))).thenReturn(RowsResult.failed(Status.STORAGE_UNAVAILABLE));

        var view = traceService.query("team-a", TRACE_ID, null, START, END);

        assertEquals(InvestigationEvidenceState.EMPTY, view.gantt().state());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.sameTraceLogs().state());
        assertEquals(InvestigationReason.STORAGE_UNAVAILABLE, view.sameTraceLogs().reason());
        verifyNoInteractions(redRepositoryProvider);
    }

    @Test
    void rejectsUppercaseTraceAndSpanSelectionsBeforeRepositoryResolution() {
        assertThrows(ObservabilityQueryRequestException.class,
                () -> traceService.query("team-a", "0123456789ABCDEF0123456789ABCDEF", null, START, END));
        assertThrows(ObservabilityQueryRequestException.class,
                () -> traceService.query("team-a", TRACE_ID, "0123456789ABCDEF", START, END));

        verifyNoInteractions(repositoryProvider);
    }

    @Test
    void duplicateSpanMakesWholeGanttUnavailable() {
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.trace(new InvestigationQueryRepository.TraceQuery("team-a", TRACE_ID, START, END)))
                .thenReturn(RowsResult.available(List.of(rootSpan(), rootSpan()), false));
        InvestigationLogRecord log = traceLog();
        when(repository.sameTraceLogs(new InvestigationQueryRepository.TraceLogsQuery(
                "team-a", TRACE_ID, START, END))).thenReturn(RowsResult.available(List.of(log), false));

        var view = traceService.query("team-a", TRACE_ID, null, START, END);

        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.gantt().state());
        assertEquals(InvestigationReason.MALFORMED_DATA, view.gantt().reason());
        assertEquals(InvestigationEvidenceState.READY, view.sameTraceLogs().state());
        assertEquals(List.of(log), view.sameTraceLogs().logs());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.dependencies().state());
    }

    @ParameterizedTest
    @EnumSource(value = Status.class, names = {"STORAGE_UNAVAILABLE", "MALFORMED_DATA", "LIMIT_EXCEEDED"})
    void failedTraceReadKeepsIndependentlyReadyLogs(Status status) {
        InvestigationLogRecord log = traceLog();
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.trace(new InvestigationQueryRepository.TraceQuery("team-a", TRACE_ID, START, END, SPAN_ID)))
                .thenReturn(RowsResult.failed(status));
        when(repository.sameTraceLogs(new InvestigationQueryRepository.TraceLogsQuery(
                "team-a", TRACE_ID, START, END))).thenReturn(RowsResult.available(List.of(log), false));

        var view = traceService.query("team-a", TRACE_ID, SPAN_ID, START, END);

        assertEquals(TRACE_ID, view.traceId());
        assertEquals(SPAN_ID, view.selectedSpanId());
        assertEquals(START, view.window().start());
        assertEquals(END, view.window().end());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.gantt().state());
        assertEquals(TraceInvestigationReadModelService.reason(status), view.gantt().reason());
        assertEquals(InvestigationEvidenceState.READY, view.sameTraceLogs().state());
        assertEquals(List.of(log), view.sameTraceLogs().logs());
        verifyNoInteractions(redRepositoryProvider);
    }

    @Test
    void partialTraceKeepsSelectedSpanAndMarksSubsetDerivedEvidence() {
        InvestigationLogRecord log = traceLog();
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.trace(new InvestigationQueryRepository.TraceQuery("team-a", TRACE_ID, START, END, SPAN_ID)))
                .thenReturn(RowsResult.available(List.of(rootSpan()), true));
        when(repository.sameTraceLogs(new InvestigationQueryRepository.TraceLogsQuery(
                "team-a", TRACE_ID, START, END))).thenReturn(RowsResult.available(List.of(log), false));

        var view = traceService.query("team-a", TRACE_ID, SPAN_ID, START, END);

        assertEquals(InvestigationEvidenceState.READY, view.gantt().state());
        assertTrue(view.gantt().detail().partial());
        assertEquals("unique", view.gantt().detail().rootState());
        assertEquals(SPAN_ID, view.selectedSpanId());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.dependencies().state());
        assertEquals(InvestigationReason.UPSTREAM_UNAVAILABLE, view.dependencies().reason());
        assertEquals(InvestigationEvidenceState.READY, view.sameTraceLogs().state());
    }

    @Test
    void missingSelectedSpanDoesNotFallbackAndKeepsRelatedLogs() {
        InvestigationLogRecord log = traceLog();
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.trace(new InvestigationQueryRepository.TraceQuery("team-a", TRACE_ID, START, END,
                "3333333333333333"))).thenReturn(RowsResult.available(List.of(rootSpan()), true));
        when(repository.sameTraceLogs(new InvestigationQueryRepository.TraceLogsQuery(
                "team-a", TRACE_ID, START, END))).thenReturn(RowsResult.available(List.of(log), false));

        var view = traceService.query("team-a", TRACE_ID, "3333333333333333", START, END);

        assertEquals(InvestigationEvidenceState.EMPTY, view.gantt().state());
        assertEquals(InvestigationReason.NOT_FOUND, view.gantt().reason());
        assertEquals("3333333333333333", view.selectedSpanId());
        assertEquals(InvestigationEvidenceState.READY, view.sameTraceLogs().state());
    }

    @Test
    void overLimitTraceWithNoMatchingLogsReportsSeparateEmptyEvidence() {
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.trace(new InvestigationQueryRepository.TraceQuery("team-a", TRACE_ID, START, END)))
                .thenReturn(RowsResult.failed(Status.LIMIT_EXCEEDED));
        when(repository.sameTraceLogs(new InvestigationQueryRepository.TraceLogsQuery(
                "team-a", TRACE_ID, START, END))).thenReturn(RowsResult.available(List.of(), false));

        var view = traceService.query("team-a", TRACE_ID, null, START, END);

        assertEquals(InvestigationReason.LIMIT_EXCEEDED, view.gantt().reason());
        assertEquals(InvestigationEvidenceState.EMPTY, view.sameTraceLogs().state());
        verifyNoInteractions(redRepositoryProvider);
    }

    @Test
    void thrownTraceReadDoesNotBlockIndependentUnavailableLogStatus() {
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.trace(new InvestigationQueryRepository.TraceQuery("team-a", TRACE_ID, START, END)))
                .thenThrow(new IllegalStateException("storage read failed"));
        when(repository.sameTraceLogs(new InvestigationQueryRepository.TraceLogsQuery(
                "team-a", TRACE_ID, START, END))).thenReturn(RowsResult.failed(Status.MALFORMED_DATA));

        var view = traceService.query("team-a", TRACE_ID, null, START, END);

        assertEquals(InvestigationReason.STORAGE_UNAVAILABLE, view.gantt().reason());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.sameTraceLogs().state());
        assertEquals(InvestigationReason.MALFORMED_DATA, view.sameTraceLogs().reason());
    }

    @Test
    void thrownLogReadDoesNotBlockReadyTrace() {
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.trace(new InvestigationQueryRepository.TraceQuery("team-a", TRACE_ID, START, END)))
                .thenReturn(RowsResult.available(List.of(rootSpan()), false));
        when(repository.sameTraceLogs(new InvestigationQueryRepository.TraceLogsQuery(
                "team-a", TRACE_ID, START, END))).thenThrow(new IllegalStateException("log storage read failed"));
        when(redRepositoryProvider.getIfAvailable()).thenReturn(null);

        var view = traceService.query("team-a", TRACE_ID, null, START, END);

        assertEquals(InvestigationEvidenceState.READY, view.gantt().state());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.sameTraceLogs().state());
        assertEquals(InvestigationReason.STORAGE_UNAVAILABLE, view.sameTraceLogs().reason());
    }

    @Test
    void malformedSelectedLogDoesNotBecomeNotFound() {
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.selectedLog(new InvestigationQueryRepository.LogQuery("team-a", "event-7", START, END)))
                .thenReturn(RowsResult.failed(Status.MALFORMED_DATA));

        var view = logService.query("team-a", "event-7", START, END);

        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.selectedLog().state());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.trace().state());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.nearbyLogs().state());
    }

    @Test
    void duplicateSelectedLogRowsAreMalformedAtServiceBoundary() {
        InvestigationLogRecord log = new InvestigationLogRecord(
                "event-7", "1787934874782123456", null, 17, "ERROR", "failed", null, null,
                identity(), Map.of(), Map.of());
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.selectedLog(new InvestigationQueryRepository.LogQuery("team-a", "event-7", START, END)))
                .thenReturn(RowsResult.available(List.of(log, log), false));

        var view = logService.query("team-a", "event-7", START, END);

        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.selectedLog().state());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.trace().state());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.nearbyLogs().state());
    }

    @Test
    void disconnectedParentCycleMakesWholeGanttUnavailable() {
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.trace(new InvestigationQueryRepository.TraceQuery("team-a", TRACE_ID, START, END)))
                .thenReturn(RowsResult.available(List.of(rootSpan(),
                        childSpan("1111111111111111", "2222222222222222"),
                        childSpan("2222222222222222", "1111111111111111")), false));
        when(repository.sameTraceLogs(new InvestigationQueryRepository.TraceLogsQuery(
                "team-a", TRACE_ID, START, END))).thenReturn(RowsResult.available(List.of(), false));

        var view = traceService.query("team-a", TRACE_ID, null, START, END);

        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.gantt().state());
        assertEquals(InvestigationEvidenceState.EMPTY, view.sameTraceLogs().state());
        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.dependencies().state());
    }

    @Test
    void selectedLogWithoutTraceHasNotCorrelatedTraceAndBoundedNearbyRows() {
        InvestigationLogRecord log = new InvestigationLogRecord(
                "event-7", "1787934874782123456", null, 17, "ERROR", "failed", null, null,
                identity(), Map.of(), Map.of());
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.selectedLog(new InvestigationQueryRepository.LogQuery("team-a", "event-7", START, END)))
                .thenReturn(RowsResult.available(List.of(log), false));
        when(repository.nearbyLogs(new InvestigationQueryRepository.NearbyQuery(
                "team-a", "event-7", 1_787_934_874_782_123_456L, "checkout", "7", "service", "payments", "prod",
                START, END)))
                .thenReturn(new InvestigationQueryRepository.NearbyResult(
                        Status.AVAILABLE, List.of(), List.of(), false, false));

        var view = logService.query("team-a", "event-7", START, END);

        assertEquals(InvestigationEvidenceState.READY, view.selectedLog().state());
        assertEquals(InvestigationEvidenceState.EMPTY, view.trace().state());
        assertEquals(InvestigationEvidenceState.EMPTY, view.nearbyLogs().state());
    }

    @Test
    void sourceBackedHostAndServiceCanScopeNearbyLogsWithoutEntityIdentity() {
        InvestigationLogRecord log = new InvestigationLogRecord(
                "event-7", "1787934874782123456", null, 17, "ERROR", "failed", null, null,
                null, Map.of(), Map.of("service.name", "checkout", "host.name", "node-1",
                        "service.namespace", "payments", "deployment.environment", "prod"));
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.selectedLog(new InvestigationQueryRepository.LogQuery("team-a", "event-7", START, END)))
                .thenReturn(RowsResult.available(List.of(log), false));
        when(repository.nearbyLogs(any())).thenReturn(new InvestigationQueryRepository.NearbyResult(
                Status.AVAILABLE, List.of(), List.of(), false, false));

        var view = logService.query("team-a", "event-7", START, END);

        assertEquals(InvestigationEvidenceState.EMPTY, view.nearbyLogs().state());
        verify(repository).nearbyLogs(new NearbyQuery("team-a", "event-7", 1_787_934_874_782_123_456L,
                "checkout", null, null, "payments", "prod", START, END, "node-1"));
    }

    @Test
    void hostFallbackNeedsBothPersistedHostAndService() {
        InvestigationLogRecord log = new InvestigationLogRecord(
                "event-7", "1787934874782123456", null, 17, "ERROR", "failed", null, null,
                null, Map.of(), Map.of("service.name", "checkout"));
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.selectedLog(new InvestigationQueryRepository.LogQuery("team-a", "event-7", START, END)))
                .thenReturn(RowsResult.available(List.of(log), false));

        var view = logService.query("team-a", "event-7", START, END);

        assertEquals(InvestigationEvidenceState.UNAVAILABLE, view.nearbyLogs().state());
        assertEquals(InvestigationReason.IDENTITY_UNAVAILABLE, view.nearbyLogs().reason());
        verify(repository, never()).nearbyLogs(any());
    }

    @Test
    void logFirstTraceCarriesSelectedSpanAndPartialCompleteness() {
        InvestigationLogRecord log = new InvestigationLogRecord(
                "event-7", "1787934874782123456", null, 17, "ERROR", "failed", TRACE_ID, SPAN_ID,
                identity(), Map.of(), Map.of());
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.selectedLog(new InvestigationQueryRepository.LogQuery("team-a", "event-7", START, END)))
                .thenReturn(RowsResult.available(List.of(log), false));
        when(repository.trace(new InvestigationQueryRepository.TraceQuery("team-a", TRACE_ID, START, END, SPAN_ID)))
                .thenReturn(RowsResult.available(List.of(rootSpan()), true));
        when(repository.nearbyLogs(new InvestigationQueryRepository.NearbyQuery(
                "team-a", "event-7", 1_787_934_874_782_123_456L, "checkout", "7", "service", "payments", "prod",
                START, END))).thenReturn(new InvestigationQueryRepository.NearbyResult(Status.AVAILABLE,
                List.of(), List.of(), false, false));

        var view = logService.query("team-a", "event-7", START, END);

        assertEquals(InvestigationEvidenceState.READY, view.trace().state());
        assertTrue(view.trace().detail().partial());
        assertEquals(SPAN_ID, view.trace().detail().spans().getFirst().spanId());
    }

    @Test
    void logFirstMissingSelectedSpanDoesNotSubstituteAnotherSpan() {
        String missingSpanId = "3333333333333333";
        InvestigationLogRecord log = new InvestigationLogRecord(
                "event-7", "1787934874782123456", null, 17, "ERROR", "failed", TRACE_ID, missingSpanId,
                identity(), Map.of(), Map.of());
        when(repositoryProvider.getIfAvailable()).thenReturn(repository);
        when(repository.selectedLog(new InvestigationQueryRepository.LogQuery("team-a", "event-7", START, END)))
                .thenReturn(RowsResult.available(List.of(log), false));
        when(repository.trace(new InvestigationQueryRepository.TraceQuery(
                "team-a", TRACE_ID, START, END, missingSpanId))).thenReturn(RowsResult.available(List.of(rootSpan()), true));
        when(repository.nearbyLogs(new InvestigationQueryRepository.NearbyQuery(
                "team-a", "event-7", 1_787_934_874_782_123_456L, "checkout", "7", "service", "payments", "prod",
                START, END))).thenReturn(new InvestigationQueryRepository.NearbyResult(Status.AVAILABLE,
                List.of(), List.of(), false, false));

        var view = logService.query("team-a", "event-7", START, END);

        assertEquals(InvestigationEvidenceState.EMPTY, view.trace().state());
        assertEquals(InvestigationReason.NOT_FOUND, view.trace().reason());
        assertEquals(InvestigationEvidenceState.READY, view.selectedLog().state());
    }

    private TraceSpanRow rootSpan() {
        return new TraceSpanRow(START, START * 1_000_000L, START + 2, TRACE_ID, SPAN_ID, null, "GET /checkout", "checkout",
                "STATUS_CODE_OK", null, "SPAN_KIND_SERVER", null, "checkout", "1.0", 2_000_000L,
                "team-a", "7", "service", "payments", "prod", Map.of("service.name", "checkout"), Map.of(),
                List.of(), List.of(), null);
    }

    private TraceSpanRow childSpan(String spanId, String parentSpanId) {
        return new TraceSpanRow(START + 1, (START + 1) * 1_000_000L, START + 2, TRACE_ID, spanId, parentSpanId, "child", "checkout",
                "STATUS_CODE_UNSET", null, "SPAN_KIND_INTERNAL", null, "checkout", "1.0", 1_000L,
                "team-a", null, null, null, null, Map.of("service.name", "checkout"), Map.of(),
                List.of(), List.of(), null);
    }

    private InvestigationServiceIdentity identity() {
        return new InvestigationServiceIdentity("team-a", "7", "service", "checkout", "payments", "prod");
    }

    private InvestigationLogRecord traceLog() {
        return new InvestigationLogRecord("event-7", "1787934874782123456", null, 17, "ERROR", "failed", TRACE_ID,
                null, identity(), Map.of(), Map.of());
    }
}
