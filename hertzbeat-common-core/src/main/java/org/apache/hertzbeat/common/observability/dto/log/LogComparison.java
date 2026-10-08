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
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.common.observability.query.ArithmeticFormulaValidator;

/** Paired complete populations over the ordered group domain selected by source a. */
public final class LogComparison {
    private LogComparison() { }

    /** Source predicate; a legacy literal is never reinterpreted as structured syntax. */
    public record Source(LogFacets.Scope scope, LogSearchExpression expression, LogGroupSelection selection) {
        public Source {
            Objects.requireNonNull(scope);
            Objects.requireNonNull(expression);
            if (scope.search() != null && (scope.search().length() > 512
                    || !(expression instanceof LogSearchExpression.And and && and.children().isEmpty()))) {
                throw new IllegalArgumentException("Invalid comparison legacy search");
            }
        }
    }

    /** Both sources must retain the same trusted context and exact tuple selection. */
    public static void validateSources(Source a, Source b) {
        if (!withoutSearch(a.scope()).equals(withoutSearch(b.scope())) || !Objects.equals(a.selection(), b.selection())) {
            throw new IllegalArgumentException("Comparison sources have different scopes");
        }
    }

    /** Fixed elapsed offsets only; calendar shifts require a different contract. */
    public static void validateTimeShift(long timeShiftMs) {
        if (timeShiftMs != 3_600_000L && timeShiftMs != 86_400_000L && timeShiftMs != 604_800_000L) {
            throw new IllegalArgumentException("Invalid comparison time shift");
        }
    }

    public static LogFacets.Window shiftedWindow(LogFacets.Window window, long timeShiftMs) {
        validateTimeShift(timeShiftMs);
        return new LogFacets.Window(Math.subtractExact(window.start(), timeShiftMs), Math.subtractExact(window.end(), timeShiftMs));
    }

    /** Only the explicitly derived b time endpoints may differ from ordinary trusted scope. */
    public static void validateShiftedSources(Source a, Source b, long timeShiftMs) {
        var window = shiftedWindow(a.scope().window(), timeShiftMs);
        var scope = a.scope();
        var shifted = new LogFacets.Scope(scope.workspaceId(), window.start(), window.end(), scope.traceId(), scope.spanId(),
                scope.severityNumber(), scope.severityText(), scope.search(), scope.serviceName(), scope.serviceNamespace(), scope.environment(),
                scope.resourceFilters(), scope.attributeFilters(), scope.excludedServiceNames(), scope.requireServiceName(), scope.severityCategory(), scope.numericRange());
        validateSources(new Source(shifted, a.expression(), a.selection()), b);
    }

    private static LogFacets.Scope withoutSearch(LogFacets.Scope s) {
        return new LogFacets.Scope(s.workspaceId(), s.start(), s.end(), s.traceId(), s.spanId(), s.severityNumber(),
                s.severityText(), null, s.serviceName(), s.serviceNamespace(), s.environment(), s.resourceFilters(),
                s.attributeFilters(), s.excludedServiceNames(), s.requireServiceName(), s.severityCategory(), s.numericRange());
    }

    /** A successful source cell; zero logs is distinct from zero admitted numeric samples. */
    public record Cell(long count, @JsonInclude(JsonInclude.Include.NON_NULL) LogAnalysis.Measurement measurement,
                       @JsonInclude(JsonInclude.Include.NON_NULL) List<LogAnalysis.Measurement> additionalMeasurements) {
        public Cell(long count, LogAnalysis.Measurement measurement) { this(count, measurement, null); }

        public Cell {
            additionalMeasurements = LogAnalysis.copyAdditionalMeasurements(additionalMeasurements, count);
            if (count < 0 || (measurement != null && measurement.sampleCount() > count)) {
                throw new IllegalArgumentException("Invalid comparison cell");
            }
        }
    }

    /** Both cells describe the same aligned bucket. */
    public record Bucket(long start, Cell a, Cell b) {
        public Bucket {
            Objects.requireNonNull(a);
            Objects.requireNonNull(b);
        }
    }

    /** Empty keys represent the selected global group, never an invented empty population. */
    public record Group(List<LogAnalysis.GroupKey> keys, Cell a, Cell b, List<Bucket> buckets) {
        public Group {
            keys = List.copyOf(keys);
            buckets = List.copyOf(buckets);
            Objects.requireNonNull(a);
            Objects.requireNonNull(b);
            if (keys.size() > 4 || a.count() <= 0) { throw new IllegalArgumentException("Invalid comparison group"); }
        }
    }

