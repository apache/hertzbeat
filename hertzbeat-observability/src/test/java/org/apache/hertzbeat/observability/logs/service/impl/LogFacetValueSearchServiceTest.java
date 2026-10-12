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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import java.util.List;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.logs.service.LogQueryService.FacetQuery;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;

class LogFacetValueSearchServiceTest {
    private static final LogFacets.Field FIELD = LogFacets.Field.parse("attribute:x");

    private FacetQuery query(boolean structured, Long entity) {
        return new FacetQuery("default", entity, 1000L, 5000L, null, null, null, null, null,
                structured ? "*" : "literal", null, null, null, "zone=local", null, false, false,
                structured ? "structured-v1" : null);
    }

    @Test
    void preservesLookupAndTrustedScopeOnBothReaderPaths() {
        var reader = mock(HistoryDataReader.class, invocation -> {
            Object input = invocation.getArgument(0);
            var scope = input instanceof org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery q ? q.scope() : (LogFacets.Scope) input;
            assertEquals("default", scope.workspaceId());
            assertEquals("local", scope.resourceFilters().get("zone"));
            assertEquals(" Rare%_\\tail ", invocation.getArgument(3));
            return new LogFacets.Values("ready", scope.window(), FIELD, new LogFacets.FullCoverage("full_window"),
                    44L, 1L, List.of(new LogFacets.Value(" Rare%_\\tail ", 1)), false, new LogFacets.Search(" Rare%_\\tail ", 1L));
        });
        var service = new LogQueryServiceImpl(List.of(reader));
        for (boolean structured : new boolean[] {false, true}) {
            var result = service.facetValues(query(structured, null), FIELD, 20, " Rare%_\\tail ");
            assertEquals(44L, result.matchedCount());
            assertEquals(1L, result.search().matchedCount());
        }
    }

    @Test
    void invalidLookupPrecedesMissingEntityAndReader() {
        var reader = mock(HistoryDataReader.class);
        var service = new LogQueryServiceImpl(List.of(reader));
        for (String invalid : List.of("x".repeat(257), "\uD800")) {
            for (boolean structured : new boolean[] {false, true}) {
                assertThrows(IllegalArgumentException.class, () -> service.facetValues(query(structured, 7L), FIELD, 20, invalid));
            }
        }
        verifyNoInteractions(reader);
    }

    @Test
    void emptyEntityEchoesLiteralLookupButEmptyStringRemainsLegacy() {
        var service = new LogQueryServiceImpl(List.of());
        for (boolean structured : new boolean[] {false, true}) {
            var result = service.facetValues(query(structured, 7L), FIELD, 20, " Rare ");
            assertEquals(new LogFacets.Search(" Rare ", 0L), result.search());
            assertEquals(0L, result.matchedCount());
            assertEquals(null, service.facetValues(query(structured, 7L), FIELD, 20, "").search());
        }
    }

    @Test
    void presentSearchCannotFallBackToUnsearchedReader() {
        var reader = mock(HistoryDataReader.class, org.mockito.Mockito.CALLS_REAL_METHODS);
        var service = new LogQueryServiceImpl(List.of(reader));
        var result = service.facetValues(query(false, null), FIELD, 20, " Rare ");
        assertEquals("unavailable", result.state());
        assertEquals(new LogFacets.Search(" Rare ", null), result.search());
        assertThrows(TelemetryStorageUnavailableException.class, () -> service.facetValues(query(true, null), FIELD, 20, "Rare"));
        org.mockito.Mockito.verify(reader, org.mockito.Mockito.never()).logFacetValues(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyInt());
        org.mockito.Mockito.verify(reader, org.mockito.Mockito.never()).structuredLogFacetValues(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyInt());
    }
}
