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

import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.apache.hertzbeat.observability.logs.query.LogCalculatedParser;
import org.apache.hertzbeat.observability.logs.query.LogSearchParser;
import org.apache.hertzbeat.common.observability.dto.log.LogSort;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Validates the pinned HertzBeat subset without rewriting accepted Perses documents. */
@Component
public class PersesDashboardDocumentValidator {
    public static final String VERSION = "hertzbeat-perses-v1";
    private static final Set<String> VARIABLE_NAMES = Set.of("serviceName", "serviceNamespace", "environment");
    private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;
    private static final JsonMapper JSON = JsonMapper.builder()
            .enable(DeserializationFeature.FAIL_ON_READING_DUP_TREE_KEY)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();

    public void validate(String key, JsonNode document) {
        require(document != null && document.toString().getBytes(StandardCharsets.UTF_8).length <= 65535);
        object(document, "kind", "metadata", "spec");
        literal(document.path("kind"), "Dashboard");
        JsonNode metadata = document.path("metadata");
        object(metadata, "name", "project", "tags");
        require(text(metadata.path("name"), 1, 75).matches("[A-Za-z0-9_.-]+"));
        literal(metadata.path("name"), key);
        literal(metadata.path("project"), "hertzbeat");
        if (metadata.has("tags")) {
            uniqueStrings(metadata.get("tags"), 0, 16, 64);
            require(tags(document).length() <= 512 && metadata.get("tags").toString().length() <= 512);
        }
        JsonNode spec = document.path("spec");
        object(spec, "display", "duration", "variables", "panels", "layouts", "refreshInterval", "timezone");
        display(spec.path("display"));
        choice(spec.path("duration"), "15m", "30m", "1h", "6h", "24h");
        if (spec.has("refreshInterval")) {
            choice(spec.get("refreshInterval"), "0s", "30s", "1m");
        }
        if (spec.has("timezone")) {
            String zone = text(spec.get("timezone"), 1, 128);
            require(Set.of("EST", "MST", "HST").contains(zone.toUpperCase(Locale.ROOT))
                    || ZoneId.getAvailableZoneIds().stream().anyMatch(known -> known.equalsIgnoreCase(zone)));
        }
        Set<String> variables = variables(spec.path("variables"));
        JsonNode panels = spec.path("panels");
        require(panels.isObject() && panels.size() <= 24);
        for (String panelId : panels.propertyNames()) {
            require(panelId.matches("[A-Za-z0-9_-]{1,128}") && !"__proto__".equals(panelId));
            panel(panels.get(panelId), variables);
        }
        layout(spec.path("layouts"), panels);
    }

    public String title(JsonNode document) {
        return document.path("spec").path("display").path("name").asText();
    }

    public String description(JsonNode document) {
        return document.path("spec").path("display").path("description").asText("");
    }

    public String tags(JsonNode document) {
        List<String> tags = new ArrayList<>();
        document.path("metadata").path("tags").forEach(tag -> tags.add(tag.asText()));
        return String.join(",", tags);
    }

    private Set<String> variables(JsonNode definitions) {
        array(definitions, 0, 3);
        Set<String> names = new HashSet<>();
        for (JsonNode definition : definitions) {
            object(definition, "kind", "spec");
            JsonNode spec = definition.path("spec");
            String name = text(spec.path("name"), 1, 256);
            require(VARIABLE_NAMES.contains(name) && names.add(name));
            String kind = text(definition.path("kind"), 1, 64);
            if ("TextVariable".equals(kind)) {
                object(spec, "name", "value");
                String value = text(spec.path("value"), 0, 256);
                require(value.isEmpty() || !value.isBlank() && trimmed(value));
            } else {
                require("ListVariable".equals(kind));
                object(spec, "name", "defaultValue", "allowMultiple", "allowAllValue", "plugin");
                require(spec.path("allowMultiple").isBoolean() && !spec.path("allowMultiple").booleanValue());
                require(spec.path("allowAllValue").isBoolean() && !spec.path("allowAllValue").booleanValue());
                JsonNode plugin = spec.path("plugin");
                object(plugin, "kind", "spec");
                literal(plugin.path("kind"), "StaticListVariable");
                object(plugin.path("spec"), "values");
                Set<String> values = uniqueStrings(plugin.path("spec").path("values"), 1, 100, 256);
                require(values.contains(text(spec.path("defaultValue"), 1, 256)));
            }
        }
        return names;
    }

