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
import java.util.HashSet;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;

/** Bounded typed subset of the calculated-field grammar, shared by validation and SQL generation. */
public final class LogCalculatedFormula {

    /** Bounded validation result, with no authored source text in the error. */
    public static final class ValidationException extends IllegalArgumentException {
        private final String code;
        private final String path;

        public ValidationException(String code, String path) {
            super(code);
            this.code = code;
            this.path = path;
        }

        public String code() { return code; }

        public String path() { return path; }

        public ValidationException at(String location) { return new ValidationException(code, location); }
    }

    private static final Pattern NUMBER = Pattern.compile("(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?");

    /** Parsed numeric node. */
    public sealed interface Node permits Number, Text, Bool, Raw, Resource, Derived, Reserved, Unary, Binary, Call { }

    /** Finite numeric literal. */
    public record Number(String value) implements Node { }

    /** Escaped string literal. */
    public record Text(String value) implements Node { }

    /** Boolean literal. */
    public record Bool(boolean value) implements Node { }

    /** Literal raw attribute reference. */
    public record Raw(String name) implements Node { }

    /** Literal resource attribute reference, distinct from log attributes. */
    public record Resource(String name) implements Node { }

    /** Named calculated output reference. */
    public record Derived(String name) implements Node { }

    /** A source-backed built-in, kept separate from raw attributes and calculated outputs. */
    public record Reserved(String name) implements Node { }

    /** Typed unary operation. */
    public record Unary(char operator, Node operand) implements Node { }

    /** Typed binary operation. */
    public record Binary(String operator, Node left, Node right) implements Node { }

    /** Fixed-signature scalar call. */
    public record Call(String name, List<Node> arguments) implements Node { }

    private final String source;
    private int position;
    private int depth;
    private int nodes;

    private LogCalculatedFormula(String source) { this.source = source; }

    public static Node parse(String source) {
        if (source == null || source.isBlank()) { throw invalid(); }
        if (!StandardCharsets.UTF_8.newEncoder().canEncode(source)) { throw invalid(); }
        if (source.getBytes(StandardCharsets.UTF_8).length > 1024) { throw issue("budget_exceeded"); }
        var parser = new LogCalculatedFormula(source);
        Node result = parser.expression();
        parser.space();
        if (parser.position != source.length()) { throw invalid(); }
        if (treeDepth(result) > 16) { throw issue("budget_exceeded"); }
        return result;
    }

    private static int treeDepth(Node value) {
        return switch (value) {
            case Unary unary -> 1 + treeDepth(unary.operand());
            case Binary binary -> 1 + Math.max(treeDepth(binary.left()), treeDepth(binary.right()));
            case Call call -> 1 + call.arguments().stream().mapToInt(LogCalculatedFormula::treeDepth)
                    .max().orElse(0);
            default -> 1;
        };
    }

    public static Set<String> dependencies(Node node) {
        var result = new HashSet<String>();
        collect(node, result);
        return Set.copyOf(result);
    }

    public static List<String> nativePatterns(Node node) {
        var result = new java.util.ArrayList<String>();
        collectPatterns(node, result);
        return List.copyOf(result);
    }

    public static int heavyCalls(Node node) {
        return switch (node) {
            case Call call -> ("regexp_like".equals(call.name()) || "regexp_replace".equals(call.name())
                    || "levenshtein_distance".equals(call.name()) || "entropy".equals(call.name()) ? 1 : 0)
                    + call.arguments().stream().mapToInt(LogCalculatedFormula::heavyCalls).sum();
            case Unary unary -> heavyCalls(unary.operand());
            case Binary binary -> heavyCalls(binary.left()) + heavyCalls(binary.right());
            default -> 0;
        };
    }

    private static void collectPatterns(Node node, List<String> result) {
        switch (node) {
            case Call call -> {
                if ("regexp_like".equals(call.name()) || "regexp_replace".equals(call.name())) {
                    result.add(((Text) call.arguments().get(1)).value());
                }
                call.arguments().forEach(argument -> collectPatterns(argument, result));
            }
            case Unary unary -> collectPatterns(unary.operand(), result);
            case Binary binary -> {
                collectPatterns(binary.left(), result);
                collectPatterns(binary.right(), result);
            }
            default -> { }
        }
    }

