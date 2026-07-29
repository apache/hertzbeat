/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.traces.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.dto.trace.TraceDetailDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceOverviewDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.apache.hertzbeat.observability.shared.query.CollectorResourceScope;
import org.apache.hertzbeat.observability.shared.query.TelemetryQueryContextScope;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService.TraceDetailQuery;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Trace query APIs for entity workspace and trace center.
 */
@RestController
@RequestMapping(path = "/api/traces", produces = "application/json")
@Tag(name = "Trace Query Controller")
@RequiredArgsConstructor
public class TraceQueryController {

    private final EntityTraceQueryService entityTraceQueryService;

    @GetMapping("/list")
    @Operation(summary = "Query traces with entity context and canonical resource filters")
    public ResponseEntity<Message<Page<TraceListItemDto>>> list(
            @RequestParam(value = "entityId", required = false) Long entityId,
            @RequestParam(value = "entityType", required = false) String entityType,
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "traceId", required = false) String traceId,
            @RequestParam(value = "errorOnly", required = false) Boolean errorOnly,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "collectorId", required = false) String collectorId,
            @RequestParam(value = "instance", required = false) String instance,
            @RequestParam(value = "endpoint", required = false) String endpoint,
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @RequestParam(value = "operationName", required = false) String operationName,
            @RequestParam(value = "minDurationMs", required = false) Long minDurationMs,
            @RequestParam(value = "maxDurationMs", required = false) Long maxDurationMs,
            @RequestParam(value = "spanScope", required = false) String spanScope,
            @RequestParam(value = "hideInternal", required = false) Boolean hideInternal,
            @RequestParam(value = "pageIndex", defaultValue = "0") Integer pageIndex,
            @RequestParam(value = "pageSize", defaultValue = "20") Integer pageSize) {
        ScopedFilters scopedFilters = scopeFilters(
                entityId, entityType, collectorId, instance, endpoint, resourceFilter, attributeFilter);
        Page<TraceListItemDto> page = entityTraceQueryService.queryTraceList(
                entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                scopedFilters.resourceFilter(), operationName, minDurationMs, maxDurationMs, pageIndex, pageSize,
                hideInternal, spanScope, scopedFilters.attributeFilter());
        return ResponseEntity.ok(Message.success(page));
    }

    @GetMapping("/stats/overview")
    @Operation(summary = "Trace overview statistics")
    public ResponseEntity<Message<TraceOverviewDto>> overview(
            @RequestParam(value = "entityId", required = false) Long entityId,
            @RequestParam(value = "entityType", required = false) String entityType,
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "traceId", required = false) String traceId,
            @RequestParam(value = "errorOnly", required = false) Boolean errorOnly,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "collectorId", required = false) String collectorId,
            @RequestParam(value = "instance", required = false) String instance,
            @RequestParam(value = "endpoint", required = false) String endpoint,
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @RequestParam(value = "operationName", required = false) String operationName,
            @RequestParam(value = "minDurationMs", required = false) Long minDurationMs,
            @RequestParam(value = "maxDurationMs", required = false) Long maxDurationMs,
            @RequestParam(value = "spanScope", required = false) String spanScope,
            @RequestParam(value = "hideInternal", required = false) Boolean hideInternal) {
        ScopedFilters scopedFilters = scopeFilters(
                entityId, entityType, collectorId, instance, endpoint, resourceFilter, attributeFilter);
        return ResponseEntity.ok(Message.success(entityTraceQueryService.getTraceOverview(
                entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                scopedFilters.resourceFilter(), operationName, minDurationMs, maxDurationMs, hideInternal, spanScope,
                scopedFilters.attributeFilter())));
    }

    @GetMapping("/stats/group-by")
    @Operation(summary = "Trace group-by statistics")
    public ResponseEntity<Message<Map<String, Object>>> groupBy(
            @RequestParam(value = "entityId", required = false) Long entityId,
            @RequestParam(value = "entityType", required = false) String entityType,
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "traceId", required = false) String traceId,
            @RequestParam(value = "errorOnly", required = false) Boolean errorOnly,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "collectorId", required = false) String collectorId,
            @RequestParam(value = "instance", required = false) String instance,
            @RequestParam(value = "endpoint", required = false) String endpoint,
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @RequestParam(value = "operationName", required = false) String operationName,
            @RequestParam(value = "minDurationMs", required = false) Long minDurationMs,
            @RequestParam(value = "maxDurationMs", required = false) Long maxDurationMs,
            @RequestParam(value = "groupBy") String groupBy,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "orderBy", required = false) String orderBy,
            @RequestParam(value = "minCount", required = false) Integer minCount,
            @RequestParam(value = "spanScope", required = false) String spanScope,
            @RequestParam(value = "hideInternal", required = false) Boolean hideInternal) {
        ScopedFilters scopedFilters = scopeFilters(
                entityId, entityType, collectorId, instance, endpoint, resourceFilter, attributeFilter);
        return ResponseEntity.ok(Message.success(entityTraceQueryService.getTraceGroupByStats(
                entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                scopedFilters.resourceFilter(), operationName, minDurationMs, maxDurationMs, groupBy, limit, orderBy,
                minCount, hideInternal, spanScope, scopedFilters.attributeFilter())));
    }

    @GetMapping("/{traceId}")
    @Operation(summary = "Query single trace detail")
    public ResponseEntity<Message<TraceDetailDto>> detail(@PathVariable("traceId") String traceId,
                                                          @RequestParam(value = "entityId", required = false) Long entityId,
                                                          @RequestParam(value = "start", required = false) Long start,
                                                          @RequestParam(value = "end", required = false) Long end,
                                                          @RequestParam(value = "spanId", required = false) String spanId,
                                                          @RequestParam(value = "serviceName", required = false)
                                                          String serviceName,
                                                          @RequestParam(value = "serviceNamespace", required = false)
                                                          String serviceNamespace,
                                                          @RequestParam(value = "environment", required = false)
                                                          String environment,
                                                          @RequestParam(value = "collectorId", required = false)
                                                          String collectorId,
                                                          @RequestParam(value = "instance", required = false)
                                                          String instance,
                                                          @RequestParam(value = "endpoint", required = false)
                                                          String endpoint,
                                                          @RequestParam(value = "resourceFilter", required = false)
                                                          String resourceFilter,
                                                          @RequestParam(value = "attributeFilter", required = false)
                                                          String attributeFilter,
                                                          @RequestParam(value = "minDurationMs", required = false)
                                                          Long minDurationMs,
                                                          @RequestParam(value = "maxDurationMs", required = false)
                                                          Long maxDurationMs) {
        TraceDetailQuery query = detailQuery(
                entityId, traceId, spanId, start, end, serviceName, serviceNamespace, environment, collectorId,
                instance, endpoint, resourceFilter, attributeFilter, minDurationMs, maxDurationMs);
        return ResponseEntity.ok(Message.success(entityTraceQueryService.getTraceDetail(query)));
    }

    @GetMapping("/{traceId}/spans")
    @Operation(summary = "Query spans by trace id")
    public ResponseEntity<Message<List<TraceSpanNodeDto>>> spans(@PathVariable("traceId") String traceId,
                                                                 @RequestParam(value = "entityId", required = false)
                                                                 Long entityId,
                                                                 @RequestParam(value = "start", required = false)
                                                                 Long start,
                                                                 @RequestParam(value = "end", required = false)
                                                                 Long end,
                                                                 @RequestParam(value = "spanId", required = false)
                                                                 String spanId,
                                                                 @RequestParam(value = "serviceName", required = false)
                                                                 String serviceName,
                                                                 @RequestParam(value = "serviceNamespace", required = false)
                                                                 String serviceNamespace,
                                                                 @RequestParam(value = "environment", required = false)
                                                                 String environment,
                                                                 @RequestParam(value = "collectorId", required = false)
                                                                 String collectorId,
                                                                 @RequestParam(value = "instance", required = false)
                                                                 String instance,
                                                                 @RequestParam(value = "endpoint", required = false)
                                                                 String endpoint,
                                                                 @RequestParam(value = "resourceFilter", required = false)
                                                                 String resourceFilter,
                                                                 @RequestParam(value = "attributeFilter", required = false)
                                                                 String attributeFilter,
                                                                 @RequestParam(value = "minDurationMs", required = false)
                                                                 Long minDurationMs,
                                                                 @RequestParam(value = "maxDurationMs", required = false)
                                                                 Long maxDurationMs) {
        TraceDetailQuery query = detailQuery(
                entityId, traceId, spanId, start, end, serviceName, serviceNamespace, environment, collectorId,
                instance, endpoint, resourceFilter, attributeFilter, minDurationMs, maxDurationMs);
        TraceDetailDto detail = entityTraceQueryService.getTraceDetail(query);
        return ResponseEntity.ok(Message.success(detail == null ? List.of() : detail.getSpans()));
    }

    private TraceDetailQuery detailQuery(
            Long entityId,
            String traceId,
            String spanId,
            Long start,
            Long end,
            String serviceName,
            String serviceNamespace,
            String environment,
            String collectorId,
            String instance,
            String endpoint,
            String resourceFilter,
            String attributeFilter,
            Long minDurationMs,
            Long maxDurationMs) {
        ScopedFilters scopedFilters = scopeFilters(
                entityId, null, collectorId, instance, endpoint, resourceFilter, attributeFilter);
        return new TraceDetailQuery(
                entityId, traceId, spanId, start, end, serviceName, serviceNamespace, environment,
                scopedFilters.resourceFilter(), scopedFilters.attributeFilter(), minDurationMs, maxDurationMs);
    }

    private String mergeEntityContextResourceFilter(Long entityId, String entityType, String resourceFilter) {
        String normalizedResourceFilter = StringUtils.trimWhitespace(resourceFilter);
        String scopedResourceFilter = normalizedResourceFilter;
        String normalizedEntityType = StringUtils.trimWhitespace(entityType);
        if (!StringUtils.hasText(normalizedEntityType) || !normalizedEntityType.matches("[A-Za-z0-9_.:-]+")) {
            return scopedResourceFilter;
        }
        if (StringUtils.hasText(scopedResourceFilter)
                && scopedResourceFilter.contains(OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_TYPE)) {
            return scopedResourceFilter;
        }
        String entityTypeFilter = OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_TYPE + "=\"" + normalizedEntityType + "\"";
        return StringUtils.hasText(scopedResourceFilter)
                ? scopedResourceFilter + " and " + entityTypeFilter
                : entityTypeFilter;
    }

    private ScopedFilters scopeFilters(Long entityId, String entityType, String collectorId, String instance,
                                       String endpoint, String resourceFilter, String attributeFilter) {
        TelemetryQueryContextScope queryContextScope = new TelemetryQueryContextScope(instance, endpoint);
        String collectorScopedResourceFilter = CollectorResourceScope.apply(
                mergeEntityContextResourceFilter(entityId, entityType, resourceFilter), collectorId);
        return new ScopedFilters(
                queryContextScope.applyResourceFilter(collectorScopedResourceFilter),
                queryContextScope.applyAttributeFilter(attributeFilter));
    }

    private record ScopedFilters(String resourceFilter, String attributeFilter) {
    }
}
