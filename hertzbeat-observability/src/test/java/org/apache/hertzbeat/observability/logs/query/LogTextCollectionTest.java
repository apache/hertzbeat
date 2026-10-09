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

class LogTextCollectionTest {
    @Test
    void quotedMembersAreExactTypedStringsIncludingEmpty() {
        for (String text : List.of("", "4", "Peter", "*?", " leading ", "O'Reilly", "\u03b1")) {
            var predicate = LogSearchEvaluator.compile(LogSearchParser.parse("@names[]:\"" + text + "\""));
            assertTrue(predicate.test(log(text)));
            assertTrue(predicate.test(log(Arrays.asList(null, 4L, text))));
            assertFalse(predicate.test(log(List.of(List.of(text)))));
            assertFalse(predicate.test(log(Map.of("x", text))));
            assertFalse(predicate.test(log(null)));
        }
        assertFalse(LogSearchEvaluator.compile(LogSearchParser.parse("@names[]:\"4\"")).test(log(4L)));
        assertFalse(LogSearchEvaluator.compile(LogSearchParser.parse("@names[]:\"Peter\"")).test(log("peter")));
        assertFalse(LogSearchEvaluator.compile(LogSearchParser.parse("@names[]:\"*\"")).test(log("anything")));
    }

    @Test
    void groupedMixedOperandsAndEscapesRetainExistingSemantics() {
        var both = LogSearchEvaluator.compile(LogSearchParser.parse("@names[]:(4 \"4\")"));
        assertTrue(both.test(log(List.of(4L, "4"))));
        assertFalse(both.test(log(List.of(4L))));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("@names[]:(4 OR \"4\")")).test(log("4")));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("NOT @names[]:\"\"")).test(log(null)));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("@names[]:\"a\\\"b\"")).test(log("a\"b")));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("@names[]:\"a\\\\b\"")).test(log("a\\b")));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("@names[]:\"\\n\"")).test(log("n")));
    }

    @Test
    void quotedControlsMalformedRangesAndLimitsReject() {
        for (String expression : List.of("@names[]:\"line\nnext\"", "@names[]:\"open", "@names[]:[\"a\" TO \"z\"]",
                "@names[]:*", "@names[]:\"" + "x".repeat(8192) + "\"")) {
            assertThrows(LogFilterQueryException.class, () -> LogSearchParser.parse(expression));
        }
        LogSearchParser.parse(String.join(" AND ", java.util.Collections.nCopies(100, "@names[]:\"\"")));
        assertThrows(LogFilterQueryException.class,
                () -> LogSearchParser.parse(String.join(" AND ", java.util.Collections.nCopies(101, "@names[]:\"\""))));
    }

    private static LogEntry log(Object value) {
        var log = new LogEntry();
        log.setAttributes(value == null ? Map.of() : Map.of("names", value));
        return log;
    }
}
