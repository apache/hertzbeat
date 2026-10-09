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
import java.util.List;
import java.util.HashSet;

/** One full-window statistic over an authorized log population. */
public final class LogAnalysis {
    private LogAnalysis() { }

    /** Measure identity; count is represented by an absent measure. */
    public record Measure(String function, String field) {
        public Measure {
            var parsed = LogFacets.Field.parse(field);
            if (!List.of("sum", "avg", "min", "max", "unique", "p50", "p75", "p90", "p95", "p98", "p99").contains(function)
                    || (!"unique".equals(function) && "builtin".equals(parsed.source()))) {
                throw new IllegalArgumentException("Invalid log measure");
            }
        }
    }

    /** One ordered scalar grouping dimension. */
    public record Dimension(String field, int limit) {
        public Dimension {
            LogFacets.Field.parse(field);
            if (limit < 1 || limit > 100) { throw new IllegalArgumentException("Invalid dimension limit"); }
        }
    }

    /** Each prefix ranks within the previously selected parent; the product bounds final leaves. */
    public record Grouping(int version, List<Dimension> dimensions) {
        public Grouping {
            if (version != 1 || dimensions == null || dimensions.isEmpty() || dimensions.size() > 4) {
                throw new IllegalArgumentException("Invalid grouping");
            }
            dimensions = List.copyOf(dimensions);
            var fields = new HashSet<String>();
            int product = 1;
            for (var dimension : dimensions) {
                product = Math.multiplyExact(product, dimension.limit());
                if (product > 100 || !fields.add(dimension.field())) { throw new IllegalArgumentException("Invalid grouping dimensions"); }
            }
        }

        public int limit() { return dimensions.stream().mapToInt(Dimension::limit).reduce(1, Math::multiplyExact); }
    }

    /** Exact scalar identity; labels never stand in for tuple identity. */
    public record GroupKey(String field, String kind, String value) {
        public GroupKey {
            LogFacets.Field.parse(field);
            if (kind == null || !List.of("value", "missing", "null", "non_scalar").contains(kind)
                    || ("value".equals(kind) != (value != null))) { throw new IllegalArgumentException("Invalid group key"); }
        }
    }

    /** Validated analysis controls, retaining the existing count constructor. */
    public record Request(LogFacets.Field field, String view, int limit, String order, long minCount, Measure measure, Grouping grouping,
                          @JsonInclude(JsonInclude.Include.NON_NULL) Long intervalMs,
                          @JsonInclude(JsonInclude.Include.NON_NULL) List<Measure> additionalMeasures,
                          @JsonInclude(JsonInclude.Include.NON_NULL) String transform) {
        public Request(LogFacets.Field field, String view, int limit, String order, long minCount) {
            this(field, view, limit, order, minCount, null, null);
        }

        public Request(LogFacets.Field field, String view, int limit, String order, long minCount, Measure measure) {
            this(field, view, limit, order, minCount, measure, null);
        }

        public Request(LogFacets.Field field, String view, int limit, String order, long minCount, Measure measure, Grouping grouping) {
            this(field, view, limit, order, minCount, measure, grouping, null);
        }

        public Request(LogFacets.Field field, String view, int limit, String order, long minCount, Measure measure, Grouping grouping,
                       Long intervalMs) {
            this(field, view, limit, order, minCount, measure, grouping, intervalMs, null);
        }

        public Request(LogFacets.Field field, String view, int limit, String order, long minCount, Measure measure, Grouping grouping,
                       Long intervalMs, List<Measure> additionalMeasures) {
            this(field, view, limit, order, minCount, measure, grouping, intervalMs, additionalMeasures, null);
        }

        public Request {
            if (transform != null && (!"throughput".equals(transform) || !"timeseries".equals(view))) {
                throw new IllegalArgumentException("Invalid analysis transform");
            }
            if (additionalMeasures != null) {
                additionalMeasures = List.copyOf(additionalMeasures);
                if (!"groups".equals(view) || additionalMeasures.isEmpty() || additionalMeasures.size() > 3
                        || new HashSet<>(additionalMeasures).size() != additionalMeasures.size()
                        || (measure != null && additionalMeasures.contains(measure))) {
                    throw new IllegalArgumentException("Invalid additional measures");
                }
            }
            if (intervalMs != null && (!"timeseries".equals(view) || !LogTrend.EXPLICIT_INTERVALS_MS.contains(intervalMs))) {
                throw new IllegalArgumentException("Invalid explicit log analysis interval");
            }
            if (grouping != null && (field != null || limit != grouping.limit())) {
                throw new IllegalArgumentException("Conflicting grouping controls");
            }
            if (field != null) { field = LogFacets.Field.parse(field.id()); }
            var orders = measure == null ? List.of("count-asc", "count-desc") : List.of("measure-asc", "measure-desc");
            if (!List.of("groups", "timeseries").contains(view) || limit < 1 || limit > 100
                    || !orders.contains(order) || minCount < 1 || minCount > 1_000_000) {
                throw new IllegalArgumentException("Invalid log analysis controls");
            }
        }
    }

