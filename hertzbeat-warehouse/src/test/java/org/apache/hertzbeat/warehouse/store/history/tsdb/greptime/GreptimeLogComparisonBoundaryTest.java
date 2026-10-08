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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.db.GreptimeQueryGuard;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class GreptimeLogComparisonBoundaryTest {
    @Test
    void rejectsUnboundedEmptyGridAndBelowThresholdAnchor() {
        var request = new LogAnalysis.Request(null, "timeseries", 20, "count-desc", 1);
        assertThrows(IllegalArgumentException.class, () -> new LogComparison.Result(new LogFacets.Window(1, 86_400_000),
                request, 0, 2, false, 60_000L, List.of(), null));
        var group = new LogComparison.Group(List.of(), new LogComparison.Cell(1, null), new LogComparison.Cell(0, null), List.of());
        assertThrows(IllegalArgumentException.class, () -> new LogComparison.Result(new LogFacets.Window(1, 119_999),
                new LogAnalysis.Request(null, "groups", 20, "count-desc", 2), 1, 0, false, null, List.of(group), null));
    }

    @Test
    void globalGroupCannotLoseMatchingSourceRows() {
        var group = new LogComparison.Group(List.of(), new LogComparison.Cell(1, null), new LogComparison.Cell(0, null), List.of());
        assertThrows(IllegalArgumentException.class, () -> new LogComparison.Result(new LogFacets.Window(1, 119_999),
                new LogAnalysis.Request(null, "groups", 20, "count-desc", 1), 2, 0, false, null, List.of(group), null));
    }

    @Test
    void rejectsLegacyAmbiguityAndScopeOrSelectionDifferences() {
        var a = source("a OR b", null);
        assertEquals("a OR b", a.scope().search());
        assertThrows(IllegalArgumentException.class, () -> source("x".repeat(513), null));
        assertThrows(IllegalArgumentException.class, () -> new LogComparison.Source(a.scope(), new LogSearchExpression.Not(
                new LogSearchExpression.And(List.of())), null));
        var selector = new LogGroupSelection(1, List.of(new LogGroupSelection.Key(LogFacets.Field.parse("attribute:k"), "value", "2.0")));
        assertThrows(IllegalArgumentException.class, () -> LogComparison.validateSources(a, source("b", selector)));
    }

    @Test
    void executesOneCompleteStatementAndDoesNotTurnStorageFailureIntoZero() {
        var sql = mock(GreptimeSqlQueryExecutor.class);
        var properties = mock(GreptimeProperties.class);
        when(properties.database()).thenReturn("hertzbeat");
        when(properties.grpcEndpoints()).thenReturn("127.0.0.1:4001");
        when(properties.httpEndpoint()).thenReturn("http://127.0.0.1:4000");
        var sentinel = new HashMap<String, Object>(Map.of("matching_a", 0, "matching_b", 2, "selected_count", 0, "truncated", 0));
        sentinel.put("a_count", null);
        when(sql.executeStrict(anyString())).thenReturn(List.of(sentinel));
        try (var guard = new GreptimeQueryGuard(1, Duration.ofSeconds(2), Duration.ofMillis(10))) {
            var storage = new GreptimeDbDataStorage(properties, null, sql, guard);
            var selector = new LogGroupSelection(1, List.of(new LogGroupSelection.Key(LogFacets.Field.parse("attribute:k"), "value", "2.0")));
            var request = new LogAnalysis.Request(null, "groups", 20, "count-desc", 1);
            var result = storage.logComparison(source("a OR b", selector), source("error", selector), request, 60_000, null);
            assertTrue(result.groups().isEmpty());
            assertEquals(2, result.matchingB());
            var capture = ArgumentCaptor.forClass(String.class);
            verify(sql).executeStrict(capture.capture());
            String query = capture.getValue();
            assertTrue(query.contains("a OR b") && query.contains("error"));
            assertTrue(query.contains("workspace-proof") && query.contains("2.0") && query.contains("checkout"));
            when(sql.executeStrict(anyString())).thenThrow(new IllegalStateException("unavailable"));
            assertThrows(TelemetryStorageUnavailableException.class, () -> storage.logComparison(source(null, null),
                    source(null, null), request, 60_000, null));
        }
    }

    private LogComparison.Source source(String search, LogGroupSelection selection) {
        var scope = new LogFacets.Scope("workspace-proof", 1, 119_999, null, null, null, null, search, "checkout", "shop", "prod",
                Map.of("service.version", "v1"), Map.of(), Set.of(), false, null);
        return new LogComparison.Source(scope, new LogSearchExpression.And(List.of()), selection);
    }
}
