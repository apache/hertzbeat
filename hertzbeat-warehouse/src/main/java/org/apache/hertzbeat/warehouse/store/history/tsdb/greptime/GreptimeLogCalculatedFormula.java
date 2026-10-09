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

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.query.LogCalculatedFormula;

/** Fixed scalar SQL mappings for the accepted, statically typed formula AST. */
final class GreptimeLogCalculatedFormula {
    private static final String FINITE = " BETWEEN -1.7976931348623157e308 AND 1.7976931348623157e308";
    private static final String NUMBER = "^[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?$";

    private GreptimeLogCalculatedFormula() { }

    static String sql(LogCalculatedFormula.Node node, Map<String, String> columns, Map<String, String> types) {
        String result = switch (node) {
            case LogCalculatedFormula.Number number -> "CAST(" + quote(number.value()) + " AS DOUBLE)";
            case LogCalculatedFormula.Text text -> quote(text.value());
            case LogCalculatedFormula.Bool bool -> bool.value() ? "TRUE" : "FALSE";
            case LogCalculatedFormula.Raw raw -> raw(raw.name());
            case LogCalculatedFormula.Resource resource -> resource(resource.name());
            case LogCalculatedFormula.Reserved reserved -> reserved(reserved.name());
            case LogCalculatedFormula.Derived derived -> {
                String column = columns.get(derived.name());
                if (column == null) { throw new IllegalArgumentException("Unknown calculated dependency"); }
                yield column;
            }
            case LogCalculatedFormula.Unary unary -> unary.operator() == '!'
                    ? "(NOT " + sql(unary.operand(), columns, types) + ")"
                    : "(" + unary.operator() + floating(number(unary.operand(), columns, types)) + ")";
            case LogCalculatedFormula.Binary binary -> binary(binary, columns, types);
            case LogCalculatedFormula.Call call -> call(call, columns, types);
        };
        if (result.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 16384) {
            throw new LogCalculatedFormula.ValidationException("budget_exceeded", "calculatedFields");
        }
        return result;
    }

    static String finite(String expression) {
        return "(CASE WHEN " + expression + FINITE + " THEN " + expression + " END)";
    }

    static String numeric(String value) {
        String number = "TRY_CAST(" + value + " AS DOUBLE)";
        return "(CASE WHEN regexp_like(CAST(" + value + " AS STRING), '" + NUMBER + "') AND "
                + number + FINITE + " THEN " + number + " END)";
    }

    private static String number(LogCalculatedFormula.Node node, Map<String, String> columns,
                                 Map<String, String> types) {
        String value = sql(node, columns, types);
        if (node instanceof LogCalculatedFormula.Raw || node instanceof LogCalculatedFormula.Resource
                || node instanceof LogCalculatedFormula.Derived derived && "string".equals(types.get(derived.name()))) {
            return numeric(value);
        }
        return value;
    }

    private static String string(LogCalculatedFormula.Node node, Map<String, String> columns,
                                 Map<String, String> types) {
        return sql(node, columns, types);
    }

    private static String floating(String value) { return "CAST(" + value + " AS DOUBLE)"; }

    private static String integer(LogCalculatedFormula.Node node) {
        String value;
        if (node instanceof LogCalculatedFormula.Number number) { value = number.value(); }
        else if (node instanceof LogCalculatedFormula.Unary unary
                && unary.operand() instanceof LogCalculatedFormula.Number number
                && (unary.operator() == '+' || unary.operator() == '-')) {
            value = unary.operator() + number.value();
        } else { throw new IllegalArgumentException("Invalid calculated integer literal"); }
        Integer.parseInt(value);
        return value;
    }

