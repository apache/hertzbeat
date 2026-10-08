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

package org.apache.hertzbeat.observability.logs.query;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.junit.jupiter.api.Test;

class LogNumericCollectionTest {
    @Test
    void signedBoundsAndEscapedColonKeysRemainCanonical() {
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("@codes[]:+4")).test(log(4L)));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("@codes[]:[+2 TO +6]")).test(log(4L)));
        var entry = new LogEntry();
        entry.setAttributes(Map.of("code:kind", List.of(4L)));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("@code\\:kind[]:4")).test(entry));
    }

    @Test
    void exactRootKeysAndExistingComplexityLimitsRemain() {
        var row = new LogEntry();
        row.setAttributes(Map.of("a.b", List.of(4L), "a", Map.of("b", List.of(6L))));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("@a.b[]:4")).test(row));
        assertFalse(LogSearchEvaluator.compile(LogSearchParser.parse("@a.b[]:6")).test(row));
        LogSearchParser.parse(String.join(" AND ", java.util.Collections.nCopies(100, "@codes[]:4")));
        assertThrows(LogFilterQueryException.class,
                () -> LogSearchParser.parse(String.join(" AND ", java.util.Collections.nCopies(101, "@codes[]:4"))));
        assertThrows(LogFilterQueryException.class, () -> LogSearchParser.parse("(".repeat(17) + "@codes[]:4" + ")".repeat(17)));
        LogSearchParser.validateQuery(null, "@codes[]:[not structured");
    }

    @Test
    void oneItemMustSatisfyBothBoundsWithoutCoercionOrFlattening() {
        var predicate = LogSearchEvaluator.compile(LogSearchParser.parse("@codes[]:[2 TO 6]"));
        for (Object value : List.of(List.of(1L, 9L), List.of("4", true, List.of(4L)), Map.of("x", 4), "4", Double.POSITIVE_INFINITY)) {
            assertFalse(predicate.test(log(value)));
        }
        for (Object value : List.of(4L, 4.5, List.of(1L, 4L, 9L), Arrays.asList(null, "4", 5.5))) {
            assertTrue(predicate.test(log(value)));
        }
        assertFalse(predicate.test(log(null)));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("NOT @codes[]:[2 TO 6]")).test(log(List.of(1L, 9L))));
    }

    @Test
    void groupedMembershipPreservesBooleanAndExactIntegralSemantics() {
        var both = LogSearchEvaluator.compile(LogSearchParser.parse("@codes[]:(4 6)"));
        assertTrue(both.test(log(List.of(4L, 6L))));
        assertFalse(both.test(log(List.of(4L))));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("@codes[]:(4 OR 6)")).test(log(6L)));
        var boundary = LogSearchEvaluator.compile(LogSearchParser.parse("@codes[]:9007199254740992"));
        assertTrue(boundary.test(log(9007199254740992L)));
        assertFalse(boundary.test(log(9007199254740993L)));
        assertFalse(LogSearchEvaluator.compile(LogSearchParser.parse("@codes:4")).test(log(List.of(4L))));
    }

    @Test
    void malformedOrUnsupportedCollectionSyntaxAndBoundsReject() {
        for (String expression : List.of("@codes[]:4.0", "@codes[]:1e0", "@codes[]:>4", "@codes[]:*",
                "@codes[]:[6 TO 2]", "@codes[]:9007199254740993", "@codes[0]:4", "@codes[][]:4", "@codes[].child:4", "@codes[]:04")) {
            assertThrows(LogFilterQueryException.class, () -> LogSearchParser.parse(expression));
        }
    }

    private static LogEntry log(Object value) {
        var entry = new LogEntry();
        entry.setAttributes(value == null ? Map.of() : Map.of("codes", value));
        return entry;
    }
}
