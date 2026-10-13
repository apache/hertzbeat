/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.observability.dto.log;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Objects;
import org.apache.hertzbeat.common.observability.query.ArithmeticFormulaValidator;

/** Bounded independent log populations over one trusted reference window. */
public final class LogQuerySet {
    private LogQuerySet() { }

    /** The requested source series exceed the bounded query-set calculation budget. */
    public static final class SeriesBudgetExceeded extends IllegalArgumentException {
        public SeriesBudgetExceeded() { super("Log query set exceeds the series budget"); }
    }

    /** Per-source analysis settings validated before execution. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Analysis(String field, LogAnalysis.Grouping grouping, LogAnalysis.Measure measure,
                           int limit, String order, long minCount, String transform) {
        public LogAnalysis.Request request(String view, Long intervalMs) {
            return new LogAnalysis.Request(field == null ? null : LogFacets.Field.parse(field), view,
                    limit, order, minCount, measure, grouping, intervalMs, null, transform);
        }

        public static Analysis from(LogAnalysis.Request request) {
            return new Analysis(request.field() == null ? null : request.field().id(), request.grouping(), request.measure(),
                    request.limit(), request.order(), request.minCount(), request.transform());
        }
    }

    /** One stable source reference and its independent search. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Query(String refId, String alias, boolean visible, String searchSyntax, String search,
                        Long timeShiftMs, Analysis analysis) { }

    /** Formula descriptor whose dependencies are source references. */
    public record Formula(String refId, String alias, boolean visible, String expression, List<String> dependsOn) {
        public Formula {
            dependsOn = List.copyOf(dependsOn);
        }

        public static Formula from(String refId, String alias, boolean visible, String expression,
                                   java.util.Set<String> sourceIds) {
            return new Formula(refId, alias, visible, expression,
                    ArithmeticFormulaValidator.referencesUsed(expression, sourceIds).stream().sorted().toList());
        }
    }

    /** Executed formula input, excluding server-derived dependency metadata. */
    public record FormulaInput(String refId, String alias, boolean visible, String expression) {
        public static FormulaInput from(Formula formula) {
            return new FormulaInput(formula.refId(), formula.alias(), formula.visible(), formula.expression());
        }
    }

    /** Server-validated inputs bound to the returned snapshot. */
    public record Executed(List<Query> queries, List<FormulaInput> formulas) {
        public Executed {
            queries = List.copyOf(queries);
            formulas = List.copyOf(formulas);
        }

        public static Executed from(List<Query> queries, List<Formula> formulas) {
            return new Executed(queries, formulas.stream().map(FormulaInput::from).toList());
        }
    }

    /** A validated descriptor paired with its independently compiled trusted predicate. */
    public record Population(Query query, LogComparison.Source source) {
        public Population {
            Objects.requireNonNull(query);
            Objects.requireNonNull(source);
        }
    }

    /** One aligned reference-window bucket. */
    public record Bucket(long start, LogComparison.Cell cell) {
        public Bucket { Objects.requireNonNull(cell); }
    }

    /** A full source cell within the bounded union domain. */
    public record Group(List<LogAnalysis.GroupKey> keys, LogComparison.Cell cell, List<Bucket> buckets) {
        public Group {
            keys = List.copyOf(keys);
            buckets = List.copyOf(buckets);
            Objects.requireNonNull(cell);
        }
    }

    /** An independently aggregated source over its actual time window. */
    public record Source(String refId, String alias, boolean visible, LogFacets.Window sourceWindow,
                         long matchingTotal, boolean truncated, Analysis analysis, List<Group> groups) {
        public Source {
            groups = List.copyOf(groups);
            if (matchingTotal < 0 || groups.size() > 100) { throw new IllegalArgumentException("Invalid query-set source"); }
        }
    }

    /** Query-set response with a common reference window. */
    public record Result(int version, LogFacets.Window window, Long intervalMs, Executed executed,
                         List<Source> sources, List<Formula> formulas) {
        public Result {
            sources = List.copyOf(sources);
            formulas = List.copyOf(formulas);
            if (version != 2 || sources.isEmpty() || sources.size() > 4 || formulas.size() > 4) {
                throw new IllegalArgumentException("Invalid query-set result");
            }
        }
    }
}
