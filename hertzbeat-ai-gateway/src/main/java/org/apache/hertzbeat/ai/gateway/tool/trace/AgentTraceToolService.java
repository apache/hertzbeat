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

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeTextSanitizer;
import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.common.observability.dto.trace.TraceDetailDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService.TraceDetailQuery;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

/** Bounded trace investigation tools backed by the product trace query service. */
@Service
public class AgentTraceToolService {

    private static final long MAX_RANGE_MILLIS = Duration.ofDays(7).toMillis();
    private static final int MAX_DETAIL_SPANS = 200;

    private final EntityTraceQueryService traceQueryService;

    public AgentTraceToolService(EntityTraceQueryService traceQueryService) {
        this.traceQueryService = traceQueryService;
    }

    @Tool(name = "traces.query", description = "Query traces in a bounded time range using entity and service filters.")
    @AgentToolPolicy
    public Map<String, Object> queryTraces(
            @ToolParam(required = false, description = "Observable entity id.") Long entityId,
            @ToolParam(required = false, description = "Start Unix timestamp in milliseconds.") Long start,
            @ToolParam(required = false, description = "End Unix timestamp in milliseconds.") Long end,
            @ToolParam(required = false, description = "Exact trace id.") String traceId,
            @ToolParam(required = false, description = "Return only traces with errors.") Boolean errorOnly,
            @ToolParam(required = false, description = "OpenTelemetry service name.") String serviceName,
            @ToolParam(required = false, description = "OpenTelemetry service namespace.") String serviceNamespace,
            @ToolParam(required = false, description = "Deployment environment.") String environment,
            @ToolParam(required = false, description = "Root operation name.") String operationName,
            @ToolParam(required = false, description = "Zero-based page index.") Integer pageIndex,
            @ToolParam(required = false, description = "Page size; maximum 50.") Integer pageSize,
            @ToolParam(required = false, description = "Hide internal spans; defaults to true.") Boolean hideInternal) {
        long[] range = range(start, end);
        int resolvedPageIndex = AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, 10_000);
        int resolvedPageSize = AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 50);
        boolean resolvedHideInternal = hideInternal == null || hideInternal;
        Page<TraceListItemDto> page = traceQueryService.queryTraceList(entityId, range[0], range[1], traceId,
                errorOnly, serviceName, serviceNamespace, environment, operationName, null, null,
                resolvedPageIndex, resolvedPageSize, resolvedHideInternal);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", page.getContent().stream().map(this::traceRow).toList());
        result.put("pageIndex", page.getNumber());
        result.put("pageSize", page.getSize());
        result.put("totalElements", page.getTotalElements());
        result.put("totalPages", page.getTotalPages());
        result.put("start", range[0]);
        result.put("end", range[1]);
        return result;
    }

    @Tool(name = "traces.get", description = "Get a bounded trace span tree using exact trace context.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> getTrace(
            @ToolParam(required = false, description = "Observable entity id.") Long entityId,
            @ToolParam(description = "Exact trace id.") String traceId,
            @ToolParam(required = false, description = "Start Unix timestamp in milliseconds.") Long start,
            @ToolParam(required = false, description = "End Unix timestamp in milliseconds.") Long end,
            @ToolParam(required = false, description = "OpenTelemetry service name.") String serviceName,
            @ToolParam(required = false, description = "OpenTelemetry service namespace.") String serviceNamespace,
            @ToolParam(required = false, description = "Deployment environment.") String environment) {
        if (traceId == null || traceId.isBlank()) {
            throw new IllegalArgumentException("traces.get requires traceId");
        }
        validateOptionalRange(start, end);
        TraceDetailDto detail = traceQueryService.getTraceDetail(new TraceDetailQuery(entityId, traceId,
                null, start, end, serviceName, serviceNamespace, environment, null, null, null, null));
        if (detail == null) {
            throw new IllegalArgumentException("Trace not found: " + traceId);
        }
        Map<String, Object> result = traceRow(detail);
        List<TraceSpanNodeDto> spans = detail.getSpans() == null ? List.of() : detail.getSpans();
        result.put("spans", spans.stream().limit(MAX_DETAIL_SPANS).map(this::spanRow).toList());
        result.put("spanCount", spans.size());
        result.put("partial", spans.size() > MAX_DETAIL_SPANS);
        return result;
    }

    private Map<String, Object> traceRow(TraceListItemDto trace) {
        Map<String, Object> row = new LinkedHashMap<>();
        put(row, "traceId", trace.getTraceId());
        put(row, "rootSpanId", trace.getRootSpanId());
        put(row, "serviceName", safe(trace.getServiceName(), 256));
        put(row, "serviceNamespace", safe(trace.getServiceNamespace(), 256));
        put(row, "rootSpanName", safe(trace.getRootSpanName(), 512));
        put(row, "durationNanos", trace.getDurationNanos());
        put(row, "status", trace.getStatus());
        put(row, "startTime", trace.getStartTime());
        row.put("errorSpanCount", trace.getErrorSpanCount());
        row.put("resourceAttributes", redact(trace.getResourceAttributes()));
        return row;
    }

    private Map<String, Object> traceRow(TraceDetailDto trace) {
        TraceListItemDto summary = new TraceListItemDto(trace.getTraceId(), trace.getRootSpanId(),
                trace.getServiceName(), trace.getServiceNamespace(), trace.getRootSpanName(),
                trace.getDurationNanos(), trace.getStatus(), trace.getStartTime(), trace.getErrorSpanCount(),
                trace.getResourceAttributes());
        return traceRow(summary);
    }

    private Map<String, Object> spanRow(TraceSpanNodeDto span) {
        Map<String, Object> row = new LinkedHashMap<>();
        put(row, "traceId", span.getTraceId());
        put(row, "spanId", span.getSpanId());
        put(row, "parentSpanId", span.getParentSpanId());
        put(row, "spanName", safe(span.getSpanName(), 512));
        put(row, "serviceName", safe(span.getServiceName(), 256));
        put(row, "status", span.getStatus());
        put(row, "spanKind", span.getSpanKind());
        put(row, "statusMessage", safe(span.getStatusMessage(), 1024));
        put(row, "durationNanos", span.getDurationNanos());
        put(row, "startTime", span.getStartTime());
        row.put("resourceAttributes", redact(span.getResourceAttributes()));
        row.put("spanAttributes", redact(span.getSpanAttributes()));
        return row;
    }

    private Map<String, Object> redact(Map<String, String> values) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        return GatewaySecretRedactor.redactMap(new LinkedHashMap<>(values));
    }

    private long[] range(Long start, Long end) {
        long resolvedEnd = end == null ? System.currentTimeMillis() : end;
        long resolvedStart = start == null ? resolvedEnd - Duration.ofHours(1).toMillis() : start;
        validateRange(resolvedStart, resolvedEnd);
        return new long[] {resolvedStart, resolvedEnd};
    }

    private void validateOptionalRange(Long start, Long end) {
        if (start != null && end != null) {
            validateRange(start, end);
        }
    }

    private void validateRange(long start, long end) {
        if (start < 0 || end <= start || end - start > MAX_RANGE_MILLIS) {
            throw new IllegalArgumentException("Trace time range must be positive, ordered, and no longer than 7 days");
        }
    }

    private String safe(String value, int maxLength) {
        return value == null ? null : AgentRuntimeTextSanitizer.sanitizeAndLimit(value, maxLength);
    }

    private void put(Map<String, Object> target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }
}
