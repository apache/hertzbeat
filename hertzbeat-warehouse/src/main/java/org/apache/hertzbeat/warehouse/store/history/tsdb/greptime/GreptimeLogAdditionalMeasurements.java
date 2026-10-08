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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;

/** Additional columns share sample admission and aggregation with the primary measure. */
final class GreptimeLogAdditionalMeasurements {
    private GreptimeLogAdditionalMeasurements() { }

    static String projections(List<LogAnalysis.Measure> measures) {
        StringBuilder sql = new StringBuilder();
        if (measures != null) {
            for (int i = 0; i < measures.size(); i++) {
                sql.append(", ").append(GreptimeLogMeasurement.sample(measures.get(i))).append(" AS extra").append(i);
            }
        }
        return sql.toString();
    }

    static String aggregates(List<LogAnalysis.Measure> measures) {
        StringBuilder sql = new StringBuilder();
        if (measures != null) {
            for (int i = 0; i < measures.size(); i++) {
                sql.append(", COUNT(f.extra").append(i).append(") AS extra").append(i).append("_samples, ")
                        .append(GreptimeLogMeasurement.finite(GreptimeLogMeasurement.aggregate(measures.get(i), "f.extra" + i)))
                        .append(" AS extra").append(i).append("_measurement");
            }
        }
        return sql.toString();
    }

    static String columns(List<LogAnalysis.Measure> measures, String source, String target, boolean optional) {
        StringBuilder sql = new StringBuilder();
        if (measures != null) {
            for (int i = 0; i < measures.size(); i++) {
                String name = "extra" + i;
                String samples = source + "." + name + "_samples";
                String value = source + "." + name + "_measurement";
                if (optional) {
                    samples = "COALESCE(" + samples + ", 0)";
                    value = "CASE WHEN " + source + ".count IS NULL THEN "
                            + ("unique".equals(measures.get(i).function()) ? "0" : "NULL") + " ELSE " + value + " END";
                }
                sql.append(", ").append(samples).append(" AS ").append(target).append(name).append("_samples, ")
                        .append(value).append(" AS ").append(target).append(name).append("_measurement");
            }
        }
        return sql.toString();
    }

    static List<LogAnalysis.Measurement> read(Map<String, Object> row, String prefix, List<LogAnalysis.Measure> measures) {
        if (measures == null) { return null; }
        var values = new ArrayList<LogAnalysis.Measurement>();
        for (int i = 0; i < measures.size(); i++) {
            values.add(GreptimeLogMeasurement.read(row, prefix + "extra" + i + "_", measures.get(i)));
        }
        return values;
    }
}
