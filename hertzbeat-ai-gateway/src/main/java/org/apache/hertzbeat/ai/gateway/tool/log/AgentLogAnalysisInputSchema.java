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

package org.apache.hertzbeat.ai.gateway.tool.log;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;

/** Describes the product's JSON-encoded optional grouping and measurement descriptors. */
final class AgentLogAnalysisInputSchema {
    private AgentLogAnalysisInputSchema() { }

    @SuppressWarnings("unchecked")
    static void apply(Map<String, Object> query) {
        Map<String, Object> fields = (Map<String, Object>) query.get("properties");
        field(fields, "field").put("description", "Optional single grouping field: builtin:serviceName, "
                + "builtin:environment, builtin:severityCategory, resource:<key> or attribute:<key>. "
                + "Use this with limit for simple count groups. Omit field and limit when grouping is supplied.");
        field(fields, "field").put("examples", List.of("builtin:serviceName"));
        field(fields, "grouping").put("description", "Optional JSON STRING for multi-field grouping, not a plain field name. "
                + "version must be 1; dimensions contains 1..4 unique qualified field/limit pairs with product <=100. "
                + "Omit top-level field and limit when supplied; for one field prefer field plus limit.");
        field(fields, "grouping").put("maxLength", 2048);
        field(fields, "grouping").put("examples", List.of(
                "{\"version\":1,\"dimensions\":[{\"field\":\"builtin:serviceName\",\"limit\":5}]}"));
        field(fields, "measure").put("description", "Optional JSON STRING, not plain count. Omit for counting logs. "
                + "Count may be encoded as {\"function\":\"count\"}. Numeric functions sum/avg/min/max/p50/p75/p90/p95/p98/p99 "
                + "need a resource:<key> or attribute:<key> field; unique also supports builtin fields.");
        field(fields, "measure").put("maxLength", 512);
        field(fields, "measure").put("examples", List.of("{\"function\":\"count\"}"));
        field(fields, "view").put("enum", List.of("groups", "timeseries"));
        field(fields, "order").put("enum", List.of("count-desc", "count-asc", "measure-desc", "measure-asc"));
        field(fields, "order").put("description", "Use count-desc/count-asc for counts; measure-desc/measure-asc only "
                + "with a non-count measure. Omit to use the matching descending default.");
        field(fields, "additionalMeasures").put("description", "Optional JSON STRING array of 1..3 distinct non-count "
                + "measure objects; groups view only. Omit for simple log counts.");
        field(fields, "additionalMeasures").put("maxLength", 2048);
        field(fields, "intervalMs").put("enum", List.copyOf(LogTrend.EXPLICIT_INTERVALS_MS));
        field(fields, "intervalMs").put("description", "Optional explicit bucket interval; timeseries view only.");
        field(fields, "transform").put("enum", List.of("throughput"));
        field(fields, "transform").put("description", "Optional throughput transform; timeseries view only.");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> field(Map<String, Object> fields, String name) {
        return (Map<String, Object>) fields.get(name);
    }
}
