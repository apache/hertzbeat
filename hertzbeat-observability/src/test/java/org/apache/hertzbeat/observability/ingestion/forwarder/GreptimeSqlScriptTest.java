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

package org.apache.hertzbeat.observability.ingestion.forwarder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ClassPathResource;

class GreptimeSqlScriptTest {

    @Test
    void ignoresSemicolonsAndQuotesInsideLineAndNestedBlockComments() {
        String script = "-- ASF License; ' quote\r\nSELECT/* outer; /* nested; */ end */ 1;"
                + "-- between; \"\nSELECT 2; -- trailing;";
        assertEquals(List.of("SELECT  1", "SELECT 2"), GreptimeSqlScript.statements(script));
    }

    @Test
    void preservesSemicolonsCommentMarkersAndEscapedQuotesInQuotedTokens() {
        String script = "SELECT 'a;--/*b*/', 'it''s;safe', \"a;\"\"b\", `x;``y`;"
                + "SELECT 'back\\\';slash';";
        assertEquals(List.of("SELECT 'a;--/*b*/', 'it''s;safe', \"a;\"\"b\", `x;``y`",
                "SELECT 'back\\\';slash'"), GreptimeSqlScript.statements(script));
    }

    @Test
    void preservesLiteralWhitespaceAndMultipleStatementsWithoutTrailingDelimiter() {
        assertEquals(List.of("SELECT 'a\n  b;c'", "SELECT 2"),
                GreptimeSqlScript.statements("SELECT 'a\n  b;c';;\n SELECT 2"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " \r\n", ";;;", "-- only;", "/* only; */", "-- ;\r\n; /* ; */;"})
    void discardsEmptyAndCommentOnlyFragments(String script) {
        assertTrue(GreptimeSqlScript.statements(script).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"SELECT 'unfinished;", "SELECT \"unfinished;", "SELECT `unfinished;", "/* unfinished;"})
    void rejectsUnterminatedTokensBeforeAnyStatementsAreExecuted(String script) {
        assertThrows(IllegalArgumentException.class, () -> GreptimeSqlScript.statements("SELECT 1;" + script));
    }

    @Test
    void bundledLicensedResourceProducesExactlyTableThenFlow() throws Exception {
        String sql = new ClassPathResource(GreptimeApmFlowInitializer.APM_FLOW_RESOURCE)
                .getContentAsString(StandardCharsets.UTF_8);
        assertTrue(sql.contains("-- (the \"License\");"));
        List<String> statements = GreptimeSqlScript.statements(sql);
        assertEquals(2, statements.size());
        assertTrue(statements.get(0).startsWith("CREATE TABLE IF NOT EXISTS hertzbeat_apm_red_1m"));
        assertTrue(statements.get(1).startsWith("CREATE FLOW IF NOT EXISTS hertzbeat_apm_red_1m_flow"));
        assertTrue(statements.get(1).contains("EXPIRE AFTER '6 hours'::INTERVAL"));
    }
}
