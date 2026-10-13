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

import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.dto.log.LogSeverityCategory;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.logs.sse.LogBodyTermFilter;

import java.util.Map;
import java.util.function.Predicate;
import java.util.regex.Pattern;

/** Compiles structured predicates once for a live subscription. */
public final class LogSearchEvaluator {
    private static final Pattern NUMBER =
            Pattern.compile("[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?");

    private LogSearchEvaluator() {}

    public static Predicate<LogEntry> compile(LogSearchExpression expression) {
        if (expression instanceof LogSearchExpression.And and) {
            var children = and.children().stream().map(LogSearchEvaluator::compile).toList();
            return log -> children.stream().allMatch(child -> child.test(log));
        }
        if (expression instanceof LogSearchExpression.Or or) {
            var children = or.children().stream().map(LogSearchEvaluator::compile).toList();
            return log -> children.stream().anyMatch(child -> child.test(log));
        }
        if (expression instanceof LogSearchExpression.Not not) {
            return compile(not.child()).negate();
        }
        if (expression instanceof LogSearchExpression.TextCollection collection) {
            Predicate<Object> member = collection.value()::equals;
            return compileCollection(collection.field(), collection.children(), member);
        }
        if (expression instanceof LogSearchExpression.NumericCollection collection) {
            Predicate<Object> member = raw -> collectionNumber(raw, collection);
            return compileCollection(collection.field(), collection.children(), member);
        }
        var term = (LogSearchExpression.Term) expression;
        if (term.field().domain() == LogSearchExpression.Domain.FULL_TEXT) {
            throw new LogFilterQueryException(LogFilterQueryException.Reason.FULL_TEXT_UNSUPPORTED);
        }
        Predicate<String> glob =
                term.operator() == LogSearchExpression.Operator.GLOB ? glob(term.value())
                        : term.operator() == LogSearchExpression.Operator.FULL_TEXT_GLOB
                                ? glob("*" + term.value() + "*", true) : null;
        LogBodyTermFilter body =
                term.operator() == LogSearchExpression.Operator.TERM
                        || term.operator() == LogSearchExpression.Operator.FULL_TEXT_TERM
                        ? new LogBodyTermFilter(term.value(), term.operator() == LogSearchExpression.Operator.FULL_TEXT_TERM)
                        : null;
        return log -> {
            Object raw = value(log, term.field());
            if (term.operator() == LogSearchExpression.Operator.EXISTS) {
                return exists(log, term.field());
            }
            if (body != null) {
                if (term.operator() == LogSearchExpression.Operator.FULL_TEXT_TERM
                        && term.field().domain() != LogSearchExpression.Domain.BUILTIN
                        && (raw instanceof Map || raw instanceof Iterable || raw != null && raw.getClass().isArray())) {
                    return false;
                }
                return body.test(raw);
            }
            if (term.operator() == LogSearchExpression.Operator.FULL_TEXT_GLOB) {
                boolean message = term.field().domain() == LogSearchExpression.Domain.BUILTIN
                        && term.field().key().equals("message");
                if (raw == null) { return false; }
                if (raw instanceof Map<?, ?> values) {
                    return message && values.values().stream().anyMatch(value -> fullTextGlobValue(value, glob));
                }
                if (raw instanceof Iterable<?> values) {
                    return message && java.util.stream.StreamSupport.stream(values.spliterator(), false)
                            .anyMatch(value -> fullTextGlobValue(value, glob));
                }
                if (raw.getClass().isArray()) {
                    if (!message) { return false; }
                    for (int index = 0; index < java.lang.reflect.Array.getLength(raw); index++) {
                        if (fullTextGlobValue(java.lang.reflect.Array.get(raw, index), glob)) { return true; }
                    }
                    return false;
                }
                return glob.test(raw instanceof CharSequence ? raw.toString() : JsonUtil.toJson(raw));
            }
            if (raw == null || raw instanceof Map || raw instanceof Iterable || raw.getClass().isArray()) {
                return false;
            }
            String actual = raw instanceof CharSequence ? raw.toString() : JsonUtil.toJson(raw);
            if (term.operator() == LogSearchExpression.Operator.EQUALS) {
                if (raw instanceof Number number) {
                    if (!NUMBER.matcher(term.value()).matches()) { return false; }
                    double expected = Double.parseDouble(term.value());
                    return Double.isFinite(number.doubleValue()) && Double.isFinite(expected) && number.doubleValue() == expected;
                }
                return term.value().equals(actual);
            }
            if (glob != null) {
                return raw instanceof CharSequence && glob.test(actual);
            }
            if (actual == null || !NUMBER.matcher(actual).matches()) {
                return false;
            }
            double number = Double.parseDouble(actual);
            if (!Double.isFinite(number)) {
                return false;
            }
            double expected = Double.parseDouble(term.value());
            return switch (term.operator()) {
                case GT -> number > expected;
                case GTE -> number >= expected;
                case LT -> number < expected;
                case LTE -> number <= expected;
                default -> false;
            };
        };
    }

    private static Predicate<LogEntry> compileCollection(LogSearchExpression.Field field, java.util.List<String> children,
                                                        Predicate<Object> member) {
        for (int index = children.size() - 1; index >= 0; index--) {
            String key = children.get(index);
            Predicate<Object> descendant = member;
            member = item -> item instanceof Map<?, ?> object && matchesCollection(object.get(key), descendant);
        }
        Predicate<Object> compiled = member;
        return log -> matchesCollection(value(log, field), compiled);
    }

