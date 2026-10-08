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

import java.util.List;
import org.apache.hertzbeat.common.util.JsonUtil;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Field;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Term;

/** Compiles only the validated log AST; authorization is a separate outer predicate. */
final class GreptimeStructuredLogPredicate {
    private static final String DECIMAL = "[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?";

    private GreptimeStructuredLogPredicate() { }

    static String compile(LogSearchExpression expression) {
        return switch (expression) {
            case LogSearchExpression.And and -> combine(and.children(), " AND ", "true");
            case LogSearchExpression.Or or -> combine(or.children(), " OR ", "false");
            case LogSearchExpression.Not not -> "(NOT " + compile(not.child()) + ")";
            case Term term -> term(term);
            case LogSearchExpression.NumericCollection collection -> collection(collection);
            case LogSearchExpression.TextCollection collection -> textCollection(collection);
        };
    }

    private static String collection(LogSearchExpression.NumericCollection collection) {
        String condition = collection.lower() == collection.upper() ? "@ == " + collection.lower()
                : "@ >= " + collection.lower() + " && @ <= " + collection.upper();
        return collection(collection.field(), collection.children(), condition);
    }

    private static String textCollection(LogSearchExpression.TextCollection collection) {
        // Pinned jsonb 0.4.4 rejects empty string literals. PathValue orders strings above
        // numbers (OrderedFloat NaN is greatest), so only empty strings lie below NUL.
        String condition = collection.value().isEmpty() ? "@ > NaN && @ < \"\\u0000\""
                : "@ == " + JsonUtil.toJson(collection.value());
        return collection(collection.field(), collection.children(), condition);
    }

    private static String collection(Field field, List<String> children, String condition) {
        String column = field.domain() == LogSearchExpression.Domain.RESOURCE ? "resource_attributes" : "log_attributes";
        // Pinned JSONPath wildcard admits a scalar or immediate array elements, without recursive flattening.
        var path = new StringBuilder("$[\"").append(field.key()).append("\"][*]");
        for (String child : children) {
            path.append("[\"").append(child).append("\"][*]");
        }
        path.append(" ? (").append(condition).append(')');
        return "COALESCE(json_path_exists(" + column + ", " + literal(path.toString()) + "), false)";
    }

    private static String combine(List<LogSearchExpression> children, String join, String empty) {
        return children.isEmpty() ? empty : children.stream().map(GreptimeStructuredLogPredicate::compile)
                .collect(Collectors.joining(join, "(", ")"));
    }

    private static String term(Term term) {
        if (term.field().domain() == LogSearchExpression.Domain.FULL_TEXT) {
            return fullText(term);
        }
        String value = value(term.field());
        String predicate = switch (term.operator()) {
            case EXISTS -> exists(term.field(), value);
            case EQUALS -> equality(value, term);
            case GLOB -> isString(term.field()) + " AND regexp_like(" + value + ", " + literal(glob(term.value())) + ")";
            case TERM -> "matches_term(" + value + ", " + literal(term.value()) + ")";
            case FULL_TEXT_TERM -> (term.field().domain() == LogSearchExpression.Domain.ATTRIBUTE
                    ? isString(term.field()) + " AND " : "")
                    + "matches_term(lower(" + value + "), lower(" + literal(term.value()) + "))";
            case FULL_TEXT_GLOB -> fullTextFieldGlob(term, value);
            case GT, GTE, LT, LTE -> numeric(value, term);
        };
        return "COALESCE(" + predicate + ", false)";
    }

    private static String fullText(Term term) {
        boolean glob = term.operator() == LogSearchExpression.Operator.FULL_TEXT_GLOB;
        String pattern = fullTextStringPattern(term.value(), glob);
        String bodyPredicate = glob
                ? "regexp_like(lower(body), " + literal(glob("*" + term.value().toLowerCase(java.util.Locale.ROOT) + "*")) + ")"
                : term.value().isEmpty() ? "body = ''" : "matches_term(lower(body), lower(" + literal(term.value()) + "))";
        List<String> predicates = new java.util.ArrayList<>(List.of(
                bodyPredicate,
                "regexp_like(" + searchableAttributes("log_attributes") + ", " + literal(pattern) + ")",
                "regexp_like(" + searchableResourceAttributes() + ", " + literal(pattern) + ")"));
        if (!glob && (term.value().matches("[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?")
                || List.of("true", "false").contains(term.value().toLowerCase(java.util.Locale.ROOT)))) {
            String scalar = "(?i)(?:^|[:,\\[{]\\s*)" + regexLiteral(term.value())
                    + "(?:\\s*[,}\\]]|\\s*$)";
            predicates.add("regexp_like(" + searchableAttributes("log_attributes") + ", " + literal(scalar) + ")");
            predicates.add("regexp_like(" + searchableResourceAttributes() + ", " + literal(scalar) + ")");
        }
        return "COALESCE((" + String.join(" OR ", predicates) + "), false)";
    }

