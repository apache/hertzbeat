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

package org.apache.hertzbeat.observability.logs.sse;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;

/**
 * Fail-closed parser and matcher for a single SSE resource or log attribute expression.
 */
final class LogSseAttributeFilter {

    private static final String NEGATION_PREFIX = "!";
    private static final String IN_PREFIX = "__in__:";
    private static final String NOT_IN_PREFIX = "__not_in__:";
    private static final String CONTAINS_PREFIX = "__contains__:";
    private static final String NOT_CONTAINS_PREFIX = "__not_contains__:";
    private static final String EXISTS = "__exists__";
    private static final String NOT_EXISTS = "__not_exists__";
    private static final String VALUE_DELIMITER = "\u001F";
    private static final Pattern LIST_OPERATOR_PATTERN = Pattern.compile(
            "^([A-Za-z0-9_.:-]+)\\s+(NOT\\s+IN|IN)\\s*(\\(.+\\))$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern TEXT_OPERATOR_PATTERN = Pattern.compile(
            "^([A-Za-z0-9_.:-]+)\\s+(NOT\\s+CONTAINS|CONTAINS)\\s+(.+)$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern PRESENCE_OPERATOR_PATTERN = Pattern.compile(
            "^([A-Za-z0-9_.:-]+)\\s+(NOT\\s+EXISTS|EXISTS)$",
            Pattern.CASE_INSENSITIVE);

    private static final LogSseAttributeFilter EMPTY = new LogSseAttributeFilter(Map.of());

    private final Map<String, String> expectedAttributes;

    private LogSseAttributeFilter(Map<String, String> expectedAttributes) {
        this.expectedAttributes = expectedAttributes;
    }

    static LogSseAttributeFilter parse(String expression) {
        if (!StringUtils.hasText(expression)) {
            return EMPTY;
        }
        List<String> clauses = splitClauses(expression);
        if (clauses.isEmpty()) {
            throw invalidFilter();
        }
        Map<String, String> parsed = new LinkedHashMap<>();
        for (String clause : clauses) {
            if (!appendClause(parsed, clause)) {
                throw invalidFilter();
            }
        }
        return new LogSseAttributeFilter(Map.copyOf(parsed));
    }

    boolean matches(Map<String, Object> source) {
        if (expectedAttributes.isEmpty()) {
            return true;
        }
        if (source == null || source.isEmpty()) {
            return expectedAttributes.values().stream().allMatch(LogSseAttributeFilter::isExclusion);
        }
        return expectedAttributes.entrySet().stream()
                .allMatch(entry -> matchesValue(resolveValue(source, entry.getKey()), entry.getValue(),
                        containsKey(source, entry.getKey())));
    }

    private static boolean appendClause(Map<String, String> filters, String clause) {
        return StringUtils.hasText(clause)
                && (appendListValue(filters, clause)
                || appendTextValue(filters, clause)
                || appendPresenceValue(filters, clause)
                || appendSimpleValue(filters, clause));
    }

    private static boolean appendSimpleValue(Map<String, String> filters, String clause) {
        boolean negate = false;
        int separatorIndex = clause.indexOf("!=");
        if (separatorIndex >= 0) {
            negate = true;
        } else {
            separatorIndex = clause.indexOf('=');
        }
        if (separatorIndex < 0) {
            separatorIndex = clause.indexOf(':');
        }
        if (separatorIndex <= 0 || separatorIndex >= clause.length() - 1) {
            return false;
        }
        String key = clause.substring(0, separatorIndex).trim();
        String value = stripQuotes(clause.substring(separatorIndex + (negate ? 2 : 1)).trim());
        if (!isSafeKey(key) || !StringUtils.hasText(value)) {
            return false;
        }
        return putFilter(filters, key, negate ? NEGATION_PREFIX + value : value);
    }

