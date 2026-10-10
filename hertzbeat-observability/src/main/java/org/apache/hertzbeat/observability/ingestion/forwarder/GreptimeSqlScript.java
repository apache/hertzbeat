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

package org.apache.hertzbeat.observability.ingestion.forwarder;

import java.util.ArrayList;
import java.util.List;

/**
 * Splits bundled Greptime DDL without interpreting its dialect-specific SQL grammar.
 * Recognizes line/block comments and single, double and backtick quoted tokens.
 */
public final class GreptimeSqlScript {

    private GreptimeSqlScript() {
    }

    /**
     * Returns executable statements, preserving quoted content and separating comment-adjacent tokens.
     *
     * @param script SQL resource content
     * @return statements without comments or empty fragments
     * @throws IllegalArgumentException when a quote or block comment is unterminated
     */
    public static List<String> statements(String script) {
        List<String> statements = new ArrayList<>();
        StringBuilder statement = new StringBuilder();
        char quote = 0;
        for (int index = 0; index < script.length(); index++) {
            char current = script.charAt(index);
            char next = index + 1 < script.length() ? script.charAt(index + 1) : 0;
            if (quote != 0) {
                statement.append(current);
                if (current == '\\' && next != 0) {
                    statement.append(next);
                    index++;
                } else if (current == quote) {
                    if (next == quote) {
                        statement.append(next);
                        index++;
                    } else {
                        quote = 0;
                    }
                }
            } else if (current == '\'' || current == '"' || current == '`') {
                quote = current;
                statement.append(current);
            } else if (current == '-' && next == '-') {
                statement.append(' ');
                index += 2;
                while (index < script.length() && script.charAt(index) != '\n' && script.charAt(index) != '\r') {
                    index++;
                }
            } else if (current == '/' && next == '*') {
                statement.append(' ');
                index = blockCommentEnd(script, index + 2);
            } else if (current == ';') {
                addStatement(statements, statement);
            } else {
                statement.append(current);
            }
        }
        if (quote != 0) {
            throw new IllegalArgumentException("Unterminated quoted SQL token");
        }
        addStatement(statements, statement);
        return List.copyOf(statements);
    }

    private static int blockCommentEnd(String script, int start) {
        int depth = 1;
        for (int index = start; index + 1 < script.length(); index++) {
            if (script.startsWith("/*", index)) {
                depth++;
                index++;
            } else if (script.startsWith("*/", index)) {
                if (--depth == 0) {
                    return index + 1;
                }
                index++;
            }
        }
        throw new IllegalArgumentException("Unterminated SQL block comment");
    }

    private static void addStatement(List<String> statements, StringBuilder statement) {
        String sql = statement.toString().strip();
        if (!sql.isEmpty()) {
            statements.add(sql);
        }
        statement.setLength(0);
    }
}
