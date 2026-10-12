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

package org.apache.hertzbeat.observability.logs.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSeverityCategory;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class LogFacetScopeContractTest {
    @Test
    void bothEndpointsResolveTrustedEntityAndRetainEveryOtherSubmittedPredicate() {
        var reader = mock(HistoryDataReader.class);
        var gateway = mock(ObservabilityWorkspaceQueryGateway.class);
        when(gateway.findEntityById("workspace-proof", 42L)).thenReturn(Optional.of(new ObserveEntity()));
        when(gateway.findIdentitiesByEntityId("workspace-proof", 42L)).thenReturn(List.of());
        var service = new LogQueryServiceImpl(List.of(reader), Optional.of(gateway));
        var query = query(42L, "hertzbeat.entity_id=99 and service.version IN ('v1','v2')");
        var field = LogFacets.Field.parse("attribute:detail");
        when(reader.logFacetFields(any())).thenAnswer(call -> LogFacets.Fields.empty(((LogFacets.Scope) call.getArgument(0)).window()));
        when(reader.logFacetValues(any(), eq(field), eq(20))).thenAnswer(call -> LogFacets.Values.empty(
                ((LogFacets.Scope) call.getArgument(0)).window(), field));
        service.facetFields(query);
        service.facetValues(query, field, 20);
        var scope = ArgumentCaptor.forClass(LogFacets.Scope.class);
        verify(reader).logFacetFields(scope.capture());
        verify(reader).logFacetValues(scope.capture(), eq(field), eq(20));
        assertEquals(scope.getAllValues().getFirst(), scope.getAllValues().getLast());
        var actual = scope.getValue();
        assertEquals("workspace-proof", actual.workspaceId());
        assertEquals("42", actual.resourceFilters().get("hertzbeat.entity_id"));
        assertTrue(actual.resourceFilters().get("service.version").startsWith("__hz_in__:"));
        assertEquals(Map.of("detail", "__hz_contains__:timeout"), actual.attributeFilters());
        assertEquals("trace-proof", actual.traceId());
        assertEquals("span-proof", actual.spanId());
        assertEquals(LogSeverityCategory.ERROR, actual.severityCategory());
        assertEquals("SEVERE", actual.severityText());
        assertEquals("failure", actual.search());
        assertEquals("checkout", actual.serviceName());
        assertEquals("shop", actual.serviceNamespace());
        assertEquals("prod", actual.environment());
        assertTrue(actual.requireServiceName());
        assertTrue(!actual.excludedServiceNames().isEmpty());
    }

    @Test
    void foreignEntityAndMissingWorkspaceNeverReadUnscopedRows() {
        var reader = mock(HistoryDataReader.class);
        var gateway = mock(ObservabilityWorkspaceQueryGateway.class);
        when(gateway.findEntityById("workspace-proof", 99L)).thenReturn(Optional.empty());
        var service = new LogQueryServiceImpl(List.of(reader), Optional.of(gateway));
        var field = LogFacets.Field.parse("builtin:serviceName");
        assertEquals(0L, service.facetValues(query(99L, ""), field, 20).matchedCount());
        assertEquals(0, service.facetFields(query(99L, "")).coverage().scannedRows());
        assertThrows(org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException.class, () -> service.facetFields(new LogQueryService.FacetQuery(
                "", null, 1000, 2000, null, null, null, null, null, null, null, null, null, null, null, false, false)));
        verifyNoInteractions(reader);
    }

    @Test
    void absentFacetCapabilityIsUnavailableRatherThanListFallback() {
        var service = new LogQueryServiceImpl(List.of());
        var result = service.facetValues(query(null, ""), LogFacets.Field.parse("builtin:serviceName"), 20);
        assertEquals("unavailable", result.state());
        org.junit.jupiter.api.Assertions.assertNull(result.matchedCount());
    }

    private LogQueryService.FacetQuery query(Long entityId, String resources) {
        return new LogQueryService.FacetQuery("workspace-proof", entityId, 1000, 2000,
                "trace-proof", "span-proof", null, "SEVERE", LogSeverityCategory.ERROR, "failure", "checkout",
                "shop", "prod", resources, "detail CONTAINS 'timeout'", true, true);
    }
}
