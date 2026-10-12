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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;

/** Pinned raw JSON sample admission and one statistic, shared by whole groups and buckets. */
final class GreptimeLogMeasurement {
    private static final String FINITE = " BETWEEN -1.7976931348623157e308 AND 1.7976931348623157e308";

    private GreptimeLogMeasurement() { }

    static String sample(LogAnalysis.Measure measure) {
        var field = LogFacets.Field.parse(measure.field());
        String scalar = GreptimeLogFacets.expression(field);
        if ("unique".equals(measure.function())) { return scalar; }
        return numericSample(field);
    }

    static String numericSample(LogFacets.Field field) {
        String scalar = GreptimeLogFacets.expression(field);
        String column = "resource".equals(field.source()) ? "resource_attributes" : "log_attributes";
        String number = "TRY_CAST(" + scalar + " AS DOUBLE)";
        return "CASE WHEN NOT " + GreptimeStructuredLogPredicate.stringAt(column, field.key())
                + " AND " + number + FINITE + " THEN " + number + " END";
    }

    static String aggregate(LogAnalysis.Measure measure, String column) {
        return aggregate(measure.function(), column);
    }

    static String aggregate(String function, String column) {
        return switch (function) {
            case "avg" -> "AVG(" + column + ")";
            case "sum" -> "SUM(" + column + ")";
            case "min" -> "MIN(" + column + ")";
            case "max" -> "MAX(" + column + ")";
            case "unique" -> "COUNT(DISTINCT " + column + ")";
            case "p50", "p75", "p90", "p95", "p98", "p99" -> percentile(function, column);
            default -> throw new IllegalArgumentException("Invalid measure");
        };
    }

    private static String percentile(String function, String column) {
        double quantile = Integer.parseInt(function.substring(1)) / 100.0;
        // Pinned t-digest can clamp overflow to a finite endpoint. Conservatively reject populations
        // whose magnitude sum or range cannot be represented before exposing an estimate.
        return "CASE WHEN SUM(ABS(" + column + "))" + FINITE
                + " AND (MAX(" + column + ") - MIN(" + column + "))" + FINITE
                + " THEN APPROX_PERCENTILE_CONT(" + quantile + ", 100) WITHIN GROUP (ORDER BY " + column + ") END";
    }

    static String finite(String expression) {
        return "CASE WHEN " + expression + FINITE + " THEN " + expression + " END";
    }

    static LogAnalysis.Measurement read(Map<String, Object> row, String prefix, LogAnalysis.Measure measure) {
        return read(row, prefix, measure != null);
    }

    static LogAnalysis.Measurement read(Map<String, Object> row, String prefix, boolean measured) {
        if (!measured) { return null; }
        if (!row.containsKey(prefix + "samples") || !row.containsKey(prefix + "measurement")) {
            throw new IllegalArgumentException("Missing measurement result");
        }
        long samples = Long.parseLong(String.valueOf(row.get(prefix + "samples")));
        Object raw = row.get(prefix + "measurement");
        Double value = raw == null ? null : Double.valueOf(raw.toString());
        if (value != null && !Double.isFinite(value)) { value = null; }
        String state = value != null ? "ready" : samples == 0 ? "no_samples" : "non_finite";
        return new LogAnalysis.Measurement(state, samples, value);
    }
}
