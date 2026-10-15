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

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSort;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.query.LogCalculatedFormula;
import org.apache.hertzbeat.common.observability.query.LogCalculatedExtraction;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Strict calculated-field input at the API boundary. */
public final class LogCalculatedParser {

    /** Invalid JSON or a malformed request envelope, distinct from an invalid authored definition. */
    public static final class StructureException extends IllegalArgumentException {
        public StructureException() { super("Invalid calculated envelope"); }
    }

    private static final JsonMapper MAPPER = JsonMapper.builder()
            .enable(DeserializationFeature.FAIL_ON_READING_DUP_TREE_KEY)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
    private static final String NAME = "[A-Za-z][A-Za-z0-9_]{0,63}";
    private static final String NUMBER = "[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?";
    private static final Set<String> EXTRACTION_BUILTINS = Set.of("builtin:serviceName", "builtin:environment",
            "builtin:severityCategory");
    private static final Set<String> PARAMETERS = Set.of("start", "end", "entityId", "entityType", "collectorId",
            "instance", "endpoint", "traceId", "spanId", "severityNumber", "severityText", "severityCategory",
            "serviceName", "serviceNamespace", "environment", "resourceFilter", "attributeFilter",
            "hideInternal", "hideNoise", "logGroupSelection", "logNumericRange", "searchSyntax", "search");

    private LogCalculatedParser() { }

    /** Parsed request before trusted workspace and entity scope binding. */
    public record Envelope(Map<String, String> parameters, LogCalculated.Definitions definitions,
                           LogSearchExpression search, LogCalculated.Operation operation) {
        public LogCalculated.Page page() { return (LogCalculated.Page) operation; }
    }

    /** Validated draft with an optional explicit sample, never a log-table read. */
    public record ValidationRequest(LogCalculated.Definitions definitions, String previewId, String sourceText) { }

    public static Envelope query(String source) {
        try {
            if (source == null || source.getBytes(StandardCharsets.UTF_8).length > 32768) { throw invalid(); }
            JsonNode root = MAPPER.readTree(source);
            fields(root, Set.of("version", "parameters", "calculatedFields", "operation"));
            if (!integer(root.get("version"), 2, 2)) { throw invalid(); }
            var definitions = definitions(root.get("calculatedFields"));
            var parameters = parameters(root.get("parameters"));
            var search = search(parameters, definitions);
            return new Envelope(parameters, definitions, search,
                    operation(root.get("operation"), definitions, parameters));
        } catch (LogFilterQueryException unavailable) {
            throw unavailable;
        } catch (LogCalculatedFormula.ValidationException invalid) {
            throw invalid;
        } catch (RuntimeException invalid) {
            throw invalid();
        }
    }

    public static LogCalculated.Definitions validate(String source) {
        return validationRequest(source).definitions();
    }

    public static ValidationRequest validationRequest(String source) {
        if (source == null || source.getBytes(StandardCharsets.UTF_8).length > 32768) {
            throw new StructureException();
        }
        JsonNode root;
        try { root = MAPPER.readTree(source); }
        catch (RuntimeException invalid) { throw new StructureException(); }
        if (root == null || !root.isObject() || !Set.of("version", "calculatedFields", "preview")
                .containsAll(root.propertyNames()) || !integer(root.get("version"), 2, 2)) {
            throw new StructureException();
        }
        var definitions = definitions(root.get("calculatedFields"));
        if (!root.has("preview")) { return new ValidationRequest(definitions, null, null); }
        JsonNode preview = root.get("preview");
        if (preview == null || !preview.isObject() || !Set.of("definitionId", "sourceText")
                .equals(Set.copyOf(preview.propertyNames())) || !preview.get("sourceText").isString()) {
            throw new StructureException();
        }
        String id = text(preview.get("definitionId"));
        String sample = preview.get("sourceText").asString();
        if (sample.getBytes(StandardCharsets.UTF_8).length > 16384) {
            throw new LogCalculatedFormula.ValidationException("budget_exceeded", "preview.sourceText");
        }
        if (definitions.fields().stream().noneMatch(field -> field.id().equals(id)
                && "extraction".equals(field.kind()))) {
            throw new LogCalculatedFormula.ValidationException("invalid_expression", "preview.definitionId");
        }
        return new ValidationRequest(definitions, id, sample);
    }

