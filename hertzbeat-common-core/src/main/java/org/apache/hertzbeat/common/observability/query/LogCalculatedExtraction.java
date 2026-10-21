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

package org.apache.hertzbeat.common.observability.query;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Bounded named-capture compiler; only Greptime executes the resulting regex. */
public final class LogCalculatedExtraction {
    private static final String NAME = "[A-Za-z][A-Za-z0-9_]{0,63}";

    private LogCalculatedExtraction() { }

    /** One capture in native array order. */
    public record Group(String name, String type, int index) { }

    /** Bounded native pattern and its ordered outputs. */
    public record Compiled(String pattern, List<Group> groups) { }

    public static String capturePattern(Compiled compiled, Group selected) {
        if (!compiled.groups().contains(selected)) { throw invalid(); }
        var result = new StringBuilder();
        String pattern = compiled.pattern();
        boolean inClass = false;
        for (int index = 0; index < pattern.length(); index++) {
            char value = pattern.charAt(index);
            if (value == '\\' && index + 1 < pattern.length()) {
                result.append(value).append(pattern.charAt(++index));
            } else if (value == '[' && !inClass) {
                inClass = true;
                result.append(value);
            } else if (value == ']' && inClass) {
                inClass = false;
                result.append(value);
            } else if (value == '(' && !inClass && pattern.startsWith("(?P<", index)) {
                int end = pattern.indexOf('>', index + 4);
                if (end < 0) { throw invalid(); }
                String name = pattern.substring(index + 4, end);
                result.append(selected.name().equals(name) ? pattern.substring(index, end + 1) : "(?:");
                index = end;
            } else { result.append(value); }
        }
        return result.toString();
    }

    public static Compiled compile(String engine, String pattern) {
        if (pattern == null || pattern.getBytes(StandardCharsets.UTF_8).length > 256 || pattern.isEmpty()) {
            throw invalid();
        }
        Compiled result = switch (engine) {
            case "regex" -> regex(pattern);
            case "grok" -> grok(pattern);
            default -> throw invalid();
        };
        if (result.groups().isEmpty() || result.groups().size() > 8
                || result.pattern().getBytes(StandardCharsets.UTF_8).length > 1024) { throw invalid(); }
        return result;
    }

    private static Compiled regex(String pattern) {
        var result = new StringBuilder();
        var groups = new ArrayList<Group>();
        int depth = 0;
        boolean inClass = false;
        for (int index = 0; index < pattern.length(); index++) {
            char character = pattern.charAt(index);
            if (character == '\\') {
                if (++index == pattern.length() || !inClass && (Character.isDigit(pattern.charAt(index))
                        || pattern.charAt(index) == 'k')) { throw invalid(); }
                result.append('\\').append(pattern.charAt(index));
            } else if (character == '[' && !inClass) {
                inClass = true;
                result.append(character);
            } else if (character == ']' && inClass) {
                inClass = false;
                result.append(character);
            } else if (character == '(' && !inClass) {
                index = opening(pattern, index, result, groups);
                depth++;
            } else if (character == ')' && !inClass) {
                if (--depth < 0) { throw invalid(); }
                result.append(character);
            } else { result.append(character); }
        }
        if (inClass || depth != 0) { throw invalid(); }
        return new Compiled(result.toString(), List.copyOf(groups));
    }

    private static int opening(String pattern, int index, StringBuilder result, List<Group> groups) {
        if (pattern.startsWith("(?:", index)) {
            result.append("(?:");
            return index + 2;
        }
        if (!pattern.startsWith("(?<", index)) { throw invalid(); }
        int end = pattern.indexOf('>', index + 3);
        if (end < 0) { throw invalid(); }
        String name = pattern.substring(index + 3, end);
        add(groups, name, "string");
        result.append("(?P<").append(name).append('>');
        return end;
    }

    private static Compiled grok(String pattern) {
        if (!pattern.startsWith("^") || !pattern.endsWith("$")) { throw invalid(); }
        var result = new StringBuilder("^");
        var groups = new ArrayList<Group>();
        for (int index = 1; index < pattern.length() - 1; index++) {
            if (pattern.startsWith("%{", index)) {
                int end = pattern.indexOf('}', index + 2);
                if (end < 0) { throw invalid(); }
                String[] parts = pattern.substring(index + 2, end).split(":", -1);
                if (parts.length != 2) { throw invalid(); }
                String expression = macro(parts[0]);
                add(groups, parts[1], "number".equals(parts[0]) || "integer".equals(parts[0])
                        ? "number" : "string");
                result.append("(?P<").append(parts[1]).append('>').append(expression).append(')');
                index = end;
            } else {
                char value = pattern.charAt(index);
                if (value == '\\' || value == '{' || value == '}') { throw invalid(); }
                if (".[]()^$*+?|".indexOf(value) >= 0) { result.append('\\'); }
                result.append(value);
            }
        }
        result.append('$');
        return new Compiled(result.toString(), List.copyOf(groups));
    }

    private static String macro(String name) {
        return switch (name) {
            case "word" -> "[A-Za-z0-9_]+";
            case "data" -> ".*?";
            case "notSpace" -> "\\S+";
            case "number" -> "[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)";
            case "integer" -> "[+-]?[0-9]+";
            default -> throw invalid();
        };
    }

    private static void add(List<Group> groups, String name, String type) {
        if (!name.matches(NAME) || groups.stream().anyMatch(group -> group.name().equals(name))) { throw invalid(); }
        groups.add(new Group(name, type, groups.size() + 1));
    }

    private static LogCalculatedFormula.ValidationException invalid() {
        return new LogCalculatedFormula.ValidationException("invalid_pattern", "calculatedFields");
    }
}