    /** Conservative string expansion across a formula dependency graph. */
    public record Expansion(int literalBytes, int rawCopies) {
        public Expansion plus(Expansion other) {
            return new Expansion(Math.addExact(literalBytes, other.literalBytes),
                    Math.addExact(rawCopies, other.rawCopies));
        }

        public Expansion times(int copies) {
            return new Expansion(Math.multiplyExact(literalBytes, copies), Math.multiplyExact(rawCopies, copies));
        }
    }

    public static Expansion expansion(Node node, Map<String, Expansion> dependencies) {
        Expansion result = switch (node) {
            case Text value -> new Expansion(value.value().getBytes(StandardCharsets.UTF_8).length, 0);
            case Raw raw -> new Expansion(0, 1);
            case Resource resource -> new Expansion(0, 1);
            case Reserved ignored -> new Expansion(0, 1);
            case Derived value -> {
                Expansion expansion = dependencies.get(value.name());
                if (expansion == null) { throw invalid(); }
                yield expansion;
            }
            case Call call -> callExpansion(call, dependencies);
            case Unary unary -> {
                expansion(unary.operand(), dependencies);
                yield new Expansion(0, 0);
            }
            case Binary binary -> {
                expansion(binary.left(), dependencies);
                expansion(binary.right(), dependencies);
                yield new Expansion(0, 0);
            }
            default -> new Expansion(0, 0);
        };
        if (result.literalBytes() > 16384 || result.rawCopies() > 16) { throw issue("budget_exceeded"); }
        return result;
    }

    private static Expansion callExpansion(Call call, Map<String, Expansion> dependencies) {
        var args = call.arguments().stream().map(arg -> expansion(arg, dependencies)).toList();
        return switch (call.name()) {
            case "concat" -> args.stream().reduce(new Expansion(0, 0), Expansion::plus);
            case "textjoin" -> args.subList(2, args.size()).stream()
                    .reduce(args.getFirst().times(args.size() - 3), Expansion::plus);
            case "lower", "upper", "proper" -> args.getFirst().times(4);
            case "left", "right", "substring", "split_before", "split_after" -> args.getFirst();
            case "regexp_replace" -> {
                int replacement = ((Text) call.arguments().get(2)).value()
                        .getBytes(StandardCharsets.UTF_8).length;
                yield args.getFirst().times(replacement + 1).plus(new Expansion(replacement, 0));
            }
            case "if" -> new Expansion(Math.max(args.get(1).literalBytes(), args.get(2).literalBytes()),
                    Math.max(args.get(1).rawCopies(), args.get(2).rawCopies()));
            default -> new Expansion(0, 0);
        };
    }

    private static void collect(Node node, Set<String> result) {
        switch (node) {
            case Derived derived -> result.add(derived.name());
            case Unary unary -> collect(unary.operand(), result);
            case Binary binary -> {
                collect(binary.left(), result);
                collect(binary.right(), result);
            }
            case Call call -> call.arguments().forEach(argument -> collect(argument, result));
            default -> { }
        }
    }

    /** Inferred scalar type; untyped raw fields require a typed operation context. */
    public static String type(Node node, Map<String, String> dependencies) {
        return switch (node) {
            case Number ignored -> "number";
            case Text ignored -> "string";
            case Bool ignored -> "boolean";
            case Raw raw -> "unknown";
            case Resource resource -> "unknown";
            case Reserved value -> {
                if ("source".equals(value.name())) { throw issue("unsupported_function"); }
                yield "string";
            }
            case Derived derived -> {
                String type = dependencies.get(derived.name());
                if (type == null) { throw invalid(); }
                yield type;
            }
            case Unary unary -> unary.operator() == '!' ? booleanOperand(unary.operand(), dependencies)
                    : numeric(unary.operand(), dependencies);
            case Binary binary -> binaryType(binary, dependencies);
            case Call call -> function(call, dependencies);
        };
    }

    private static String numeric(Node node, Map<String, String> dependencies) {
        String type = type(node, dependencies);
        if (!"number".equals(type) && !"unknown".equals(type)
                && !("string".equals(type) && node instanceof Derived)) { throw issue("type_mismatch"); }
        return "number";
    }

    private static String booleanOperand(Node node, Map<String, String> dependencies) {
        if (!"boolean".equals(type(node, dependencies))) { throw issue("type_mismatch"); }
        return "boolean";
    }

