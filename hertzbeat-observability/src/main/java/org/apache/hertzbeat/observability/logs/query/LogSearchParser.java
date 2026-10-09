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

import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.And;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Domain;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Field;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Not;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Operator;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Or;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Term;

import java.util.ArrayList;
import java.util.List;

/** Versioned Boolean log grammar, independent of legacy attribute and body syntax. */
public final class LogSearchParser {
    public static final String SYNTAX = "structured-v1";
    private static final int MAX_LENGTH = 8192;
    private static final int MAX_LEAVES = 100;
    private static final int MAX_DEPTH = 16;
    private static final String NUMBER =
            "[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?";
    private final List<Token> tokens;
    private final int sourceLength;
    private final boolean calculated;
    private int position;
    private int leaves;
    private int depth;

    private LogSearchParser(String source, boolean calculated) {
        sourceLength = source.length();
        tokens = tokenize(source);
        this.calculated = calculated;
    }

    public static void validateSyntax(String syntax) {
        if (syntax != null && !syntax.isEmpty() && !SYNTAX.equals(syntax)) {
            throw invalid();
        }
    }

    public static LogSearchExpression parse(String source) {
        return parse(source, false);
    }

    public static LogSearchExpression parseCalculated(String source) {
        return parse(source, true);
    }

    private static LogSearchExpression parse(String source, boolean calculated) {
        try {
            if (source == null) { return new And(List.of()); }
            if (source.length() > MAX_LENGTH) {
                throw invalid();
            }
            if (source.isBlank()) { return new And(List.of()); }
            var parser = new LogSearchParser(source, calculated);
            var result = parser.expression(null);
            if (parser.position != parser.tokens.size()) {
                throw parser.failure("unexpected_token");
            }
            return result;
        } catch (LogFilterQueryException invalid) {
            throw invalid;
        } catch (IllegalArgumentException invalid) {
            throw invalid();
        }
    }

    private LogSearchExpression expression(QueryField inherited) {
        if (++depth > MAX_DEPTH) {
            throw invalid();
        }
        List<LogSearchExpression> values = new ArrayList<>();
        values.add(conjunction(inherited));
        while (take("OR")) {
            values.add(conjunction(inherited));
        }
        depth--;
        return values.size() == 1 ? values.getFirst() : new Or(values);
    }

    private LogSearchExpression conjunction(QueryField inherited) {
        List<LogSearchExpression> values = new ArrayList<>();
        values.add(atom(inherited));
        while (position < tokens.size() && !at("OR") && !at(")")) {
            take("AND");
            values.add(atom(inherited));
        }
        return values.size() == 1 ? values.getFirst() : new And(values);
    }

