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

package org.apache.hertzbeat.manager.service.impl;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;
import org.apache.hertzbeat.common.observability.query.ArithmeticFormulaValidator;
import org.apache.hertzbeat.observability.logs.query.LogAnalysisGroupingParser;
import org.apache.hertzbeat.observability.logs.query.LogAnalysisMeasureParser;
import org.apache.hertzbeat.observability.logs.query.LogQuerySetParser;
import org.apache.hertzbeat.observability.logs.query.LogAttributeFilterParser;
import org.apache.hertzbeat.observability.logs.query.LogGroupSelectionParser;
import org.apache.hertzbeat.observability.logs.query.LogNumericRangeParser;
import org.apache.hertzbeat.observability.logs.query.LogSearchParser;
import org.apache.hertzbeat.observability.logs.query.LogSortParser;
import tools.jackson.databind.JsonNode;

/** Validates persisted analysis without resolving variables or inventing a runtime window. */
final class PersesLogAnalysisValidator {
    private PersesLogAnalysisValidator() { }

    static void validate(JsonNode query, String panelKind) {
        object(query, "signal", "queryKind", "context", "search", "searchSyntax", "severity", "severityCategory",
                "traceId", "spanId", "hideInternal", "hideNoise", "resourceFilter", "attributeFilter", "sort", "logSort",
                "limit", "logGroupSelection", "logNumericRange", "analysis", "returnView");
        require("logs".equals(text(query.path("signal"), 16)) && "analysis".equals(text(query.path("queryKind"), 16)));
        search(query);
        for (String key : Set.of("resourceFilter", "attributeFilter")) {
            if (query.has(key)) { LogAttributeFilterParser.parse(text(query.get(key), 1024)); }
        }
        for (String key : Set.of("traceId", "spanId", "severity")) {
            if (query.has(key)) {
                String value = text(query.get(key), "severity".equals(key) ? 512 : 256);
                require(!value.isEmpty() && PersesDashboardDocumentValidator.trimmed(value));
            }
        }
        if (query.has("severityCategory")) { choice(query.get("severityCategory"), "TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"); }
        for (String key : Set.of("hideInternal", "hideNoise")) { if (query.has(key)) { require(query.get(key).isBoolean()); } }
        if (query.has("limit")) { integer(query.get("limit"), 1, 1000); }
        if (query.has("sort")) { choice(query.get("sort"), "newest", "oldest"); }
        if (query.has("logSort")) {
            LogSortParser.parse(query.get("logSort").toString());
            require(!query.has("sort") || "newest".equals(query.get("sort").stringValue()));
        }
        if (query.has("logGroupSelection")) { LogGroupSelectionParser.parse(query.get("logGroupSelection").toString()); }
        if (query.has("logNumericRange")) { LogNumericRangeParser.parse(query.get("logNumericRange").toString()); }
        analysis(query.path("analysis"), panelKind);
    }

    private static void analysis(JsonNode state, String panelKind) {
        object(state, "version", "representation", "field", "measure", "additionalMeasures", "grouping", "comparison", "querySet",
                "limit", "order", "minCount", "intervalMs", "transform");
        require(state.toString().length() <= 20000);
        integer(state.path("version"), 1, 1);
        String representation = text(state.path("representation"), 16);
        choice(state.path("representation"), "table", "toplist", "timeseries");
        boolean timed = "timeseries".equals(representation);
        require((timed ? "TimeSeriesChart" : "LogsTable").equals(panelKind));
        var field = state.has("field") ? LogFacets.Field.parse(text(state.get("field"), 266)) : null;
        var measure = state.has("measure") ? LogAnalysisMeasureParser.parse(state.get("measure").toString()) : null;
        require(!state.has("measure") || measure != null);
        var extras = state.has("additionalMeasures") ? LogAnalysisMeasureParser.parseAdditional(state.get("additionalMeasures").toString()) : null;
        require(extras == null || measure == null || !extras.contains(measure));
        var grouping = state.has("grouping") ? LogAnalysisGroupingParser.parse(state.get("grouping").toString()) : null;
        require(!"toplist".equals(representation) || grouping == null || grouping.dimensions().size() == 1);
        Long interval = state.has("intervalMs") ? integer(state.get("intervalMs"), 1, 86400000) : null;
        require(interval == null || LogTrend.EXPLICIT_INTERVALS_MS.contains(interval));
        String transform = state.has("transform") ? text(state.get("transform"), 16) : null;
        new LogAnalysis.Request(field, timed ? "timeseries" : "groups", (int) integer(state.path("limit"), 1, 100),
                text(state.path("order"), 16), integer(state.path("minCount"), 1, 1000000), measure, grouping,
                timed ? interval : null, "table".equals(representation) ? extras : null, transform);
        require(!state.has("comparison") || !state.has("querySet"));
        if (state.has("querySet")) { querySet(state.get("querySet"), timed, interval); }
        if (state.has("comparison")) {
            require(!"toplist".equals(representation));
            JsonNode comparison = state.get("comparison");
            object(comparison, "version", "search", "searchSyntax", "formula", "timeShiftMs", "hidden");
            integer(comparison.path("version"), 1, 1);
            boolean hasB = comparison.has("search");
            require(hasB || comparison.has("formula"));
            require(hasB || !comparison.has("searchSyntax") && !comparison.has("timeShiftMs"));
            if (hasB) { search(comparison); }
            if (comparison.has("formula")) {
                ArithmeticFormulaValidator.validate(text(comparison.get("formula"), 256), hasB ? Set.of("a", "b") : Set.of("a"));
            }
            if (comparison.has("timeShiftMs")) { LogComparison.validateTimeShift(integer(comparison.get("timeShiftMs"), 1, 604800000)); }
            if (comparison.has("hidden")) { hidden(comparison.get("hidden"), hasB, comparison.has("formula")); }
        }
    }