    /** Missing samples and non-finite aggregates are not zero. */
    public record Measurement(String state, long sampleCount, @JsonInclude(JsonInclude.Include.ALWAYS) Double value) {
        public Measurement {
            if (sampleCount < 0 || !List.of("ready", "no_samples", "non_finite").contains(state)
                    || ("ready".equals(state) ? value == null || !Double.isFinite(value) : value != null)
                    || ("no_samples".equals(state) && sampleCount != 0)
                    || ("non_finite".equals(state) && sampleCount == 0)) {
                throw new IllegalArgumentException("Invalid log measurement");
            }
        }
    }

    /** One raw time bucket, not an aggregation of group statistics. */
    public record Bucket(long start, long count, @JsonInclude(JsonInclude.Include.NON_NULL) Measurement measurement) {
        public Bucket(long start, long count) { this(start, count, null); }

        public Bucket {
            new LogTrendBucket(start, count);
            if (measurement != null && measurement.sampleCount() > count) {
                throw new IllegalArgumentException("Invalid bucket samples");
            }
        }
    }

    /** One distinct field identity and its full-window count and optional measurement. */
    public record Group(String kind, String value, long count, List<Bucket> buckets,
                        @JsonInclude(JsonInclude.Include.NON_NULL) Measurement measurement,
                        @JsonInclude(JsonInclude.Include.NON_NULL) List<GroupKey> keys,
                        @JsonInclude(JsonInclude.Include.NON_NULL) List<Measurement> additionalMeasurements) {
        public Group(String kind, String value, long count, List<LogTrendBucket> buckets) {
            this(kind, value, count, buckets.stream().map(b -> new Bucket(b.start(), b.count())).toList(), null, null);
        }

        public Group(String kind, String value, long count, List<Bucket> buckets, Measurement measurement) {
            this(kind, value, count, buckets, measurement, null);
        }

        public Group(String kind, String value, long count, List<Bucket> buckets, Measurement measurement, List<GroupKey> keys) {
            this(kind, value, count, buckets, measurement, keys, null);
        }

        public Group {
            additionalMeasurements = copyAdditionalMeasurements(additionalMeasurements, count);
            if (keys != null) {
                keys = List.copyOf(keys);
                if (kind != null || value != null || keys.isEmpty() || keys.size() > 4) {
                    throw new IllegalArgumentException("Invalid tuple group");
                }
            }
            if (keys == null && (!List.of("value", "missing", "null", "non_scalar", "all").contains(kind)
                    || ("value".equals(kind) != (value != null)))) {
                throw new IllegalArgumentException("Invalid log analysis group");
            }
            if (count <= 0 || (measurement != null && measurement.sampleCount() > count)) {
                throw new IllegalArgumentException("Invalid log analysis group");
            }
            buckets = List.copyOf(buckets);
        }
    }