    private LogSearchExpression atom(QueryField inherited) {
        if (take("NOT") || take("-")) {
            if (++depth > MAX_DEPTH) {
                throw invalid();
            }
            var child = atom(inherited);
            depth--;
            return new Not(child);
        }
        if (take("(")) {
            if (position == tokens.size()) { throw failure("unclosed_group"); }
            var result = expression(inherited);
            expect(")");
            return result;
        }
        if (inherited != null && inherited.collection()) { return collection(inherited); }
        Token token = next();
        if (token.special || !token.quoted && List.of("AND", "OR", "TO").contains(token.text)) {
            throw atToken("unexpected_token", token);
        }
        if (!token.quoted && token.pattern.equals(token.text)) {
            if (token.text.equals("CIDR") && at("(")) {
                throw new LogFilterQueryException(LogFilterQueryException.Reason.CIDR_UNSUPPORTED);
            }
        }
        if (!token.quoted && (token.text.startsWith("@") || token.text.startsWith("resource.")) && at("[")) {
            take("[");
            if (!take("]")) {
                throw new LogFilterQueryException(LogFilterQueryException.Reason.NESTED_PATH_UNSUPPORTED);
            }
            if (inherited != null) { throw invalid(); }
            List<String> children = new ArrayList<>();
            while (take("[")) {
                Token child = next();
                if (!child.quoted || children.size() == 3) { throw invalid(); }
                children.add(child.text);
                expect("]");
                expect("[");
                expect("]");
            }
            expect(":");
            return collection(new QueryField(field(token.text), true, List.copyOf(children)));
        }
        Field field = inherited == null ? null : inherited.field();
        if (take(":")) {
            if (inherited != null || token.quoted) {
                throw invalid();
            }
            field = field(token.text);
            if (take("(")) {
                if (position == tokens.size()) { throw failure("unclosed_group"); }
                var grouped = expression(new QueryField(field, false));
                expect(")");
                return grouped;
            }
            if (take("[")) {
                if (field.domain() == Domain.FULL_TEXT) { throw invalid(); }
                Token low = rangeNumber(false);
                rangeExpect("TO");
                Token high = rangeNumber(false);
                rangeExpect("]");
                if (new java.math.BigDecimal(low.text).compareTo(new java.math.BigDecimal(high.text)) > 0) {
                    throw invalid();
                }
                return new And(
                        List.of(
                                term(field, Operator.GTE, low.text),
                                term(field, Operator.LTE, high.text)));
            }
            Operator comparison = null;
            if (take(">=")) {
                comparison = Operator.GTE;
            } else if (take("<=")) {
                comparison = Operator.LTE;
            } else if (take(">")) {
                comparison = Operator.GT;
            } else if (take("<")) {
                comparison = Operator.LT;
            }
            if (comparison != null && field.domain() == Domain.FULL_TEXT) { throw invalid(); }
            token = valueToken();
            if (comparison != null) {
                numeric(token);
                return term(field, comparison, token.text);
            }
        }
        if (token.special
                || !token.quoted && List.of("AND", "OR", "NOT", "TO").contains(token.text)) {
            throw invalid();
        }
        if (field == null && !token.quoted && (token.text.startsWith("@") || token.text.startsWith("#"))) {
            throw invalid();
        }
        if (field == null && token.wildcard && token.pattern.equals("*")) {
            return new And(List.of());
        }
        if (field == null && !token.wildcard) {
            return new Or(List.of(
                    term(new Field(Domain.BUILTIN, "message"), Operator.FULL_TEXT_TERM, token.text),
                    term(new Field(Domain.ATTRIBUTE, "title"), Operator.FULL_TEXT_TERM, token.text),
                    term(new Field(Domain.ATTRIBUTE, "error.message"), Operator.FULL_TEXT_TERM, token.text),
                    term(new Field(Domain.ATTRIBUTE, "error.stack"), Operator.FULL_TEXT_TERM, token.text)));
        }
        if (field == null && token.wildcard) {
            return new Or(List.of(
                    term(new Field(Domain.BUILTIN, "message"), Operator.FULL_TEXT_GLOB, token.pattern),
                    term(new Field(Domain.ATTRIBUTE, "title"), Operator.FULL_TEXT_GLOB, token.pattern),
                    term(new Field(Domain.ATTRIBUTE, "error.message"), Operator.FULL_TEXT_GLOB, token.pattern),
                    term(new Field(Domain.ATTRIBUTE, "error.stack"), Operator.FULL_TEXT_GLOB, token.pattern)));
        }
        if (field == null) {
            field = new Field(Domain.BUILTIN, "message");
        }
        if (field.domain() == Domain.FULL_TEXT) {
            return term(field, token.wildcard ? Operator.FULL_TEXT_GLOB : Operator.FULL_TEXT_TERM,
                    token.wildcard ? token.pattern : token.text);
        }
        if (token.wildcard) {
            return term(
                    field,
                    token.pattern.equals("*") ? Operator.EXISTS : Operator.GLOB,
                    token.pattern);
        }
        return term(
                field,
                field.domain() == Domain.BUILTIN && field.key().equals("message")
                        ? Operator.TERM
                        : Operator.EQUALS,
                token.text);
    }

    private record QueryField(Field field, boolean collection, List<String> children) {
        private QueryField(Field field, boolean collection) { this(field, collection, List.of()); }
    }

    private LogSearchExpression collection(QueryField context) {
        if (take("(")) {
            var result = expression(context);
            expect(")");
            return result;
        }
        if (position < tokens.size() && tokens.get(position).quoted) {
            if (++leaves > MAX_LEAVES) { throw invalid(); }
            return new LogSearchExpression.TextCollection(context.field(), next().text, context.children());
        }
        long lower;
        long upper;
        if (take("[")) {
            lower = collectionInteger(rangeNumber(true));
            rangeExpect("TO");
            upper = collectionInteger(rangeNumber(true));
            rangeExpect("]");
        } else {
            lower = collectionInteger(valueToken());
            upper = lower;
        }
        if (++leaves > MAX_LEAVES) { throw invalid(); }
        return new LogSearchExpression.NumericCollection(context.field(), lower, upper, context.children());
    }

    private static long collectionInteger(Token token) {
        if (token.quoted || token.special || !token.text.matches("[+-]?(0|[1-9][0-9]*)")) { throw invalid(); }
        return Long.parseLong(token.text);
    }

    /** Validate structured expressions before query admission; legacy search remains literal. */
    public static void validateQuery(String syntax, String search) {
        validateSyntax(syntax);
        if (SYNTAX.equals(syntax)) { parse(search); }
    }

    private Term term(Field field, Operator operator, String value) {
        if (++leaves > MAX_LEAVES) {
            throw invalid();
        }
        if (field.domain() == Domain.BUILTIN && field.key().equals("status") && (operator == Operator.EQUALS || operator == Operator.GLOB)) {
            value = value.toUpperCase(java.util.Locale.ROOT);
        }
        return new Term(field, operator, value);
    }

    private static void numeric(Token token) {
        if (token.quoted || token.special || !token.text.matches(NUMBER)) {
            throw invalid();
        }
    }