    private void tableDisplay(JsonNode options, boolean logs) {
        optionalChoice(options, "density", "compact", "comfortable");
        if (!options.has("columns")) {
            return;
        }
        JsonNode columns = options.get("columns");
        array(columns, 1, logs ? 8 : 7);
        Set<String> seen = new java.util.HashSet<>();
        boolean required = false;
        for (JsonNode column : columns) {
            String identity;
            if (logs) {
                object(column, "kind", "scope", "path");
                choice(column.path("kind"), "time", "severity", "service", "message", "traceId", "spanId", "field");
                String kind = column.path("kind").asString();
                required |= "message".equals(kind);
                identity = kind;
                if ("field".equals(kind)) {
                    choice(column.path("scope"), "resource", "attributes", "instrumentationScope");
                    String scope = column.path("scope").asString();
                    array(column.path("path"), 1, 8);
                    for (JsonNode part : column.path("path")) {
                        if (!part.isString() || part.asString().isEmpty() || part.asString().length() > 256) {
                            throw invalid();
                        }
                    }
                    identity += ":" + scope + ":" + column.path("path");
                } else {
                    object(column, "kind");
                }
            } else {
                choice(column, "traceName", "service", "spanCount", "errorCount", "duration", "startTime", "traceId");
                identity = column.asString();
                required |= "traceName".equals(identity);
            }
            if (!seen.add(identity)) {
                throw invalid();
            }
        }
        if (!required) {
            throw invalid();
        }
    }

    private void panel(JsonNode panel, Set<String> variables) {
        object(panel, "kind", "spec");
        literal(panel.path("kind"), "Panel");
        JsonNode spec = panel.path("spec");
        object(spec, "display", "plugin", "queries");
        display(spec.path("display"));
        JsonNode plugin = spec.path("plugin");
        object(plugin, "kind", "spec");
        String kind = text(plugin.path("kind"), 1, 64);
        JsonNode options = plugin.path("spec");
        String queryType;
        String queryPlugin;
        switch (kind) {
            case "TimeSeriesChart" -> {
                object(options, "visual", "metricView");
                if (options.has("metricView")) {
                    metricView(options.get("metricView"));
                }
                if (options.has("visual")) {
                    object(options.get("visual"), "display");
                    choice(options.get("visual").path("display"), "line", "bar");
                }
                queryType = "TimeSeriesQuery";
                queryPlugin = "HertzBeatTimeSeriesQuery";
            }
            case "StatChart", "GaugeChart" -> {
                object(options, "calculation", "format", "max");
                literal(options.path("calculation"), "last-number");
                JsonNode format = options.path("format");
                object(format, "unit");
                literal(format.path("unit"), "decimal");
                if ("GaugeChart".equals(kind)) {
                    JsonNode max = options.path("max");
                    require(max.isNumber() && Double.isFinite(max.doubleValue()) && max.doubleValue() > 0);
                } else {
                    require(!options.has("max"));
                }
                queryType = "TimeSeriesQuery";
                queryPlugin = "HertzBeatTimeSeriesQuery";
            }
            case "Table" -> {
                object(options, "density");
                literal(options.path("density"), "compact");
                queryType = "TimeSeriesQuery";
                queryPlugin = "HertzBeatTimeSeriesQuery";
            }
            case "LogsTable" -> {
                object(options, "allowWrap", "showTime", "columns", "density");
                tableDisplay(options, true);
                optionalBooleans(options, "allowWrap", "showTime");
                queryType = "LogQuery";
                queryPlugin = "HertzBeatLogQuery";
            }
            case "TraceTable", "TracingGanttChart" -> {
                if ("TraceTable".equals(kind)) {
                    object(options, "columns", "density");
                    tableDisplay(options, false);
                } else {
                    object(options);
                }
                queryType = "TraceQuery";
                queryPlugin = "HertzBeatTraceQuery";
            }
            default -> throw invalid();
        }
        array(spec.path("queries"), 1, 1);
        JsonNode query = spec.path("queries").get(0);
        object(query, "kind", "spec");
        literal(query.path("kind"), queryType);
        object(query.path("spec"), "plugin");
        JsonNode embedded = query.path("spec").path("plugin");
        object(embedded, "kind", "spec");
        literal(embedded.path("kind"), queryPlugin);
        object(embedded.path("spec"), "version", "query");
        integer(embedded.path("spec").path("version"), 1, 1);
        JsonNode querySpec = embedded.path("spec").path("query");
        if ("logs".equals(querySpec.path("signal").asText()) && "analysis".equals(querySpec.path("queryKind").asText())) {
            if ("LogsTable".equals(kind)) { object(options); }
            else { object(options, "visual"); }
        }
        query(querySpec, kind, variables);
    }

