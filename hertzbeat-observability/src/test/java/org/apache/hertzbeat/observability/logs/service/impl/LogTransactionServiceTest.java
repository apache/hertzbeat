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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogTransactions;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.observability.logs.service.LogQueryService.ContextFilters;
import org.apache.hertzbeat.observability.logs.service.LogQueryService.FacetQuery;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;

class LogTransactionServiceTest {
    private final LogTransactions.Request request = new LogTransactions.Request(1,
            LogFacets.Field.parse("attribute:request.id"), 20, "related-count-desc");

    private FacetQuery query(Long entity, String syntax, String search) {
        return new FacetQuery("default", entity, 4000000L, 4005000L, "trace", "span", 17, "ERROR", null,
                search, "checkout", "shop", "prod", "collector=local and zone=west", "endpoint=/checkout and tag=seed",
                true, false, syntax, null, null);
    }

    @Test
    void separatesOnlyAuthoredFiltersAndPreservesSelectedContext() {
        var reader = mock(HistoryDataReader.class, invocation -> {
            if (!"logTransactions".equals(invocation.getMethod().getName())) { return null; }
            LogTransactions.Query scoped = invocation.getArgument(0);
            var population = scoped.population();
            assertEquals("default", population.workspaceId());
            assertEquals("checkout", population.serviceName());
            assertEquals("trace", population.traceId());
            assertEquals("span", population.spanId());
            assertEquals("local", population.resourceFilters().get("collector"));
            assertEquals("/checkout", population.attributeFilters().get("endpoint"));
            assertEquals(1, population.resourceFilters().size());
            assertEquals(1, population.attributeFilters().size());
            assertNull(population.search());
            assertNull(population.severityNumber());
            assertEquals("a OR b", scoped.seed().scope().search());
            assertEquals(17, scoped.seed().scope().severityNumber());
            assertEquals("west", scoped.seed().scope().resourceFilters().get("zone"));
            throw new UnsupportedOperationException();
        });
        var service = new LogQueryServiceImpl(List.of(reader));
        assertThrows(TelemetryStorageUnavailableException.class, () -> service.transactions(query(null, null, "a OR b"),
                new ContextFilters("collector=local", "endpoint=/checkout"), request));
    }

    @Test
    void resolvedEntityRestrictionSurvivesExpansionAndIsResolvedOnce() {
        var gateway = mock(org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway.class);
        org.mockito.Mockito.when(gateway.findEntityById("default", 5L)).thenReturn(java.util.Optional.of(
                org.apache.hertzbeat.common.entity.manager.ObserveEntity.builder().id(5L).type("service").name("checkout").build()));
        org.mockito.Mockito.when(gateway.findIdentitiesByEntityId("default", 5L)).thenReturn(List.of());
        var reader = mock(HistoryDataReader.class, invocation -> {
            if (!"logTransactions".equals(invocation.getMethod().getName())) { return null; }
            LogTransactions.Query scoped = invocation.getArgument(0);
            assertEquals("5", scoped.population().resourceFilters().get(org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID));
            assertEquals("5", scoped.seed().scope().resourceFilters().get(org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID));
            throw new UnsupportedOperationException();
        });
        var service = new LogQueryServiceImpl(List.of(reader), java.util.Optional.of(gateway));
        assertThrows(TelemetryStorageUnavailableException.class, () -> service.transactions(query(5L, null, "literal"),
                new ContextFilters(null, null), request));
        org.mockito.Mockito.verify(gateway).findEntityById("default", 5L);
        org.mockito.Mockito.verify(gateway).findIdentitiesByEntityId("default", 5L);
    }

    @Test
    void validatesSeedBeforeMissingEntityAndDoesNotFallbackToRawReader() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        assertThrows(LogFilterQueryException.class, () -> service.transactions(query(5L, "structured-v1", "a OR"),
                new ContextFilters(null, null), request));
        var empty = service.transactions(query(5L, null, "literal"), new ContextFilters(null, null), request);
        assertEquals(0, empty.transactionCount());
        var detail = new LogTransactions.Detail("id", "local literal", new org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.And(List.of()),
                0, 20, "oldest");
        var unavailable = service.transactionDetail(query(5L, null, "literal"), new ContextFilters(null, null), request, detail);
        org.junit.jupiter.api.Assertions.assertFalse(unavailable.qualified());
        assertNull(unavailable.total());
        verifyNoInteractions(reader);
    }
}
