/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.observability.logs.query;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogQuerySet;
import org.apache.hertzbeat.common.observability.query.ArithmeticFormulaValidator;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Strict bounded query-set envelope; trusted scope is resolved by the service. */
public final class LogQuerySetParser {
    private static final JsonMapper MAPPER = JsonMapper.builder()
            .enable(DeserializationFeature.FAIL_ON_READING_DUP_TREE_KEY)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
    private static final Set<String> SHARED = new HashSet<>(LogComparisonParser.PARAMETERS);

    static {
        SHARED.removeAll(Set.of("field", "grouping", "measure", "additionalMeasures", "limit", "order", "minCount", "transform"));
    }

    private LogQuerySetParser() { }

    /** Parsed request values, before trusted scope binding. */
    public record Envelope(Map<String, String> parameters, List<LogQuerySet.Query> queries,
                           List<LogQuerySet.Formula> formulas) { }

    public static Envelope parse(String source) {
        if (source == null || source.length() > 32768) { throw invalid(); }
        try {
            JsonNode root = MAPPER.readTree(source);
            fields(root, Set.of("version", "parameters", "queries", "formulas"));
            if (!integer(root.get("version"), 2, 2)) { throw invalid(); }
            Map<String, String> parameters = parameters(root.get("parameters"));
            List<LogQuerySet.Query> queries = queries(root.get("queries"), parameters);
            List<LogQuerySet.Formula> formulas = formulas(root.get("formulas"), queries);
            return new Envelope(Map.copyOf(parameters), List.copyOf(queries), List.copyOf(formulas));
        } catch (LogFilterQueryException invalid) {
            throw invalid;
        } catch (RuntimeException invalid) {
            throw invalid();
        }
    }

    private static Map<String, String> parameters(JsonNode node) {
        fields(node, SHARED);
        var result = new LinkedHashMap<String, String>();
        for (String name : node.propertyNames()) { result.put(name, text(node.get(name))); }
        return result;
    }

    private static List<LogQuerySet.Query> queries(JsonNode node, Map<String, String> parameters) {
        if (node == null || !node.isArray() || node.size() < 1 || node.size() > 4) { throw invalid(); }
        var result = new ArrayList<LogQuerySet.Query>();
        var seen = new HashSet<String>();
        for (JsonNode item : node) {
            fields(item, Set.of("refId", "alias", "visible", "searchSyntax", "search", "timeShiftMs", "analysis"));
            String id = text(item.get("refId"));
            if (!id.matches("[a-z]") || !seen.add(id)) { throw invalid(); }
            String alias = alias(item.get("alias"));
            if (item.get("visible") == null || !item.get("visible").isBoolean()) { throw invalid(); }
            String syntax = item.has("searchSyntax") ? text(item.get("searchSyntax")) : null;
            String search = item.has("search") ? text(item.get("search")) : null;
            LogSearchParser.validateSyntax(syntax);
            if (LogSearchParser.SYNTAX.equals(syntax)) { LogSearchParser.parse(search); }
            else if (search != null && search.length() > 512) { throw invalid(); }
            Long shift = shift(item.get("timeShiftMs"));
            LogQuerySet.Analysis analysis = analysis(item.get("analysis"), parameters);
            result.add(new LogQuerySet.Query(id, alias, item.get("visible").booleanValue(), syntax, search, shift, analysis));
        }
        return result;
    }

    private static List<LogQuerySet.Formula> formulas(JsonNode node, List<LogQuerySet.Query> queries) {
        if (node == null) { return List.of(); }
        if (!node.isArray() || node.size() > 4) { throw invalid(); }
        var result = new ArrayList<LogQuerySet.Formula>();
        var seen = new HashSet<String>();
        Set<String> references = queries.stream().map(LogQuerySet.Query::refId).collect(java.util.stream.Collectors.toSet());
        for (JsonNode item : node) {
            fields(item, Set.of("refId", "alias", "visible", "expression"));
            String id = text(item.get("refId"));
            if (!id.matches("f(?:[1-9][0-9]{0,3})") || !seen.add(id)) { throw invalid(); }
            if (item.get("visible") == null || !item.get("visible").isBoolean()) { throw invalid(); }
            String expression = text(item.get("expression"));
            var used = ArithmeticFormulaValidator.referencesUsed(expression, references);
            if (!compatible(queries, used)) { throw invalid(); }
            result.add(LogQuerySet.Formula.from(id, alias(item.get("alias")), item.get("visible").booleanValue(), expression, references));
        }
        return result;
    }

    private static boolean compatible(List<LogQuerySet.Query> queries, Set<String> used) {
        List<String> signature = null;
        for (var query : queries) {
            if (!used.contains(query.refId())) { continue; }
            var analysis = query.analysis();
            var current = analysis.grouping() != null ? analysis.grouping().dimensions().stream().map(LogAnalysis.Dimension::field).toList()
                    : analysis.field() == null ? List.<String>of() : List.of(analysis.field());
            if (signature != null && !signature.equals(current)) { return false; }
            signature = current;
        }
        return true;
    }

    private static LogQuerySet.Analysis analysis(JsonNode node, Map<String, String> parameters) {
        fields(node, Set.of("field", "grouping", "measure", "limit", "order", "minCount", "transform"));
        LogFacets.Field field = node.has("field") && !node.get("field").isNull()
                ? LogFacets.Field.parse(text(node.get("field"))) : null;
        LogAnalysis.Grouping grouping = node.has("grouping") && !node.get("grouping").isNull()
                ? LogAnalysisGroupingParser.parse(node.get("grouping").toString()) : null;
        LogAnalysis.Measure measure = node.has("measure") && !node.get("measure").isNull()
                ? LogAnalysisMeasureParser.parse(node.get("measure").toString()) : null;
        int limit = requiredInt(node.get("limit"), 1, 25);
        long minCount = requiredInt(node.get("minCount"), 1, 1_000_000);
        String view = parameters.getOrDefault("view", "groups");
        Long interval = parameters.containsKey("intervalMs") ? Long.parseLong(parameters.get("intervalMs")) : null;
        return LogQuerySet.Analysis.from(new LogAnalysis.Request(field, view, limit, text(node.get("order")), minCount,
                measure, grouping, interval, null, node.has("transform") ? text(node.get("transform")) : null));
    }

    private static Long shift(JsonNode node) {
        if (node == null) { return null; }
        if (!integer(node, 0, 604800000)) { throw invalid(); }
        long value = node.longValue();
        if (value != 0) { LogComparison.validateTimeShift(value); }
        return value;
    }

    private static String alias(JsonNode node) {
        String value = text(node);
        if (value.isBlank() || value.codePointCount(0, value.length()) > 64 || value.chars().anyMatch(Character::isISOControl)) {
            throw invalid();
        }
        return value;
    }

    private static int requiredInt(JsonNode node, int min, int max) {
        if (!integer(node, min, max)) { throw invalid(); }
        return node.intValue();
    }

    private static boolean integer(JsonNode node, long min, long max) {
        return node != null && node.isIntegralNumber() && node.canConvertToLong()
                && node.longValue() >= min && node.longValue() <= max;
    }

    private static void fields(JsonNode node, Set<String> names) {
        if (node == null || !node.isObject() || !names.containsAll(node.propertyNames())) { throw invalid(); }
    }

    private static String text(JsonNode node) {
        if (node == null || !node.isString()) { throw invalid(); }
        return node.stringValue();
    }

    private static IllegalArgumentException invalid() { return new IllegalArgumentException("Invalid log query set"); }
}