    private void query(JsonNode query, String panelKind, Set<String> variables) {
        if ("analysis".equals(query.path("queryKind").asText()) && "logs".equals(query.path("signal").asText())) {
            PersesLogAnalysisValidator.validate(query, panelKind);
            if (query.has("returnView")) { returnView(query.get("returnView")); }
            if (query.has("context")) { context(query.get("context"), variables); }
            return;
        }
        switch (panelKind) {
            case "TimeSeriesChart", "StatChart", "GaugeChart", "Table" -> {
                if ("composition".equals(query.path("queryKind").asText())) {
                    object(query, "signal", "queryKind", "context", "plan", "operationName", "limit");
                    literal(query.path("signal"), "metrics");
                    metricPlan(query.path("plan"));
                    optionalText(query, "operationName", 512);
                    optionalInteger(query, "limit", 1, 32);
                    break;
                }
                object(query, "signal", "queryKind", "context", "metric", "limit");
                literal(query.path("signal"), "metrics");
                literal(query.path("queryKind"), "time-series");
                JsonNode metric = query.path("metric");
                object(metric, "name", "aggregation", "temporalAggregation", "stepSeconds", "operationName", "metricFilter", "groupBy");
                require(text(metric.path("name"), 1, 256).matches("[A-Za-z_:][A-Za-z0-9_:.-]{0,255}"));
                optionalChoice(metric, "aggregation", "avg", "sum", "min", "max", "count");
                optionalChoice(metric, "temporalAggregation", "raw", "rate", "increase", "delta");
                optionalInteger(metric, "stepSeconds", 1, 86400);
                optionalText(metric, "operationName", 512);
                for (String field : List.of("metricFilter", "groupBy")) {
                    if (metric.has(field)) {
                        text(metric.get(field), 0, 1024);
                    }
                }
                optionalInteger(query, "limit", 1, 32);
            }
            case "LogsTable" -> {
                object(query, "signal", "queryKind", "context", "search", "severity", "traceId", "spanId",
                        "hideInternal", "hideNoise", "sort", "limit", "severityCategory", "resourceFilter", "attributeFilter", "searchSyntax", "logSort", "logNumericRange", "logCalculatedV2");
                literal(query.path("signal"), "logs");
                literal(query.path("queryKind"), "table");
                optionalChoice(query, "searchSyntax", "structured-v1", "structured-v2");
                optionalText(query, "search", query.has("searchSyntax") ? 8192 : 512);
                require(query.has("logCalculatedV2") == "structured-v2".equals(query.path("searchSyntax").asString("")));
                if (query.has("searchSyntax") && !query.has("logCalculatedV2")) {
                    LogSearchParser.parse(query.path("search").asString(""));
                }
                optionalChoice(query, "sort", "newest", "oldest");
                if (query.has("logNumericRange")) {
                    var range = query.get("logNumericRange");
                    object(range, "version", "field", "min", "max");
                    org.apache.hertzbeat.observability.logs.query.LogNumericRangeParser.parse(range.toString());
                }
                if (query.has("logSort")) {
                    JsonNode sort = query.get("logSort");
                    object(sort, "version", "field", "type", "direction");
                    require(!query.has("sort") || "newest".equals(query.path("sort").asString()));
                    require(sort.path("version").isNumber() && sort.path("version").decimalValue().compareTo(java.math.BigDecimal.ONE) == 0);
                    new LogSort(1, text(sort.path("field"), 1, 266),
                            text(sort.path("type"), 1, 6), text(sort.path("direction"), 1, 4));
                }
                optionalText(query, "traceId", 256);
                optionalText(query, "spanId", 256);
                optionalText(query, "severity", 512);
                optionalChoice(query, "severityCategory", "TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL");
                for (String field : List.of("resourceFilter", "attributeFilter")) {
                    if (query.has(field)) {
                        text(query.get(field), 0, 1024);
                    }
                }
                optionalBooleans(query, "hideInternal", "hideNoise");
                optionalInteger(query, "limit", 1, 1000);
                if (query.has("logCalculatedV2")) {
                    calculatedLogPanel(query);
                }
            }
            case "TraceTable" -> {
                object(query, "signal", "queryKind", "context", "operationName", "errorOnly", "minDurationMs",
                        "maxDurationMs", "spanScope", "hideInternal", "endExclusive", "limit", "sort",
                        "resourceFilter", "attributeFilter", "population", "groupBy", "orderBy");
                literal(query.path("signal"), "traces");
                choice(query.path("queryKind"), "table", "spans", "groups");
                String queryKind = query.path("queryKind").asString();
                optionalText(query, "resourceFilter", 1024);
                optionalText(query, "attributeFilter", 1024);
                if ("groups".equals(queryKind)) {
                    require(!query.has("sort"));
                    choice(query.path("population"), "matched_traces", "matched_spans");
                    choice(query.path("groupBy"), "serviceName", "operationName", "environment");
                    optionalChoice(query, "orderBy", "count-desc", "error-count-desc");
                } else {
                    require(!query.has("population") && !query.has("groupBy") && !query.has("orderBy"));
                    optionalChoice(query, "sort", "newest", "duration_desc");
                }
                optionalText(query, "operationName", 512);
                optionalBooleans(query, "errorOnly", "hideInternal", "endExclusive");
                optionalInteger(query, "minDurationMs", 0, MAX_SAFE_INTEGER);
                optionalInteger(query, "maxDurationMs", 0, MAX_SAFE_INTEGER);
                if (query.has("minDurationMs") && query.has("maxDurationMs")) {
                    require(query.get("minDurationMs").longValue() <= query.get("maxDurationMs").longValue());
                }
                optionalChoice(query, "spanScope", "root", "entrypoint");
                optionalInteger(query, "limit", 1, "table".equals(queryKind) ? 1000 : 100);
            }
            case "TracingGanttChart" -> {
                object(query, "signal", "queryKind", "traceId", "spanId");
                literal(query.path("signal"), "traces");
                literal(query.path("queryKind"), "gantt");
                require(text(query.path("traceId"), 32, 32).matches("[0-9a-f]{32}"));
                if (query.has("spanId")) {
                    require(text(query.get("spanId"), 16, 16).matches("[0-9a-f]{16}"));
                }
            }
            default -> throw invalid();
        }
        if (query.has("context")) {
            context(query.get("context"), variables);
        }
    }