    private static String binary(LogCalculatedFormula.Binary binary, Map<String, String> columns,
                                 Map<String, String> types) {
        String operator = binary.operator();
        if ("&&".equals(operator) || "||".equals(operator)) {
            return "(" + sql(binary.left(), columns, types) + ("&&".equals(operator) ? " AND " : " OR ")
                    + sql(binary.right(), columns, types) + ")";
        }
        if ("==".equals(operator) || "!=".equals(operator)) {
            return equality(binary, columns, types, "==".equals(operator) ? "=" : "<>");
        }
        String left = number(binary.left(), columns, types);
        String right = number(binary.right(), columns, types);
        if ("^".equals(operator)) { return finite("power(" + left + ", " + right + ")"); }
        if ("/".equals(operator) || "%".equals(operator)) {
            String numerator = floating(left);
            String denominator = floating(right);
            String divisor = "NULLIF(" + denominator + ", 0)";
            if ("/".equals(operator)) { return "(" + numerator + " / " + divisor + ")"; }
            return finite("(" + numerator + " - FLOOR(" + numerator + " / " + divisor
                    + ") * " + denominator + ")");
        }
        return "(" + floating(left) + " " + operator + " " + floating(right) + ")";
    }

    private static String equality(LogCalculatedFormula.Binary binary, Map<String, String> columns,
                                   Map<String, String> types, String operator) {
        String leftType = LogCalculatedFormula.type(binary.left(), types);
        String rightType = LogCalculatedFormula.type(binary.right(), types);
        String expected = "unknown".equals(leftType) ? rightType : leftType;
        String left = typedEqualityValue(binary.left(), expected, columns, types);
        String right = typedEqualityValue(binary.right(), expected, columns, types);
        return "(" + left + " " + operator + " " + right + ")";
    }

    private static String typedEqualityValue(LogCalculatedFormula.Node node, String expected,
                                             Map<String, String> columns, Map<String, String> types) {
        if (node instanceof LogCalculatedFormula.Raw || node instanceof LogCalculatedFormula.Resource) {
            return switch (expected) {
                case "number" -> number(node, columns, types);
                case "boolean" -> booleanValue(sql(node, columns, types));
                default -> sql(node, columns, types);
            };
        }
        return sql(node, columns, types);
    }

    private static String booleanValue(String value) {
        return "(CASE WHEN lower(" + value + ") IN ('true', 'false') THEN TRY_CAST(" + value
                + " AS BOOLEAN) END)";
    }

    private static String call(LogCalculatedFormula.Call call, Map<String, String> columns,
                               Map<String, String> types) {
        var args = call.arguments();
        return switch (call.name()) {
            case "abs", "floor", "ceiling" -> call.name() + "(" + number(args.getFirst(), columns, types) + ")";
            case "round" -> "round(" + number(args.getFirst(), columns, types)
                    + (args.size() == 2 ? ", " + integer(args.get(1)) : "") + ")";
            case "min", "max" -> minMax(call.name(), args, columns, types);
            case "lower", "upper", "proper" -> ("proper".equals(call.name()) ? "initcap" : call.name())
                    + "(" + string(args.getFirst(), columns, types) + ")";
            case "concat" -> concat(args, columns, types);
            case "textjoin" -> textjoin(args, columns, types);
            case "left", "right" -> call.name() + "(" + string(args.getFirst(), columns, types)
                    + ", " + integer(args.get(1)) + ")";
            case "substring" -> substring(args, columns, types);
            case "split_before", "split_after" -> split(call.name(), args, columns, types);
            case "substring_count" -> substringCount(args, columns, types);
            case "regexp_like" -> "COALESCE(regexp_like(" + string(args.getFirst(), columns, types)
                    + ", " + sql(args.get(1), columns, types) + "), FALSE)";
            case "regexp_replace" -> "regexp_replace(" + string(args.getFirst(), columns, types)
                    + ", " + sql(args.get(1), columns, types) + ", " + sql(args.get(2), columns, types) + ")";
            case "levenshtein_distance" -> "levenshtein(" + string(args.getFirst(), columns, types)
                    + ", " + string(args.get(1), columns, types) + ")";
            case "is_null" -> "(" + sql(args.getFirst(), columns, types) + " IS NULL)";
            case "if" -> conditional(args, columns, types);
            default -> throw new IllegalArgumentException("Unsupported calculated function");
        };
    }

    private static String minMax(String name, List<LogCalculatedFormula.Node> args,
                                 Map<String, String> columns, Map<String, String> types) {
        var values = args.stream().map(arg -> number(arg, columns, types)).toList();
        if (values.size() == 1) { return values.getFirst(); }
        String missing = values.stream().map(value -> value + " IS NULL").collect(Collectors.joining(" OR "));
        return "(CASE WHEN " + missing + " THEN NULL ELSE "
                + ("min".equals(name) ? "least" : "greatest") + "("
                + String.join(", ", values) + ") END)";
    }