    private static void querySet(JsonNode state, boolean timed, Long interval) {
        object(state, "version", "queries", "formulas", "nextSourceOrdinal", "nextFormulaSeq");
        integer(state.path("version"), 2, 2);
        long nextSource = integer(state.path("nextSourceOrdinal"), 1, 27);
        long nextFormula = integer(state.path("nextFormulaSeq"), 1, 10000);
        require(state.has("queries") && state.has("formulas"));
        String parameters = "{\"view\":\"" + (timed ? "timeseries" : "groups") + "\""
                + (interval == null ? "" : ",\"intervalMs\":\"" + interval + "\"") + "}";
        String envelope = "{\"version\":2,\"parameters\":" + parameters + ",\"queries\":"
                + state.get("queries") + ",\"formulas\":" + state.get("formulas") + "}";
        var parsed = LogQuerySetParser.parse(envelope);
        long highestSource = parsed.queries().stream().mapToInt(query -> query.refId().charAt(0) - 'a' + 1).max().orElse(0);
        long highestFormula = parsed.formulas().stream().mapToInt(formula -> Integer.parseInt(formula.refId().substring(1))).max().orElse(0);
        require(nextSource >= highestSource && nextFormula > highestFormula);
    }

    private static void hidden(JsonNode values, boolean hasB, boolean hasFormula) {
        require(values.isArray() && values.size() <= 3);
        var seen = new HashSet<String>();
        for (JsonNode value : values) {
            String id = text(value, 7);
            require(Set.of("a", "b", "formula").contains(id) && seen.add(id));
            require(!"b".equals(id) || hasB);
            require(!"formula".equals(id) || hasFormula);
        }
    }

    private static void search(JsonNode source) {
        String syntax = source.has("searchSyntax") ? text(source.get("searchSyntax"), 32) : null;
        LogSearchParser.validateSyntax(syntax);
        String search = source.has("search") ? text(source.get("search"), syntax == null ? 512 : 8192) : "";
        if (syntax != null) { LogSearchParser.parse(search); }
    }

    private static void object(JsonNode node, String... keys) {
        require(node.isObject() && Set.of(keys).containsAll(node.propertyNames()));
    }

    private static String text(JsonNode node, int maximum) {
        require(node.isString() && node.stringValue().length() <= maximum);
        return node.stringValue();
    }

    private static long integer(JsonNode node, long min, long max) {
        require(node.isNumber());
        BigDecimal value = node.decimalValue();
        require(value.stripTrailingZeros().scale() <= 0 && value.compareTo(BigDecimal.valueOf(min)) >= 0
                && value.compareTo(BigDecimal.valueOf(max)) <= 0);
        return value.longValueExact();
    }

    private static void choice(JsonNode node, String... choices) { require(Set.of(choices).contains(text(node, 32))); }

    private static void require(boolean valid) {
        if (!valid) { throw new IllegalArgumentException("Invalid persisted log analysis"); }
    }
}