    private void calculatedLogPanel(JsonNode query) {
        require(!query.has("limit") || integer(query.get("limit"), 20, 20) == 20);
        JsonNode scope = query.path("context");
        require(!scope.has("entityType"));
        require(!scope.has("entityId") || scope.has("serviceName"));
        require(!scope.has("collectorId") || scope.has("serviceName")
                && scope.has("serviceNamespace") && scope.has("environment"));
        String raw = text(query.path("logCalculatedV2"), 1, 16384);
        try {
            JsonNode authored = JSON.readTree(raw);
            object(authored, "version", "nextFieldSeq", "fields");
            integer(authored.path("version"), 2, 2);
            long nextFieldSeq = integer(authored.path("nextFieldSeq"), 1, 10000);
            array(authored.path("fields"), 1, 8);
            for (JsonNode field : authored.path("fields")) {
                String id = text(field.path("id"), 2, 5);
                require(id.matches("c[1-9][0-9]{0,3}") && Long.parseLong(id.substring(1)) < nextFieldSeq);
            }
            ObjectNode definitions = (ObjectNode) authored.deepCopy();
            definitions.remove("nextFieldSeq");
            ObjectNode request = JSON.createObjectNode();
            request.put("version", 2);
            request.set("calculatedFields", definitions);
            ObjectNode parameters = request.putObject("parameters");
            parameters.put("start", "1").put("end", "2").put("searchSyntax", "structured-v2");
            if (query.has("search")) { parameters.put("search", query.path("search").asString()); }
            ObjectNode operation = request.putObject("operation");
            operation.put("kind", "page").put("pageIndex", 0).put("pageSize", 20);
            ObjectNode sort = operation.putObject("sort");
            if (query.has("logSort")) {
                JsonNode panelSort = query.get("logSort");
                sort.put("field", panelSort.path("field").asString());
                sort.put("direction", panelSort.path("direction").asString());
                if (!sort.path("field").asString().startsWith("calculated:")) {
                    sort.put("type", panelSort.path("type").asString());
                }
            } else {
                sort.put("field", "timestamp");
                sort.put("direction", "oldest".equals(query.path("sort").asString()) ? "asc" : "desc");
            }
            LogCalculatedParser.query(request.toString());
        } catch (RuntimeException invalid) {
            throw invalid();
        }
    }