    private static boolean matchesCollection(Object raw, Predicate<Object> member) {
        if (raw instanceof Iterable<?> values) {
            for (Object item : values) { if (member.test(item)) { return true; } }
            return false;
        }
        return member.test(raw);
    }

    private static boolean fullTextGlobValue(Object raw, Predicate<String> glob) {
        if (raw == null) { return false; }
        if (raw instanceof Map<?, ?> values) {
            return values.values().stream().anyMatch(value -> fullTextGlobValue(value, glob));
        }
        if (raw instanceof Iterable<?> values) {
            return java.util.stream.StreamSupport.stream(values.spliterator(), false)
                    .anyMatch(value -> fullTextGlobValue(value, glob));
        }
        if (raw.getClass().isArray()) {
            for (int index = 0; index < java.lang.reflect.Array.getLength(raw); index++) {
                if (fullTextGlobValue(java.lang.reflect.Array.get(raw, index), glob)) { return true; }
            }
            return false;
        }
        return glob.test(raw instanceof CharSequence ? raw.toString() : JsonUtil.toJson(raw));
    }

    private static boolean collectionNumber(Object raw, LogSearchExpression.NumericCollection collection) {
        if (raw instanceof Byte || raw instanceof Short || raw instanceof Integer || raw instanceof Long) {
            long number = ((Number) raw).longValue();
            return number >= collection.lower() && number <= collection.upper();
        }
        if (raw instanceof Float || raw instanceof Double) {
            double number = ((Number) raw).doubleValue();
            return Double.isFinite(number) && number >= collection.lower() && number <= collection.upper();
        }
        return false;
    }

    private static Predicate<String> glob(String value) {
        return glob(value, false);
    }

    private static Predicate<String> glob(String value, boolean caseInsensitive) {
        String patternValue = caseInsensitive ? value.toLowerCase(java.util.Locale.ROOT) : value;
        java.util.List<Integer> tokens = new java.util.ArrayList<>();
        for (int i = 0; i < patternValue.length(); ) {
            int point = patternValue.codePointAt(i);
            i += Character.charCount(point);
            if (point == '\\' && i < patternValue.length()) {
                point = patternValue.codePointAt(i);
                i += Character.charCount(point);
                tokens.add(point);
            } else {
                tokens.add(point == '*' ? -1 : point == '?' ? -2 : point);
            }
        }
        return text -> {
            String candidate = caseInsensitive ? text.toLowerCase(java.util.Locale.ROOT) : text;
            int[] points = candidate.codePoints().toArray();
            int current = 0;
            int pattern = 0;
            int star = -1;
            int retry = 0;
            while (current < points.length) {
                if (pattern < tokens.size()
                        && (tokens.get(pattern) == points[current]
                                || tokens.get(pattern) == -2 && isSpecial(points[current]))) {
                    current++;
                    pattern++;
                } else if (pattern < tokens.size() && tokens.get(pattern) == -1) {
                    star = pattern++;
                    retry = current;
                } else if (star >= 0) {
                    pattern = star + 1;
                    current = ++retry;
                } else {
                    return false;
                }
            }
            while (pattern < tokens.size() && tokens.get(pattern) == -1) {
                pattern++;
            }
            return pattern == tokens.size();
        };
    }

    private static boolean isSpecial(int point) {
        int type = Character.getType(point);
        return !Character.isLetter(point)
                && type != Character.DECIMAL_DIGIT_NUMBER
                && type != Character.LETTER_NUMBER
                && type != Character.OTHER_NUMBER;
    }

    private static Map<String, Object> map(LogEntry log, LogSearchExpression.Domain domain) {
        Map<String, Object> result =
                domain == LogSearchExpression.Domain.RESOURCE
                        ? log.getResource()
                        : log.getAttributes();
        return result == null ? Map.of() : result;
    }

    private static Object value(LogEntry log, LogSearchExpression.Field field) {
        if (field.domain() != LogSearchExpression.Domain.BUILTIN) {
            return map(log, field.domain()).get(field.key());
        }
        Map<String, Object> resource = map(log, LogSearchExpression.Domain.RESOURCE);
        return switch (field.key()) {
            case "service" -> coalesce(resource, "service.name", "service_name");
            case "namespace" ->
                    coalesce(resource, "service.namespace", "service_namespace");
            case "env" ->
                    coalesce(resource, "deployment.environment.name", "deployment_environment_name");
            case "trace_id" -> log.getTraceId();
            case "span_id" -> log.getSpanId();
            case "message" -> log.getBody() == null ? null : log.getBody() instanceof CharSequence
                    ? log.getBody().toString() : JsonUtil.toJson(log.getBody());
            case "status" ->
                    java.util.Arrays.stream(LogSeverityCategory.values())
                            .filter(c -> c.matches(log.getSeverityNumber()))
                            .map(Enum::name)
                            .findFirst()
                            .orElse(null);
            default -> null;
        };
    }

    private static Object coalesce(Map<String, Object> values, String first, String second) {
        Object value = values.get(first);
        if (value == null || value instanceof Map || value instanceof Iterable || value.getClass().isArray()) {
            value = values.get(second);
        }
        return value == null || value instanceof Map || value instanceof Iterable || value.getClass().isArray() ? null : value;
    }

    private static boolean exists(LogEntry log, LogSearchExpression.Field field) {
        return field.domain() == LogSearchExpression.Domain.BUILTIN
                ? value(log, field) != null
                : map(log, field.domain()).containsKey(field.key());
    }
}