    private Field field(String value) {
        if (value.startsWith("#")) {
            if (!calculated) { throw invalid(); }
            return new Field(Domain.CALCULATED, value.substring(1));
        }
        if (value.startsWith("@")) {
            return new Field(Domain.ATTRIBUTE, value.substring(1));
        }
        if (value.startsWith("resource.")) {
            return new Field(Domain.RESOURCE, value.substring(9));
        }
        if (value.equals("host")) { return new Field(Domain.RESOURCE, "host.name"); }
        if (value.equals("*")) { return new Field(Domain.FULL_TEXT, "all"); }
        return new Field(Domain.BUILTIN, value);
    }

    private boolean at(String value) {
        return position < tokens.size()
                && !tokens.get(position).quoted
                && tokens.get(position).text.equals(value);
    }

    private boolean take(String value) {
        if (!at(value)) {
            return false;
        }
        position++;
        return true;
    }

    private void expect(String value) {
        if (!take(value)) {
            throw failure(value.equals(")") && position == tokens.size() ? "unclosed_group" : "unexpected_token");
        }
    }

    private Token next() {
        if (position >= tokens.size()) {
            throw failure("unexpected_token");
        }
        return tokens.get(position++);
    }

    private Token valueToken() {
        if (position == tokens.size()) { throw failure("missing_value"); }
        Token token = tokens.get(position);
        if (token.special || !token.quoted && List.of("AND", "OR", "NOT", "TO").contains(token.text)) {
            throw failure("missing_value");
        }
        return next();
    }

    private Token rangeNumber(boolean integer) {
        if (position == tokens.size()) { throw failure("incomplete_range"); }
        Token token = tokens.get(position);
        if (token.quoted || token.special || !token.text.matches(integer ? "[+-]?(0|[1-9][0-9]*)" : NUMBER)) {
            throw failure("incomplete_range");
        }
        return next();
    }

    private void rangeExpect(String value) {
        if (!take(value)) { throw failure("incomplete_range"); }
    }

    private LogFilterQueryException failure(String issue) {
        return position < tokens.size() ? atToken(issue, tokens.get(position))
                : LogFilterQueryException.syntax(issue, sourceLength, sourceLength);
    }

    private static LogFilterQueryException atToken(String issue, Token token) {
        return LogFilterQueryException.syntax(issue, token.start, token.end);
    }

    private record Token(
            String text, String pattern, boolean quoted, boolean wildcard, boolean special, int start, int end) {}

    private static List<Token> tokenize(String source) {
        List<Token> result = new ArrayList<>();
        for (int i = 0; i < source.length(); ) {
            int tokenStart = i;
            char c = source.charAt(i);
            if (Character.isISOControl(c) && c != '\t' && c != '\r' && c != '\n') {
                throw invalid();
            }
            if (Character.isWhitespace(c)) {
                i++;
                continue;
            }
            if ("():[]<>".indexOf(c) >= 0
                    || c == '-'
                            && (i + 1 == source.length()
                                    || !Character.isDigit(source.charAt(i + 1))
                                            && source.charAt(i + 1) != '.')) {
                String text = String.valueOf(c);
                i++;
                if ((c == '<' || c == '>') && i < source.length() && source.charAt(i) == '=') {
                    text += '=';
                    i++;
                }
                result.add(new Token(text, text, false, false, true, tokenStart, i));
                continue;
            }
            boolean quoted = c == '"';
            if (quoted) {
                i++;
            }
            StringBuilder text = new StringBuilder();
            StringBuilder pattern = new StringBuilder();
            boolean wildcard = false;
            boolean closed = !quoted;
            while (i < source.length()) {
                c = source.charAt(i);
                if (quoted && c == '"') {
                    i++;
                    closed = true;
                    break;
                }
                if (!quoted && (Character.isWhitespace(c) || "():[]<>".indexOf(c) >= 0)) {
                    break;
                }
                if (Character.isISOControl(c)) {
                    throw invalid();
                }
                if (c == '\\') {
                    if (++i >= source.length()) {
                        if (quoted) { throw LogFilterQueryException.syntax("unclosed_quote", tokenStart, source.length()); }
                        throw invalid();
                    }
                    c = source.charAt(i++);
                    if (Character.isISOControl(c)) {
                        throw invalid();
                    }
                    text.append(c);
                    pattern.append('\\').append(c);
                    continue;
                }
                if (!quoted && c == '"') {
                    throw invalid();
                }
                text.append(c);
                if (!quoted && (c == '*' || c == '?')) {
                    wildcard = true;
                    pattern.append(c);
                } else {
                    if (c == '*' || c == '?' || c == '\\') {
                        pattern.append('\\');
                    }
                    pattern.append(c);
                }
                i++;
            }
            if (!closed) { throw LogFilterQueryException.syntax("unclosed_quote", tokenStart, source.length()); }
            if (!quoted && text.isEmpty()) {
                throw invalid();
            }
            result.add(new Token(text.toString(), pattern.toString(), quoted, wildcard, false, tokenStart, i));
        }
        return result;
    }

    private static LogFilterQueryException invalid() {
        return new LogFilterQueryException();
    }
}
