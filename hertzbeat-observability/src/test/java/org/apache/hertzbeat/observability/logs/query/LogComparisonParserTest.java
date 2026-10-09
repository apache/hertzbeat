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
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class LogComparisonParserTest {
    @Test
    void preservesTransformParameterForSharedAnalysisValidation() {
        var parsed = LogComparisonParser.parse("""
                {"version":1,"parameters":{"view":"timeseries","transform":"throughput"},"queries":[{"id":"a"},{"id":"b"}]}
                """);
        assertEquals("throughput", parsed.parameters().get("transform"));
    }

    @Test
    void permitsOnlyExactFixedOffsetsOnB() {
        for (long offset : new long[] {3600000, 86400000, 604800000}) {
            var parsed = LogComparisonParser.parse("{\"version\":1,\"parameters\":{},\"queries\":[{\"id\":\"a\"},{\"id\":\"b\",\"timeShiftMs\":" + offset + "}]}");
            assertEquals(offset, parsed.queries().getLast().timeShiftMs());
        }
        for (String value : new String[] {"null", "0", "-3600000", "3600000.0", "\"3600000\"", "1", "9223372036854775808"}) {
            assertThrows(IllegalArgumentException.class, () -> LogComparisonParser.parse(
                    "{\"version\":1,\"parameters\":{},\"queries\":[{\"id\":\"a\"},{\"id\":\"b\",\"timeShiftMs\":" + value + "}]}"));
        }
        assertThrows(IllegalArgumentException.class, () -> LogComparisonParser.parse("""
                {"version":1,"parameters":{},"queries":[{"id":"a","timeShiftMs":3600000},{"id":"b"}]}
                """));
        assertEquals(null, new LogComparisonParser.Query(null, "literal").timeShiftMs());
    }

    @Test
    void attachesOnlyComparedExpressionSourceWithoutEchoingText() {
        for (String id : new String[] {"a", "b"}) {
            String a = "a".equals(id) ? "status:ERROR OR" : "*";
            String b = "b".equals(id) ? "status:ERROR OR" : "*";
            var error = assertThrows(LogFilterQueryException.class, () -> LogComparisonParser.parse(
                    "{\"version\":1,\"parameters\":{},\"queries\":[{\"id\":\"a\",\"searchSyntax\":\"structured-v1\",\"search\":\"" + a
                            + "\"},{\"id\":\"b\",\"searchSyntax\":\"structured-v1\",\"search\":\"" + b + "\"}]}"));
            assertEquals(id, error.detail().source());
            assertEquals(null, error.detail().reason());
            assertEquals(LogFilterQueryException.ERROR_CODE, error.getMessage());
        }
        assertEquals(null, new LogFilterQueryException().detail());
    }

    @Test
    void rejectsInvalidTypedMembersAndLegacySourceBounds() {
        for (String parameters : new String[] {"{\"start\":1000}", "{\"workspaceId\":\"other\"}",
                "{\"search\":\"hidden\"}", "{\"start\":\"1\",\"start\":\"2\"}"}) {
            assertThrows(IllegalArgumentException.class, () -> LogComparisonParser.parse(
                    "{\"version\":1,\"parameters\":" + parameters + ",\"queries\":[{\"id\":\"a\"},{\"id\":\"b\"}]}"));
        }
        for (String query : new String[] {"{\"id\":\"a\",\"search\":null}", "{\"id\":\"a\",\"scope\":{}}",
                "{\"id\":\"a\",\"search\":\"" + "x".repeat(513) + "\"}"}) {
            assertThrows(IllegalArgumentException.class, () -> LogComparisonParser.parse(
                    "{\"version\":1,\"parameters\":{},\"queries\":[" + query + ",{\"id\":\"b\"}]}"));
        }
        assertThrows(LogFilterQueryException.class, () -> LogComparisonParser.parse("""
                {"version":1,"parameters":{},"queries":[{"id":"a"},{"id":"b","searchSyntax":"structured-v1","search":"*:secret"}]}
                """));
    }

    @Test
    void keepsLiteralSourceAndFormulaWithStrictEnvelope() {
        var parsed = LogComparisonParser.parse("""
                {"version":1,"parameters":{"start":"1000","end":"5000"},
                "queries":[{"id":"a","search":"literal OR text"},{"id":"b","searchSyntax":"structured-v1","search":"status:ERROR"}],"formula":"100*b/a"}
                """);
        assertEquals("literal OR text", parsed.queries().getFirst().search());
        assertEquals("100*b/a", parsed.formula());
        for (String source : new String[] {"", "{}", "{} {}", " ".repeat(32769),
                "{\"version\":1,\"version\":1}",
                "{\"version\":1,\"parameters\":{\"workspace\":\"other\"},\"queries\":[]}",
                "{\"version\":1,\"parameters\":{},\"queries\":[{\"id\":\"b\"},{\"id\":\"a\"}]}",
                "{\"version\":1,\"parameters\":{},\"queries\":[{\"id\":\"a\"},{\"id\":\"b\"}],\"formula\":\"a+c\"}"}) {
            assertThrows(IllegalArgumentException.class, () -> LogComparisonParser.parse(source));
        }
        assertThrows(IllegalArgumentException.class, () -> LogComparisonParser.parse(
                "{\"version\":1,\"parameters\":{},\"queries\":[{\"id\":\"a\"}],\"formula\":\"a\"}"));
    }
}