    static LogCalculated.Definitions definitions(JsonNode node) {
        fields(node, Set.of("version", "fields"));
        if (!integer(node.get("version"), 2, 2) || node.get("fields") == null
                || !node.get("fields").isArray() || node.get("fields").size() < 1
                || node.get("fields").size() > 8) { throw invalid(); }
        var result = new ArrayList<LogCalculated.Definition>();
        var names = new HashSet<String>();
        var ids = new HashSet<String>();
        for (int index = 0; index < node.get("fields").size(); index++) {
            var field = node.get("fields").get(index);
            if (field == null || !field.isObject()) { throw invalid(); }
            String id = text(field.get("id"));
            String kind = text(field.get("kind"));
            if (!id.matches("c[1-9][0-9]{0,3}") || !ids.add(id)) { throw invalid(); }
            result.add(switch (kind) {
                case "formula" -> formula(field, id, index, names);
                case "extraction" -> extraction(field, id, index, names);
                default -> throw invalid();
            });
        }
        if (names.size() > 16) { throw new LogCalculatedFormula.ValidationException("budget_exceeded", "fields"); }
        int heavyCalls = result.stream().filter(field -> "formula".equals(field.kind()))
                .mapToInt(field -> LogCalculatedFormula.heavyCalls(LogCalculatedFormula.parse(field.expression()))).sum();
        if (heavyCalls > 8) { throw new LogCalculatedFormula.ValidationException("budget_exceeded", "fields"); }
        var types = validateDependencies(result);
        return new LogCalculated.Definitions(2, result.stream().map(field -> new LogCalculated.Definition(
                field.id(), field.kind(), field.name(), field.expression(), field.engine(), field.source(),
                field.pattern(), field.captures(), "formula".equals(field.kind())
                ? List.of(new LogCalculated.Output(field.name(), types.get(field.name()))) : field.outputs())).toList());
    }

    private static LogCalculated.Definition formula(JsonNode field, String id, int index, Set<String> names) {
        fields(field, Set.of("id", "kind", "name", "expression"));
        String name = text(field.get("name"));
        String expression = text(field.get("expression"));
        if (!name.matches(NAME)) { throw invalid(); }
        addOutput(names, name, "fields[" + index + "].name");
        try { LogCalculatedFormula.parse(expression); }
        catch (LogCalculatedFormula.ValidationException invalid) {
            throw invalid.at("fields[" + index + "].expression");
        }
        return new LogCalculated.Definition(id, "formula", name, expression, null, null, null, null, List.of());
    }

    private static LogCalculated.Definition extraction(JsonNode field, String id, int index, Set<String> names) {
        fields(field, Set.of("id", "kind", "engine", "source", "pattern", "captures"));
        String engine = text(field.get("engine"));
        String source = text(field.get("source"));
        if (!"builtin:body".equals(source)) {
            var parsed = LogFacets.Field.parse(source);
            if ("builtin".equals(parsed.source()) && !EXTRACTION_BUILTINS.contains(source)) { throw invalid(); }
        }
        String pattern = text(field.get("pattern"));
        LogCalculatedExtraction.Compiled compiled;
        try { compiled = LogCalculatedExtraction.compile(engine, pattern); }
        catch (LogCalculatedFormula.ValidationException invalid) {
            throw invalid.at("fields[" + index + "].pattern");
        }
        JsonNode captures = field.get("captures");
        if (captures == null || !captures.isArray() || captures.size() != compiled.groups().size()) { throw invalid(); }
        var authored = new ArrayList<LogCalculated.Capture>();
        var outputs = new ArrayList<LogCalculated.Output>();
        for (int capture = 0; capture < captures.size(); capture++) {
            fields(captures.get(capture), Set.of("name"));
            String name = text(captures.get(capture).get("name"));
            var group = compiled.groups().get(capture);
            if (!name.equals(group.name())) { throw invalid(); }
            addOutput(names, name, "fields[" + index + "].captures[" + capture + "].name");
            authored.add(new LogCalculated.Capture(name));
            outputs.add(new LogCalculated.Output(name, group.type()));
        }
        return new LogCalculated.Definition(id, "extraction", null, null, engine, source, pattern,
                List.copyOf(authored), List.copyOf(outputs));
    }

    private static void addOutput(Set<String> names, String name, String path) {
        if (!names.add(name)) { throw new LogCalculatedFormula.ValidationException("duplicate_output", path); }
    }

    static Map<String, String> parameters(JsonNode node) {
        fields(node, PARAMETERS);
        var result = new HashMap<String, String>();
        for (String name : node.propertyNames()) { result.put(name, text(node.get(name))); }
        if (!result.containsKey("start") || !result.containsKey("end")) { throw invalid(); }
        return Map.copyOf(result);
    }