    /** Strict complete result, including the applied shared analysis contract. */
    public record Result(LogFacets.Window window, LogAnalysis.Request analysis, long matchingA, long matchingB,
                         boolean truncated, Long intervalMs, List<Group> groups,
                         @JsonInclude(JsonInclude.Include.NON_NULL) String formula,
                         @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("bTimeShiftMs") Long timeShiftMs,
                         @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("bWindow") LogFacets.Window shiftedWindow) {
        public Result(LogFacets.Window window, LogAnalysis.Request analysis, long matchingA, long matchingB,
                      boolean truncated, Long intervalMs, List<Group> groups, String formula) {
            this(window, analysis, matchingA, matchingB, truncated, intervalMs, groups, formula, null, null);
        }

        public Result {
            if ((timeShiftMs == null) != (shiftedWindow == null)
                    || timeShiftMs != null && !LogComparison.shiftedWindow(window, timeShiftMs).equals(shiftedWindow)) {
                throw new IllegalArgumentException("Invalid shifted comparison metadata");
            }
            Objects.requireNonNull(window);
            Objects.requireNonNull(analysis);
            groups = List.copyOf(groups);
            if (matchingA < 0 || matchingB < 0 || groups.size() > analysis.limit()
                    || (analysis.intervalMs() != null && !analysis.intervalMs().equals(intervalMs))
                    || ("timeseries".equals(analysis.view()) != (intervalMs != null))) {
                throw new IllegalArgumentException("Invalid comparison result");
            }
            if (formula != null) { ArithmeticFormulaValidator.validate(formula, Set.of("a", "b")); }
            if (intervalMs != null) {
                new LogTrend(window.start(), window.end(), intervalMs, List.of());
                if (Math.floorDiv(window.end(), intervalMs) - Math.floorDiv(window.start(), intervalMs) + 1 > LogTrend.MAX_BUCKETS) {
                    throw new IllegalArgumentException("Unbounded comparison grid");
                }
            }
            var fields = analysis.grouping() != null ? analysis.grouping().dimensions().stream().map(LogAnalysis.Dimension::field).toList()
                    : analysis.field() == null ? List.<String>of() : List.of(analysis.field().id());
            var identities = new HashSet<List<LogAnalysis.GroupKey>>();
            long totalA = 0;
            long totalB = 0;
            for (var group : groups) {
                if (group.a().count() < analysis.minCount()
                        || !group.keys().stream().map(LogAnalysis.GroupKey::field).toList().equals(fields) || !identities.add(group.keys())) {
                    throw new IllegalArgumentException("Invalid comparison tuple");
                }
                validateCell(group.a(), analysis.measure());
                validateCell(group.b(), analysis.measure());
                LogAnalysis.validateAdditionalMeasurements(analysis.additionalMeasures(), group.a().additionalMeasurements());
                LogAnalysis.validateAdditionalMeasurements(analysis.additionalMeasures(), group.b().additionalMeasurements());
                totalA = Math.addExact(totalA, group.a().count());
                totalB = Math.addExact(totalB, group.b().count());
                if (intervalMs != null) {
                    new LogTrend(window.start(), window.end(), intervalMs, group.buckets().stream()
                            .map(bucket -> new LogTrendBucket(bucket.start(), bucket.a().count())).toList());
                    validateBuckets(group, analysis.measure());
                } else if (!group.buckets().isEmpty()) { throw new IllegalArgumentException("Unexpected comparison buckets"); }
            }
            if (totalA > matchingA || totalB > matchingB
                    || (fields.isEmpty() && !groups.isEmpty() && (totalA != matchingA || totalB != matchingB))) {
                throw new IllegalArgumentException("Invalid comparison totals");
            }
        }
    }

    private static void validateCell(Cell cell, LogAnalysis.Measure measure) {
        LogAnalysis.validateMeasurement(measure, cell.measurement());
    }

    private static void validateBuckets(Group group, LogAnalysis.Measure measure) {
        long countA = 0;
        long countB = 0;
        long samplesA = 0;
        long samplesB = 0;
        for (var bucket : group.buckets()) {
            LogAnalysis.validateAdditionalMeasurements(null, bucket.a().additionalMeasurements());
            LogAnalysis.validateAdditionalMeasurements(null, bucket.b().additionalMeasurements());
            validateCell(bucket.a(), measure);
            validateCell(bucket.b(), measure);
            countA = Math.addExact(countA, bucket.a().count());
            countB = Math.addExact(countB, bucket.b().count());
            if (measure != null) {
                samplesA = Math.addExact(samplesA, bucket.a().measurement().sampleCount());
                samplesB = Math.addExact(samplesB, bucket.b().measurement().sampleCount());
            }
        }
        if (countA != group.a().count() || countB != group.b().count() || (measure != null
                && (samplesA != group.a().measurement().sampleCount() || samplesB != group.b().measurement().sampleCount()))) {
            throw new IllegalArgumentException("Incomplete comparison buckets");
        }
    }
}
