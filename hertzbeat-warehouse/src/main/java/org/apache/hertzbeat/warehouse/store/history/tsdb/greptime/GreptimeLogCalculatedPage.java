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

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.log.HistoricalLogRow;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;
import org.apache.hertzbeat.common.observability.dto.log.LogSort;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.query.LogCalculatedFormula;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;

/** One guarded SQL statement for projected log rows and their exact filtered count. */
final class GreptimeLogCalculatedPage {
    private static final String NUMBER = "^[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?$";

    private GreptimeLogCalculatedPage() { }

    static LogCalculated.PageResult read(GreptimeSqlQueryExecutor executor, LogCalculated.Query query, String where,
                                         Function<List<Map<String, Object>>, List<LogEntry>> rowMapper) {
        String statement = sql(query, where, "hertzbeat_logs");
        try {
            return map(executor.executeStrict(statement), query, rowMapper);
        } catch (LogCalculatedFormula.ValidationException budget) {
            throw budget;
        } catch (RuntimeException failure) {
            if (GreptimeLogCalculatedPreview.nativePatternError(failure)) {
                throw new LogCalculatedFormula.ValidationException("invalid_pattern", "calculatedFields");
            }
            throw new TelemetryStorageUnavailableException();
        }
    }

    static String sql(LogCalculated.Query query, String where, String table) {
        var projection = projection(query, where, table);
        var columns = projection.columns();
        var ctes = new ArrayList<String>();
        ctes.add(projection.ctes());
        ctes.add("total AS (SELECT COUNT(*) AS total_count FROM filtered)");
        String sort = sort(query.page().sort(), columns);
        long offset = (long) query.page().pageIndex() * query.page().pageSize();
        ctes.add("ranked_page AS (SELECT *, ROW_NUMBER() OVER (ORDER BY " + sort
                + ") AS page_ordinal FROM filtered)");
        ctes.add("page AS (SELECT * FROM ranked_page WHERE page_ordinal > " + offset
                + " AND page_ordinal <= " + (offset + query.page().pageSize()) + ")");
        String derived = columns.values().stream().map(column -> ", " + column).reduce("", String::concat);
        String admitted = projection.guarded() ? "admission.admitted, " : "";
        String gate = projection.guarded() ? "admission CROSS JOIN " : "";
        return "WITH " + String.join(", ", ctes) + " SELECT " + admitted + "total_count, "
                + GreptimeDbDataStorage.NATIVE_LOG_SELECT_COLUMNS + derived
                + " FROM " + gate + "total LEFT JOIN page ON true ORDER BY " + sort;
    }

    record Projection(String ctes, Map<String, String> columns, Map<String, String> types, boolean guarded) { }

