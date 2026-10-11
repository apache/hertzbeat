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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Domain;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Field;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.NumericCollection;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.TextCollection;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery;
import org.apache.hertzbeat.warehouse.db.GreptimeQueryGuard;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.Test;

class GreptimeLogCollectionTest {
    @Test
    void nestedPathsAreImmutableBoundedAndEveryKeyUsesTheExistingGuard() {
        var root = new Field(Domain.ATTRIBUTE, "users");
        var children = new ArrayList<>(List.of("codes.v", "leaf"));
        var numeric = new NumericCollection(root, 2, 6, children);
        children.clear();
        assertEquals(List.of("codes.v", "leaf"), numeric.children());
        assertThrows(UnsupportedOperationException.class, () -> numeric.children().add("extra"));
        assertEquals(List.of(), new NumericCollection(root, 4, 4).children());
        assertEquals(List.of(), new TextCollection(root, "Peter").children());
        assertThrows(IllegalArgumentException.class, () -> new TextCollection(root, "x", List.of("a", "b", "c", "d")));
        for (String key : List.of("", "*", "x[]", "x\"", "a".repeat(257), "workspace.id", "hertzbeat_workspace_id")) {
            assertThrows(IllegalArgumentException.class, () -> new TextCollection(root, "x", List.of(key)));
        }
        assertThrows(NullPointerException.class, () -> new TextCollection(root, "x", null));
        assertEquals(3, new TextCollection(new Field(Domain.RESOURCE, "a".repeat(256)), "",
                List.of("b".repeat(256), "c".repeat(256), "d".repeat(256))).children().size());
    }

    @Test
    void nestedRangeAndEmptyKeepEachLiteralSegmentAndImmediateExpansion() {
        var root = new Field(Domain.ATTRIBUTE, "users.list");
        assertEquals("COALESCE(json_path_exists(log_attributes, '$[\"users.list\"][*][\"codes.v\"][*] ? (@ >= 2 && @ <= 6)'), false)",
                GreptimeStructuredLogPredicate.compile(new NumericCollection(root, 2, 6, List.of("codes.v"))));
        String empty = GreptimeStructuredLogPredicate.compile(new TextCollection(root, "", List.of("name")));
        assertTrue(empty.contains("$[\"users.list\"][*][\"name\"][*] ? (@ > NaN && @ < \"\\u0000\")"));
        String both = GreptimeStructuredLogPredicate.compile(new LogSearchExpression.And(List.of(
                new TextCollection(root, "Peter", List.of("name")),
                new NumericCollection(root, 4, 4, List.of("codes")))));
        assertTrue(both.contains(" AND ") && both.contains("[\"name\"][*]") && both.contains("[\"codes\"][*]"));
    }

    @Test
    void textValuesStayExactBoundedAndNeverTargetBuiltins() {
        var field = new Field(Domain.ATTRIBUTE, "literal.dotted");
        assertEquals("", new TextCollection(field, "").value());
        assertEquals(" ", new TextCollection(field, " ").value());
        String supplementary = new String(Character.toChars(0x1F600));
        assertEquals(supplementary, new TextCollection(field, supplementary).value());
        assertThrows(IllegalArgumentException.class, () -> new TextCollection(field, String.valueOf((char) 0xD800)));
        assertThrows(IllegalArgumentException.class, () -> new TextCollection(field, String.valueOf((char) 0xDC00)));
        assertEquals(8192, new TextCollection(field, "a".repeat(8192)).value().length());
        assertThrows(IllegalArgumentException.class, () -> new TextCollection(field, "a".repeat(8193)));
        assertThrows(NullPointerException.class, () -> new TextCollection(field, null));
        assertThrows(NullPointerException.class, () -> new TextCollection(null, "x"));
        assertThrows(IllegalArgumentException.class, () -> new TextCollection(new Field(Domain.BUILTIN, "service"), "x"));
    }

    @Test
    void textCompilesQuotedScalarEqualityAndEmptyUsesTypedBoundary() {
        var field = new Field(Domain.RESOURCE, "literal.dotted:code");
        String empty = GreptimeStructuredLogPredicate.compile(new TextCollection(field, ""));
        assertEquals("COALESCE(json_path_exists(resource_attributes, '$[\"literal.dotted:code\"][*] ? (@ > NaN && @ < \"\\u0000\")'), false)", empty);
        assertEquals("(NOT " + empty + ")", GreptimeStructuredLogPredicate.compile(new LogSearchExpression.Not(new TextCollection(field, ""))));
        String exact = GreptimeStructuredLogPredicate.compile(new TextCollection(field, "O'Reilly *?"));
        assertTrue(exact.contains("@ == \"O''Reilly *?\""));
        String mixed = GreptimeStructuredLogPredicate.compile(new LogSearchExpression.And(List.of(
                new NumericCollection(field, 4, 4), new TextCollection(field, "4"))));
        assertTrue(mixed.contains("@ == 4") && mixed.contains("@ == \"4\"") && mixed.contains(" AND "));
    }