    private static String binaryType(Binary node, Map<String, String> dependencies) {
        return switch (node.operator()) {
            case "+", "-", "*", "/", "%", "^" -> {
                numeric(node.left(), dependencies);
                numeric(node.right(), dependencies);
                yield "number";
            }
            case "<", "<=", ">", ">=" -> {
                numeric(node.left(), dependencies);
                numeric(node.right(), dependencies);
                yield "boolean";
            }
            case "==", "!=" -> {
                String left = type(node.left(), dependencies);
                String right = type(node.right(), dependencies);
                if (!left.equals(right) && !"unknown".equals(left) && !"unknown".equals(right)) {
                    throw issue("type_mismatch");
                }
                yield "boolean";
            }
            case "&&", "||" -> {
                booleanOperand(node.left(), dependencies);
                booleanOperand(node.right(), dependencies);
                yield "boolean";
            }
            default -> throw invalid();
        };
    }

    private static void string(Node node, Map<String, String> dependencies) {
        String type = type(node, dependencies);
        if (!"string".equals(type) && !"unknown".equals(type)) { throw issue("type_mismatch"); }
    }

    private static String function(Call call, Map<String, String> dependencies) {
        var args = call.arguments();
        int size = args.size();
        return switch (call.name()) {
            case "abs", "floor", "ceiling" -> {
                arity(size, 1, 1);
                numeric(args.getFirst(), dependencies);
                yield "number";
            }
            case "round" -> {
                arity(size, 1, 2);
                numeric(args.getFirst(), dependencies);
                if (size == 2) { integerLiteral(args.get(1)); }
                yield "number";
            }
            case "min", "max" -> {
                arity(size, 1, 16);
                args.forEach(arg -> numeric(arg, dependencies));
                yield "number";
            }
            case "lower", "upper", "proper" -> {
                arity(size, 1, 1);
                string(args.getFirst(), dependencies);
                yield "string";
            }
            case "concat" -> {
                arity(size, 1, 16);
                args.forEach(arg -> string(arg, dependencies));
                yield "string";
            }
            case "textjoin" -> {
                arity(size, 3, 16);
                string(args.getFirst(), dependencies);
                var ignore = args.get(1);
                if (!(ignore instanceof Text text
                        && ("true".equals(text.value()) || "false".equals(text.value())))) { throw issue("type_mismatch"); }
                args.subList(2, size).forEach(arg -> string(arg, dependencies));
                yield "string";
            }
            case "left", "right" -> {
                arity(size, 2, 2);
                string(args.getFirst(), dependencies);
                integerLiteral(args.get(1));
                yield "string";
            }
            case "substring", "split_before", "split_after" -> {
                arity(size, 3, 3);
                string(args.getFirst(), dependencies);
                if ("substring".equals(call.name())) { integerLiteral(args.get(1)); }
                else { string(args.get(1), dependencies); }
                integerLiteral(args.get(2));
                yield "string";
            }
            case "substring_count" -> {
                arity(size, 2, 2);
                args.forEach(arg -> string(arg, dependencies));
                yield "number";
            }
            case "regexp_like", "regexp_replace" -> {
                arity(size, "regexp_like".equals(call.name()) ? 2 : 3,
                        "regexp_like".equals(call.name()) ? 2 : 3);
                string(args.getFirst(), dependencies);
                regexPattern(args.get(1));
                if (size == 3) { regexReplacement((Text) args.get(1), args.get(2)); }
                yield size == 2 ? "boolean" : "string";
            }
            case "levenshtein_distance" -> {
                arity(size, 2, 2);
                args.forEach(arg -> string(arg, dependencies));
                yield "number";
            }
            case "entropy" -> {
                arity(size, 1, 1);
                string(args.getFirst(), dependencies);
                yield "number";
            }
            case "is_null" -> {
                arity(size, 1, 1);
                type(args.getFirst(), dependencies);
                yield "boolean";
            }
            case "if" -> {
                arity(size, 3, 3);
                if (!"boolean".equals(type(args.getFirst(), dependencies))) { throw issue("type_mismatch"); }
                String yes = type(args.get(1), dependencies);
                String no = type(args.get(2), dependencies);
                if ("unknown".equals(yes) || !yes.equals(no)) { throw issue("type_mismatch"); }
                yield yes;
            }
            default -> throw issue("unsupported_function");
        };
    }

