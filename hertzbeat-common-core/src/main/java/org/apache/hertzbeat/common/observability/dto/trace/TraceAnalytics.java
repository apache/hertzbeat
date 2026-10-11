/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.common.observability.dto.trace;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Explicit matched-span and matched-trace analytics evidence. */
public final class TraceAnalytics {
    private TraceAnalytics() { }

    /** Exact boundary semantics shared by results and histogram brush. */
    public record Window(long start, long end, boolean endExclusive) {
        public Window {
            if (start <= 0 || end <= start || end > Long.MAX_VALUE / 1_000_000L || end - start > 86_400_000L) {
                throw new IllegalArgumentException("Invalid trace analytics window");
            }
        }
    }

    /** Population coverage; bounded counts never claim the whole window. */
    public record Coverage(String mode, Integer rowLimit, Integer scannedRows, boolean truncated) { }

    /** Failed retrieval carries no fabricated counts or coverage. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Evidence<T>(String state, Window window, String population, Coverage coverage, T data) {
        public static <T> Evidence<T> unavailable(Window window, String population) {
            return new Evidence<>("unavailable", window, population, null, null);
        }
    }

    /** A real matched span, independent of trace-root completeness. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record SpanRow(String traceId, String spanId, String parentSpanId, String serviceName,
                          String serviceNamespace, String environment, String operationName, String spanKind,
                          String status, String startTimeUnixNano, String durationNanos) { }

    /** Server-ordered span page. */
    public record SpanPage(List<SpanRow> content, long totalElements, int pageIndex, int pageSize, String sort) { }

    /** One nonoverlapping time bucket with its exact brush boundary. */
    public record Bucket(long start, long end, boolean endExclusive, long count, long errorCount) { }

    /** Histogram over the declared population and coverage. */
    public record Histogram(long totalCount, long errorCount, long intervalMs, List<Bucket> buckets) { }

    /** A facet or group count; group null is an explicit missing value. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Value(String value, long count, long errorCount) { }

    /** Trace memberships may overlap across values. */
    public record Facets(String field, long totalCount, long missingCount, String membership,
                         List<Value> values, boolean truncated) { }

    /** Ranked counts, without inferring root latency from matching spans. */
    public record Groups(String groupBy, long totalCount, String membership, String orderBy,
                         List<Value> groups, boolean truncated) { }

    /** Already authorized native selection; no raw SQL or untrusted workspace. */
    public record Scope(Window window, String workspaceId, String traceId, boolean errorOnly, String population,
                        String serviceName, String serviceNamespace, String environment, String operationName,
                        Long minDurationNanos, Long maxDurationNanos, String spanScope, boolean hideInternal,
                        Map<String, Set<String>> resources, Map<String, Set<String>> attributes) {
        public Scope {
            if (workspaceId == null || workspaceId.isBlank()) {
                throw new IllegalArgumentException("Trusted workspace required");
            }
            TraceAnalytics.population(population);
            resources = Map.copyOf(resources);
            attributes = Map.copyOf(attributes);
        }
    }

    /** Internal shape options; HTTP controllers choose shape rather than accepting SQL. */
    public record Options(String shape, String field, int limit, int bucketCount, int pageIndex, int pageSize, String sort) {
        public Options {
            if (!List.of("spans", "histogram", "facets", "groups").contains(shape)
                    || limit < 1 || limit > 100 || bucketCount < 1 || bucketCount > 60
                    || pageIndex < 0 || pageSize < 1 || pageSize > 100) {
                throw new IllegalArgumentException("Invalid trace analytics options");
            }
            if ("facets".equals(shape) || "groups".equals(shape)) {
                TraceAnalytics.field(field);
            }
            if ("groups".equals(shape) && !List.of("count-desc", "error-count-desc").contains(sort)
                    || "spans".equals(shape) && !List.of("newest", "oldest", "duration_desc").contains(sort)) {
                throw new IllegalArgumentException("Invalid trace analytics sort");
            }
        }
    }

    public static String population(String population) {
        if (!List.of("matched_spans", "matched_traces").contains(population)) {
            throw new IllegalArgumentException("Invalid trace population");
        }
        return population;
    }

    public static String field(String field) {
        if (!List.of("serviceName", "operationName", "environment").contains(field)) {
            throw new IllegalArgumentException("Invalid trace facet field");
        }
        return field;
    }
}
