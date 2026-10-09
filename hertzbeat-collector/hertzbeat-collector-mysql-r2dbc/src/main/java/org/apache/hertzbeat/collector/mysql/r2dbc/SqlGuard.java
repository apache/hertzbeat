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

package org.apache.hertzbeat.collector.mysql.r2dbc;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Minimal SQL guard for the built-in read-only MySQL collector route.
 */
public class SqlGuard {

    private static final Pattern TRAILING_SEMICOLONS = Pattern.compile(";\\s*$");
    private static final Pattern COMMENTS = Pattern.compile("(/\\*|\\*/|--|#)");
    private static final Pattern FORBIDDEN = Pattern.compile(
            "\\b(insert|update|delete|replace|merge|alter|drop|truncate|create|call)\\b");

    /**
     * Normalize a single read-only SQL statement and reject obvious unsafe statements.
     *
     * @param sql sql text
     * @return normalized sql text
     */
    public String normalizeAndValidate(String sql) {
        if (sql == null || sql.isBlank()) {
            throw new IllegalArgumentException("R2DBC MySQL collector route requires a non-empty SQL statement");
        }
        String normalized = TRAILING_SEMICOLONS.matcher(sql.trim()).replaceAll("").trim();
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("R2DBC MySQL collector route requires a non-empty SQL statement");
        }
        if (normalized.indexOf(';') >= 0) {
            throw new IllegalArgumentException("R2DBC MySQL collector route only allows a single SQL statement");
        }
        if (COMMENTS.matcher(normalized).find()) {
            throw new IllegalArgumentException("R2DBC MySQL collector route does not allow SQL comments");
        }

        String lower = normalized.toLowerCase(Locale.ROOT);
        if (!(lower.startsWith("select") || lower.startsWith("show"))) {
            throw new IllegalArgumentException("R2DBC MySQL collector route only supports SELECT or SHOW statements");
        }

        String stripped = stripQuotedContent(lower);
        if (FORBIDDEN.matcher(stripped).find()) {
            throw new IllegalArgumentException("R2DBC MySQL collector route only supports read-only statements");
        }
        return normalized;
    }

    private String stripQuotedContent(String sql) {
        StringBuilder builder = new StringBuilder(sql.length());
        char quote = 0;
        for (int i = 0; i < sql.length(); i++) {
            char current = sql.charAt(i);
            if (quote == 0 && (current == '\'' || current == '"' || current == '`')) {
                quote = current;
                builder.append(' ');
                continue;
            }
            if (quote != 0 && current == quote) {
                quote = 0;
                builder.append(' ');
                continue;
            }
            builder.append(quote == 0 ? current : ' ');
        }
        return builder.toString();
    }
}
