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

import java.time.Duration;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.ai.tool.annotation.ToolParam;

/** Bounded log UI query controls; deliberately excludes workspace identity and arbitrary query execution. */
public record AgentLogQuery(
        @ToolParam(required = false, description = "Product log entityId control.") Long entityId,
        @ToolParam(required = false, description = "Product log entityType control.") String entityType,
        @ToolParam(required = true, description = "Product log start control.") Long start,
        @ToolParam(required = true, description = "Product log end control.") Long end,
        @ToolParam(required = false, description = "Product log traceId control.") String traceId,
        @ToolParam(required = false, description = "Product log spanId control.") String spanId,
        @ToolParam(required = false, description = "Product log severityNumber control.") Integer severityNumber,
        @ToolParam(required = false, description = "Product log severityText control.") String severityText,
        @ToolParam(required = false, description = "Product log severityCategory control.") String severityCategory,
        @ToolParam(required = false, description = "Product log search control.") String search,
        @ToolParam(required = false, description = "Product log serviceName control.") String serviceName,
        @ToolParam(required = false, description = "Product log serviceNamespace control.") String serviceNamespace,
        @ToolParam(required = false, description = "Product log environment control.") String environment,
        @ToolParam(required = false, description = "Product log collectorId control.") String collectorId,
        @ToolParam(required = false, description = "Product log instance control.") String instance,
        @ToolParam(required = true, description = "Product log endpoint control.") String endpoint,
        @ToolParam(required = false, description = "Product log resourceFilter control.") String resourceFilter,
        @ToolParam(required = false, description = "Product log attributeFilter control.") String attributeFilter,
        @ToolParam(required = false, description = "Product log pageIndex control.") Integer pageIndex,
        @ToolParam(required = false, description = "Product log pageSize control.") Integer pageSize,
        @ToolParam(required = false, description = "Product log hideInternal control.") Boolean hideInternal,
        @ToolParam(required = false, description = "Product log hideNoise control.") Boolean hideNoise,
        @ToolParam(required = false, description = "Product log sort control.") String sort,
        @ToolParam(required = false, description = "Product log searchSyntax control.") String searchSyntax,
        @ToolParam(required = false, description = "Product log logGroupSelection control.") String logGroupSelection,
        @ToolParam(required = false, description = "Product log logSort control.") String logSort,
        @ToolParam(required = false, description = "Product log logNumericRange control.") String logNumericRange,
        @ToolParam(required = false, description = "Product log logRecordUid control.") String logRecordUid,
        @ToolParam(required = false, description = "Product log groupBy control.") String groupBy,
        @ToolParam(required = false, description = "Product log limit control.") Integer limit,
        @ToolParam(required = false, description = "Product log orderBy control.") String orderBy,
        @ToolParam(required = false, description = "Product log minCount control.") Integer minCount,
        @ToolParam(required = false, description = "Product log view control.") String view,
        @ToolParam(required = false, description = "Product log field control.") String field,
        @ToolParam(required = false, description = "Product log order control.") String order,
        @ToolParam(required = false, description = "Product log measure control.") String measure,
        @ToolParam(required = false, description = "Product log grouping control.") String grouping,
        @ToolParam(required = false, description = "Product log additionalMeasures control.") String additionalMeasures,
        @ToolParam(required = false, description = "Product log transform control.") String transform,
        @ToolParam(required = false, description = "Product log valueSearch control.") String valueSearch,
        @ToolParam(required = false, description = "Product log transactionField control.") String transactionField,
        @ToolParam(required = false, description = "Product log transactionOrder control.") String transactionOrder,
        @ToolParam(required = false, description = "Product log transactionId control.") String transactionId,
        @ToolParam(required = false, description = "Product log localSearchSyntax control.") String localSearchSyntax,
        @ToolParam(required = false, description = "Product log localSearch control.") String localSearch,
        @ToolParam(required = false, description = "Product log transactionVersion control.") Integer transactionVersion,
        @ToolParam(required = false, description = "Product log transactionLimit control.") Integer transactionLimit,
        @ToolParam(required = false, description = "Product log intervalMs control.") Long intervalMs) {
    public Map<String, String> parameters() {
        validate();
        Map<String, String> result = new LinkedHashMap<>();
        if (entityId != null) { result.put("entityId", entityId.toString()); }
        if (entityType != null) { result.put("entityType", entityType.toString()); }
        if (start != null) { result.put("start", start.toString()); }
        if (end != null) { result.put("end", end.toString()); }
        if (traceId != null) { result.put("traceId", traceId.toString()); }
        if (spanId != null) { result.put("spanId", spanId.toString()); }
        if (severityNumber != null) { result.put("severityNumber", severityNumber.toString()); }
        if (severityText != null) { result.put("severityText", severityText.toString()); }
        if (severityCategory != null) { result.put("severityCategory", severityCategory.toString()); }
        if (search != null) { result.put("search", search.toString()); }
        if (serviceName != null) { result.put("serviceName", serviceName.toString()); }
        if (serviceNamespace != null) { result.put("serviceNamespace", serviceNamespace.toString()); }
        if (environment != null) { result.put("environment", environment.toString()); }
        if (collectorId != null) { result.put("collectorId", collectorId.toString()); }
        if (instance != null) { result.put("instance", instance.toString()); }
        if (endpoint != null) { result.put("endpoint", endpoint.toString()); }
        if (resourceFilter != null) { result.put("resourceFilter", resourceFilter.toString()); }
        if (attributeFilter != null) { result.put("attributeFilter", attributeFilter.toString()); }
        if (pageIndex != null) { result.put("pageIndex", pageIndex.toString()); }
        if (pageSize != null) { result.put("pageSize", pageSize.toString()); }
        if (hideInternal != null) { result.put("hideInternal", hideInternal.toString()); }
        if (hideNoise != null) { result.put("hideNoise", hideNoise.toString()); }
        if (sort != null) { result.put("sort", sort.toString()); }
        if (searchSyntax != null) { result.put("searchSyntax", searchSyntax.toString()); }
        if (logGroupSelection != null) { result.put("logGroupSelection", logGroupSelection.toString()); }
        if (logSort != null) { result.put("logSort", logSort.toString()); }
        if (logNumericRange != null) { result.put("logNumericRange", logNumericRange.toString()); }
        if (logRecordUid != null) { result.put("logRecordUid", logRecordUid.toString()); }
        if (groupBy != null) { result.put("groupBy", groupBy.toString()); }
        if (limit != null) { result.put("limit", limit.toString()); }
        if (orderBy != null) { result.put("orderBy", orderBy.toString()); }
        if (minCount != null) { result.put("minCount", minCount.toString()); }
        if (view != null) { result.put("view", view.toString()); }
        if (field != null) { result.put("field", field.toString()); }
        if (order != null) { result.put("order", order.toString()); }
        if (measure != null) { result.put("measure", measure.toString()); }
        if (grouping != null) { result.put("grouping", grouping.toString()); }
        if (additionalMeasures != null) { result.put("additionalMeasures", additionalMeasures.toString()); }
        if (transform != null) { result.put("transform", transform.toString()); }
        if (valueSearch != null) { result.put("valueSearch", valueSearch.toString()); }
        if (transactionField != null) { result.put("transactionField", transactionField.toString()); }
        if (transactionOrder != null) { result.put("transactionOrder", transactionOrder.toString()); }
        if (transactionId != null) { result.put("transactionId", transactionId.toString()); }
        if (localSearchSyntax != null) { result.put("localSearchSyntax", localSearchSyntax.toString()); }
        if (localSearch != null) { result.put("localSearch", localSearch.toString()); }
        if (transactionVersion != null) { result.put("transactionVersion", transactionVersion.toString()); }
        if (transactionLimit != null) { result.put("transactionLimit", transactionLimit.toString()); }
        if (intervalMs != null) { result.put("intervalMs", intervalMs.toString()); }
        return result;
    }

    @JsonAnySetter
    public void rejectUnknown(String name, Object value) {
        throw new IllegalArgumentException("Unknown query control");
    }

    public void validate() {
        if (start == null || end == null || start < 0 || end <= start
                || end - start > Duration.ofDays(7).toMillis()) {
            throw new IllegalArgumentException("Log range must be ordered and at most 7 days");
        }
        if (entityId != null && entityId <= 0) {
            throw new IllegalArgumentException("entityId must be positive");
        }
        bounded(pageIndex, 0, 10000);
        bounded(pageSize, 1, 100);
        bounded(limit, 1, 100);
        bounded(transactionLimit, 1, 100);
        bounded(severityNumber, 1, 24);
        text(entityType);
        text(traceId);
        text(spanId);
        text(severityText);
        text(severityCategory);
        text(search);
        text(serviceName);
        text(serviceNamespace);
        text(environment);
        text(collectorId);
        text(instance);
        text(endpoint);
        text(resourceFilter);
        text(attributeFilter);
        text(sort);
        text(searchSyntax);
        text(logGroupSelection);
        text(logSort);
        text(logNumericRange);
        text(logRecordUid);
        text(groupBy);
        text(orderBy);
        text(view);
        text(field);
        text(order);
        text(measure);
        text(grouping);
        text(additionalMeasures);
        text(transform);
        text(valueSearch);
        text(transactionField);
        text(transactionOrder);
        text(transactionId);
        text(localSearchSyntax);
        text(localSearch);
    }

    public void validateOperation(String operation) {
        Map<String, String> supplied = parameters();
        java.util.Set<String> allowed = new java.util.HashSet<>(java.util.Set.of(
                "entityId", "entityType", "start", "end", "traceId", "spanId", "severityNumber", "severityText",
                "severityCategory", "search", "serviceName", "serviceNamespace", "environment", "collectorId",
                "instance", "endpoint", "resourceFilter", "attributeFilter", "hideInternal", "hideNoise",
                "searchSyntax", "logGroupSelection", "logNumericRange"));
        switch (operation) {
            case "list" -> allowed.addAll(java.util.Set.of("pageIndex", "pageSize", "sort", "logSort"));
            case "context" -> {
                allowed.clear();
                allowed.addAll(java.util.Set.of("start", "end", "logRecordUid", "logGroupSelection", "logNumericRange"));
            }
            case "analysis" -> allowed.addAll(java.util.Set.of("view", "field", "limit", "order", "minCount",
                    "measure", "grouping", "intervalMs", "additionalMeasures", "transform"));
            case "facetFields", "overviewStats", "traceCoverageStats", "trendStats" -> { }
            case "facetValues" -> allowed.addAll(java.util.Set.of("field", "limit", "valueSearch"));
            case "groupByStats" -> allowed.addAll(java.util.Set.of("groupBy", "limit", "orderBy", "minCount"));
            case "transactions" -> allowed.addAll(java.util.Set.of("transactionVersion", "transactionField",
                    "transactionLimit", "transactionOrder"));
            case "transactionDetail" -> allowed.addAll(java.util.Set.of("transactionVersion", "transactionField",
                    "transactionLimit", "transactionOrder", "transactionId", "localSearchSyntax", "localSearch",
                    "pageIndex", "pageSize", "sort"));
            case "live" -> allowed.add("logSort");
            default -> throw new IllegalArgumentException("Unknown log operation");
        }
        if (!allowed.containsAll(supplied.keySet())) {
            throw new IllegalArgumentException("A query control is unsupported for this log operation");
        }
    }

    private static void bounded(Integer value, int min, int max) {
        if (value != null && (value < min || value > max)) {
            throw new IllegalArgumentException("Log numeric control is out of range");
        }
    }

    private static void text(String value) {
        if (value != null && (value.length() > 8192 || value.codePoints().anyMatch(c -> c < 32 || c == 127))) {
            throw new IllegalArgumentException("Log control is invalid or too long");
        }
    }
}
