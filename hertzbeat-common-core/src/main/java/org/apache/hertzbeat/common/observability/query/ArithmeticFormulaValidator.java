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

package org.apache.hertzbeat.common.observability.query;

import java.util.Set;
import java.util.HashSet;
import java.util.regex.Pattern;

/** Syntax-only validation of the pinned frontend arithmetic grammar; no evaluation or query execution. */
public final class ArithmeticFormulaValidator {
    private static final Pattern NUMBER = Pattern.compile("(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)");
    private final String source;
    private final Set<String> references;
    private final Set<String> used = new HashSet<>();
    private int position;
    private int depth;

    private ArithmeticFormulaValidator(String source, Set<String> references) {
        this.source = source;
        this.references = references;
    }

    public static void validate(String source, Set<String> references) {
        referencesUsed(source, references);
    }

    /** Validate and return source references, excluding function names. */
    public static Set<String> referencesUsed(String source, Set<String> references) {
        require(source != null && !source.isBlank() && source.length() <= 256);
        var parser = new ArithmeticFormulaValidator(source, references);
        parser.expression(0);
        require(parser.peek() == 0 && parser.position == source.length());
        return Set.copyOf(parser.used);
    }

    private char peek() {
        while (position < source.length()) {
            char value = source.charAt(position);
            if (!(value >= 0x09 && value <= 0x0d || Character.getType(value) == Character.SPACE_SEPARATOR
                    || value == 0x2028 || value == 0x2029 || value == 0xfeff)) {
                return value;
            }
            position++;
        }
        return 0;
    }

    private void expression(int minimum) {
        require(++depth <= 24);
        atom();
        while (peek() != 0) {
            char operator = peek();
            int precedence = operator == '+' || operator == '-' ? 1 : operator == '*' || operator == '/' ? 2 : 0;
            if (precedence <= minimum) {
                break;
            }
            position++;
            expression(precedence);
        }
        depth--;
    }

    private void atom() {
        char token = peek();
        if (token == '+' || token == '-') {
            position++;
            expression(3);
        } else if (token == '(') {
            position++;
            expression(0);
            expect(')');
        } else {
            var number = NUMBER.matcher(source).region(position, source.length());
            if (number.lookingAt()) {
                require(Double.isFinite(Double.parseDouble(number.group())));
                position = number.end();
                return;
            }
            int start = position;
            while (position < source.length() && (source.charAt(position) >= 'a' && source.charAt(position) <= 'z'
                    || source.charAt(position) >= '0' && source.charAt(position) <= '9')) {
                position++;
            }
            String name = source.substring(start, position);
            if (name.length() == 1) {
                require(references.contains(name));
                used.add(name);
            } else {
                int arity = switch (name) {
                    case "abs", "log2", "log10" -> 1;
                    case "minimum", "maximum", "pow" -> 2;
                    default -> 0;
                };
                require(arity > 0);
                expect('(');
                for (int argument = 0; argument < arity; argument++) {
                    if (argument > 0) {
                        expect(',');
                    }
                    expression(0);
                }
                expect(')');
            }
        }
    }

    private void expect(char token) {
        require(peek() == token);
        position++;
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new IllegalArgumentException("Invalid arithmetic formula");
        }
    }
}