    @Test
    void boundsDomainAndReservedFieldRemainValidated() {
        var field = new Field(Domain.ATTRIBUTE, "literal.dotted");
        assertEquals(9007199254740992L, new NumericCollection(field, -9007199254740992L, 9007199254740992L).upper());
        assertThrows(IllegalArgumentException.class, () -> new NumericCollection(field, 6, 2));
        assertThrows(IllegalArgumentException.class, () -> new NumericCollection(field, Long.MIN_VALUE, 0));
        assertThrows(IllegalArgumentException.class, () -> new NumericCollection(field, 0, Long.MAX_VALUE));
        assertThrows(IllegalArgumentException.class, () -> new NumericCollection(new Field(Domain.BUILTIN, "service"), 1, 1));
        assertThrows(IllegalArgumentException.class, () -> new Field(Domain.RESOURCE, "hertzbeat.workspace_id"));
        assertThrows(IllegalArgumentException.class, () -> new Field(Domain.ATTRIBUTE, "v\"[*]"));
    }

    @Test
    void rangeIsOneElementPredicateAndNotComplementsMissing() {
        var field = new Field(Domain.ATTRIBUTE, "literal.dotted:code");
        String sql = GreptimeStructuredLogPredicate.compile(new NumericCollection(field, -2, 6));
        assertEquals("COALESCE(json_path_exists(log_attributes, '$[\"literal.dotted:code\"][*] ? (@ >= -2 && @ <= 6)'), false)", sql);
        assertEquals("(NOT " + sql + ")", GreptimeStructuredLogPredicate.compile(
                new LogSearchExpression.Not(new NumericCollection(field, -2, 6))));
        var resource = new Field(Domain.RESOURCE, "codes");
        String both = GreptimeStructuredLogPredicate.compile(new LogSearchExpression.And(List.of(
                new NumericCollection(resource, 4, 4), new NumericCollection(resource, 6, 6))));
        assertTrue(both.contains("resource_attributes") && both.contains("@ == 4") && both.contains("@ == 6") && both.contains(" AND "));
    }

    @Test
    void wholeHistoryFamilyKeepsCollectionInsideTrustedWhereBeforeLimits() {
        var executor = mock(GreptimeSqlQueryExecutor.class);
        var captured = new ArrayList<String>();
        when(executor.executeStrict(anyString())).thenAnswer(call -> {
            String sql = call.getArgument(0);
            captured.add(sql);
            if (sql.contains(" as totalCount")) {
                return List.of(Map.of("totalCount", 0L, "fatalCount", 0L, "errorCount", 0L,
                        "warnCount", 0L, "infoCount", 0L, "debugCount", 0L, "traceCount", 0L,
                        "withTrace", 0L, "withSpan", 0L, "withBothTraceAndSpan", 0L));
            }
            if (sql.startsWith("SELECT COUNT(*)")) { return List.of(Map.of("count", 0L)); }
            return List.of();
        });
        var properties = mock(GreptimeProperties.class);
        when(properties.database()).thenReturn("public");
        when(properties.grpcEndpoints()).thenReturn("localhost:4001");
        when(properties.httpEndpoint()).thenReturn("http://localhost:4000");
        var scope = new LogFacets.Scope("bound", 1000, 2000, null, null, null, null, null,
                "service", null, null, Map.of(), Map.of(), Set.of(), false, null);
        var expression = new LogSearchExpression.And(List.of(
                new NumericCollection(new Field(Domain.ATTRIBUTE, "users"), 2, 6, List.of("codes")),
                new TextCollection(new Field(Domain.RESOURCE, "users"), "Peter", List.of("names"))));
        var query = new LogSearchQuery(scope, expression);
        try (var guard = new GreptimeQueryGuard(1, Duration.ofSeconds(2), Duration.ofMillis(10))) {
            var store = new GreptimeDbDataStorage(properties, null, executor, guard);
            store.queryStructuredLogs(query, 0, 10, "newest");
            store.countStructuredLogs(query);
            store.structuredLogOverview(query);
            store.structuredLogTraceCoverage(query);
            store.structuredLogTrend(query, 60000);
            store.structuredLogGroups(query, "serviceName", 20, "count-desc", 1);
            store.structuredLogFacetFields(query);
            store.structuredLogFacetValues(query, LogFacets.Field.parse("attribute:codes"), 20);
        }
        assertEquals(8, captured.size());
        String predicate = GreptimeStructuredLogPredicate.compile(expression);
        for (String sql : captured) {
            assertTrue(sql.contains("bound") && sql.contains("service_name = 'service'") && sql.contains(predicate));
            assertTrue(sql.indexOf(" LIMIT ") < 0 || sql.indexOf(predicate) < sql.indexOf(" LIMIT "));
        }
    }
}
