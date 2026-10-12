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

package org.apache.hertzbeat.observability.logs.query;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.junit.jupiter.api.Test;

class LogGroupSelectionParserTest {
    @Test
    void acceptsFourDistinctKeysButNotFive() {
        String four = java.util.stream.IntStream.range(0, 4).mapToObj(i ->
                "{\"field\":\"attribute:k" + i + "\",\"kind\":\"missing\"}")
                .collect(java.util.stream.Collectors.joining(","));
        assertEquals(4, LogGroupSelectionParser.parse("{\"version\":1,\"groups\":[" + four + "]}").groups().size());
        assertThrows(LogFilterQueryException.class, () -> LogGroupSelectionParser.parse(
                "{\"version\":1,\"groups\":[" + four + ",{\"field\":\"attribute:k4\",\"kind\":\"missing\"}]}"));
    }

    @Test
    void absentIsLegacyButValuesAndWhitespaceAreExact() {
        assertNull(LogGroupSelectionParser.parse(null));
        var selection = LogGroupSelectionParser.parse("""
                {"version":1,"groups":[{"field":"attribute:proof.status","kind":"value","value":" 2.0 "}]}
                """);
        assertEquals(" 2.0 ", selection.groups().getFirst().value());
        assertEquals("proof.status", selection.groups().getFirst().field().key());
        assertEquals("", LogGroupSelectionParser.parse("""
                {"version":1,"groups":[{"field":"attribute:key","kind":"value","value":""}]}
                """).groups().getFirst().value());
    }

    @Test
    void malformedOrAmbiguousSelectionFailsClosed() {
        for (String invalid : List.of("", " ", "null", "[]", "{}", "{} {}", " ".repeat(4097),
                "{\"version\":1,\"version\":2,\"groups\":[]}",
                "{\"version\":2,\"groups\":[]}",
                "{\"version\":1.0,\"groups\":[]}",
                "{\"version\":1,\"groups\":[],\"other\":true}",
                "{\"version\":1,\"groups\":[]}")) {
            assertThrows(LogFilterQueryException.class, () -> LogGroupSelectionParser.parse(invalid));
        }
        for (String group : List.of(
                "{\"field\":\"attribute:key\",\"kind\":\"value\"}",
                "{\"field\":\"attribute:key\",\"kind\":\"missing\",\"value\":\"x\"}",
                "{\"field\":\"attribute:key\",\"kind\":\"all\"}",
                "{\"field\":\"attribute:key\",\"kind\":\"value\",\"value\":2}",
                "{\"field\":\"attribute:key\",\"kind\":\"null\",\"extra\":1}")) {
            assertThrows(LogFilterQueryException.class, () -> LogGroupSelectionParser.parse(
                    "{\"version\":1,\"groups\":[" + group + "]}"));
        }
    }

    @Test
    void supportsDistinctPresenceKindsButRejectsDuplicateFieldsAndOversizedValues() {
        String group = "{\"field\":\"attribute:key\",\"kind\":\"missing\"}";
        assertThrows(LogFilterQueryException.class, () -> LogGroupSelectionParser.parse(
                "{\"version\":1,\"groups\":[" + group + "," + group + "]}"));
        assertThrows(LogFilterQueryException.class, () -> LogGroupSelectionParser.parse(
                "{\"version\":1,\"groups\":[{\"field\":\"attribute:key\",\"kind\":\"value\",\"value\":\""
                        + "x".repeat(1025) + "\"}]}"));
        for (String kind : List.of("missing", "null", "non_scalar")) {
            var selection = LogGroupSelectionParser.parse("{\"version\":1,\"groups\":[{\"field\":\"attribute:key\",\"kind\":\""
                    + kind + "\"}]}");
            assertEquals(kind, selection.groups().getFirst().kind());
        }
    }
}
