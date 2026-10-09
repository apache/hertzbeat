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

package org.apache.hertzbeat.common.observability.dto.log;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class LogNumericRangeTest {
    @Test
    void validatesDirectConstructionAndPreservesSignedZeroAndFiniteExtremes() {
        var field = LogFacets.Field.parse("attribute:duration");
        new LogNumericRange(1, field, -0.0, 0.0);
        new LogNumericRange(1, field, -Double.MAX_VALUE, Double.MAX_VALUE);
        for (double invalid : new double[] {Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY}) {
            assertThrows(IllegalArgumentException.class, () -> new LogNumericRange(1, field, invalid, 4));
            assertThrows(IllegalArgumentException.class, () -> new LogNumericRange(1, field, 4, invalid));
        }
        assertThrows(IllegalArgumentException.class, () -> new LogNumericRange(2, field, 2, 6));
        assertThrows(IllegalArgumentException.class, () -> new LogNumericRange(1, field, 6, 2));
        for (String id : List.of("builtin:serviceName", "attribute:workspace.id", "resource:hertzbeat_workspace_id")) {
            assertThrows(IllegalArgumentException.class, () -> new LogNumericRange(1, LogFacets.Field.parse(id), 2, 6));
        }
        assertThrows(IllegalArgumentException.class, () -> new LogNumericRange(1,
                new LogFacets.Field("attribute:duration", "resource", "duration"), 2, 6));
    }

    @Test
    void preservesOldScopeAndOnlyAdmitsLegacyLiteralWithRangeAndEmptyExpression() {
        var old = new LogFacets.Scope("bound", 1000, 2000, null, null, null, null, null,
                null, null, null, Map.of(), Map.of(), Set.of(), false, null);
        assertNull(old.numericRange());
        assertEquals(old, scope(1000, 2000, null, null));
        var empty = new LogSearchExpression.And(List.of());
        new LogSearchQuery(scope(1000, 2000, "a OR b", range()), empty);
        assertThrows(IllegalArgumentException.class, () -> new LogSearchQuery(scope(1000, 2000, "a OR b", null), empty));
        assertThrows(IllegalArgumentException.class, () -> new LogSearchQuery(scope(1000, 2000, "a OR b", range()),
                new LogSearchExpression.Not(empty)));
    }

    @Test
    void comparisonCopiesRetainRangeAndRejectMismatchedBounds() {
        var empty = new LogSearchExpression.And(List.of());
        var a = new LogComparison.Source(scope(3601000, 3602000, "a", range()), empty, null);
        var b = new LogComparison.Source(scope(1000, 2000, "b", range()), empty, null);
        LogComparison.validateShiftedSources(a, b, 3600000);
        var changed = new LogComparison.Source(scope(1000, 2000, "b", null), empty, null);
        assertThrows(IllegalArgumentException.class, () -> LogComparison.validateShiftedSources(a, changed, 3600000));
        assertThrows(IllegalArgumentException.class, () -> LogComparison.validateSources(b, changed));
    }

    private LogNumericRange range() { return new LogNumericRange(1, LogFacets.Field.parse("attribute:duration"), 2, 6); }

    private LogFacets.Scope scope(long start, long end, String search, LogNumericRange range) {
        return new LogFacets.Scope("bound", start, end, null, null, null, null, search,
                null, null, null, Map.of(), Map.of(), Set.of(), false, null, range);
    }
}
