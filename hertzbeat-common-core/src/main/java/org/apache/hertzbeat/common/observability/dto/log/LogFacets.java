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

import com.fasterxml.jackson.annotation.JsonInclude;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Query-scoped log facets; bounded discovery never supplies population counts. */
public final class LogFacets {
    public static final int ROW_LIMIT = 1000;
    public static final int FIELD_LIMIT = 200;

    private LogFacets() { }


    /** Validated inclusive query window. */
    public record Window(long start, long end) {
        public Window {
            if (start <= 0 || end <= start || end - start > 86_400_000L) {
                throw new IllegalArgumentException("Invalid facet window");
            }
        }
    }


    /** Allowlisted facet dimension with a literal attribute key. */
    public record Field(String id, String source, String key,
                        @JsonInclude(JsonInclude.Include.NON_NULL) Boolean scalar) {
        public Field(String id, String source, String key) {
            this(id, source, key, null);
        }

        public static Field parse(String id) {
            if (id == null || id.length() > 266 || !id.contains(":")) {
                throw new IllegalArgumentException("Invalid facet field");
            }
            int separator = id.indexOf(':');
            String source = id.substring(0, separator);
            String key = id.substring(separator + 1);
            if ("builtin".equals(source)) {
                if (!List.of("serviceName", "environment", "severityCategory").contains(key)) {
                    throw new IllegalArgumentException("Invalid builtin field");
                }
            } else if (!List.of("resource", "attribute").contains(source)
                    || key.length() > 256 || !key.matches("[A-Za-z0-9_.:-]+")) {
                throw new IllegalArgumentException("Invalid attribute field");
            }
            return new Field(id, source, key);
        }
    }


    /** Canonical authorized history scope. */
    public record Scope(String workspaceId, long start, long end, String traceId, String spanId,
                        Integer severityNumber, String severityText, String search, String serviceName,
                        String serviceNamespace, String environment, Map<String, String> resourceFilters,
                        Map<String, String> attributeFilters, Set<String> excludedServiceNames,
                        boolean requireServiceName, LogSeverityCategory severityCategory, LogNumericRange numericRange) {
        public Scope(String workspaceId, long start, long end, String traceId, String spanId,
                     Integer severityNumber, String severityText, String search, String serviceName,
                     String serviceNamespace, String environment, Map<String, String> resourceFilters,
                     Map<String, String> attributeFilters, Set<String> excludedServiceNames,
                     boolean requireServiceName, LogSeverityCategory severityCategory) {
            this(workspaceId, start, end, traceId, spanId, severityNumber, severityText, search, serviceName,
                    serviceNamespace, environment, resourceFilters, attributeFilters, excludedServiceNames,
                    requireServiceName, severityCategory, null);
        }

        public Scope {
            new Window(start, end);
            if (workspaceId == null || workspaceId.isBlank()) {
                throw new IllegalArgumentException("Trusted workspace required");
            }
            resourceFilters = Map.copyOf(resourceFilters);
            attributeFilters = Map.copyOf(attributeFilters);
            excludedServiceNames = Set.copyOf(excludedServiceNames);
        }

        public Window window() { return new Window(start, end); }
    }


    /** Exact population count for one non-null value. */
    public record Value(String value, long count) { }

    /** Requested full-window population. */
    public record FullCoverage(String mode) { }

    /** Discovery scan coverage, absent on failure. */
    public record BoundedCoverage(String mode, int rowLimit, Integer scannedRows, Boolean hasMore) { }

    /** Literal lookup text; empty input retains the original top-values request. */
    public static String normalizeValueSearch(String query) {
        if (query == null || query.isEmpty()) {
            return null;
        }
        if (query.length() > 256 || !StandardCharsets.UTF_8.newEncoder().canEncode(query)) {
            throw new IllegalArgumentException("Invalid facet value search");
        }
        return query;
    }

    /** Lookup population counts, distinct from the full applied query population. */
    public record Search(String query, Long matchedCount) {
        public Search {
            if (normalizeValueSearch(query) == null || (matchedCount != null && matchedCount < 0)) {
                throw new IllegalArgumentException("Invalid facet search metadata");
            }
        }
    }

    /** Full-window value counts, or unavailable without counts. */
    public record Values(String state, Window window, Field field, FullCoverage coverage,
                         Long matchedCount, Long missingOrNullCount, List<Value> values, boolean truncated,
                         @JsonInclude(JsonInclude.Include.NON_NULL) Search search) {
        public Values(String state, Window window, Field field, FullCoverage coverage,
                      Long matchedCount, Long missingOrNullCount, List<Value> values, boolean truncated) {
            this(state, window, field, coverage, matchedCount, missingOrNullCount, values, truncated, null);
        }

        public Values {
            values = List.copyOf(values);
            if (search != null) {
                if ("ready".equals(state)) {
                    if (matchedCount == null || missingOrNullCount == null || missingOrNullCount < 0
                            || missingOrNullCount > matchedCount || search.matchedCount() == null
                            || search.matchedCount() > matchedCount - missingOrNullCount) {
                        throw new IllegalArgumentException("Invalid facet search counts");
                    }
                    long sum = 0;
                    Set<String> keys = new java.util.HashSet<>();
                    for (Value value : values) {
                        if (value.value() == null || value.count() <= 0 || !keys.add(value.value())) {
                            throw new IllegalArgumentException("Invalid facet search value");
                        }
                        sum = Math.addExact(sum, value.count());
                    }
                    if (sum > search.matchedCount() || (!truncated && sum != search.matchedCount())) {
                        throw new IllegalArgumentException("Incomplete facet search counts");
                    }
                } else if (!"unavailable".equals(state) || matchedCount != null || missingOrNullCount != null
                        || search.matchedCount() != null || !values.isEmpty() || truncated) {
                    throw new IllegalArgumentException("Invalid unavailable facet search");
                }
            }
        }

        public static Values unavailable(Window window, Field field, String valueSearch) {
            String query = normalizeValueSearch(valueSearch);
            return new Values("unavailable", window, field, new FullCoverage("full_window"), null, null, List.of(), false,
                    query == null ? null : new Search(query, null));
        }

        public static Values empty(Window window, Field field, String valueSearch) {
            String query = normalizeValueSearch(valueSearch);
            return new Values("ready", window, field, new FullCoverage("full_window"), 0L, 0L, List.of(), false,
                    query == null ? null : new Search(query, 0L));
        }

        public static Values unavailable(Window window, Field field) {
            return new Values("unavailable", window, field, new FullCoverage("full_window"), null, null, List.of(), false);
        }

        public static Values empty(Window window, Field field) {
            return new Values("ready", window, field, new FullCoverage("full_window"), 0L, 0L, List.of(), false);
        }
    }

    /** Bounded field discovery, not a complete key index. */
    public record Fields(String state, Window window, BoundedCoverage coverage, List<Field> fields, boolean truncated) {
        public static Fields unavailable(Window window) {
            return new Fields("unavailable", window, new BoundedCoverage("bounded_rows", ROW_LIMIT, null, null), List.of(), false);
        }

        public static Fields empty(Window window) {
            return new Fields("ready", window, new BoundedCoverage("bounded_rows", ROW_LIMIT, 0, false), builtins(), false);
        }
    }

    public static List<Field> builtins() {
        return List.of(
                new Field("builtin:serviceName", "builtin", "serviceName", true),
                new Field("builtin:environment", "builtin", "environment", true),
                new Field("builtin:severityCategory", "builtin", "severityCategory", true));
    }
}
