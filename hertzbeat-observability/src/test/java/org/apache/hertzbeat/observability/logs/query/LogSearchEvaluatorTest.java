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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.junit.jupiter.api.Test;

class LogSearchEvaluatorTest {
    private boolean matches(String query, Object value) {
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("n", value);
        return LogSearchEvaluator.compile(LogSearchParser.parse(query)).test(LogEntry.builder()
                .body("request failed").severityNumber(17).attributes(attributes)
                .resource(Map.of("service.name", "checkout", "deployment.environment.name", "prod")).build());
    }

    @Test
    void groupedBooleanAndNumericConditionsRespectPrecedence() {
        assertTrue(matches("(service:checkout OR service:billing) AND @n:[500 TO 599]", 502));
        assertFalse(matches("(service:checkout OR service:billing) AND @n:[500 TO 599]", 200));
        assertTrue(matches("service:missing OR service:checkout AND @n:>500", 502));
        assertFalse(matches("service:missing OR service:checkout AND @n:>500", 200));
        assertTrue(matches("service:(checkout OR billing) status:ERROR -@n:200", 502));
        assertTrue(matches("status:err*", 502));
        assertTrue(matches("status:ERR*", 502));
        assertTrue(matches("@n:>-.5", 0));
    }

    @Test
    void exactCaseQuotedWildcardsAndPresenceAreIndependent() {
        assertTrue(matches("@n:\"Error*\"", "Error*"));
        assertFalse(matches("@n:\"Error*\"", "ErrorMessage"));
        assertTrue(matches("@n:Error*", "ErrorMessage"));
        assertFalse(matches("@n:error*", "ErrorMessage"));
        assertTrue(matches("@n:hello?world", "hello world"));
        assertFalse(matches("@n:hello?world", "helloAworld"));
        assertTrue(matches("@n:*", null));
        assertTrue(matches("@n:*", Map.of("key", "value")));
        assertFalse(matches("@n:value", Map.of("key", "value")));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("*")).test(LogEntry.builder().build()));
    }

    @Test
    void numericSourceContractIsFiniteFloat64WithStrictStringGrammar() {
        assertTrue(matches("@n:>40", "4.25e1"));
        assertFalse(matches("@n:>40", " 42.5 "));
        assertFalse(matches("@n:>0", true));
        assertFalse(matches("@n:>0", "Infinity"));
        assertFalse(matches("@n:>0", "1e999"));
        assertFalse(matches("@n:>0", null));
        assertTrue(matches("NOT @n:>0", null));
        assertTrue(matches("@n:<=9007199254740992", 9007199254740993L));
    }

    @Test
    void liveCriteriaUsesVersionAndPreservesLegacyBodyInterpretation() {
        var criteria = new org.apache.hertzbeat.observability.logs.sse.LogSseFilterCriteria();
        criteria.setWorkspaceId("default");
        criteria.setLogContent("service:checkout OR service:billing");
        var row = LogEntry.builder().body("ordinary request").resource(Map.of("service.name", "checkout")).build();
        assertFalse(criteria.matches(row));
        criteria.setSearchSyntax("structured-v1");
        assertTrue(criteria.matches(row));
        criteria.setResourceFilter("zone=local");
        assertFalse(criteria.matches(row));
    }

    @Test
    void builtinPresenceRequiresScalarWhileResourcePresenceIncludesContainers() {
        var row = LogEntry.builder().resource(Map.of("service_name", Map.of(), "service_namespace", Map.of(),
                "deployment_environment_name", Map.of())).build();
        for (String field : java.util.List.of("service", "namespace", "env")) {
            assertFalse(LogSearchEvaluator.compile(LogSearchParser.parse(field + ":*")).test(row));
        }
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("resource.service_name:*")).test(row));
    }

    @Test
    void nativeNumbersCompareNumericallyWhileNumericStringsStayExact() {
        assertTrue(matches("@n:0.00000001", 1e-8));
        assertTrue(matches("@n:1e20", 1e20));
        assertFalse(matches("@n:0.00000001", "1e-8"));
        assertTrue(matches("@n:1e-8", "1e-8"));
        assertFalse(matches("@n:1*", 100));
        assertTrue(matches("@n:1*", "100"));
        assertTrue(matches("@n:true", true));
    }

    @Test
    void messageGlobUsesThePersistedBodyStringForStructuredBodies() {
        var row = LogEntry.builder().body(Map.of("key", "value")).build();
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("message:*value*")).test(row));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("message:value")).test(row));
    }

    @Test
    void bareTextMatchesDatadogTextAttributesCaseInsensitively() {
        var row = LogEntry.builder().body("ordinary request").attributes(Map.of("title", "Connection TIMEOUT")).build();
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("timeout")).test(row));
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("\"connection timeout\"")).test(row));
        assertFalse(LogSearchEvaluator.compile(LogSearchParser.parse("message:Timeout")).test(row));
        var embedded = LogEntry.builder().attributes(Map.of("title", "xconnection timeoutz")).build();
        assertFalse(LogSearchEvaluator.compile(LogSearchParser.parse("\"connection timeout\"")).test(embedded));
        var wildcard = LogEntry.builder().attributes(Map.of("title", "Connection TIMEOUTS")).build();
        assertTrue(LogSearchEvaluator.compile(LogSearchParser.parse("timeout*")).test(wildcard));
        assertFalse(LogSearchEvaluator.compile(LogSearchParser.parse("@title:timeout*")).test(wildcard));
        var keyedOnly = LogEntry.builder().attributes(Map.of("title", Map.of("timeout", "other"))).build();
        assertFalse(LogSearchEvaluator.compile(LogSearchParser.parse("timeout")).test(keyedOnly));
    }

    @Test
    void liveTailStillRejectsHistoricalFullTextSyntax() {
        var criteria = new org.apache.hertzbeat.observability.logs.sse.LogSseFilterCriteria();
        criteria.setWorkspaceId("default");
        criteria.setSearchSyntax("structured-v1");
        criteria.setLogContent("*:timeout");
        org.junit.jupiter.api.Assertions.assertThrows(LogFilterQueryException.class, criteria::validate);
    }

}