    private void returnView(JsonNode view) {
        object(view, "version", "columns", "density", "wrap");
        require(view.path("version").isNumber() && view.path("version").decimalValue().compareTo(java.math.BigDecimal.ONE) == 0);
        require(view.has("columns") && view.path("wrap").isBoolean());
        choice(view.path("density"), "compact", "comfortable");
        tableDisplay(view, true);
        String serialized = view.toString();
        require(StandardCharsets.UTF_8.newEncoder().canEncode(serialized));
        int encodedLength = 0;
        for (byte value : serialized.getBytes(StandardCharsets.UTF_8)) {
            int character = Byte.toUnsignedInt(value);
            encodedLength += character >= 'a' && character <= 'z' || character >= 'A' && character <= 'Z'
                    || character >= '0' && character <= '9' || "-_.!~*'()".indexOf(character) >= 0 ? 1 : 3;
        }
        require(encodedLength <= 6000);
    }

    private void metricPlan(JsonNode plan) {
        object(plan, "version", "queries", "formulas");
        integer(plan.path("version"), 1, 1);
        array(plan.path("queries"), 1, 4);
        array(plan.path("formulas"), 0, 4);
        Set<String> references = new HashSet<>();
        for (JsonNode row : plan.path("queries")) {
            object(row, "refId", "metric", "metricFilter", "groupBy", "aggregation", "temporalAggregation", "step",
                    "timeShiftSeconds", "rollup", "nestedRollup");
            String ref = text(row.path("refId"), 1, 1);
            require(ref.matches("[a-z]") && references.add(ref));
            require(trimMetricText(text(row.path("metric"), 1, 256)).matches("[A-Za-z_:][A-Za-z0-9_:.-]*"));
            for (String field : List.of("metricFilter", "groupBy", "aggregation", "step")) {
                if (row.has(field)) {
                    String value = trimMetricText(text(row.get(field), 0, 1024));
                    if ("aggregation".equals(field) && !value.isEmpty()) {
                        require(Set.of("avg", "sum", "min", "max", "count").contains(value.toLowerCase(Locale.ROOT)));
                    }
                    if ("step".equals(field) && !value.isEmpty()) {
                        require(value.matches("[1-9][0-9]*") && value.length() <= 5 && Long.parseLong(value) <= 86400);
                    }
                }
            }
            optionalChoice(row, "temporalAggregation", "raw", "rate", "increase", "delta");
            optionalInteger(row, "timeShiftSeconds", 0, 31536000);
            if (row.has("rollup")) {
                JsonNode rollup = row.get("rollup");
                object(rollup, "aggregation", "intervalSeconds");
                choice(rollup.path("aggregation"), "avg", "sum", "min", "max", "count");
                long interval = integer(rollup.path("intervalSeconds"), 1, 86400);
                require(!row.has("temporalAggregation") || "raw".equals(row.path("temporalAggregation").asString()));
                long outputInterval = interval;
                if (row.has("nestedRollup")) {
                    JsonNode nested = row.get("nestedRollup");
                    object(nested, "aggregation", "intervalSeconds");
                    choice(nested.path("aggregation"), "avg", "sum", "min", "max", "count");
                    outputInterval = integer(nested.path("intervalSeconds"), 1, 86400);
                    require(outputInterval > interval);
                }
                require(!row.has("step") || trimMetricText(row.path("step").asString()).isEmpty()
                        || Long.parseLong(trimMetricText(row.path("step").asString())) == outputInterval);
            } else {
                require(!row.has("nestedRollup"));
            }
        }
        Set<String> formulas = new HashSet<>();
        for (JsonNode formula : plan.path("formulas")) {
            object(formula, "id", "expression");
            String id = text(formula.path("id"), 2, 2);
            require(id.matches("f[1-4]") && formulas.add(id));
            PersesMetricFormulaValidator.validate(text(formula.path("expression"), 1, 256), references);
        }
    }

