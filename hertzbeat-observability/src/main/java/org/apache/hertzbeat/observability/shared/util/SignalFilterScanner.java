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

package org.apache.hertzbeat.observability.shared.util;

import java.util.ArrayList;
import java.util.List;
import org.springframework.util.StringUtils;

/**
 * Scans workspace signal filters while preserving quoted values and parenthesized lists.
 */
public final class SignalFilterScanner {
    private SignalFilterScanner() {
    }

    public static List<String> splitClauses(String filterExpression) {
        return splitClauses(filterExpression, false);
    }

    public static List<String> splitClausesPreservingEmpty(String filterExpression) {
        return splitClauses(filterExpression, true);
    }

    public static List<String> splitDisjunctionsPreservingEmpty(String filterExpression) {
        return splitClauses(filterExpression, true, true);
    }

    private static List<String> splitClauses(String filterExpression, boolean preserveEmpty) {
        return splitClauses(filterExpression, preserveEmpty, false);
    }

    private static List<String> splitClauses(String filterExpression, boolean preserveEmpty, boolean disjunction) {
        List<String> clauses = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int depth = 0;
        char quote = 0;
        for (int index = 0; index < filterExpression.length(); index++) {
            char character = filterExpression.charAt(index);
            if (quote != 0) {
                current.append(character);
                if (character == '\\' && index + 1 < filterExpression.length()) {
                    current.append(filterExpression.charAt(++index));
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
                if (disjunction && depth == 0) {
                    throw new IllegalArgumentException("Unbalanced filter parentheses");
                }
                depth = Math.max(0, depth - 1);
                current.append(character);
                continue;
            }
            if (!disjunction && depth == 0 && character == ',') {
                addClause(clauses, current, preserveEmpty);
                continue;
            }
            if (!disjunction && depth == 0 && isAndDelimiter(filterExpression, index)) {
                addClause(clauses, current, preserveEmpty);
                index += 4;
                continue;
            }
            if (disjunction && depth == 0 && isOrDelimiter(filterExpression, index)) {
                addClause(clauses, current, preserveEmpty);
                index += 3;
                continue;
            }
            current.append(character);
        }
        if (disjunction && (depth != 0 || quote != 0)) {
            throw new IllegalArgumentException("Unbalanced filter expression");
        }
        addClause(clauses, current, preserveEmpty);
        return clauses;
    }

    public static List<String> splitListValues(String values) {
        return splitListValues(values, false);
    }

    public static List<String> splitListValuesPreservingEmpty(String values) {
        return splitListValues(values, true);
    }

    private static List<String> splitListValues(String values, boolean preserveEmpty) {
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
                addClause(result, current, preserveEmpty);
                continue;
            }
            current.append(character);
        }
        addClause(result, current, preserveEmpty);
        return result;
    }

    private static void addClause(List<String> clauses, StringBuilder current, boolean preserveEmpty) {
        String clause = current.toString().trim();
        if (preserveEmpty || StringUtils.hasText(clause)) {
            clauses.add(clause);
        }
        current.setLength(0);
    }

    private static boolean isAndDelimiter(String value, int index) {
        return index + 5 <= value.length() && value.regionMatches(true, index, " and ", 0, 5);
    }

    private static boolean isOrDelimiter(String value, int index) {
        return index + 4 <= value.length() && value.regionMatches(true, index, " or ", 0, 4);
    }
}
