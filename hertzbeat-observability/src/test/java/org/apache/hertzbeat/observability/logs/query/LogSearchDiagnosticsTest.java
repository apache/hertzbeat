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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

class LogSearchDiagnosticsTest {
    @Test
    void reportsOriginalUtf16SpansForCommonMistakes() {
        check("service:", "missing_value", 8, 8);
        check("service:)", "missing_value", 8, 9);
        check("(service:alpha", "unclosed_group", 14, 14);
        check("@duration:[1 TO ]", "incomplete_range", 16, 17);
        check("@duration:[1 TO", "incomplete_range", 15, 15);
        check("service:\"open", "unclosed_quote", 8, 13);
        check("service:alpha )", "unexpected_token", 14, 15);
        String prefix = "  \"" + "\uD83D\uDE00" + "\" service:";
        check(prefix, "missing_value", prefix.length(), prefix.length());
        String escaped = "@name:\"a\\\"b\" service:";
        check(escaped, "missing_value", escaped.length(), escaped.length());
        String trailingEscape = "service:\"open" + (char) 92;
        check(trailingEscape, "unclosed_quote", 8, trailingEscape.length());
        check("(@name:\"open", "unclosed_quote", 7, 12);
    }

    @Test
    void reportsAnUnclosedEmptyGroupForBothStructuredGrammars() {
        for (String source : java.util.List.of("status:(", "(")) {
            var raw = assertThrows(LogFilterQueryException.class, () -> LogSearchParser.parse(source));
            var calculated = assertThrows(LogFilterQueryException.class, () -> LogSearchParser.parseCalculated(source));
            assertEquals("unclosed_group", raw.detail().syntaxIssue());
            assertEquals(raw.detail(), calculated.detail());
            assertEquals(source.length(), raw.detail().start());
            assertEquals(source.length(), raw.detail().end());
        }
    }

    @Test
    void preservesSourceAndExistingGenericEnvelope() {
        var failure = assertThrows(LogFilterQueryException.class, () -> LogSearchParser.parse("service:"));
        var detail = JsonUtil.toJson(failure.withSource("b").detail());
        org.junit.jupiter.api.Assertions.assertTrue(detail.contains("\"source\":\"b\""));
        org.junit.jupiter.api.Assertions.assertTrue(detail.contains("missing_value"));
        assertEquals(null, new LogFilterQueryException().detail());
    }

    private static void check(String source, String issue, int start, int end) {
        var error = assertThrows(LogFilterQueryException.class, () -> LogSearchParser.parse(source));
        assertNotNull(error.detail());
        var node = JsonUtil.fromJson(JsonUtil.toJson(error.detail()), java.util.Map.class);
        assertEquals(issue, node.get("syntaxIssue"));
        assertEquals(start, node.get("start"));
        assertEquals(end, node.get("end"));
    }
}