    private static boolean appendListValue(Map<String, String> filters, String clause) {
        Matcher matcher = LIST_OPERATOR_PATTERN.matcher(clause);
        if (!matcher.matches()) {
            return false;
        }
        String key = matcher.group(1).trim();
        String operator = matcher.group(2).trim().replaceAll("\\s+", " ");
        String valueList = matcher.group(3).trim();
        if (!isSafeKey(key) || valueList.length() < 2
                || !valueList.startsWith("(") || !valueList.endsWith(")")) {
            return false;
        }
        List<String> values = splitListValues(valueList.substring(1, valueList.length() - 1)).stream()
                .map(value -> stripQuotes(value.trim()))
                .distinct()
                .toList();
        if (values.isEmpty() || values.stream().anyMatch(value -> !StringUtils.hasText(value))) {
            return false;
        }
        String prefix = "not in".equalsIgnoreCase(operator) ? NOT_IN_PREFIX : IN_PREFIX;
        return putFilter(filters, key, prefix + String.join(VALUE_DELIMITER, values));
    }

    private static boolean appendTextValue(Map<String, String> filters, String clause) {
        Matcher matcher = TEXT_OPERATOR_PATTERN.matcher(clause);
        if (!matcher.matches()) {
            return false;
        }
        String key = matcher.group(1).trim();
        String operator = matcher.group(2).trim().replaceAll("\\s+", " ");
        String value = stripQuotes(matcher.group(3).trim());
        if (!isSafeKey(key) || !StringUtils.hasText(value)) {
            return false;
        }
        return putFilter(filters, key, "not contains".equalsIgnoreCase(operator)
                ? NOT_CONTAINS_PREFIX + value
                : CONTAINS_PREFIX + value);
    }

    private static boolean appendPresenceValue(Map<String, String> filters, String clause) {
        Matcher matcher = PRESENCE_OPERATOR_PATTERN.matcher(clause);
        if (!matcher.matches()) {
            return false;
        }
        String key = matcher.group(1).trim();
        String operator = matcher.group(2).trim().replaceAll("\\s+", " ");
        if (!isSafeKey(key)) {
            return false;
        }
        return putFilter(filters, key, "not exists".equalsIgnoreCase(operator) ? NOT_EXISTS : EXISTS);
    }

    private static List<String> splitClauses(String expression) {
        List<String> clauses = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int depth = 0;
        char quote = 0;
        for (int index = 0; index < expression.length(); index++) {
            char character = expression.charAt(index);
            if (quote != 0) {
                current.append(character);
                if (character == quote) {
                    quote = 0;
                }
                continue;
            }
            if (character == '\'' || character == '"') {
                quote = character;
                current.append(character);
                continue;
            }
            if (character == '(') {
                depth++;
                current.append(character);
                continue;
            }
            if (character == ')') {
                if (depth == 0) {
                    throw invalidFilter();
                }
                depth--;
                current.append(character);
                continue;
            }
            if (depth == 0 && (character == ',' || isAndDelimiter(expression, index))) {
                if (!StringUtils.hasText(current)) {
                    throw invalidFilter();
                }
                addClause(clauses, current);
                if (character != ',') {
                    index += 4;
                }
                continue;
            }
            current.append(character);
        }
        if (quote != 0 || depth != 0 || !StringUtils.hasText(current)) {
            throw invalidFilter();
        }
        addClause(clauses, current);
        return clauses;
    }

    private static List<String> splitListValues(String values) {
        if (!StringUtils.hasText(values)) {
            throw invalidFilter();
        }
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        char quote = 0;
        for (int index = 0; index < values.length(); index++) {
            char character = values.charAt(index);
            if (quote != 0) {
                current.append(character);
                if (character == quote) {
                    quote = 0;
                }
                continue;
            }
            if (character == '\'' || character == '"') {
                quote = character;
                current.append(character);
                continue;
            }
            if (character == ',') {
                if (!StringUtils.hasText(current)) {
                    throw invalidFilter();
                }
                addClause(result, current);
                continue;
            }
            current.append(character);
        }
        if (quote != 0 || !StringUtils.hasText(current)) {
            throw invalidFilter();
        }
        addClause(result, current);
        return result;
    }

    private static void addClause(List<String> clauses, StringBuilder current) {
        String clause = current.toString().trim();
        if (StringUtils.hasText(clause)) {
            clauses.add(clause);
        }
        current.setLength(0);
    }

    private static boolean isAndDelimiter(String value, int index) {
        return index + 5 <= value.length() && value.regionMatches(true, index, " and ", 0, 5);
    }