    private static LogSearchExpression search(Map<String, String> parameters, LogCalculated.Definitions definitions) {
        String syntax = parameters.get("searchSyntax");
        String source = parameters.get("search");
        if ("structured-v2".equals(syntax)) {
            var parsed = LogSearchParser.parseCalculated(source);
            validateSearch(parsed, definitions);
            return parsed;
        }
        LogSearchParser.validateQuery(syntax, source);
        return LogSearchParser.SYNTAX.equals(syntax) ? LogSearchParser.parse(source) : LogSearchParser.parse(null);
    }

    private static void validateSearch(LogSearchExpression expression, LogCalculated.Definitions definitions) {
        switch (expression) {
            case LogSearchExpression.And and -> and.children().forEach(child -> validateSearch(child, definitions));
            case LogSearchExpression.Or or -> or.children().forEach(child -> validateSearch(child, definitions));
            case LogSearchExpression.Not not -> validateSearch(not.child(), definitions);
            case LogSearchExpression.Term term -> {
                if (term.field().domain() == LogSearchExpression.Domain.CALCULATED) {
                    String type = fieldType("calculated:" + term.field().key(), definitions);
                    if (term.operator() == LogSearchExpression.Operator.EXISTS) { break; }
                    boolean accepted = switch (type) {
                        case "number" -> Set.of(LogSearchExpression.Operator.EQUALS,
                                LogSearchExpression.Operator.GT, LogSearchExpression.Operator.GTE,
                                LogSearchExpression.Operator.LT, LogSearchExpression.Operator.LTE)
                                .contains(term.operator()) && term.value().matches(NUMBER)
                                && Double.isFinite(Double.parseDouble(term.value()));
                        case "string" -> Set.of(LogSearchExpression.Operator.EQUALS,
                                LogSearchExpression.Operator.GLOB).contains(term.operator());
                        case "boolean" -> term.operator() == LogSearchExpression.Operator.EQUALS
                                && Set.of("true", "false").contains(term.value());
                        default -> false;
                    };
                    if (!accepted) { throw invalid(); }
                }
            }
            case LogSearchExpression.NumericCollection collection -> {
                if (collection.field().domain() == LogSearchExpression.Domain.CALCULATED) { throw invalid(); }
            }
            case LogSearchExpression.TextCollection collection -> {
                if (collection.field().domain() == LogSearchExpression.Domain.CALCULATED) { throw invalid(); }
            }
        }
    }

    private static LogCalculated.Page page(JsonNode node, LogCalculated.Definitions definitions) {
        fields(node, Set.of("kind", "pageIndex", "pageSize", "sort"));
        if (!"page".equals(text(node.get("kind"))) || !integer(node.get("pageIndex"), 0, 10_000)
                || !integer(node.get("pageSize"), 1, 100)) { throw invalid(); }
        int index = node.get("pageIndex").intValue();
        int size = node.get("pageSize").intValue();
        if ((long) index * size > 10_000) { throw invalid(); }
        JsonNode sort = node.get("sort");
        fields(sort, Set.of("field", "direction", "type"));
        String field = text(sort.get("field"));
        String direction = text(sort.get("direction"));
        String type = sort.has("type") ? text(sort.get("type")) : null;
        if (!Set.of("asc", "desc").contains(direction)) { throw invalid(); }
        if (field.startsWith("resource:") || field.startsWith("attribute:") || field.startsWith("builtin:")) {
            new LogSort(1, field, type == null ? "text" : type, direction);
        } else if (type != null || !"timestamp".equals(field) && !"severityNumber".equals(field)
                && (!field.startsWith("calculated:") || definitions.fields().stream()
                        .flatMap(item -> item.outputs().stream())
                        .noneMatch(output -> field.equals("calculated:" + output.name())))) { throw invalid(); }
        return new LogCalculated.Page(index, size, new LogCalculated.Sort(field, direction, type));
    }

    static LogCalculated.Operation operation(JsonNode node, LogCalculated.Definitions definitions,
                                                     Map<String, String> parameters) {
        if (node == null || !node.isObject()) { throw invalid(); }
        return switch (text(node.get("kind"))) {
            case "page" -> page(node, definitions);
            case "trend" -> trend(node, parameters);
            case "facet" -> facet(node, definitions);
            case "analysis" -> analysis(node, definitions, parameters);
            default -> throw invalid();
        };
    }

