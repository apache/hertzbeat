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

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.query.ArithmeticFormulaValidator;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Strict read-only comparison envelope, independent of trusted workspace resolution. */
public final class LogComparisonParser {
    private static final int MAX_LENGTH = 32768;
    static final Set<String> PARAMETERS = Set.of("start", "end", "entityId", "entityType", "collectorId", "instance", "endpoint",
            "traceId", "spanId", "severityNumber", "severityText", "severityCategory", "serviceName", "serviceNamespace", "environment",
            "resourceFilter", "attributeFilter", "hideInternal", "hideNoise", "logGroupSelection", "logNumericRange", "view", "field", "limit", "order", "minCount",
            "measure", "grouping", "intervalMs", "additionalMeasures", "transform");
    private static final JsonMapper MAPPER = JsonMapper.builder()
            .enable(DeserializationFeature.FAIL_ON_READING_DUP_TREE_KEY)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();

    private LogComparisonParser() { }

    /** One uncompiled user expression, never a trusted scope. */
    public record Query(String searchSyntax, String search, Long timeShiftMs) {
        public Query(String searchSyntax, String search) { this(searchSyntax, search, null); }
    }

    /** Validate the fixed translation before admission or identity lookup. */
    public static LogFacets.Window comparisonWindow(LogFacets.Window window, List<Query> queries) {
        if (queries == null || queries.size() != 2 || queries.getFirst().timeShiftMs() != null) { throw invalid(); }
        Long offset = queries.getLast().timeShiftMs();
        return offset == null ? window : LogComparison.shiftedWindow(window, offset);
    }

    /** Validated external comparison controls. */
    public record Envelope(Map<String, String> parameters, List<Query> queries, String formula) { }

    public static Envelope parse(String source) {
        if (source == null || source.length() > MAX_LENGTH) { throw invalid(); }
        try {
            JsonNode root = MAPPER.readTree(source);
            fields(root, Set.of("version", "parameters", "queries", "formula"));
            JsonNode version = root.get("version");
            if (version == null || !version.isIntegralNumber() || !version.canConvertToInt() || version.intValue() != 1) { throw invalid(); }
            JsonNode parameters = root.get("parameters");
            fields(parameters, PARAMETERS);
            var values = new LinkedHashMap<String, String>();
            for (String name : parameters.propertyNames()) { values.put(name, text(parameters.get(name))); }
            JsonNode queries = root.get("queries");
            if (queries == null || !queries.isArray() || queries.size() != 2) { throw invalid(); }
            var parsed = new ArrayList<Query>();
            for (int i = 0; i < 2; i++) {
                JsonNode query = queries.get(i);
                fields(query, i == 0 ? Set.of("id", "searchSyntax", "search") : Set.of("id", "searchSyntax", "search", "timeShiftMs"));
                Long offset = null;
                if (query.has("timeShiftMs")) {
                    JsonNode value = query.get("timeShiftMs");
                    if (!value.isIntegralNumber() || !value.canConvertToLong()) { throw invalid(); }
                    offset = value.longValue();
                    LogComparison.validateTimeShift(offset);
                }
                if (!(i == 0 ? "a" : "b").equals(text(query.get("id")))) { throw invalid(); }
                String syntax = query.has("searchSyntax") ? text(query.get("searchSyntax")) : null;
                String search = query.has("search") ? text(query.get("search")) : null;
                try {
                    LogSearchParser.validateSyntax(syntax);
                    if (LogSearchParser.SYNTAX.equals(syntax)) { LogSearchParser.parse(search); }
                    else if (search != null && search.length() > 512) { throw invalid(); }
                } catch (LogFilterQueryException invalid) {
                    throw invalid.withSource(i == 0 ? "a" : "b");
                }
                parsed.add(new Query(syntax, search, offset));
            }
            String formula = root.has("formula") ? text(root.get("formula")) : null;
            if (formula != null) { ArithmeticFormulaValidator.validate(formula, Set.of("a", "b")); }
            return new Envelope(Map.copyOf(values), List.copyOf(parsed), formula);
        } catch (LogFilterQueryException invalid) {
            throw invalid;
        } catch (RuntimeException ignored) {
            throw invalid();
        }
    }

    private static void fields(JsonNode node, Set<String> allowed) {
        if (node == null || !node.isObject() || !allowed.containsAll(node.propertyNames())) { throw invalid(); }
    }

    private static String text(JsonNode node) {
        if (node == null || !node.isString()) { throw invalid(); }
        return node.stringValue();
    }

    private static IllegalArgumentException invalid() { return new IllegalArgumentException("Invalid log comparison"); }
}