    static Projection projection(LogCalculated.Query query, String where, String table) {
        var ctes = new ArrayList<String>();
        boolean guarded = GreptimeLogCalculatedAdmission.required(query);
        ctes.add(GreptimeLogCalculatedAdmission.ctes(query, where, table));
        var columns = new LinkedHashMap<String, String>();
        var types = new LinkedHashMap<String, String>();
        String source = guarded ? "admitted_rows" : "scoped";
        int index = 0;
        int entropyOrdinal = 0;
        for (var definition : ordered(query.definitions())) {
            if ("extraction".equals(definition.kind())) {
                var compiled = org.apache.hertzbeat.common.observability.query.LogCalculatedExtraction
                        .compile(definition.engine(), definition.pattern());
                String match = "calculated_" + index;
                var matches = new ArrayList<String>();
                for (int capture = 0; capture < compiled.groups().size(); capture++) {
                    String pattern = org.apache.hertzbeat.common.observability.query.LogCalculatedExtraction
                            .capturePattern(compiled, compiled.groups().get(capture)).replace("'", "''");
                    matches.add("regexp_match(" + GreptimeLogCalculatedAdmission.source(definition.source())
                            + ", '" + pattern + "') AS captures_" + (index + capture));
                }
                ctes.add(match + " AS (SELECT *, " + String.join(", ", matches) + " FROM " + source + ")");
                var outputs = new ArrayList<String>();
                for (int capture = 0; capture < definition.outputs().size(); capture++) {
                    var output = definition.outputs().get(capture);
                    String column = "c_" + (index + capture);
                    String value = "array_element(captures_" + (index + capture) + ", 1)";
                    if ("number".equals(output.type())) { value = GreptimeLogCalculatedFormula.numeric(value); }
                    outputs.add(value + " AS " + column);
                    columns.put(output.name(), column);
                    types.put(output.name(), output.type());
                }
                source = "extracted_" + index;
                ctes.add(source + " AS (SELECT *, " + String.join(", ", outputs) + " FROM " + match + ")");
                index += definition.outputs().size();
            } else {
                String column = "c_" + index;
                var entropy = new GreptimeLogCalculatedEntropy(ctes, source, columns, types, entropyOrdinal);
                var formula = entropy.rewrite(LogCalculatedFormula.parse(definition.expression()));
                source = entropy.source();
                entropyOrdinal = entropy.ordinal();
                String expression = GreptimeLogCalculatedFormula.sql(formula, entropy.columns(), entropy.types());
                String type = definition.outputs().getFirst().type();
                if (expression.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 16384) {
                    throw new LogCalculatedFormula.ValidationException("budget_exceeded", "calculatedFields");
                }
                String name = "calculated_" + index++;
                String value = "number".equals(type) ? GreptimeLogCalculatedFormula.finite(expression) : expression;
                if (value.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 16384) {
                    throw new LogCalculatedFormula.ValidationException("budget_exceeded", "calculatedFields");
                }
                ctes.add(name + " AS (SELECT *, " + value
                        + " AS " + column + " FROM " + source + ")");
                source = name;
                columns.put(definition.name(), column);
                types.put(definition.name(), type);
            }
        }
        var requestedSort = query.operation() instanceof LogCalculated.Page page ? page.sort() : null;
        String rawSort = requestedSort != null && rawSort(requestedSort) ? ", " + GreptimeLogSort.projection(new LogSort(1,
                requestedSort.field(), requestedSort.type() == null ? "text" : requestedSort.type(),
                requestedSort.direction())) : "";
        String selected = query.selection() == null ? "" : " AND " + GreptimeLogGroupProjection.selection(query.selection());
        if (query.subquery() == null) {
            ctes.add("filtered AS (SELECT *" + rawSort + " FROM " + source + " WHERE "
                    + search(query.search(), columns, types) + selected + ")");
        } else {
            if (!query.definitions().fields().isEmpty()) {
                throw new IllegalArgumentException("Subquery cannot include calculated fields");
            }
            ctes.addAll(GreptimeLogSubquery.ctes(query, source, rawSort));
        }
        return new Projection(String.join(", ", ctes), Collections.unmodifiableMap(new LinkedHashMap<>(columns)),
                Collections.unmodifiableMap(new LinkedHashMap<>(types)), guarded);
    }

    static LogCalculated.PageResult map(List<Map<String, Object>> rows, LogCalculated.Query query,
                                         Function<List<Map<String, Object>>, List<LogEntry>> rowMapper) {
        GreptimeLogCalculatedAdmission.check(rows, query);
        if (rows == null || rows.isEmpty() || !rows.getFirst().containsKey("total_count")) {
            throw new IllegalArgumentException("Missing calculated count");
        }
        long total = Long.parseLong(String.valueOf(rows.getFirst().get("total_count")));
        if (total < 0) { throw new IllegalArgumentException("Invalid calculated count"); }
        var present = rows.stream().filter(row -> row.get("timestamp") != null).toList();
        var logs = rowMapper.apply(present);
        if (logs.size() != present.size()) { throw new IllegalArgumentException("Invalid calculated page"); }
        var ordered = ordered(query.definitions());
        var result = new ArrayList<LogCalculated.Row>();
        for (int row = 0; row < present.size(); row++) {
            var derived = new LinkedHashMap<String, Object>();
            int column = 0;
            for (var definition : ordered) {
                for (var output : definition.outputs()) {
                    String key = "c_" + column++;
                    if (!present.get(row).containsKey(key)) { throw new IllegalArgumentException("Missing calculated output"); }
                    Object raw = present.get(row).get(key);
                    String type = output.type();
                    Object value = switch (type) {
                        case "number" -> {
                            Double number = raw == null ? null : Double.valueOf(raw.toString());
                            yield number != null && Double.isFinite(number) ? number : null;
                        }
                        case "string" -> raw == null ? null : raw instanceof String text ? text : invalidValue();
                        case "boolean" -> raw == null ? null : raw instanceof Boolean bool ? bool : invalidValue();
                        default -> invalidValue();
                    };
                    derived.put(output.name(), value);
                }
            }
            result.add(new LogCalculated.Row(HistoricalLogRow.from(logs.get(row)),
                    Collections.unmodifiableMap(new LinkedHashMap<>(derived))));
        }
        return new LogCalculated.PageResult(total, List.copyOf(result));
    }

    static List<LogCalculated.Definition> ordered(LogCalculated.Definitions definitions) {
        var names = new HashMap<String, LogCalculated.Definition>();
        for (var definition : definitions.fields()) {
            for (var output : definition.outputs()) { names.put(output.name(), definition); }
        }
        var result = new ArrayList<LogCalculated.Definition>();
        var seen = new HashSet<String>();
        for (var definition : definitions.fields()) { order(definition, names, seen, result); }
        return result;
    }

