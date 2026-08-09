/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.CRC32;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Loaded current-version baseline plus the metadata expected by Flyway schema history. */
final class TargetSchemaBaseline {

    private static final Pattern CREATE_TABLE = Pattern.compile(
            "(?i)^create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?([a-z][a-z0-9_]*)\\s*\\(");
    static final String VERSION = "206";
    static final String DESCRIPTION = "current schema";
    static final String SCRIPT = "B206__current_schema.sql";
    static final String TYPE = "SQL_BASELINE";

    private final List<String> statements;
    private final Set<String> expectedTables;
    private final int checksum;

    private TargetSchemaBaseline(List<String> statements, Set<String> expectedTables, int checksum) {
        this.statements = statements;
        this.expectedTables = expectedTables;
        this.checksum = checksum;
    }

    static TargetSchemaBaseline load(MetadataDatabaseKind kind) throws IOException {
        String vendor = switch (kind) {
            case MYSQL -> "mysql";
            case POSTGRESQL -> "postgresql";
            case H2 -> throw new IllegalArgumentException("H2 has no external target baseline");
        };
        String location = "/db/migration/" + vendor + "/" + SCRIPT;
        try (InputStream input = TargetSchemaBaseline.class.getResourceAsStream(location)) {
            if (input == null) {
                throw new IOException("Target schema baseline resource is missing");
            }
            String sql = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            List<String> statements = splitStatements(sql);
            return new TargetSchemaBaseline(statements, expectedTables(statements), checksum(sql));
        }
    }

    List<String> statements() {
        return statements;
    }

    int checksum() {
        return checksum;
    }

    Set<String> expectedTables() {
        return expectedTables;
    }

    private static int checksum(String sql) throws IOException {
        CRC32 checksum = new CRC32();
        try (BufferedReader reader = new BufferedReader(new StringReader(sql))) {
            String line = reader.readLine();
            if (line != null) {
                line = removeByteOrderMark(line);
                do {
                    checksum.update(line.getBytes(StandardCharsets.UTF_8));
                } while ((line = reader.readLine()) != null);
            }
        }
        return (int) checksum.getValue();
    }

    private static String removeByteOrderMark(String line) {
        return line.startsWith("\ufeff") ? line.substring(1) : line;
    }

    private static List<String> splitStatements(String script) throws IOException {
        List<String> statements = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        char quote = 0;
        boolean lineComment = false;
        for (int index = 0; index < script.length(); index++) {
            char character = script.charAt(index);
            char next = index + 1 < script.length() ? script.charAt(index + 1) : 0;
            if (lineComment) {
                if (character == '\n' || character == '\r') {
                    lineComment = false;
                    current.append(character);
                }
                continue;
            }
            if (quote == 0 && character == '-' && next == '-') {
                lineComment = true;
                index++;
                continue;
            }
            if (quote == 0 && (character == '\'' || character == '"' || character == '`')) {
                quote = character;
                current.append(character);
                continue;
            }
            if (quote != 0 && character == quote) {
                current.append(character);
                if (next == quote) {
                    current.append(next);
                    index++;
                } else {
                    quote = 0;
                }
                continue;
            }
            if (quote == 0 && character == ';') {
                addStatement(statements, current);
                continue;
            }
            current.append(character);
        }
        if (quote != 0) {
            throw new IOException("Target schema baseline contains an unterminated quoted value");
        }
        addStatement(statements, current);
        return List.copyOf(statements);
    }

    private static void addStatement(List<String> statements, StringBuilder current) {
        String statement = current.toString().trim();
        if (!statement.isEmpty()) {
            statements.add(statement);
        }
        current.setLength(0);
    }

    private static Set<String> expectedTables(List<String> statements) throws IOException {
        Set<String> tables = new LinkedHashSet<>();
        for (String statement : statements) {
            Matcher matcher = CREATE_TABLE.matcher(statement);
            if (matcher.find()) {
                tables.add(matcher.group(1).toLowerCase(Locale.ROOT));
            }
        }
        if (tables.isEmpty()) {
            throw new IOException("Target schema baseline does not declare any tables");
        }
        return Set.copyOf(tables);
    }
}