    private static void arity(int actual, int min, int max) {
        if (actual < min || actual > max) { throw invalid(); }
    }

    private static void regexPattern(Node node) {
        if (!(node instanceof Text text) || text.value().getBytes(StandardCharsets.UTF_8).length > 256) {
            throw issue("invalid_pattern");
        }
    }

    private static void regexReplacement(Text pattern, Node node) {
        if (!(node instanceof Text text) || text.value().getBytes(StandardCharsets.UTF_8).length > 256) {
            throw issue("invalid_pattern");
        }
        int groups = regexGroups(pattern.value());
        String value = text.value();
        for (int index = 0; index < value.length(); index++) {
            if (value.charAt(index) != '$') { continue; }
            if (++index == value.length() || value.charAt(index) < '1' || value.charAt(index) > '9'
                    || value.charAt(index) - '0' > groups
                    || index + 1 < value.length() && nameChar(value.charAt(index + 1))) {
                throw issue("invalid_pattern");
            }
        }
    }

    private static int regexGroups(String pattern) {
        int groups = 0;
        boolean inClass = false;
        for (int index = 0; index < pattern.length(); index++) {
            char value = pattern.charAt(index);
            if (value == '\\') { index++; }
            else if (value == '[') { inClass = true; }
            else if (value == ']') { inClass = false; }
            else if (value == '(' && !inClass && (index + 1 == pattern.length()
                    || pattern.charAt(index + 1) != '?' || pattern.startsWith("(?P<", index)
                    || pattern.startsWith("(?<", index))) { groups++; }
        }
        return groups;
    }

    private static void integerLiteral(Node node) {
        String literal;
        if (node instanceof Number number) { literal = number.value(); }
        else if (node instanceof Unary unary && unary.operand() instanceof Number number) {
            literal = unary.operator() + number.value();
        } else { throw issue("type_mismatch"); }
        if (!literal.matches("[+-]?[0-9]+")) { throw issue("type_mismatch"); }
        try { Integer.parseInt(literal); }
        catch (NumberFormatException invalid) { throw issue("type_mismatch"); }
    }

    private Node expression() {
        enter();
        Node value = disjunction();
        depth--;
        return value;
    }

    private Node disjunction() {
        Node value = conjunction();
        while (take("||") || takeWord("OR")) { value = node(new Binary("||", value, conjunction())); }
        return value;
    }

    private Node conjunction() {
        Node value = equality();
        while (take("&&") || takeWord("AND")) { value = node(new Binary("&&", value, equality())); }
        return value;
    }

    private Node equality() {
        Node value = relation();
        while (true) {
            String operator = take("==") ? "==" : take("!=") ? "!=" : null;
            if (operator == null) { return value; }
            value = node(new Binary(operator, value, relation()));
        }
    }

    private Node relation() {
        Node value = sum();
        while (true) {
            String operator = take("<=") ? "<=" : take(">=") ? ">="
                    : take("<") ? "<" : take(">") ? ">" : null;
            if (operator == null) { return value; }
            value = node(new Binary(operator, value, sum()));
        }
    }

    private Node sum() {
        Node value = product();
        while (take('+') || take('-')) {
            String operator = String.valueOf(source.charAt(position - 1));
            value = node(new Binary(operator, value, product()));
        }
        return value;
    }

    private Node product() {
        Node value = unary();
        while (take('*') || take('/') || take('%')) {
            String operator = String.valueOf(source.charAt(position - 1));
            value = node(new Binary(operator, value, unary()));
        }
        return value;
    }

    private Node unary() {
        char operator = take('+') ? '+' : take('-') ? '-' : take('!') || takeWord("NOT") ? '!' : 0;
        if (operator == 0) { return power(); }
        enter();
        Node value = node(new Unary(operator, unary()));
        depth--;
        return value;
    }

    private Node power() {
        Node value = primary();
        if (take('^')) {
            enter();
            value = node(new Binary("^", value, unary()));
            depth--;
        }
        return value;
    }