    private String trimMetricText(String value) {
        int start = 0;
        int end = value.length();
        while (start < end && trimCharacter(value.charAt(start))) {
            start++;
        }
        while (end > start && trimCharacter(value.charAt(end - 1))) {
            end--;
        }
        return value.substring(start, end);
    }

    private void metricView(JsonNode view) {
        object(view, "mode", "hidden", "splitBy", "splitRankBy", "splitLimit", "splitOrder", "splitScale");
        choice(view.path("mode"), "chart", "split", "table");
        array(view.path("hidden"), 0, 8);
        view.path("hidden").forEach(ref -> require(text(ref, 1, 2).matches("[a-z]|f[1-4]")));
        if (view.has("splitBy")) {
            text(view.get("splitBy"), 0, 128);
        }
        if (view.has("splitRankBy")) {
            require(text(view.get("splitRankBy"), 1, 2).matches("[a-z]|f[1-4]"));
        }
        optionalInteger(view, "splitLimit", 1, 12);
        optionalChoice(view, "splitOrder", "top", "bottom");
        optionalChoice(view, "splitScale", "uniform", "independent");
    }

    private void context(JsonNode context, Set<String> variables) {
        object(context, "entityId", "entityType", "serviceName", "serviceNamespace", "environment",
                "collectorId", "instance", "endpoint");
        for (String field : context.propertyNames()) {
            JsonNode node = context.get(field);
            if (VARIABLE_NAMES.contains(field) && node.isTextual() && node.asText().equals("${" + field + "}")) {
                require(variables.contains(field));
                continue;
            }
            String value = text(node, 1, "endpoint".equals(field) ? 512 : 256);
            require(trimmed(value));
            switch (field) {
                case "entityId" -> {
                    require(value.matches("[1-9][0-9]{0,18}"));
                    require(value.length() < 19 || value.compareTo("9223372036854775807") <= 0);
                }
                case "entityType" -> require(value.matches("[A-Za-z0-9_.:-]{1,128}"));
                case "collectorId" -> require(value.matches("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}"));
                default -> { }
            }
        }
    }