    private static String fullTextFieldGlob(Term term, String value) {
        String pattern = "*" + term.value() + "*";
        if (term.field().domain() == LogSearchExpression.Domain.BUILTIN
                && term.field().key().equals("message")) {
            return "regexp_like(lower(body), "
                    + literal(glob(pattern.toLowerCase(java.util.Locale.ROOT))) + ")";
        }
        if (term.field().domain() == LogSearchExpression.Domain.ATTRIBUTE) {
            return isString(term.field()) + " AND regexp_like(" + value + ", "
                    + literal("(?i)" + glob(pattern)) + ")";
        }
        throw new IllegalArgumentException("Free-text glob requires message or text attribute");
    }

    private static String fullTextStringPattern(String value, boolean glob) {
        String unit = "(?:\\\\.|[^\"\\\\])";
        String prefix = "(?:^|[:,\\[{]\\s*)\"";
        String suffix = "\"(?:\\s*[,}\\]]|\\s*$)";
        if (value.isEmpty()) {
            return "(?i)" + prefix + suffix;
        }
        if (glob) {
            String content = globStringPattern(value, unit);
            return "(?i)" + prefix + unit + "*" + content + unit + "*" + suffix;
        }
        String target = regexJsonLiteral(value);
        if (value.codePoints().anyMatch(point -> Character.UnicodeScript.of(point) == Character.UnicodeScript.HAN)) {
            return "(?i)" + prefix + unit + "*" + target + unit + "*" + suffix;
        }
        String boundary = value.codePoints().anyMatch(point -> point > 127 && Character.isLetterOrDigit(point))
                ? "[^\\p{L}\\p{N}]" : "[^A-Za-z0-9]";
        String repeat = unit + "*";
        boolean leftBoundary = Character.isLetterOrDigit(value.codePointAt(0));
        boolean rightBoundary = Character.isLetterOrDigit(value.codePointBefore(value.length()));
        if (!leftBoundary && !rightBoundary) {
            return "(?i)" + prefix + repeat + target + repeat + suffix;
        }
        if (!leftBoundary) {
            return "(?i)(?:" + prefix + repeat + target + suffix
                    + "|" + prefix + repeat + target + boundary + repeat + suffix + ")";
        }
        if (!rightBoundary) {
            return "(?i)(?:" + prefix + target + repeat + suffix
                    + "|" + prefix + repeat + boundary + target + repeat + suffix + ")";
        }
        return "(?i)(?:" + prefix + target + suffix
                + "|" + prefix + target + boundary + repeat + suffix
                + "|" + prefix + repeat + boundary + target + suffix
                + "|" + prefix + repeat + boundary + target + boundary + repeat + suffix + ")";
    }

