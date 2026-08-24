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

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Parses the bounded resource attribute expression accepted by log queries. */
final class ResourceFilterExpression {

    private static final Pattern CLAUSE = Pattern.compile(
            "^(?:resource\\.)?([A-Za-z0-9_.-]+)\\s*(=|!=|(?i:EXISTS)|(?i:NOT\\s+EXISTS))(?:\\s+(.+))?$");

    private ResourceFilterExpression() {
    }

    static List<Clause> parse(String expression) {
        List<Clause> clauses = new ArrayList<>();
        for (String value : splitClauses(expression)) {
            Matcher matcher = CLAUSE.matcher(value.trim());
            if (!matcher.matches()) {
                throw invalidExpression();
            }
            Operator operator = Operator.from(matcher.group(2));
            String operand = matcher.group(3);
            if (operator.requiresValue()) {
                if (operand == null || operand.isBlank()) {
                    throw invalidExpression();
                }
                operand = unquote(operand.trim());
                if (operand.isBlank()) {
                    throw invalidExpression();
                }
            } else if (operand != null && !operand.isBlank()) {
                throw invalidExpression();
            }
            clauses.add(new Clause(matcher.group(1), operator, operand));
        }
        if (clauses.isEmpty()) {
            throw invalidExpression();
        }
        return clauses;
    }

    private static List<String> splitClauses(String expression) {
        List<String> clauses = new ArrayList<>();
        int start = 0;
        char quote = 0;
        for (int index = 0; index < expression.length(); index++) {
            char current = expression.charAt(index);
            if ((current == '\'' || current == '"') && (index == 0 || expression.charAt(index - 1) != '\\')) {
                quote = quote == 0 ? current : quote == current ? 0 : quote;
            }
            if (quote == 0 && index + 3 <= expression.length()
                    && expression.regionMatches(true, index, "AND", 0, 3)
                    && isBoundary(expression, index - 1) && isBoundary(expression, index + 3)) {
                clauses.add(expression.substring(start, index));
                start = index + 3;
                index += 2;
            }
        }
        if (quote != 0) {
            throw invalidExpression();
        }
        clauses.add(expression.substring(start));
        return clauses;
    }

    private static boolean isBoundary(String value, int index) {
        return index < 0 || index >= value.length() || Character.isWhitespace(value.charAt(index));
    }

    private static String unquote(String value) {
        if (value.length() >= 2 && ((value.startsWith("\"") && value.endsWith("\""))
                || (value.startsWith("'") && value.endsWith("'")))) {
            return value.substring(1, value.length() - 1);
        }
        if (value.indexOf(' ') >= 0) {
            throw invalidExpression();
        }
        return value;
    }

    private static IllegalArgumentException invalidExpression() {
        return new IllegalArgumentException("Invalid resource filter expression");
    }

    record Clause(String key, Operator operator, String value) {
    }

    enum Operator {
        EQUALS,
        NOT_EQUALS,
        EXISTS,
        NOT_EXISTS;

        static Operator from(String value) {
            return switch (value.replaceAll("\\s+", " ").toUpperCase(Locale.ROOT)) {
                case "=" -> EQUALS;
                case "!=" -> NOT_EQUALS;
                case "EXISTS" -> EXISTS;
                case "NOT EXISTS" -> NOT_EXISTS;
                default -> throw invalidExpression();
            };
        }

        boolean requiresValue() {
            return this == EQUALS || this == NOT_EQUALS;
        }
    }
}