    private static String concat(List<LogCalculatedFormula.Node> args, Map<String, String> columns,
                                 Map<String, String> types) {
        String values = args.stream().map(arg -> "COALESCE(" + string(arg, columns, types) + ", '')")
                .collect(Collectors.joining(", "));
        return "concat(" + values + ")";
    }

    private static String textjoin(List<LogCalculatedFormula.Node> args, Map<String, String> columns,
                                   Map<String, String> types) {
        boolean ignoreEmpty = Boolean.parseBoolean(((LogCalculatedFormula.Text) args.get(1)).value());
        String separator = string(args.getFirst(), columns, types);
        String values = args.subList(2, args.size()).stream().map(arg -> {
            String value = "COALESCE(" + string(arg, columns, types) + ", '')";
            return ignoreEmpty ? "NULLIF(" + value + ", '')" : value;
        }).collect(Collectors.joining(", "));
        return "concat_ws(" + separator + ", " + values + ")";
    }

    private static String substring(List<LogCalculatedFormula.Node> args, Map<String, String> columns,
                                    Map<String, String> types) {
        String value = string(args.get(0), columns, types);
        String start = integer(args.get(1));
        String length = integer(args.get(2));
        return "(CASE WHEN " + start + " < 0 OR " + length + " < 0 THEN NULL WHEN "
                + start + " >= length(" + value + ") THEN '' ELSE substring(" + value
                + " FROM CAST(" + start + " AS BIGINT)+1 FOR CAST(" + length + " AS BIGINT)) END)";
    }

    private static String split(String name, List<LogCalculatedFormula.Node> args,
                                Map<String, String> columns, Map<String, String> types) {
        String value = string(args.get(0), columns, types);
        String delimiter = string(args.get(1), columns, types);
        String occurrence = integer(args.get(2));
        String before = "substring_index(" + value + ", " + delimiter + ", CAST(" + occurrence + " AS BIGINT)+1)";
        String count = "((length(" + value + ") - length(replace(" + value + ", " + delimiter
                + ", ''))) / NULLIF(length(" + delimiter + "), 0))";
        String result = "split_before".equals(name) ? before
                : "substring(" + value + " FROM length(" + before + ") + length(" + delimiter + ") + 1)";
        return "(CASE WHEN " + delimiter + " = '' OR " + occurrence + " < 0 THEN NULL"
                + " WHEN " + count + " <= " + occurrence + " THEN '' ELSE " + result + " END)";
    }

    private static String substringCount(List<LogCalculatedFormula.Node> args, Map<String, String> columns,
                                         Map<String, String> types) {
        String value = string(args.get(0), columns, types);
        String needle = string(args.get(1), columns, types);
        return "((length(" + value + ") - length(replace(" + value + ", " + needle
                + ", ''))) / NULLIF(length(" + needle + "), 0))";
    }

    static String raw(String name) { return "json_get_string(log_attributes, '$[\"" + name + "\"]')"; }

    private static String resource(String name) {
        return "json_get_string(resource_attributes, " + quote("$[\"" + name + "\"]") + ")";
    }

    static String reserved(String name) {
        return switch (name) {
            case "service" -> "service_name";
            case "status" -> "lower(" + GreptimeLogFacets.expression(
                    LogFacets.Field.parse("builtin:severityCategory")) + ")";
            default -> throw new LogCalculatedFormula.ValidationException("unsupported_function", "calculatedFields");
        };
    }

    private static String conditional(List<LogCalculatedFormula.Node> args, Map<String, String> columns,
                                      Map<String, String> types) {
        String condition = sql(args.getFirst(), columns, types);
        return "(CASE WHEN " + condition + " IS NULL THEN NULL WHEN " + condition + " THEN "
                + sql(args.get(1), columns, types) + " ELSE " + sql(args.get(2), columns, types) + " END)";
    }

    private static String quote(String value) { return "'" + value.replace("'", "''") + "'"; }
}
