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

package org.apache.hertzbeat.observability.logs.controller;

import org.apache.hertzbeat.common.observability.gateway.TelemetrySource;
import org.apache.hertzbeat.common.observability.gateway.TelemetrySourceContext;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.observability.logs.service.impl.LogQueryServiceImpl;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class LogAnalysisControllerTest {
    @AfterEach
    void clear() {
        AuthTokenRequestContext.clear();
        TelemetrySourceContext.clear();
    }

    @Test
    void throughputAndSumDispatchTogetherAndInvalidViewFailsBeforeAdmission() {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var admission = mock(ObservabilityQueryAdmissionService.class);
        var rejected = new LogQueryController(service, admission, null);
        assertThrows(ObservabilityQueryRequestException.class,
                () -> rejected.analysis(Map.of("start", "1000", "end", "2000", "view", "groups", "transform", "throughput")));
        assertThrows(ObservabilityQueryRequestException.class, () -> rejected.compare("""
                {"version":1,"parameters":{"start":"1000","end":"2000","view":"groups","transform":"throughput"},
                "queries":[{"id":"a"},{"id":"b"}]}
                """));
        verifyNoInteractions(service, admission);
        controller(service).analysis(Map.of("start", "1000", "end", "2000", "view", "timeseries", "transform", "throughput",
                "measure", "{\"function\":\"sum\",\"field\":\"attribute:bytes\"}"));
        var captured = org.mockito.ArgumentCaptor.forClass(org.apache.hertzbeat.common.observability.dto.log.LogAnalysis.Request.class);
        org.mockito.Mockito.verify(service).analysis(org.mockito.ArgumentMatchers.any(), captured.capture());
        org.junit.jupiter.api.Assertions.assertEquals("sum", captured.getValue().measure().function());
        org.junit.jupiter.api.Assertions.assertEquals("throughput", captured.getValue().transform());
    }

    @Test
    void selfVisibilityConflictInPostEnvelopeFailsBeforeAdmission() {
        AuthTokenRequestContext.bindWorkspaceId("default");
        TelemetrySourceContext.bind(
                new TelemetrySourceContext.Route(
                        TelemetrySource.SELF, "ci_self", "default"));
        var service = mock(LogQueryService.class);
        var admission = mock(ObservabilityQueryAdmissionService.class);
        var controller = new LogQueryController(service, admission, null);
        assertThrows(ObservabilityQueryRequestException.class, () -> controller.compare("""
                {"version":1,"parameters":{"start":"1000","end":"2000","hideInternal":"true"},
                "queries":[{"id":"a"},{"id":"b"}]}
                """));
        assertThrows(ObservabilityQueryRequestException.class, () -> controller.analysis(
                Map.of("start", "1000", "end", "2000", "hideInternal", "true")));
        verifyNoInteractions(service, admission);
    }

    @Test
    void explicitIntervalsArePreservedInControllerDispatch() {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var controller = controller(service);
        for (long interval : org.apache.hertzbeat.common.observability.dto.log.LogTrend.EXPLICIT_INTERVALS_MS) {
            controller.analysis(Map.of("start", "1000", "end", "3000", "view", "timeseries", "intervalMs", Long.toString(interval)));
        }
        var requests = org.mockito.ArgumentCaptor.forClass(org.apache.hertzbeat.common.observability.dto.log.LogAnalysis.Request.class);
        org.mockito.Mockito.verify(service, org.mockito.Mockito.times(11)).analysis(org.mockito.ArgumentMatchers.any(), requests.capture());
        org.junit.jupiter.api.Assertions.assertEquals(org.apache.hertzbeat.common.observability.dto.log.LogTrend.EXPLICIT_INTERVALS_MS,
                requests.getAllValues().stream().map(org.apache.hertzbeat.common.observability.dto.log.LogAnalysis.Request::intervalMs).toList());
    }

    @Test
    void invalidControlsAndUnsupportedSyntaxPreserveSafeErrors() {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var controller = controller(service);
        assertThrows(ObservabilityQueryRequestException.class,
                () -> controller.analysis(Map.of("start", "1000", "end", "5000", "limit", "101")));
        assertThrows(LogFilterQueryException.class,
                () -> controller.analysis(Map.of("start", "1000", "end", "5000", "searchSyntax", "unknown")));
        verifyNoInteractions(service);
    }

    @Test
    void missingTrustedWorkspaceAndUnavailableReaderNeverProduceSuccessZero() {
        var controller = controller(new LogQueryServiceImpl(List.of()));
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> controller.analysis(Map.of("start", "1000", "end", "5000")));
        AuthTokenRequestContext.bindWorkspaceId("default");
        assertThrows(TelemetryStorageUnavailableException.class,
                () -> controller.analysis(Map.of("start", "1000", "end", "5000")));
    }

    @Test
    void querySetSeriesBudgetIsReportedAsCalculatedBudgetError() {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var reader = mock(org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader.class);
        org.mockito.Mockito.when(reader.logQuerySet(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyLong()))
                .thenThrow(new org.apache.hertzbeat.common.observability.dto.log.LogQuerySet.SeriesBudgetExceeded());
        var service = new LogQueryServiceImpl(List.of(reader));

        var failure = assertThrows(LogFilterQueryException.class, () -> controller(service).querySet("""
                {"version":2,"parameters":{"start":"1000","end":"2000"},
                "queries":[{"refId":"a","alias":"A","visible":true,
                "analysis":{"limit":25,"minCount":1,"order":"count-desc"}}],"formulas":[]}
                """));

        org.junit.jupiter.api.Assertions.assertEquals("calculated_budget_exceeded", failure.detail().reason());
    }

    @Test
    void measuredOrderDefaultAndExplicitCountRemainUnambiguous() {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var controller = controller(service);
        controller.analysis(Map.of("start", "1000", "end", "5000", "measure",
                "{\"function\":\"avg\",\"field\":\"attribute:duration\"}"));
        controller.analysis(Map.of("start", "1000", "end", "5000", "measure", "{\"function\":\"count\"}"));
        var requests = org.mockito.ArgumentCaptor.forClass(org.apache.hertzbeat.common.observability.dto.log.LogAnalysis.Request.class);
        org.mockito.Mockito.verify(service, org.mockito.Mockito.times(2)).analysis(org.mockito.ArgumentMatchers.any(), requests.capture());
        org.junit.jupiter.api.Assertions.assertEquals("measure-desc", requests.getAllValues().getFirst().order());
        org.junit.jupiter.api.Assertions.assertEquals("avg", requests.getAllValues().getFirst().measure().function());
        org.junit.jupiter.api.Assertions.assertEquals("count-desc", requests.getAllValues().getLast().order());
        org.junit.jupiter.api.Assertions.assertNull(requests.getAllValues().getLast().measure());
    }

    @Test
    void invalidMeasureOrExplicitIncompatibleOrderNeverCallsService() {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var controller = controller(service);
        for (Map<String, String> additional : List.of(
                Map.of("measure", "{}"),
                Map.of("measure", "{\"function\":\"avg\",\"field\":\"attribute:x\"}", "order", "count-desc"),
                Map.of("measure", "{\"function\":\"count\"}", "order", "measure-asc"),
                Map.of("order", "measure-desc"))) {
            var parameters = new java.util.HashMap<>(additional);
            parameters.put("start", "1000");
            parameters.put("end", "5000");
            assertThrows(ObservabilityQueryRequestException.class, () -> controller.analysis(parameters));
        }
        verifyNoInteractions(service);
    }

    @Test
    void groupingDerivesProductAndRejectsConflictingLegacyControls() {
        AuthTokenRequestContext.bindWorkspaceId("default");
        var service = mock(LogQueryService.class);
        var controller = controller(service);
        String grouping = "{\"version\":1,\"dimensions\":[{\"field\":\"attribute:x\",\"limit\":5},"
                + "{\"field\":\"attribute:y\",\"limit\":4}]}";
        for (String conflict : List.of("field", "limit")) {
            assertThrows(ObservabilityQueryRequestException.class,
                    () -> controller.analysis(Map.of("start", "1000", "end", "5000", "grouping", grouping, conflict, "")));
        }
        verifyNoInteractions(service);
        controller.analysis(Map.of("start", "1000", "end", "5000", "grouping", grouping));
        var request = org.mockito.ArgumentCaptor.forClass(org.apache.hertzbeat.common.observability.dto.log.LogAnalysis.Request.class);
        org.mockito.Mockito.verify(service).analysis(org.mockito.ArgumentMatchers.any(), request.capture());
        org.junit.jupiter.api.Assertions.assertEquals(20, request.getValue().limit());
        org.junit.jupiter.api.Assertions.assertNull(request.getValue().field());
        org.junit.jupiter.api.Assertions.assertEquals(2, request.getValue().grouping().dimensions().size());
    }

    private static LogQueryController controller(LogQueryService service) {
        return new LogQueryController(service,
                new ObservabilityQueryAdmissionService(8, 8, 8, 4, 8, Duration.ofMillis(100)), null);
    }
}