    private void layout(JsonNode layouts, JsonNode panels) {
        array(layouts, 1, 1);
        JsonNode layout = layouts.get(0);
        object(layout, "kind", "spec");
        literal(layout.path("kind"), "Grid");
        object(layout.path("spec"), "items");
        JsonNode items = layout.path("spec").path("items");
        array(items, panels.size(), panels.size());
        Set<String> references = new HashSet<>();
        List<long[]> rectangles = new ArrayList<>();
        for (JsonNode item : items) {
            object(item, "x", "y", "width", "height", "content");
            long x = integer(item.path("x"), 0, 23);
            long y = integer(item.path("y"), 0, 1000);
            long width = integer(item.path("width"), 1, 24);
            long height = integer(item.path("height"), 1, 100);
            require(x + width <= 24);
            object(item.path("content"), "$ref");
            String ref = text(item.path("content").path("$ref"), 1, 256);
            require(ref.startsWith("#/spec/panels/") && panels.has(ref.substring(14)) && references.add(ref));
            for (long[] rectangle : rectangles) {
                require(x + width <= rectangle[0] || rectangle[0] + rectangle[2] <= x
                        || y + height <= rectangle[1] || rectangle[1] + rectangle[3] <= y);
            }
            rectangles.add(new long[]{x, y, width, height});
        }
    }

    private void display(JsonNode display) {
        object(display, "name", "description");
        String name = text(display.path("name"), 1, 255);
        require(!name.isBlank() && trimmed(name));
        if (display.has("description")) {
            text(display.get("description"), 0, 512);
        }
    }

    private Set<String> uniqueStrings(JsonNode values, int min, int max, int textMax) {
        array(values, min, max);
        Set<String> result = new HashSet<>();
        for (JsonNode value : values) {
            String string = text(value, 1, textMax);
            require(!string.isBlank() && trimmed(string) && result.add(string));
        }
        return result;
    }

    static boolean trimmed(String value) {
        return value.isEmpty() || !trimCharacter(value.codePointAt(0)) && !trimCharacter(value.codePointBefore(value.length()));
    }

    private static boolean trimCharacter(int codePoint) {
        // ECMAScript trim: ASCII whitespace, Unicode space separators, line separators and BOM.
        return codePoint >= 0x09 && codePoint <= 0x0d || Character.getType(codePoint) == Character.SPACE_SEPARATOR
                || codePoint == 0x2028 || codePoint == 0x2029 || codePoint == 0xfeff;
    }

    private void object(JsonNode node, String... fields) {
        require(node != null && node.isObject() && Set.of(fields).containsAll(node.propertyNames()));
    }

    private void array(JsonNode node, int min, int max) {
        require(node.isArray() && node.size() >= min && node.size() <= max);
    }

    private String text(JsonNode node, int min, int max) {
        require(node.isTextual());
        String value = node.asText();
        require(value.length() >= min && value.length() <= max && !value.contains("${") && !value.contains("$__"));
        return value;
    }

    private void optionalText(JsonNode node, String field, int max) {
        if (node.has(field)) {
            String value = text(node.get(field), 1, max);
            require(!value.isBlank() && trimmed(value));
        }
    }

    private void literal(JsonNode node, String expected) {
        require(node.isTextual() && expected.equals(node.asText()));
    }

    private void choice(JsonNode node, String... choices) {
        require(node.isTextual() && Set.of(choices).contains(node.asText()));
    }

    private void optionalChoice(JsonNode node, String field, String... choices) {
        if (node.has(field)) {
            choice(node.get(field), choices);
        }
    }

    private void optionalBooleans(JsonNode node, String... fields) {
        for (String field : fields) {
            if (node.has(field)) {
                require(node.get(field).isBoolean());
            }
        }
    }

    private long integer(JsonNode node, long min, long max) {
        require(node.isIntegralNumber() && node.canConvertToLong());
        long value = node.longValue();
        require(value >= min && value <= max);
        return value;
    }

    private void optionalInteger(JsonNode node, String field, long min, long max) {
        if (node.has(field)) {
            integer(node.get(field), min, max);
        }
    }

    private void require(boolean valid) {
        if (!valid) {
            throw invalid();
        }
    }

    private IllegalArgumentException invalid() {
        return new IllegalArgumentException("signal_dashboard_document_invalid");
    }
}