    private static LogCalculated.Trend trend(JsonNode node, Map<String, String> parameters) {
        fields(node, Set.of("kind", "intervalMs"));
        if (!integer(node.get("intervalMs"), 1, 86_400_000)) { throw invalid(); }
        long interval = node.get("intervalMs").longValue();
        long start = Long.parseLong(parameters.get("start"));
        long end = Long.parseLong(parameters.get("end"));
        new LogFacets.Window(start, end);
        if (!LogTrend.EXPLICIT_INTERVALS_MS.contains(interval)
                || Math.floorDiv(end, interval) - Math.floorDiv(start, interval) >= LogTrend.MAX_BUCKETS) {
            throw invalid();
        }
        return new LogCalculated.Trend(interval);
    }

    private static LogCalculated.Facet facet(JsonNode node, LogCalculated.Definitions definitions) {
        fields(node, Set.of("kind", "field", "limit", "valueSearch"));
        if (!integer(node.get("limit"), 1, 100)) { throw invalid(); }
        String field = text(node.get("field"));
        boolean calculated = field.startsWith("calculated:");
        if (calculated) {
            if (definitions.fields().stream().flatMap(item -> item.outputs().stream())
                    .noneMatch(output -> field.equals("calculated:" + output.name()))) { throw invalid(); }
        } else { LogFacets.Field.parse(field); }
        String valueSearch = node.has("valueSearch") ? text(node.get("valueSearch")) : null;
        if (valueSearch != null && (calculated && !"string".equals(fieldType(field, definitions)) || valueSearch.isEmpty()
                || valueSearch.getBytes(StandardCharsets.UTF_8).length > 256)) { throw invalid(); }
        return new LogCalculated.Facet(field, node.get("limit").intValue(), valueSearch);
    }

    private static LogCalculated.Analysis analysis(JsonNode node, LogCalculated.Definitions definitions,
                                                   Map<String, String> parameters) {
        fields(node, Set.of("kind", "view", "grouping", "measure", "limit", "order", "minCount", "intervalMs"));
        String view = text(node.get("view"));
        JsonNode grouping = node.get("grouping");
        if (!Set.of("groups", "timeseries").contains(view) || grouping == null || !grouping.isArray()
                || grouping.size() > 4 || !integer(node.get("limit"), 1, 100)
                || !integer(node.get("minCount"), 1, 1_000_000)) { throw invalid(); }
        var dimensions = new ArrayList<LogCalculated.Dimension>();
        var fields = new HashSet<String>();
        int product = 1;
        for (var dimension : grouping) {
            fields(dimension, Set.of("field", "limit"));
            String field = text(dimension.get("field"));
            if (!fields.add(field) || !integer(dimension.get("limit"), 1, 100)) { throw invalid(); }
            fieldType(field, definitions);
            product = Math.multiplyExact(product, dimension.get("limit").intValue());
            if (product > 100) { throw invalid(); }
            dimensions.add(new LogCalculated.Dimension(field, dimension.get("limit").intValue()));
        }
        LogCalculated.Measure measure = measure(node.get("measure"), definitions);
        String order = text(node.get("order"));
        if (!(measure == null ? Set.of("count-asc", "count-desc")
                : Set.of("measure-asc", "measure-desc")).contains(order)) { throw invalid(); }
        Long interval = null;
        if ("timeseries".equals(view)) {
            if (!integer(node.get("intervalMs"), 1, 86_400_000)) { throw invalid(); }
            interval = node.get("intervalMs").longValue();
            long start = Long.parseLong(parameters.get("start"));
            long end = Long.parseLong(parameters.get("end"));
            new LogFacets.Window(start, end);
            if (!LogTrend.EXPLICIT_INTERVALS_MS.contains(interval)
                    || Math.floorDiv(end, interval) - Math.floorDiv(start, interval) >= LogTrend.MAX_BUCKETS) {
                throw invalid();
            }
        } else if (node.has("intervalMs")) { throw invalid(); }
        return new LogCalculated.Analysis(view, List.copyOf(dimensions), measure, node.get("limit").intValue(),
                order, node.get("minCount").longValue(), interval);
    }

    private static LogCalculated.Measure measure(JsonNode node, LogCalculated.Definitions definitions) {
        if (node == null || node.isNull()) { return null; }
        fields(node, Set.of("function", "field"));
        String function = text(node.get("function"));
        String field = text(node.get("field"));
        if (!Set.of("sum", "avg", "min", "max", "unique", "p50", "p75", "p90", "p95", "p98", "p99")
                .contains(function)) { throw invalid(); }
        String type = fieldType(field, definitions);
        if (!"unique".equals(function) && !"number".equals(type)) { throw invalid(); }
        return new LogCalculated.Measure(function, field);
    }

