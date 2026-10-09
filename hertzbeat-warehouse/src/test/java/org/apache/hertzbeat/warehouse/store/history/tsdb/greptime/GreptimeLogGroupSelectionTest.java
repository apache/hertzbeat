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
import static org.mockito.Mockito.mock;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;

class GreptimeLogGroupSelectionTest {
    @Test
    void exactScalarSelectionDoesNotCoerceNumericGroupText() {
        String condition = GreptimeLogGroupProjection.selection(selection("value", "2.0"));
        assertTrue(condition.contains("= '2.0'"));
        assertTrue(!condition.contains("TRY_CAST"));
        assertTrue(condition.contains("json_get_string(log_attributes"));
        assertTrue(GreptimeLogGroupProjection.selection(selection("value", " x' ")).contains("= ' x'' '"));
    }

    @Test
    void distinguishesPresenceKindsAndRejectsMalformedKeys() {
        for (String kind : List.of("missing", "null", "non_scalar")) {
            assertTrue(GreptimeLogGroupProjection.selection(selection(kind, null)).contains("= '" + kind + "'"));
        }
        assertEquals("", selection("value", "").groups().getFirst().value());
        assertThrows(IllegalArgumentException.class, () -> selection("missing", "null"));
        assertThrows(IllegalArgumentException.class, () -> selection("all", null));
        assertThrows(IllegalArgumentException.class, () -> selection("value", "x".repeat(1025)));
        assertThrows(IllegalArgumentException.class, () -> new LogGroupSelection(1, List.of()));
        assertThrows(IllegalArgumentException.class, () -> new LogGroupSelection(2, selection("value", "2").groups()));
        assertThrows(IllegalArgumentException.class, () -> new LogGroupSelection.Key(
                new LogFacets.Field("attribute:proof.status", "resource", "proof.status"), "value", "2"));
        assertEquals(4, new LogGroupSelection(1,
                java.util.stream.IntStream.range(0, 4).mapToObj(index -> new LogGroupSelection.Key(
                        LogFacets.Field.parse("attribute:field" + index), "value", "2")).toList()).groups().size());
        assertThrows(IllegalArgumentException.class, () -> new LogGroupSelection(1,
                java.util.stream.IntStream.range(0, 5).mapToObj(index -> new LogGroupSelection.Key(
                        LogFacets.Field.parse("attribute:field" + index), "value", "2")).toList()));
        assertThrows(IllegalArgumentException.class, () -> new LogGroupSelection(1,
                java.util.stream.IntStream.range(0, 3).mapToObj(index -> new LogGroupSelection.Key(
                        LogFacets.Field.parse("attribute:field" + index), "value", "\n".repeat(1024))).toList()));
        var key = selection("value", "2").groups().getFirst();
        assertThrows(IllegalArgumentException.class, () -> new LogGroupSelection(1, List.of(key, key)));
    }

    @Test
    void selectedLegacyKeepsLiteralBodySearchAndUnsupportedAnalysisFailsClosed() {
        var scope = new LogFacets.Scope("bound", 1000, 2000, null, null, null, null, "a OR b",
                null, null, null, Map.of(), Map.of(), Set.of(), false, null);
        var expression = new LogSearchExpression.And(List.of());
        assertThrows(IllegalArgumentException.class, () -> new LogSearchQuery(scope, expression));
        var selected = new LogSearchQuery(scope, expression, selection("value", "2.0"));
        assertEquals("a OR b", selected.scope().search());
        var legacy = mock(HistoryDataReader.class, org.mockito.Mockito.CALLS_REAL_METHODS);
        assertThrows(UnsupportedOperationException.class,
                () -> legacy.logAnalysis(selected, new LogAnalysis.Request(null, "groups", 20, "count-desc", 1), 60000));
    }

    private static LogGroupSelection selection(String kind, String value) {
        return new LogGroupSelection(1, List.of(new LogGroupSelection.Key(LogFacets.Field.parse("attribute:proof.status"), kind, value)));
    }
}
