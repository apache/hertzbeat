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

package org.apache.hertzbeat.observability.shared.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.util.List;
import org.junit.jupiter.api.Test;

class SignalFilterScannerTest {
    @Test
    void escapedQuotesDoNotTurnLiteralCommasOrAndIntoDelimiters() {
        String first = "route=\"quote\\\",comma and text\"";
        assertEquals(List.of(first, "method=GET"), SignalFilterScanner.splitClauses(first + ",method=GET"));
        assertEquals(List.of(first, "method=GET"), SignalFilterScanner.splitClauses(first + " and method=GET"));
    }

    @Test
    void escapedListQuotesAndBackslashesPreserveExactItems() {
        String quoted = "\"quote\\\",comma\"";
        assertEquals(List.of(quoted, "plain"), SignalFilterScanner.splitListValues(quoted + ",plain"));
        String slash = "route=\"path\\\\\"";
        assertEquals(List.of(slash, "method=GET"), SignalFilterScanner.splitClauses(slash + ",method=GET"));
    }

    @Test
    void strictSplittingKeepsMissingTermsVisibleToTheCaller() {
        assertEquals(List.of("route=a", "", "method=GET", ""),
                SignalFilterScanner.splitClausesPreservingEmpty("route=a,,method=GET,"));
        assertEquals(List.of("route=a", ""), SignalFilterScanner.splitClausesPreservingEmpty("route=a and "));
        assertEquals(List.of("a", "", "b"), SignalFilterScanner.splitListValuesPreservingEmpty("a,,b"));
        assertEquals(List.of("a", ""), SignalFilterScanner.splitListValuesPreservingEmpty("a,"));
    }

    @Test
    void disjunctionSplittingKeepsQuotedAndListOrTextAndEmptyBranches() {
        assertEquals(List.of("route=\"/a OR /b\"", "method IN (\"GET OR POST\",PUT)", "host=x"),
                SignalFilterScanner.splitDisjunctionsPreservingEmpty(
                        "route=\"/a OR /b\" OR method IN (\"GET OR POST\",PUT) OR host=x"));
        assertEquals(List.of("route=/a", ""),
                SignalFilterScanner.splitDisjunctionsPreservingEmpty("route=/a OR "));
        assertThrows(IllegalArgumentException.class,
                () -> SignalFilterScanner.splitDisjunctionsPreservingEmpty("route=/a) OR method=GET"));
        assertThrows(IllegalArgumentException.class,
                () -> SignalFilterScanner.splitDisjunctionsPreservingEmpty("route IN (/a OR method=GET"));
    }
}