    private static String stripQuotes(String value) {
        if (value.length() < 2) {
            return value;
        }
        char first = value.charAt(0);
        char last = value.charAt(value.length() - 1);
        if ((first == '\'' && last == '\'') || (first == '"' && last == '"')) {
            return value.substring(1, value.length() - 1).trim();
        }
        return value;
    }

    private static boolean isSafeKey(String key) {
        return StringUtils.hasText(key) && key.matches("[A-Za-z0-9_.:-]+");
    }

    private static boolean putFilter(Map<String, String> filters, String key, String value) {
        String normalizedKey = normalizeKey(key);
        if (filters.keySet().stream().map(LogSseAttributeFilter::normalizeKey)
                .anyMatch(normalizedKey::equals)) {
            return false;
        }
        filters.put(key, value);
        return true;
    }

    private static boolean matchesValue(String actualValue, String expectedValue, boolean keyExists) {
        if (EXISTS.equals(expectedValue)) {
            return keyExists;
        }
        if (NOT_EXISTS.equals(expectedValue)) {
            return !keyExists;
        }
        if (expectedValue.startsWith(IN_PREFIX)) {
            return splitEncodedValues(expectedValue.substring(IN_PREFIX.length())).stream()
                    .anyMatch(expected -> matchesExact(actualValue, expected));
        }
        if (expectedValue.startsWith(NOT_IN_PREFIX)) {
            return splitEncodedValues(expectedValue.substring(NOT_IN_PREFIX.length())).stream()
                    .noneMatch(expected -> matchesExact(actualValue, expected));
        }
        if (expectedValue.startsWith(CONTAINS_PREFIX)) {
            return matchesContained(actualValue, expectedValue.substring(CONTAINS_PREFIX.length()));
        }
        if (expectedValue.startsWith(NOT_CONTAINS_PREFIX)) {
            return !matchesContained(actualValue, expectedValue.substring(NOT_CONTAINS_PREFIX.length()));
        }
        if (expectedValue.startsWith(NEGATION_PREFIX)) {
            return !matchesExact(actualValue, expectedValue.substring(NEGATION_PREFIX.length()));
        }
        return matchesExact(actualValue, expectedValue);
    }

    private static boolean isExclusion(String expectedValue) {
        return expectedValue.startsWith(NEGATION_PREFIX)
                || expectedValue.startsWith(NOT_IN_PREFIX)
                || expectedValue.startsWith(NOT_CONTAINS_PREFIX)
                || NOT_EXISTS.equals(expectedValue);
    }

    private static List<String> splitEncodedValues(String encodedValues) {
        if (!StringUtils.hasText(encodedValues)) {
            return List.of();
        }
        return List.of(encodedValues.split(Pattern.quote(VALUE_DELIMITER), -1)).stream()
                .filter(StringUtils::hasText)
                .toList();
    }

    private static boolean matchesExact(String actualValue, String expectedValue) {
        if (!StringUtils.hasText(expectedValue)) {
            return true;
        }
        return StringUtils.hasText(actualValue) && expectedValue.trim().equalsIgnoreCase(actualValue);
    }

    private static boolean matchesContained(String actualValue, String expectedValue) {
        if (!StringUtils.hasText(expectedValue)) {
            return true;
        }
        return StringUtils.hasText(actualValue)
                && actualValue.toLowerCase(Locale.ROOT).contains(expectedValue.trim().toLowerCase(Locale.ROOT));
    }

    private static String resolveValue(Map<String, Object> source, String key) {
        Object value = source.get(key);
        if (value == null) {
            value = source.get(normalizeKey(key));
        }
        return value == null || !StringUtils.hasText(String.valueOf(value))
                ? null
                : String.valueOf(value).trim();
    }

    private static boolean containsKey(Map<String, Object> source, String key) {
        return source.containsKey(key) || source.containsKey(normalizeKey(key));
    }

    private static String normalizeKey(String key) {
        return key == null ? null : key.replace(".", "_").replace(" ", "_");
    }

    private static IllegalArgumentException invalidFilter() {
        return new IllegalArgumentException("Invalid live log filter.");
    }
}
