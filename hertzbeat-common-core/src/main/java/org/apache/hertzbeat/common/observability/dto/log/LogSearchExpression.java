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

package org.apache.hertzbeat.common.observability.dto.log;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/** Immutable log-only structured query; never contains SQL or executable code. */
public sealed interface LogSearchExpression {
    /** Storage-independent field domain. */
    enum Domain {
        BUILTIN,
        RESOURCE,
        ATTRIBUTE,
        CALCULATED,
        FULL_TEXT
    }

    /** Finite supported leaf operators. */
    enum Operator {
        EQUALS,
        GLOB,
        EXISTS,
        GT,
        GTE,
        LT,
        LTE,
        TERM,
        FULL_TEXT_TERM,
        FULL_TEXT_GLOB
    }

    /** Validated literal field name. */
    record Field(Domain domain, String key) {
        public Field {
            Objects.requireNonNull(domain);
            if (key == null
                    || domain == Domain.FULL_TEXT && !"all".equals(key)
                    || domain != Domain.FULL_TEXT && !key.matches("[A-Za-z0-9_.:-]{1,256}")
                    || domain == Domain.BUILTIN
                            && !Set.of(
                                            "service",
                                            "namespace",
                                            "env",
                                            "status",
                                            "trace_id",
                                            "span_id",
                                            "message")
                                    .contains(key)
                    || Set.of("hertzbeat_workspace_id", "workspace_id").contains(key.replace('.', '_'))) {
                throw new IllegalArgumentException("Invalid structured log field");
            }
        }
    }

    /** Conjunction; empty children match every row. */
    record And(List<LogSearchExpression> children) implements LogSearchExpression {
        public And {
            children = List.copyOf(children);
        }
    }

    /** Nonempty disjunction. */
    record Or(List<LogSearchExpression> children) implements LogSearchExpression {
        public Or {
            children = List.copyOf(children);
            if (children.isEmpty()) {
                throw new IllegalArgumentException("Empty disjunction");
            }
        }
    }

    /** Boolean exclusion. */
    record Not(LogSearchExpression child) implements LogSearchExpression {
        public Not {
            Objects.requireNonNull(child);
        }
    }

    /** One numeric scalar or immediate array element must satisfy both inclusive integer bounds. */
    record NumericCollection(Field field, long lower, long upper, List<String> children) implements LogSearchExpression {
        public NumericCollection(Field field, long lower, long upper) {
            this(field, lower, upper, List.of());
        }

        public NumericCollection {
            children = collectionChildren(field, children);
            if (lower > upper
                    || lower < -9007199254740992L || upper > 9007199254740992L) {
                throw new IllegalArgumentException("Invalid numeric collection predicate");
            }
        }
    }

    /** One string scalar or immediate array element must equal the literal value. */
    record TextCollection(Field field, String value, List<String> children) implements LogSearchExpression {
        public TextCollection(Field field, String value) {
            this(field, value, List.of());
        }

        public TextCollection {
            children = collectionChildren(field, children);
            Objects.requireNonNull(value);
            if (value.length() > 8192
                    || !StandardCharsets.UTF_8.newEncoder().canEncode(value)) {
                throw new IllegalArgumentException("Invalid text collection predicate");
            }
        }
    }

    private static List<String> collectionChildren(Field field, List<String> children) {
        Objects.requireNonNull(field);
        children = List.copyOf(children);
        if (field.domain() == Domain.BUILTIN || children.size() > 3) {
            throw new IllegalArgumentException("Invalid collection path");
        }
        int length = field.key().length();
        for (String child : children) {
            length += new Field(field.domain(), child).key().length();
        }
        if (length > 1024) {
            throw new IllegalArgumentException("Collection path too long");
        }
        return children;
    }

    /** Typed scalar predicate. */
    record Term(Field field, Operator operator, String value) implements LogSearchExpression {
        public Term {
            Objects.requireNonNull(field);
            Objects.requireNonNull(operator);
            Objects.requireNonNull(value);
            if (value.length() > 8192) {
                throw new IllegalArgumentException("Log value too long");
            }
            if (operator == Operator.GT
                    || operator == Operator.GTE
                    || operator == Operator.LT
                    || operator == Operator.LTE) {
                BigDecimal number = new BigDecimal(value);
                if (number.abs().compareTo(new BigDecimal("9007199254740992")) > 0) {
                    throw new IllegalArgumentException("Invalid numeric bound");
                }
            }
        }
    }
}
