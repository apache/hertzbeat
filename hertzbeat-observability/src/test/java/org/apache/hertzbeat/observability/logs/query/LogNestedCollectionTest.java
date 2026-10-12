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

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.junit.jupiter.api.Test;

class LogNestedCollectionTest {
    @Test
    void explicitLevelsExpandOnlyImmediateItemsAndKeepSameElementRange() {
        var matches = LogSearchEvaluator.compile(LogSearchParser.parse("@users[][\"codes\"][]:[2 TO 6]"));
        assertTrue(matches.test(log(Map.of("codes", 4L))));
        assertTrue(matches.test(log(List.of(Map.of("codes", List.of(1L, 4L, 9L))))));
        assertFalse(matches.test(log(List.of(Map.of("codes", List.of(1L, 9L))))));
        assertFalse(matches.test(log(List.of(List.of(Map.of("codes", 4L))))));
        assertFalse(matches.test(log(Map.of("codes", List.of(List.of(4L))))));
        assertFalse(matches.test(log(Map.of("codes", "4"))));
        assertFalse(matches.test(log(null)));
    }

    @Test
    void inheritedMixedGroupingAndIndependentParentsAreExplicit() {
        var row = log(List.of(Map.of("name", "Peter", "codes", 1L), Map.of("name", "Anne", "codes", 4L)));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("@users[][\"name\"][]:\"Peter\" AND @users[][\"codes\"][]:4")).test(row));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("@users[][\"codes\"][]:(1 4)")).test(row));
        assertFalse(LogSearchEvaluator.compile(LogSearchParser.parse("@users[][\"codes\"][]:(4 \"4\")")).test(row));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("NOT @users[][\"name\"][]:\"Unknown\"")).test(row));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("@users[][\"name\"][]:\"\"")).test(log(Map.of("name", ""))));
    }

    @Test
    void literalKeysAndBoundedPathGrammarRemainDistinct() {
        var row = new LogEntry();
        row.setAttributes(Map.of("users.name", Map.of("codes.v", 4L), "users", Map.of("name", Map.of("codes", Map.of("v", 6L)))));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("@users.name[][\"codes.v\"][]:4")).test(row));
        assertFalse(LogSearchEvaluator.compile(LogSearchParser.parse("@users.name[][\"codes.v\"][]:6")).test(row));
        LogSearchParser.parse("@a[][\"b\"][][\"c\"][][\"d\"][]:4");
        for (String query : List.of("@a[][\"b\"][][\"c\"][][\"d\"][][\"e\"][]:4", "@a[][b][]:4", "@a[][0][]:4",
                "@a[][\"b\"]:4", "@a[][\"\"][]:4", "@a[][\"*\"][]:4", "@a[][\"workspace.id\"][]:4",
                "@a[][\"" + "b".repeat(257) + "\"][]:4", "@a[].b[]:4")) {
            assertThrows(LogFilterQueryException.class, () -> LogSearchParser.parse(query));
        }
    }

    @Test
    void resourceAndFourKeysUseExactChildNamesWithoutExtraFlattening() {
        var row = new LogEntry();
        row.setResource(Map.of("users", List.of(Map.of("codes:v", List.of(Map.of("c", Map.of("d", List.of(4L, "4"))))))));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("resource.users[][\"codes:v\"][][\"c\"][][\"d\"][]:4")).test(row));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("resource.users[][\"codes:v\"][][\"c\"][][\"d\"][]:\"4\"")).test(row));
        assertFalse(LogSearchEvaluator.compile(LogSearchParser.parse("@users[][\"codes:v\"][][\"c\"][][\"d\"][]:4")).test(row));
        assertFalse(LogSearchEvaluator.compile(LogSearchParser.parse("resource.users[][\"codes:v\"][][\"c\"][]:4")).test(row));
    }

    private static LogEntry log(Object users) {
        var entry = new LogEntry();
        entry.setAttributes(users == null ? Map.of() : Map.of("users", users));
        return entry;
    }
}