    /** Complete applied request metadata and bounded ranked groups. */
    public record Result(LogFacets.Window window, LogFacets.Field field, String view, int limit, String order,
                         long minCount, long matchingTotal, boolean truncated, Long intervalMs, List<Group> groups,
                         @JsonInclude(JsonInclude.Include.NON_NULL) Measure measure,
                         @JsonInclude(JsonInclude.Include.NON_NULL) Grouping grouping,
                         @JsonInclude(JsonInclude.Include.NON_NULL) List<Measure> additionalMeasures,
                          @JsonInclude(JsonInclude.Include.NON_NULL) String transform) {
        public Result(LogFacets.Window window, LogFacets.Field field, String view, int limit, String order,
                      long minCount, long matchingTotal, boolean truncated, Long intervalMs, List<Group> groups) {
            this(window, field, view, limit, order, minCount, matchingTotal, truncated, intervalMs, groups, null, null);
        }

        public Result(LogFacets.Window window, LogFacets.Field field, String view, int limit, String order,
                      long minCount, long matchingTotal, boolean truncated, Long intervalMs, List<Group> groups, Measure measure) {
            this(window, field, view, limit, order, minCount, matchingTotal, truncated, intervalMs, groups, measure, null);
        }

        public Result(LogFacets.Window window, LogFacets.Field field, String view, int limit, String order,
                      long minCount, long matchingTotal, boolean truncated, Long intervalMs, List<Group> groups,
                      Measure measure, Grouping grouping) {
            this(window, field, view, limit, order, minCount, matchingTotal, truncated, intervalMs, groups, measure, grouping, null);
        }

        public Result(LogFacets.Window window, LogFacets.Field field, String view, int limit, String order,
                      long minCount, long matchingTotal, boolean truncated, Long intervalMs, List<Group> groups,
                      Measure measure, Grouping grouping, List<Measure> additionalMeasures) {
            this(window, field, view, limit, order, minCount, matchingTotal, truncated, intervalMs, groups, measure, grouping, additionalMeasures, null);
        }

        public Result {
            additionalMeasures = new Request(field, view, limit, order, minCount, measure, grouping, null, additionalMeasures, transform).additionalMeasures();
            if (matchingTotal < 0 || groups.size() > limit || ("timeseries".equals(view) != (intervalMs != null))) {
                throw new IllegalArgumentException("Invalid log analysis result");
            }
            groups = List.copyOf(groups);
            if (intervalMs != null) { new LogTrend(window.start(), window.end(), intervalMs, List.of()); }
            long shown = 0;
            var identities = new HashSet<Object>();
            for (var group : groups) {
                validateKeys(group, grouping);
                Object identity = group.keys() == null ? java.util.Arrays.asList(group.kind(), group.value()) : group.keys();
                if (!identities.add(identity)) { throw new IllegalArgumentException("Duplicate analysis group"); }
                shown = Math.addExact(shown, group.count());
                validateMeasurement(measure, group.measurement());
                validateAdditionalMeasurements(additionalMeasures, group.additionalMeasurements());
                if (intervalMs != null) {
                    new LogTrend(window.start(), window.end(), intervalMs, group.buckets().stream()
                            .map(b -> new LogTrendBucket(b.start(), b.count())).toList());
                    validateBuckets(group, measure);
                } else if (!group.buckets().isEmpty()) { throw new IllegalArgumentException("Unexpected analysis buckets"); }
            }
            if (shown > matchingTotal) { throw new IllegalArgumentException("Invalid analysis population"); }
        }
    }

    private static void validateKeys(Group group, Grouping grouping) {
        if ((grouping == null) != (group.keys() == null)) { throw new IllegalArgumentException("Missing or unexpected group keys"); }
        if (grouping != null && !group.keys().stream().map(GroupKey::field).toList()
                .equals(grouping.dimensions().stream().map(Dimension::field).toList())) {
            throw new IllegalArgumentException("Inconsistent grouping key order");
        }
    }

    private static void validateBuckets(Group group, Measure measure) {
        long count = 0;
        long samples = 0;
        for (var bucket : group.buckets()) {
            count = Math.addExact(count, bucket.count());
            validateMeasurement(measure, bucket.measurement());
            if (measure != null) { samples = Math.addExact(samples, bucket.measurement().sampleCount()); }
        }
        if (count != group.count() || (measure != null && samples != group.measurement().sampleCount())) {
            throw new IllegalArgumentException("Incomplete analysis bucket population");
        }
    }

    static List<Measurement> copyAdditionalMeasurements(List<Measurement> values, long count) {
        if (values == null) { return null; }
        var copy = List.copyOf(values);
        if (copy.isEmpty() || copy.size() > 3 || copy.stream().anyMatch(v -> v.sampleCount() > count)) {
            throw new IllegalArgumentException("Invalid additional measurements");
        }
        return copy;
    }

    static void validateAdditionalMeasurements(List<Measure> measures, List<Measurement> values) {
        if ((measures == null) != (values == null) || measures != null && measures.size() != values.size()) {
            throw new IllegalArgumentException("Missing or unexpected additional measurements");
        }
        if (measures != null) {
            for (int i = 0; i < measures.size(); i++) { validateMeasurement(measures.get(i), values.get(i)); }
        }
    }

    static void validateMeasurement(Measure measure, Measurement value) {
        if ((measure == null) != (value == null)) { throw new IllegalArgumentException("Missing or unexpected measurement"); }
        if (measure == null) { return; }
        if ("unique".equals(measure.function())) {
            if (!"ready".equals(value.state()) || value.value() < 0 || value.value() > value.sampleCount()
                    || (value.sampleCount() > 0 && value.value() == 0) || value.value() != Math.rint(value.value())) { throw new IllegalArgumentException("Invalid cardinality"); }
        } else if ((value.sampleCount() == 0) != "no_samples".equals(value.state())) {
            throw new IllegalArgumentException("Invalid numeric sample state");
        }
    }
}
