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

package org.apache.hertzbeat.ai.gateway.tool.metrics;

import java.time.Duration;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import org.springframework.ai.tool.annotation.ToolParam;

/** Explicit OTLP metric query contract. Workspace identity is never model supplied. */
public record AgentOtlpMetricQuery(
        @ToolParam(required = false, description = "Product OTLP entityId control.") Long entityId,
        @ToolParam(required = false, description = "Product OTLP entityType control.") String entityType,
        @ToolParam(required = true, description = "Product OTLP start control.") Long start,
        @ToolParam(required = true, description = "Product OTLP end control.") Long end,
        @ToolParam(required = false, description = "Product OTLP serviceName control.") String serviceName,
        @ToolParam(required = false, description = "Product OTLP serviceNamespace control.") String serviceNamespace,
        @ToolParam(required = false, description = "Product OTLP environment control.") String environment,
        @ToolParam(required = false, description = "Product OTLP collectorId control.") String collectorId,
        @ToolParam(required = false, description = "Product OTLP instance control.") String instance,
        @ToolParam(required = false, description = "Product OTLP endpoint control.") String endpoint,
        @ToolParam(required = false, description = "Product OTLP query control.") String query,
        @ToolParam(required = false, description = "Product OTLP filter control.") String filter,
        @ToolParam(required = false, description = "Product OTLP groupBy control.") String groupBy,
        @ToolParam(required = false, description = "Product OTLP aggregation control.") String aggregation,
        @ToolParam(required = false, description = "Product OTLP temporalAggregation control.") String temporalAggregation,
        @ToolParam(required = false, description = "Product OTLP step control.") String step,
        @ToolParam(required = false, description = "Product OTLP limit control.") String limit,
        @ToolParam(required = false, description = "Product OTLP operationName control.") String operationName,
        @ToolParam(required = false, description = "Product OTLP search control.") String search,
        @ToolParam(required = false, description = "Product OTLP label control.") String label) {
    @JsonAnySetter
    public void rejectUnknown(String name, Object value) {
        throw new IllegalArgumentException("Unknown query control");
    }

    public void validate() {
        if (start == null || end == null || start < 0 || end <= start
                || end - start > Duration.ofDays(7).toMillis()) {
            throw new IllegalArgumentException("OTLP metric range must be ordered and at most 7 days");
        }
        if (entityId != null && entityId <= 0) {
            throw new IllegalArgumentException("entityId must be positive");
        }
        if (limit != null && (!limit.matches("[1-9][0-9]{0,2}") || Integer.parseInt(limit) > 100)) {
            throw new IllegalArgumentException("limit must be from 1 to 100");
        }
        text(entityType);
        text(serviceName);
        text(serviceNamespace);
        text(environment);
        text(collectorId);
        text(instance);
        text(endpoint);
        text(query);
        text(filter);
        text(groupBy);
        text(aggregation);
        text(temporalAggregation);
        text(step);
        text(limit);
        text(operationName);
        text(search);
        text(label);
    }

    public void validateOperation(String operation) {
        switch (operation) {
            case "console" -> {
                absent(search, label);
                if (query == null || query.isBlank()) {
                    throw new IllegalArgumentException("Console query is required");
                }
            }
            case "inventory" -> absent(query, filter, groupBy, aggregation, temporalAggregation,
                    step, operationName, label);
            case "labels" -> absent(groupBy, aggregation, temporalAggregation, step, search);
            case "related" -> absent(collectorId, instance, endpoint, query, groupBy, aggregation,
                    temporalAggregation, step, search, label);
            default -> throw new IllegalArgumentException("Unknown metric operation");
        }
    }

    private static void absent(String... values) {
        for (String value : values) {
            if (value != null) {
                throw new IllegalArgumentException("A query control is unsupported for this metric operation");
            }
        }
    }

    private static void text(String value) {
        if (value != null && (value.length() > 4096 || value.codePoints().anyMatch(c -> c < 32 || c == 127))) {
            throw new IllegalArgumentException("Metric parameter is invalid or too long");
        }
    }
}
