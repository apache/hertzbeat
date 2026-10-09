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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.query.LogCalculatedFormula;

/** A same-statement, full-scoped-population gate before costly string projection. */
final class GreptimeLogCalculatedAdmission {
    private static final int ROW_LIMIT = 1000;
    private static final int SOURCE_LIMIT = 16384;
    private static final int EXPANDED_LIMIT = 16 * 1024 * 1024;
    private static final Set<String> STRING_CALLS = Set.of("concat", "textjoin", "lower", "upper", "proper",
            "left", "right", "substring", "split_before", "split_after", "substring_count",
            "regexp_like", "regexp_replace", "levenshtein_distance", "entropy");

    private GreptimeLogCalculatedAdmission() { }

    static boolean required(LogCalculated.Query query) {
        return query.definitions().fields().stream().anyMatch(definition -> "extraction".equals(definition.kind())
                || stringCall(LogCalculatedFormula.parse(definition.expression()))
                || "string".equals(definition.outputs().getFirst().type())
                        && reservedInput(LogCalculatedFormula.parse(definition.expression())));
    }

    static String ctes(LogCalculated.Query query, String where, String table) {
        String search = rawSearch(query.search()) ? GreptimeStructuredLogPredicate.compile(query.search()) : null;
        String scoped = "scoped AS (SELECT * FROM " + table + where
                + (search == null || "true".equals(search) ? "" : " AND " + search) + ")";
        if (!required(query)) { return scoped; }
        var sources = new LinkedHashSet<String>();
        var expansions = new HashMap<String, LogCalculatedFormula.Expansion>();
        var heavy = new GreptimeLogCalculatedHeavyCost();
        long literal = 0;
        long copies = 0;
        for (var definition : GreptimeLogCalculatedPage.ordered(query.definitions())) {
            if ("extraction".equals(definition.kind())) {
                sources.add(source(definition.source()));
                for (var output : definition.outputs()) {
                    expansions.put(output.name(), new LogCalculatedFormula.Expansion(0, 1));
                    copies += "number".equals(output.type()) ? 3 : 1;
                }
            } else {
                var node = LogCalculatedFormula.parse(definition.expression());
                collect(node, sources);
                heavy.collect(node, expansions);
                var peak = peak(node, expansions);
                literal += peak.literalBytes();
                copies += peak.rawCopies();
                expansions.put(definition.name(), LogCalculatedFormula.expansion(node, expansions));
            }
        }
        var bytes = sources.stream().map(value -> "COALESCE(octet_length(" + value + "), 0)").toList();
        String sum = bytes.isEmpty() ? "0" : String.join(" + ", bytes);
        String max = bytes.isEmpty() ? "0" : "greatest(" + String.join(", ", bytes) + ")";
        String costed = heavy.required() ? ", costed AS (SELECT *, " + heavy.regex()
                + " AS heavy_regex_bytes, " + heavy.distance() + " AS heavy_distance_work, "
                + heavy.entropy() + " AS heavy_entropy_positions FROM sized)" : "";
        String population = heavy.required() ? "costed" : "sized";
        String heavyBound = heavy.required() ? " AND COALESCE(SUM(heavy_regex_bytes), 0) <= 1048576"
                + " AND COALESCE(SUM(heavy_distance_work), 0) <= 1000000"
                + " AND COALESCE(SUM(heavy_entropy_positions), 0) <= 65536" : "";
        return scoped + ", sized AS (SELECT *, (" + sum + ") AS input_bytes, " + max
                + " AS max_source_bytes FROM scoped)" + costed + ", admission AS (SELECT COUNT(*) AS candidate_rows,"
                + " (COUNT(*) <= " + ROW_LIMIT + " AND COALESCE(MAX(max_source_bytes), 0) <= " + SOURCE_LIMIT
                + " AND COUNT(*) * " + literal + " + COALESCE(SUM(input_bytes), 0) * " + copies
                + " <= " + EXPANDED_LIMIT + heavyBound + ") AS admitted FROM " + population + "),"
                + " admitted_rows AS (SELECT " + population + ".* FROM " + population
                + " CROSS JOIN admission WHERE admission.admitted)";
    }