    private static String globStringPattern(String value, String unit) {
        StringBuilder result = new StringBuilder();
        StringBuilder literal = new StringBuilder();
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if (character == '\\' && index + 1 < value.length()) {
                literal.append(value.charAt(++index));
            } else if (character == '*') {
                result.append(regexJsonLiteral(literal.toString())).append(unit).append('*');
                literal.setLength(0);
            } else if (character == '?') {
                result.append(regexJsonLiteral(literal.toString())).append(unit);
                literal.setLength(0);
            } else {
                literal.append(character);
            }
        }
        return result.append(regexJsonLiteral(literal.toString())).toString();
    }

    private static String regexJsonLiteral(String value) {
        String json = JsonUtil.toJson(value);
        return regexLiteral(json.substring(1, json.length() - 1));
    }

    private static String regexLiteral(String value) {
        StringBuilder result = new StringBuilder();
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if ("\\\\.^$|?*+()[]{}".indexOf(character) >= 0) { result.append('\\'); }
            result.append(character);
        }
        return result.toString();
    }

    private static String searchableResourceAttributes() {
        return searchableAttributes("resource_attributes");
    }

    private static String searchableAttributes(String column) {
        String source = "json_to_string(" + column + ")";
        String key = "\"(?:hertzbeat[._])?workspace[._]id\"\\s*:\\s*(?:\"(?:\\\\.|[^\"\\\\])*\"|-?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?|true|false|null)";
        String pattern = "([,{])\\s*" + key;
        return "regexp_replace(" + source + ", " + literal(pattern) + ", '$1', 'g')";
    }

    private static String equality(String value, Term term) {
        String exact = value + " = " + literal(term.value());
        if (!term.value().matches(DECIMAL)) {
            return exact;
        }
        String string = isString(term.field());
        if (!Double.isFinite(Double.parseDouble(term.value()))) {
            return string + " AND " + exact;
        }
        return "((" + string + " AND " + exact + ") OR (NOT " + string + " AND " + numeric(value, term) + "))";
    }

    private static String isString(Field field) {
        if (nativeServiceAlias(field)) {
            return "(CASE WHEN " + jsonValue("resource_attributes", "service_name") + " IS NOT NULL THEN "
                    + stringAt("resource_attributes", "service_name") + " ELSE service_name IS NOT NULL END)";
        }
        if (field.domain() != LogSearchExpression.Domain.BUILTIN) {
            return stringAt(field.domain() == LogSearchExpression.Domain.RESOURCE ? "resource_attributes" : "log_attributes", field.key());
        }
        String key = switch (field.key()) {
            case "service" -> "service.name";
            case "namespace" -> "service.namespace";
            case "env" -> "deployment.environment.name";
            default -> null;
        };
        if (key == null) {
            return "true";
        }
        return "(CASE WHEN " + jsonValue("resource_attributes", key) + " IS NOT NULL THEN "
                + stringAt("resource_attributes", key) + " ELSE "
                + stringAt("resource_attributes", key.replace('.', '_')) + " END)";
    }

    static String stringAt(String column, String key) {
        // Pinned jsonb 0.4.4 compares scalar strings above numbers/bools; containers do not compare.
        // Its empty-string and decimal JSONPath literals fail parsing, so use the minimum nonempty
        // Unicode string and explicitly retain empty strings. Constant SQL fixtures pin this boundary.
        String path = "$[\"" + key + "\"] >= \"\\u0000\"";
        return "COALESCE(" + jsonValue(column, key) + " = '' OR json_path_match(" + column + ", " + literal(path) + "), false)";
    }

    private static String exists(Field field, String value) {
        if (nativeServiceAlias(field)) {
            return "(json_path_exists(resource_attributes, " + literal("$[\"service_name\"]")
                    + ") OR service_name IS NOT NULL)";
        }
        if (field.domain() == LogSearchExpression.Domain.BUILTIN) {
            return value + " IS NOT NULL";
        }
        String column = field.domain() == LogSearchExpression.Domain.RESOURCE ? "resource_attributes" : "log_attributes";
        return "json_path_exists(" + column + ", " + literal("$[\"" + field.key() + "\"]") + ")";
    }

    private static String numeric(String value, Term term) {
        if (!term.value().matches(DECIMAL)) {
            throw new IllegalArgumentException("Invalid numeric bound");
        }
        String operator = switch (term.operator()) {
            case EQUALS -> "=";
            case GT -> ">";
            case GTE -> ">=";
            case LT -> "<";
            case LTE -> "<=";
            default -> throw new IllegalArgumentException("Invalid numeric operator");
        };
        String number = "TRY_CAST(" + value + " AS DOUBLE)";
        return "regexp_like(" + value + ", " + literal("^" + DECIMAL + "$") + ") AND "
                + number + " BETWEEN -1.7976931348623157e308 AND 1.7976931348623157e308 AND "
                + number + " " + operator + " " + term.value();
    }

    private static String value(Field field) {
        if (nativeServiceAlias(field)) {
            return "COALESCE(" + jsonValue("resource_attributes", "service_name") + ", service_name)";
        }
        return switch (field.domain()) {
            case CALCULATED -> throw new IllegalArgumentException("Calculated field requires projected search");
            case FULL_TEXT -> throw new IllegalArgumentException("Full-text field requires all-field search");
            case RESOURCE -> jsonValue("resource_attributes", field.key());
            case ATTRIBUTE -> jsonValue("log_attributes", field.key());
            case BUILTIN -> switch (field.key()) {
                case "service" -> resourceAlias("service.name", "service_name");
                case "namespace" -> resourceAlias("service.namespace", "service_namespace");
                case "env" -> resourceAlias("deployment.environment.name", "deployment_environment_name");
                case "status" -> GreptimeLogFacets.expression(LogFacets.Field.parse("builtin:severityCategory"));
                case "trace_id" -> "trace_id";
                case "span_id" -> "span_id";
                case "message" -> "body";
                default -> throw new IllegalArgumentException("Invalid builtin field");
            };
        };
    }

    private static boolean nativeServiceAlias(Field field) {
        return field.domain() == LogSearchExpression.Domain.RESOURCE && "service_name".equals(field.key());
    }

    private static String resourceAlias(String canonical, String alias) {
        return "COALESCE(" + jsonValue("resource_attributes", canonical) + ", "
                + jsonValue("resource_attributes", alias) + ")";
    }

    private static String jsonValue(String column, String key) {
        return "json_get_string(" + column + ", " + literal("$[\"" + key + "\"]") + ")";
    }

    static String glob(String value) {
        StringBuilder regex = new StringBuilder("(?s)^");
        boolean escaped = false;
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if (!escaped && character == '\\') {
                escaped = true;
                continue;
            }
            if (!escaped && character == '*') {
                regex.append(".*");
            } else if (!escaped && character == '?') {
                regex.append("[^\\p{L}\\p{N}]");
            } else {
                if ("\\.[]{}()*+-?^$|".indexOf(character) >= 0) {
                    regex.append('\\');
                }
                regex.append(character);
            }
            escaped = false;
        }
        if (escaped) {
            throw new IllegalArgumentException("Incomplete glob escape");
        }
        return regex.append('$').toString();
    }

    static String literal(String value) {
        return "'" + value.replace("'", "''") + "'";
    }
}
