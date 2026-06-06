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
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
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
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "traceId", required = false) String traceId,
            @RequestParam(value = "errorOnly", required = false) Boolean errorOnly,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @RequestParam(value = "operationName", required = false) String operationName,
            @RequestParam(value = "minDurationMs", required = false) Long minDurationMs,
            @RequestParam(value = "maxDurationMs", required = false) Long maxDurationMs,
            @RequestParam(value = "spanScope", required = false) String spanScope,
            @RequestParam(value = "hideInternal", required = false) Boolean hideInternal,
            @RequestParam(value = "pageIndex", defaultValue = "0") Integer pageIndex,
            @RequestParam(value = "pageSize", defaultValue = "20") Integer pageSize) {
        Page<TraceListItemDto> page = entityTraceQueryService.queryTraceList(
                entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                resourceFilter, operationName, minDurationMs, maxDurationMs, pageIndex, pageSize, hideInternal,
                spanScope);
        return ResponseEntity.ok(Message.success(page));
    }

    @GetMapping("/stats/overview")
    @Operation(summary = "Trace overview statistics")
    public ResponseEntity<Message<TraceOverviewDto>> overview(
            @RequestParam(value = "entityId", required = false) Long entityId,
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "traceId", required = false) String traceId,
            @RequestParam(value = "errorOnly", required = false) Boolean errorOnly,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @RequestParam(value = "operationName", required = false) String operationName,
            @RequestParam(value = "minDurationMs", required = false) Long minDurationMs,
            @RequestParam(value = "maxDurationMs", required = false) Long maxDurationMs,
            @RequestParam(value = "spanScope", required = false) String spanScope,
            @RequestParam(value = "hideInternal", required = false) Boolean hideInternal) {
        return ResponseEntity.ok(Message.success(entityTraceQueryService.getTraceOverview(
                entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                resourceFilter, operationName, minDurationMs, maxDurationMs, hideInternal, spanScope)));
    }

    @GetMapping("/stats/group-by")
    @Operation(summary = "Trace group-by statistics")
    public ResponseEntity<Message<Map<String, Object>>> groupBy(
            @RequestParam(value = "entityId", required = false) Long entityId,
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "traceId", required = false) String traceId,
            @RequestParam(value = "errorOnly", required = false) Boolean errorOnly,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @RequestParam(value = "operationName", required = false) String operationName,
            @RequestParam(value = "minDurationMs", required = false) Long minDurationMs,
            @RequestParam(value = "maxDurationMs", required = false) Long maxDurationMs,
            @RequestParam(value = "groupBy") String groupBy,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "orderBy", required = false) String orderBy,
            @RequestParam(value = "minCount", required = false) Integer minCount,
            @RequestParam(value = "spanScope", required = false) String spanScope,
            @RequestParam(value = "hideInternal", required = false) Boolean hideInternal) {
        return ResponseEntity.ok(Message.success(entityTraceQueryService.getTraceGroupByStats(
                entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                resourceFilter, operationName, minDurationMs, maxDurationMs, groupBy, limit, orderBy, minCount,
                hideInternal, spanScope)));
    }

    @GetMapping("/{traceId}")
    @Operation(summary = "Query single trace detail")
    public ResponseEntity<Message<TraceDetailDto>> detail(@PathVariable("traceId") String traceId,
                                                          @RequestParam(value = "entityId", required = false) Long entityId) {
        return ResponseEntity.ok(Message.success(entityTraceQueryService.getTraceDetail(entityId, traceId)));
    }

    @GetMapping("/{traceId}/spans")
    @Operation(summary = "Query spans by trace id")
    public ResponseEntity<Message<List<TraceSpanNodeDto>>> spans(@PathVariable("traceId") String traceId,
                                                                 @RequestParam(value = "entityId", required = false) Long entityId) {
        return ResponseEntity.ok(Message.success(entityTraceQueryService.getTraceSpans(entityId, traceId)));
    }
}
