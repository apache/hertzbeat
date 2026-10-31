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

package org.apache.hertzbeat.ai.gateway.tool.trace;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.hertzbeat.observability.traces.dto.TraceStructureQuery;
import org.springframework.ai.tool.annotation.ToolParam;

/** Typed, bounded inputs to the trace product adapters. Workspace identity is never model supplied. */
public final class AgentTraceToolArguments {

    private AgentTraceToolArguments() {
    }

    /** Filters shared by trace list, overview and analytics, using the product's exact filter syntax. */
    public record Selection(
            @ToolParam(required = false) Long entityId,
            @ToolParam(required = false) String entityType,
            @ToolParam(description = "Start Unix timestamp in milliseconds; analytics allows at most 24 hours.") long start,
            @ToolParam(description = "End Unix timestamp in milliseconds.") long end,
            @ToolParam(required = false) String traceId,
            @ToolParam(required = false) Boolean errorOnly,
            @ToolParam(required = false) String serviceName,
            @ToolParam(required = false) String serviceNamespace,
            @ToolParam(required = false) String environment,
            @ToolParam(required = false) String collectorId,
            @ToolParam(required = false) String instance,
            @ToolParam(required = false) String endpoint,
            @ToolParam(required = false, description = "Exact resource filter; maximum 2048 characters.") String resourceFilter,
            @ToolParam(required = false, description = "Exact span attribute filter; maximum 2048 characters.") String attributeFilter,
            @ToolParam(required = false) String operationName,
            @ToolParam(required = false) Long minDurationMs,
            @ToolParam(required = false) Long maxDurationMs,
            @ToolParam(required = false) SpanScope spanScope,
            @ToolParam(required = false) Boolean hideInternal) {

        public Selection {
            if (start <= 0 || end <= start || end > Long.MAX_VALUE / 1_000_000L
                    || end - start > Duration.ofDays(7).toMillis()
                    || entityId != null && entityId <= 0
                    || minDurationMs != null && minDurationMs < 0
                    || maxDurationMs != null && maxDurationMs < 0
                    || minDurationMs != null && maxDurationMs != null && minDurationMs > maxDurationMs) {
                throw new IllegalArgumentException("Invalid trace selection range or identity");
            }
            if (traceId != null && (!traceId.matches("[0-9a-f]{32}") || traceId.equals("0".repeat(32)))) {
                throw new IllegalArgumentException("Invalid trace identity");
            }
            text(entityType, 128);
            if (entityType != null && !entityType.matches("[A-Za-z0-9_.:-]+")) {
                throw new IllegalArgumentException("Invalid entity type");
            }
            text(serviceName, 512);
            text(serviceNamespace, 512);
            text(environment, 512);
            text(collectorId, 256);
            text(instance, 512);
            text(endpoint, 512);
            text(operationName, 512);
            text(resourceFilter, 2048);
            text(attributeFilter, 2048);
        }

        /** Preserve the controller's allowlisted parameter and scope contracts. */
        Map<String, String> parameters() {
            Map<String, String> values = new LinkedHashMap<>();
            add(values, "entityId", entityId);
            add(values, "entityType", entityType);
            add(values, "start", start);
            add(values, "end", end);
            add(values, "traceId", traceId);
            add(values, "errorOnly", errorOnly);
            add(values, "serviceName", serviceName);
            add(values, "serviceNamespace", serviceNamespace);
            add(values, "environment", environment);
            add(values, "collectorId", collectorId);
            add(values, "instance", instance);
            add(values, "endpoint", endpoint);
            add(values, "resourceFilter", resourceFilter);
            add(values, "attributeFilter", attributeFilter);
            add(values, "operationName", operationName);
            add(values, "minDurationMs", minDurationMs);
            add(values, "maxDurationMs", maxDurationMs);
            add(values, "spanScope", spanScope == null ? null : spanScope.name());
            add(values, "hideInternal", hideInternal);
            return values;
        }

        @JsonAnySetter
        public void rejectUnknown(String name, Object ignored) {
            throw new IllegalArgumentException("Unknown trace selection field");
        }
    }

    /** Two exact named clauses and an observed same-trace relationship. */
    public record StructureSelection(long start, long end, Clause left, Clause right,
                                     TraceStructureQuery.Relation relation,
                                     @ToolParam(required = false) Integer pageIndex,
                                     @ToolParam(required = false) Integer pageSize) {
        public StructureSelection {
            if (left == null || right == null) {
                throw new IllegalArgumentException("Two structural clauses are required");
            }
            pageIndex = integer(pageIndex, 0, 0, 10_000);
            pageSize = integer(pageSize, 20, 1, 50);
            new TraceStructureQuery(start, end, left.nativeClause(), right.nativeClause(), relation, pageIndex, pageSize);
        }

        Map<String, String> parameters() {
            Map<String, String> values = new LinkedHashMap<>();
            add(values, "start", start);
            add(values, "end", end);
            add(values, "aServiceName", left.serviceName());
            add(values, "aOperationName", left.operationName());
            add(values, "aStatus", left.status());
            add(values, "bServiceName", right.serviceName());
            add(values, "bOperationName", right.operationName());
            add(values, "bStatus", right.status());
            add(values, "relation", relation);
            add(values, "pageIndex", pageIndex);
            add(values, "pageSize", pageSize);
            return values;
        }

        @JsonAnySetter
        public void rejectUnknown(String name, Object ignored) {
            throw new IllegalArgumentException("Unknown structural trace field");
        }
    }

    /** Typed structural predicate. */
    public record Clause(@ToolParam(required = false) String serviceName,
                         @ToolParam(required = false) String operationName,
                         @ToolParam(required = false) Status status) {
        public Clause {
            new TraceStructureQuery.Clause(serviceName, operationName, status == null ? null : status.name());
        }

        TraceStructureQuery.Clause nativeClause() {
            return new TraceStructureQuery.Clause(serviceName, operationName, status == null ? null : status.name());
        }

        @JsonAnySetter
        public void rejectUnknown(String name, Object ignored) {
            throw new IllegalArgumentException("Unknown structural clause field");
        }
    }


    /** Status typed projection. */
    public enum Status { ERROR, OK, UNSET }


    /** Span Scope typed projection. */
    public enum SpanScope { all, root, entrypoint, entry }


    /** Population typed projection. */
    public enum Population { matched_spans, matched_traces }


    /** Field typed projection. */
    public enum Field { serviceName, operationName, environment }


    /** Span Sort typed projection. */
    public enum SpanSort { newest, oldest, duration_desc }


    /** Group Order typed projection. */
    public enum GroupOrder {
        COUNT_DESC("count-desc"), ERROR_COUNT_DESC("error-count-desc"), LATENCY_P95_DESC("latency-p95-desc");

        private final String value;

        GroupOrder(String value) {
            this.value = value;
        }

        String value() {
            return value;
        }
    }

    static int integer(Integer value, int fallback, int minimum, int maximum) {
        int resolved = value == null ? fallback : value;
        if (resolved < minimum || resolved > maximum) {
            throw new IllegalArgumentException("Trace option is outside its supported range");
        }
        return resolved;
    }

    static void text(String value, int limit) {
        if (value != null && (value.isBlank() || value.length() > limit
                || value.codePoints().anyMatch(Character::isISOControl))) {
            throw new IllegalArgumentException("Invalid trace filter text");
        }
    }

    private static void add(Map<String, String> values, String name, Object value) {
        if (value != null) {
            values.put(name, value.toString());
        }
    }
}
