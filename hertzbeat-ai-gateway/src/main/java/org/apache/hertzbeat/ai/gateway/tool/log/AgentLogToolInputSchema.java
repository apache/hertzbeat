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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.util.JsonUtil;
import tools.jackson.core.type.TypeReference;

/** Publishes each log operation's actual validated query controls, not the shared record union. */
public final class AgentLogToolInputSchema {
    private AgentLogToolInputSchema() { }

    public static String enrich(String tool, String generated) {
        if ("logs.query".equals(tool)) {
            Map<String, Object> schema = JsonUtil.fromJson(generated, new TypeReference<>() { });
            nativeQuery(schema);
            return JsonUtil.toJson(schema);
        }
        String operation = switch (tool) {
            case "logs.list", "logs.live.snapshot" -> "list";
            case "logs.context" -> "context";
            case "logs.analysis" -> "analysis";
            case "logs.facet_fields" -> "facetFields";
            case "logs.facet_values" -> "facetValues";
            case "logs.overview_stats" -> "overviewStats";
            case "logs.trace_coverage_stats" -> "traceCoverageStats";
            case "logs.trend_stats" -> "trendStats";
            case "logs.group_by_stats" -> "groupByStats";
            case "logs.transactions" -> "transactions";
            case "logs.transaction_detail" -> "transactionDetail";
            case "logs.live.validate" -> "live";
            default -> null;
        };
        if (operation == null) {
            return generated;
        }
        Map<String, Object> schema = JsonUtil.fromJson(generated, new TypeReference<>() { });
        project(query(schema), operation);
        return JsonUtil.toJson(schema);
    }

    @SuppressWarnings("unchecked")
    private static void nativeQuery(Map<String, Object> schema) {
        Map<String, Object> fields = (Map<String, Object>) schema.get("properties");
        Map<String, Object> severity = (Map<String, Object>) fields.get("severityText");
        severity.put("enum", List.of("TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"));
        severity.put("description", "Optional standard severity. The aggregate display bucket unknown is not a queryable severity. "
                + "Omit both severityText and severityNumber for an unfiltered query, not a missing-only query. "
                + "Missing-only severity filtering is unsupported here; do not substitute a broad query as proof for that scope.");
        for (String key : List.of("start", "end")) {
            Map<String, Object> epoch = (Map<String, Object>) fields.get(key);
            epoch.put("description", "Unix epoch milliseconds. Use exact server-provided bounds; start < end and window <= 7 days.");
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> query(Map<String, Object> schema) {
        return (Map<String, Object>) ((Map<?, ?>) schema.get("properties")).get("q");
    }

    @SuppressWarnings("unchecked")
    private static void project(Map<String, Object> query, String operation) {
        var allowed = AgentLogQuery.allowedControls(operation);
        Map<String, Object> fields = (Map<String, Object>) query.get("properties");
        fields.keySet().retainAll(allowed);
        ((Map<String, Object>) fields.get("start")).put("minimum", 0);
        ((Map<String, Object>) fields.get("end")).put("minimum", 1);
        for (String field : List.of("start", "end")) {
            ((Map<String, Object>) fields.get(field)).put("maximum", 253_402_300_799_999L);
            ((Map<String, Object>) fields.get(field)).put("description",
                    "Absolute Unix epoch milliseconds. Resolve the user's timezone before conversion; "
                    + "start < end and window <= 7 days. No timezone or local-time string argument.");
        }
        if (fields.containsKey("severityCategory")) {
            var category = (Map<String, Object>) fields.get("severityCategory");
            category.put("enum", List.of("TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"));
            category.put("description", "Canonical OpenTelemetry category; gateway also normalizes known case variants.");
        }
        if (fields.containsKey("severityText")) {
            ((Map<String, Object>) fields.get("severityText")).put("description", "Exact source severity text; case-sensitive.");
        }
        for (String field : List.of("pageSize", "limit", "transactionLimit")) {
            if (fields.containsKey(field)) {
                var bounded = (Map<String, Object>) fields.get(field);
                bounded.put("minimum", 1);
                bounded.put("maximum", 100);
            }
        }
        if (fields.containsKey("severityNumber")) {
            var number = (Map<String, Object>) fields.get("severityNumber");
            number.put("minimum", 1);
            number.put("maximum", 24);
        }
        if (fields.containsKey("minCount")) {
            var count = (Map<String, Object>) fields.get("minCount");
            count.put("minimum", 1);
            count.put("maximum", 1_000_000);
        }
        if (fields.containsKey("searchSyntax")) {
            ((Map<String, Object>) fields.get("searchSyntax")).put("enum", List.of("", "structured-v1"));
        }
        List<String> required = new ArrayList<>(List.of("start", "end"));
        if ("facetValues".equals(operation)) {
            required.add("field");
            Map<String, Object> field = (Map<String, Object>) fields.get("field");
            field.put("description", "Qualified facet id: builtin:serviceName, builtin:environment, "
                    + "builtin:severityCategory, resource:<key> or attribute:<key>.");
            field.put("pattern", "^(builtin:(serviceName|environment|severityCategory)|"
                    + "(resource|attribute):[A-Za-z0-9_.:-]{1,256})$");
        }
        if ("groupByStats".equals(operation)) {
            required.add("groupBy");
            ((Map<String, Object>) fields.get("groupBy")).put("description",
                    "Grouping field such as service.name, severity, resource:service.version or attribute:http.route. "
                    + "Do not use builtin:serviceName here; qualified builtin facet ids belong to logs.analysis field. "
                    + "The display bucket unknown represents missing/blank field values and is not a severity filter token.");
            ((Map<String, Object>) fields.get("orderBy")).put("enum", List.of("count-desc", "count-asc"));
        }
        if ("analysis".equals(operation)) {
            AgentLogAnalysisInputSchema.apply(query);
        }
        query.put("required", required);
        query.put("additionalProperties", false);
    }
}
