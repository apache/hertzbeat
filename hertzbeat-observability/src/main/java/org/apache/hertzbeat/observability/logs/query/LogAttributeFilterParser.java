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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;

/**
 * Fail-closed flat log filter grammar shared by history and live queries.
 */
public final class LogAttributeFilterParser {

    private LogAttributeFilterParser() { }

    public static final int MAX_EXPRESSION_LENGTH = 8192;
    public static final int MAX_CLAUSES = 100;
    private static final Pattern EQUALITY = Pattern.compile("^([A-Za-z0-9_.:-]+?)\\s*(!=|=)\\s*(.+)$", Pattern.DOTALL);
    private static final Pattern LEGACY_EQUALITY = Pattern.compile("^([A-Za-z0-9_.-]+)\\s*(:)\\s*(.+)$", Pattern.DOTALL);
    private static final Pattern AND_DELIMITER = Pattern.compile("\\s+AND(?:\\s+|$)", Pattern.CASE_INSENSITIVE);
    private static final String NEGATION_PREFIX = "!";
    private static final String IN_PREFIX = "__hz_in__:";
    private static final String NOT_IN_PREFIX = "__hz_not_in__:";
    private static final String CONTAINS_PREFIX = "__hz_contains__:";
    private static final String NOT_CONTAINS_PREFIX = "__hz_not_contains__:";
    private static final String EXISTS = "__hz_exists__";
    private static final String NOT_EXISTS = "__hz_not_exists__";
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

    public static Map<String, String> parse(String expression) {
        if (!StringUtils.hasText(expression)) {
            return Map.of();
        }
        if (expression.length() > MAX_EXPRESSION_LENGTH || expression.chars().anyMatch(c -> Character.isISOControl(c)
                && c != '\t' && c != '\n' && c != '\r')) {
            throw invalidFilter();
        }
        List<String> clauses = splitClauses(expression);
        if (clauses.size() > MAX_CLAUSES) {
            throw invalidFilter();
        }
        Map<String, String> parsed = new LinkedHashMap<>();
        for (String clause : clauses) {
            if (!appendClause(parsed, clause)) {
                throw invalidFilter();
            }
        }
        return Map.copyOf(parsed);
    }

    private static boolean appendClause(Map<String, String> filters, String clause) {
        return StringUtils.hasText(clause)
                && (appendListValue(filters, clause)
                || appendTextValue(filters, clause)
                || appendPresenceValue(filters, clause)
                || appendSimpleValue(filters, clause));
    }

    private static boolean appendSimpleValue(Map<String, String> filters, String clause) {
        Matcher matcher = EQUALITY.matcher(clause);
        if (!matcher.matches()) {
            matcher = LEGACY_EQUALITY.matcher(clause);
            if (!matcher.matches()) {
                return false;
            }
        }
        String key = matcher.group(1);
        String value = stripQuotes(matcher.group(3));
        if (!StringUtils.hasText(value)) {
            return false;
        }
        String encoded = value;
        if (matcher.group(2).equals("!=")) {
            encoded = NEGATION_PREFIX + value;
        } else if (value.startsWith("!") || value.startsWith("__hz_")) {
            // A singleton IN preserves literal sentinels without a second wire encoding.
            encoded = IN_PREFIX + value;
        }
        return putFilter(filters, key, encoded);
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
                if (character == '\\' && index + 1 < expression.length()) {
                    current.append(expression.charAt(++index));
                    continue;
                }
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
            if (depth == 0 && (character == ',' || andDelimiterLength(expression, index) > 0)) {
                if (!StringUtils.hasText(current)) {
                    throw invalidFilter();
                }
                addClause(clauses, current);
                if (character != ',') {
                    index += andDelimiterLength(expression, index) - 1;
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
                if (character == '\\' && index + 1 < values.length()) {
                    current.append(values.charAt(++index));
                    continue;
                }
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

    private static int andDelimiterLength(String value, int index) {
        if (!Character.isWhitespace(value.charAt(index))) {
            return 0;
        }
        Matcher matcher = AND_DELIMITER.matcher(value.substring(index));
        return matcher.lookingAt() ? matcher.end() : 0;
    }

    private static String stripQuotes(String raw) {
        String value = raw.trim();
        if (value.isEmpty()) {
            throw invalidFilter();
        }
        char first = value.charAt(0);
        if (first != '\'' && first != '"') {
            if (value.matches("(?is).*(?:\\bOR\\b|[()<>*=\\\"']).*") || value.indexOf(',') >= 0) {
                throw invalidFilter();
            }
            return value;
        }
        StringBuilder decoded = new StringBuilder();
        for (int index = 1; index < value.length(); index++) {
            char character = value.charAt(index);
            if (character == first) {
                if (index != value.length() - 1) {
                    throw invalidFilter();
                }
                return decoded.toString().trim();
            }
            if (character == '\\' && index + 1 < value.length()
                    && (value.charAt(index + 1) == first || value.charAt(index + 1) == '\\')) {
                character = value.charAt(++index);
            }
            decoded.append(character);
        }
        throw invalidFilter();
    }

    private static boolean isSafeKey(String key) {
        return StringUtils.hasText(key) && key.matches("[A-Za-z0-9_.:-]+");
    }

    private static boolean putFilter(Map<String, String> filters, String key, String value) {
        String normalizedKey = normalizeKey(key);
        if (filters.keySet().stream().map(LogAttributeFilterParser::normalizeKey)
                .anyMatch(normalizedKey::equals)) {
            return false;
        }
        filters.put(key, value);
        return true;
    }

    private static String normalizeKey(String key) {
        return key.replace('.', '_');
    }

    private static LogFilterQueryException invalidFilter() {
        return new LogFilterQueryException();
    }
}