    private static void order(LogCalculated.Definition definition, Map<String, LogCalculated.Definition> names, Set<String> seen,
                              List<LogCalculated.Definition> result) {
        if (!seen.add(definition.id())) { return; }
        if ("formula".equals(definition.kind())) {
            for (String dep : LogCalculatedFormula.dependencies(LogCalculatedFormula.parse(definition.expression()))) {
                order(names.get(dep), names, seen, result);
            }
        }
        result.add(definition);
    }

    private static Object invalidValue() { throw new IllegalArgumentException("Invalid calculated output type"); }

    static String search(LogSearchExpression node, Map<String, String> columns, Map<String, String> types) {
        return switch (node) {
            case LogSearchExpression.And and -> join(and.children(), columns, types, " AND ", "true");
            case LogSearchExpression.Or or -> join(or.children(), columns, types, " OR ", "false");
            case LogSearchExpression.Not not -> "(NOT " + search(not.child(), columns, types) + ")";
            case LogSearchExpression.Term term -> term.field().domain() == LogSearchExpression.Domain.CALCULATED
                    ? calculatedTerm(term, columns, types) : GreptimeStructuredLogPredicate.compile(term);
            default -> GreptimeStructuredLogPredicate.compile(node);
        };
    }

    private static String join(List<LogSearchExpression> values, Map<String, String> columns, Map<String, String> types,
                               String delimiter, String empty) {
        return values.isEmpty() ? empty : values.stream().map(value -> search(value, columns, types))
                .reduce((left, right) -> left + delimiter + right).map(value -> "(" + value + ")").orElse(empty);
    }

    private static String calculatedTerm(LogSearchExpression.Term term, Map<String, String> columns,
                                         Map<String, String> types) {
        String value = columns.get(term.field().key());
        if (value == null) { throw new IllegalArgumentException("Unknown calculated output"); }
        if (term.operator() == LogSearchExpression.Operator.EXISTS) { return value + " IS NOT NULL"; }
        String type = types.get(term.field().key());
        if ("string".equals(type)) {
            return switch (term.operator()) {
                case EQUALS -> "COALESCE(" + value + " = "
                        + GreptimeStructuredLogPredicate.literal(term.value()) + ", false)";
                case GLOB -> "COALESCE(regexp_like(" + value + ", "
                        + GreptimeStructuredLogPredicate.literal(GreptimeStructuredLogPredicate.glob(term.value()))
                        + "), false)";
                default -> throw new IllegalArgumentException("Unsupported calculated string search");
            };
        }
        if ("boolean".equals(type)) {
            if (term.operator() != LogSearchExpression.Operator.EQUALS
                    || !List.of("true", "false").contains(term.value())) {
                throw new IllegalArgumentException("Unsupported calculated boolean search");
            }
            return "COALESCE(" + value + " = " + term.value().toUpperCase(java.util.Locale.ROOT) + ", false)";
        }
        if (!term.value().matches(NUMBER.substring(1, NUMBER.length() - 1))
                || !Double.isFinite(Double.parseDouble(term.value()))) {
            throw new IllegalArgumentException("Invalid calculated numeric search");
        }
        String operator = switch (term.operator()) {
            case EQUALS -> "=";
            case GT -> ">";
            case GTE -> ">=";
            case LT -> "<";
            case LTE -> "<=";
            default -> throw new IllegalArgumentException("Unsupported calculated search");
        };
        return "COALESCE(" + value + " " + operator + " " + term.value() + ", false)";
    }

    private static String sort(LogCalculated.Sort sort, Map<String, String> columns) {
        if (rawSort(sort)) {
            return "raw_sort_value " + ("asc".equals(sort.direction()) ? "ASC" : "DESC")
                    + " NULLS LAST, timestamp DESC, log_record_uid DESC";
        }
        String value = switch (sort.field()) {
            case "timestamp" -> "timestamp";
            case "severityNumber" -> "severity_number";
            default -> columns.get(sort.field().substring("calculated:".length()));
        };
        if (value == null) { throw new IllegalArgumentException("Unknown calculated sort"); }
        String direction = "asc".equals(sort.direction()) ? "ASC" : "DESC";
        return value + " " + direction + " NULLS LAST, timestamp " + direction
                + ", log_record_uid " + direction;
    }

    private static boolean rawSort(LogCalculated.Sort sort) {
        return sort.field().startsWith("resource:") || sort.field().startsWith("attribute:")
                || sort.field().startsWith("builtin:");
    }

}