    private static String fieldType(String field, LogCalculated.Definitions definitions) {
        if (field.startsWith("calculated:")) {
            String name = field.substring("calculated:".length());
            return definitions.fields().stream().flatMap(item -> item.outputs().stream())
                    .filter(output -> output.name().equals(name)).map(LogCalculated.Output::type)
                    .findFirst().orElseThrow(LogCalculatedParser::invalid);
        }
        var raw = LogFacets.Field.parse(field);
        return "builtin".equals(raw.source()) ? "text" : "number";
    }

    private static Map<String, String> validateDependencies(List<LogCalculated.Definition> definitions) {
        var byName = new HashMap<String, LogCalculated.Definition>();
        var positions = new HashMap<String, Integer>();
        var types = new HashMap<String, String>();
        var expansions = new HashMap<String, LogCalculatedFormula.Expansion>();
        for (int index = 0; index < definitions.size(); index++) {
            var definition = definitions.get(index);
            if ("formula".equals(definition.kind())) {
                byName.put(definition.name(), definition);
                positions.put(definition.name(), index);
            } else {
                for (var output : definition.outputs()) {
                    types.put(output.name(), output.type());
                    expansions.put(output.name(), "string".equals(output.type())
                            ? new LogCalculatedFormula.Expansion(0, 1) : new LogCalculatedFormula.Expansion(0, 0));
                }
            }
        }
        var marks = new HashMap<String, Integer>();
        for (var definition : definitions) {
            if ("formula".equals(definition.kind())) {
                visit(definition.name(), byName, marks, types, expansions, positions);
            }
        }
        return types;
    }

    private static void visit(String name, Map<String, LogCalculated.Definition> byName, Map<String, Integer> marks,
                              Map<String, String> types, Map<String, LogCalculatedFormula.Expansion> expansions,
                              Map<String, Integer> positions) {
        int mark = marks.getOrDefault(name, 0);
        String path = "fields[" + positions.get(name) + "].expression";
        if (mark == 1) { throw new LogCalculatedFormula.ValidationException("dependency_cycle", path); }
        if (mark == 2) { return; }
        marks.put(name, 1);
        var definition = byName.get(name);
        if (definition == null) { throw new LogCalculatedFormula.ValidationException("unknown_reference", path); }
        var parsed = LogCalculatedFormula.parse(definition.expression());
        for (String dependency : LogCalculatedFormula.dependencies(parsed)) {
            if (!byName.containsKey(dependency) && !types.containsKey(dependency)) {
                throw new LogCalculatedFormula.ValidationException("unknown_reference", path);
            }
            if (byName.containsKey(dependency)) { visit(dependency, byName, marks, types, expansions, positions); }
        }
        String type;
        try { type = LogCalculatedFormula.type(parsed, types); }
        catch (LogCalculatedFormula.ValidationException invalid) { throw invalid.at(path); }
        // A raw attribute is projected with json_get_string, which preserves SQL NULLs.
        // Treat only a top-level raw field as a string output; nested raw fields still
        // need a typed operation so numeric and boolean inference stays explicit.
        if ("unknown".equals(type) && (parsed instanceof LogCalculatedFormula.Raw
                || parsed instanceof LogCalculatedFormula.Resource)) { type = "string"; }
        if ("unknown".equals(type)) { throw new LogCalculatedFormula.ValidationException("type_mismatch", path); }
        try {
            var expansion = LogCalculatedFormula.expansion(parsed, expansions);
            expansions.put(name, "string".equals(type) ? expansion : new LogCalculatedFormula.Expansion(0, 0));
        } catch (LogCalculatedFormula.ValidationException invalid) { throw invalid.at(path); }
        types.put(name, type);
        marks.put(name, 2);
    }

    static void fields(JsonNode node, Set<String> allowed) {
        if (node == null || !node.isObject() || !allowed.containsAll(node.propertyNames())) { throw invalid(); }
    }

    static boolean integer(JsonNode node, long min, long max) {
        return node != null && node.isIntegralNumber() && node.canConvertToLong()
                && node.longValue() >= min && node.longValue() <= max;
    }

    static String text(JsonNode node) {
        if (node == null || !node.isString()) { throw invalid(); }
        return node.stringValue();
    }

    static IllegalArgumentException invalid() { return new IllegalArgumentException("Invalid calculated field"); }
}