    static String source(String field) {
        return "builtin:body".equals(field) ? "body" : GreptimeLogFacets.expression(LogFacets.Field.parse(field));
    }

    static void check(List<Map<String, Object>> rows, LogCalculated.Query query) {
        if (!required(query)) { return; }
        if (rows == null || rows.isEmpty() || !(rows.getFirst().get("admitted") instanceof Boolean admitted)) {
            throw new IllegalArgumentException("Missing calculated admission");
        }
        if (!admitted) {
            throw new LogCalculatedFormula.ValidationException("budget_exceeded", "calculatedFields");
        }
        if (rows.stream().anyMatch(row -> !Boolean.TRUE.equals(row.get("admitted")))) {
            throw new IllegalArgumentException("Inconsistent calculated admission");
        }
    }

    private static LogCalculatedFormula.Expansion peak(LogCalculatedFormula.Node node,
                                                       Map<String, LogCalculatedFormula.Expansion> dependencies) {
        var result = LogCalculatedFormula.expansion(node, dependencies);
        List<LogCalculatedFormula.Node> children = switch (node) {
            case LogCalculatedFormula.Call call -> call.arguments();
            case LogCalculatedFormula.Unary unary -> List.of(unary.operand());
            case LogCalculatedFormula.Binary binary -> List.of(binary.left(), binary.right());
            default -> List.of();
        };
        for (var child : children) {
            var next = peak(child, dependencies);
            result = new LogCalculatedFormula.Expansion(Math.max(result.literalBytes(), next.literalBytes()),
                    Math.max(result.rawCopies(), next.rawCopies()));
        }
        return result;
    }

    private static void collect(LogCalculatedFormula.Node node, Set<String> sources) {
        switch (node) {
            case LogCalculatedFormula.Raw raw -> sources.add(GreptimeLogCalculatedFormula.raw(raw.name()));
            case LogCalculatedFormula.Reserved reserved -> sources.add(GreptimeLogCalculatedFormula.reserved(reserved.name()));
            case LogCalculatedFormula.Call call -> call.arguments().forEach(arg -> collect(arg, sources));
            case LogCalculatedFormula.Unary unary -> collect(unary.operand(), sources);
            case LogCalculatedFormula.Binary binary -> {
                collect(binary.left(), sources);
                collect(binary.right(), sources);
            }
            default -> { }
        }
    }

    private static boolean stringCall(LogCalculatedFormula.Node node) {
        return switch (node) {
            case LogCalculatedFormula.Call call -> STRING_CALLS.contains(call.name())
                    || call.arguments().stream().anyMatch(GreptimeLogCalculatedAdmission::stringCall);
            case LogCalculatedFormula.Unary unary -> stringCall(unary.operand());
            case LogCalculatedFormula.Binary binary -> stringCall(binary.left()) || stringCall(binary.right());
            default -> false;
        };
    }

    private static boolean reservedInput(LogCalculatedFormula.Node node) {
        return switch (node) {
            case LogCalculatedFormula.Reserved ignored -> true;
            case LogCalculatedFormula.Call call -> call.arguments().stream()
                    .anyMatch(GreptimeLogCalculatedAdmission::reservedInput);
            case LogCalculatedFormula.Unary unary -> reservedInput(unary.operand());
            case LogCalculatedFormula.Binary binary -> reservedInput(binary.left()) || reservedInput(binary.right());
            default -> false;
        };
    }

    private static boolean rawSearch(LogSearchExpression expression) {
        return switch (expression) {
            case LogSearchExpression.And and -> and.children().stream().allMatch(GreptimeLogCalculatedAdmission::rawSearch);
            case LogSearchExpression.Or or -> or.children().stream().allMatch(GreptimeLogCalculatedAdmission::rawSearch);
            case LogSearchExpression.Not not -> rawSearch(not.child());
            case LogSearchExpression.Term term -> term.field().domain() != LogSearchExpression.Domain.CALCULATED;
            case LogSearchExpression.NumericCollection collection ->
                    collection.field().domain() != LogSearchExpression.Domain.CALCULATED;
            case LogSearchExpression.TextCollection collection ->
                    collection.field().domain() != LogSearchExpression.Domain.CALCULATED;
        };
    }
}
