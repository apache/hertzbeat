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

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;
import org.apache.hertzbeat.observability.logs.query.LogAttributeFilterParser;

/**
 * Fail-closed parser and matcher for a single SSE resource or log attribute expression.
 */
final class LogSseAttributeFilter {

    private static final String NEGATION_PREFIX = "!";
    private static final String IN_PREFIX = "__hz_in__:";
    private static final String NOT_IN_PREFIX = "__hz_not_in__:";
    private static final String CONTAINS_PREFIX = "__hz_contains__:";
    private static final String NOT_CONTAINS_PREFIX = "__hz_not_contains__:";
    private static final String EXISTS = "__hz_exists__";
    private static final String NOT_EXISTS = "__hz_not_exists__";
    private static final String VALUE_DELIMITER = "\u001F";
    private static final LogSseAttributeFilter EMPTY = new LogSseAttributeFilter(Map.of());

    private final Map<String, String> expectedAttributes;

    private LogSseAttributeFilter(Map<String, String> expectedAttributes) {
        this.expectedAttributes = expectedAttributes;
    }

    static LogSseAttributeFilter parse(String expression) {
        if (!StringUtils.hasText(expression)) {
            return EMPTY;
        }
        return new LogSseAttributeFilter(LogAttributeFilterParser.parse(expression));
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

}