    private Node primary() {
        if (take('(')) {
            Node inner = expression();
            if (!take(')')) { throw invalid(); }
            return inner;
        }
        space();
        if (take('"')) { return node(new Text(quoted())); }
        if (position < source.length() && (source.charAt(position) == '@' || source.charAt(position) == '#')) {
            char prefix = source.charAt(position++);
            int begin = position;
            while (position < source.length() && nameChar(source.charAt(position))) { position++; }
            String name = source.substring(begin, position);
            if (name.isEmpty() || !Character.isLetter(name.charAt(0))) { throw invalid(); }
            if (prefix == '@') { LogFacets.Field.parse("attribute:" + name); }
            else if (name.length() > 64 || !name.matches("[A-Za-z][A-Za-z0-9_]{0,63}")) { throw invalid(); }
            return node(prefix == '@' ? new Raw(name) : new Derived(name));
        }
        if (position < source.length() && Character.isLetter(source.charAt(position))) {
            int begin = position;
            while (position < source.length() && nameChar(source.charAt(position))) { position++; }
            String name = source.substring(begin, position);
            if ("true".equals(name) || "false".equals(name)) { return node(new Bool(Boolean.parseBoolean(name))); }
            if (!take('(')) {
                if (Set.of("service", "status", "source").contains(name)) { return node(new Reserved(name)); }
                throw invalid();
            }
            var args = new ArrayList<Node>();
            if (!take(')')) {
                do {
                    args.add(expression());
                } while (take(','));
                if (!take(')')) { throw invalid(); }
            }
            if ("resource".equals(name)) {
                if (args.size() != 1 || !(args.getFirst() instanceof Text text)) { throw invalid(); }
                LogFacets.Field.parse("resource:" + text.value());
                return node(new Resource(text.value()));
            }
            return node(new Call(name, List.copyOf(args)));
        }
        var match = NUMBER.matcher(source).region(position, source.length());
        if (!match.lookingAt()) { throw invalid(); }
        String literal = match.group();
        position = match.end();
        if (!Double.isFinite(Double.parseDouble(literal))) { throw invalid(); }
        return node(new Number(literal));
    }

    private String quoted() {
        var value = new StringBuilder();
        while (position < source.length()) {
            char next = source.charAt(position++);
            if (next == '"') {
                if (!StandardCharsets.UTF_8.newEncoder().canEncode(value)) { throw invalid(); }
                return value.toString();
            }
            if (next == '\\') {
                if (position == source.length()) { throw invalid(); }
                next = switch (source.charAt(position++)) {
                    case '"' -> '"';
                    case '\\' -> '\\';
                    case '/' -> '/';
                    case 'b' -> '\b';
                    case 'f' -> '\f';
                    case 'n' -> '\n';
                    case 'r' -> '\r';
                    case 't' -> '\t';
                    case 'u' -> unicode();
                    default -> throw invalid();
                };
            } else if (next < 0x20) { throw invalid(); }
            value.append(next);
        }
        throw invalid();
    }

    private char unicode() {
        if (position + 4 > source.length()) { throw invalid(); }
        int value = 0;
        for (int index = 0; index < 4; index++) {
            int digit = Character.digit(source.charAt(position++), 16);
            if (digit < 0) { throw invalid(); }
            value = value * 16 + digit;
        }
        return (char) value;
    }

    private static boolean nameChar(char value) {
        return value >= 'A' && value <= 'Z' || value >= 'a' && value <= 'z'
                || value >= '0' && value <= '9' || value == '_' || value == '.';
    }

    private boolean take(char value) {
        space();
        if (position < source.length() && source.charAt(position) == value) {
            position++;
            return true;
        }
        return false;
    }

    private boolean take(String value) {
        space();
        if (source.startsWith(value, position)) {
            position += value.length();
            return true;
        }
        return false;
    }

    private boolean takeWord(String value) {
        space();
        int end = position + value.length();
        if (end <= source.length() && source.regionMatches(true, position, value, 0, value.length())
                && (end == source.length() || !nameChar(source.charAt(end)))) {
            position = end;
            return true;
        }
        return false;
    }

    private void space() {
        while (position < source.length() && Character.isWhitespace(source.charAt(position))) { position++; }
    }

    private void enter() {
        if (++depth > 16) { throw issue("budget_exceeded"); }
    }

    private <T extends Node> T node(T value) {
        if (++nodes > 64) { throw issue("budget_exceeded"); }
        return value;
    }

    private static ValidationException invalid() { return issue("invalid_expression"); }

    private static ValidationException issue(String code) {
        return new ValidationException(code, "calculatedFields");
    }
}
