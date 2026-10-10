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

package org.apache.hertzbeat.common.observability.dto.log;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;

/** Typed, query-time calculated outputs; definition IDs are not output names. */
public final class LogCalculated {
    private LogCalculated() { }

    /** One named, typed result of a definition. */
    public record Output(String name, String type) { }

    /** One authored named extraction capture. */
    public record Capture(String name) { }

    /** One formula or extraction definition and its inferred outputs. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Definition(String id, String kind, String name, String expression, String engine,
                             String source, String pattern, List<Capture> captures, List<Output> outputs) { }

    /** Versioned set of bounded definitions. */
    public record Definitions(int version, List<Definition> fields) {
        public String outputType(String name) {
            return fields.stream().flatMap(field -> field.outputs().stream())
                    .filter(output -> output.name().equals(name)).map(Output::type)
                    .findFirst().orElseThrow(() -> new IllegalArgumentException("Unknown calculated output"));
        }
    }

    /** Page ordering. */
    public record Sort(String field, String direction, String type) {
        public Sort(String field, String direction) { this(field, direction, null); }
    }

    /** Bounded terminal operation over the shared projected population. */
    public sealed interface Operation permits Page, Trend, Facet, Analysis {
        String kind();
    }

    /** Page controls. */
    public record Page(int pageIndex, int pageSize, Sort sort) implements Operation {
        @Override public String kind() { return "page"; }
    }

    /** Epoch-aligned count buckets. */
    public record Trend(long intervalMs) implements Operation {
        @Override public String kind() { return "trend"; }
    }

    /** Full-population top values. */
    public record Facet(String field, int limit, String valueSearch) implements Operation {
        @Override public String kind() { return "facet"; }
    }

    /** One ordered grouping dimension. */
    public record Dimension(String field, int limit) { }

    /** One typed aggregate input. */
    public record Measure(String function, String field) { }

    /** Bounded grouped or time-bucketed aggregate. */
    public record Analysis(String view, List<Dimension> grouping, Measure measure, int limit, String order,
                           long minCount, Long intervalMs) implements Operation {
        @Override public String kind() { return "analysis"; }
    }

    /** Trusted scope and projected search. */
    public record Query(LogFacets.Scope scope, LogSearchExpression search, Definitions definitions, Operation operation,
                        LogGroupSelection selection, LogSubquery.Filter subquery) {
        public Query(LogFacets.Scope scope, LogSearchExpression search, Definitions definitions, Operation operation) {
            this(scope, search, definitions, operation, null, null);
        }

        public Query(LogFacets.Scope scope, LogSearchExpression search, Definitions definitions, Operation operation,
                     LogGroupSelection selection) {
            this(scope, search, definitions, operation, selection, null);
        }

        public Page page() { return (Page) operation; }
    }

    /** Raw log and every derived output. */
    public record Row(HistoricalLogRow log, Map<String, Object> derived) { }

    /** Exact count with one current page. */
    public record PageResult(long totalElements, List<Row> rows) { }

    /** Exact trend population and returned non-empty bucket counts. */
    public record TrendResult(long matchingTotal, List<LogTrendBucket> buckets) { }

    /** Exact facet population and bounded ranked values. */
    public record FacetValue(Object value, long count) { }

    /** Exact population, null count, ranked values, and optional text-search count. */
    public record FacetResult(long matchingTotal, long missingOrNullCount, List<FacetValue> values,
                              boolean truncated, Long searchMatchedCount) { }

    /** Typed grouping identity; null and all are explicit states. */
    public record AnalysisKey(String field, String kind, Object value) { }

    /** One complete group bucket. */
    public record AnalysisBucket(long start, long count,
                                 @JsonInclude(JsonInclude.Include.ALWAYS) LogAnalysis.Measurement measurement) { }

    /** One ranked full-window group. */
    public record AnalysisGroup(List<AnalysisKey> keys, long count,
                                @JsonInclude(JsonInclude.Include.ALWAYS) LogAnalysis.Measurement measurement,
                                List<AnalysisBucket> buckets) { }

    /** Exact matched count and bounded selected groups. */
    public record AnalysisResult(long matchingTotal, boolean truncated, List<AnalysisGroup> groups) { }

    /** Accepted request echoed with server-inferred output types. */
    public record Executed(Map<String, String> parameters, Definitions calculatedFields, Map<String, Object> operation) { }

    /** Calculated query result envelope. */
    public record Result(int version, LogFacets.Window window, Executed executed, Map<String, Object> result) { }

    /** Bounded user-facing validation location. */
    public record Error(String path, String code) { }

    /** Explicit sample-only extraction values. */
    public record Preview(String definitionId, Map<String, Object> values) { }

    /** Validation feedback without a storage read. */
    public record Validation(int version, boolean valid, Definitions executedDefinitions, Preview preview, List<Error> errors) { }
}
