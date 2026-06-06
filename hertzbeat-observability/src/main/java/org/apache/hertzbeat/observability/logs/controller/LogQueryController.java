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

package org.apache.hertzbeat.observability.logs.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Log query and statistics APIs for UI consumption
 */
@RestController
@RequestMapping(path = "/api/logs", produces = "application/json")
@Tag(name = "Log Query Controller")
public class LogQueryController {

    private final LogQueryService logQueryService;

    @Autowired
    public LogQueryController(LogQueryService logQueryService) {
        this.logQueryService = logQueryService;
    }

    @GetMapping("/list")
    @Operation(summary = "Query logs by time range with optional filters",
            description = "Query logs by [start,end] in ms and optional filters with pagination. Returns paginated log entries sorted by timestamp in descending order.")
    public ResponseEntity<Message<Page<LogEntry>>> list(
            @Parameter(description = "Start timestamp in milliseconds (Unix timestamp)", example = "1640995200000")
            @RequestParam(value = "start", required = false) Long start,
            @Parameter(description = "End timestamp in milliseconds (Unix timestamp)", example = "1641081600000")
            @RequestParam(value = "end", required = false) Long end,
            @Parameter(description = "Trace ID for distributed tracing", example = "1234567890abcdef")
            @RequestParam(value = "traceId", required = false) String traceId,
            @Parameter(description = "Span ID for distributed tracing", example = "abcdef1234567890")
            @RequestParam(value = "spanId", required = false) String spanId,
            @Parameter(description = "Log severity number (1-24 according to OpenTelemetry standard)", example = "9")
            @RequestParam(value = "severityNumber", required = false) Integer severityNumber,
            @Parameter(description = "Log severity text (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)", example = "INFO")
            @RequestParam(value = "severityText", required = false) String severityText,
            @Parameter(description = "Log content search keyword", example = "error")
            @RequestParam(value = "search", required = false) String search,
            @Parameter(description = "OTel service.name resource attribute", example = "checkout")
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @Parameter(description = "OTel service.namespace resource attribute", example = "payments")
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @Parameter(description = "OTel deployment.environment.name resource attribute", example = "prod")
            @RequestParam(value = "environment", required = false) String environment,
            @Parameter(description = "Resource attribute filter expression, for example service.version=1.2.3")
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @Parameter(description = "Log attribute filter expression, for example http.route:/checkout")
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @Parameter(description = "Page index starting from 0", example = "0")
            @RequestParam(value = "pageIndex", required = false, defaultValue = "0") Integer pageIndex,
            @Parameter(description = "Number of items per page", example = "20")
            @RequestParam(value = "pageSize", required = false, defaultValue = "20") Integer pageSize,
            @Parameter(description = "Hide internal workspace infrastructure logs such as collector/exporter self logs", example = "true")
            @RequestParam(value = "hideInternal", required = false, defaultValue = "false") boolean hideInternal,
            @Parameter(description = "Hide demo infrastructure noise logs such as kafka/load-generator when focusing on business requests", example = "true")
            @RequestParam(value = "hideNoise", required = false, defaultValue = "false") boolean hideNoise) {
        Page<LogEntry> result = logQueryService.list(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                pageIndex, pageSize, hideInternal, hideNoise);
        return ResponseEntity.ok(Message.success(result));
    }

    @GetMapping("/context")
    @Operation(summary = "Query log context around a selected log",
            description = "Return surrounding logs around a selected log timestamp. The response contains bounded before, selected, and after rows for log-detail context inspection.")
    public ResponseEntity<Message<Map<String, Object>>> context(
            @Parameter(description = "Selected log timestamp in nanoseconds", example = "1734005477630000000")
            @RequestParam(value = "logTimeUnixNano") Long logTimeUnixNano,
            @Parameter(description = "Optional context window start timestamp in milliseconds", example = "1734005177000")
            @RequestParam(value = "start", required = false) Long start,
            @Parameter(description = "Optional context window end timestamp in milliseconds", example = "1734005777000")
            @RequestParam(value = "end", required = false) Long end,
            @Parameter(description = "OTel service.name resource attribute", example = "checkout")
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @Parameter(description = "OTel service.namespace resource attribute", example = "payments")
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @Parameter(description = "OTel deployment.environment.name resource attribute", example = "prod")
            @RequestParam(value = "environment", required = false) String environment,
            @Parameter(description = "Resource attribute filter expression, for example service.version=1.2.3")
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @Parameter(description = "Log attribute filter expression, for example http.route:/checkout")
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @Parameter(description = "Number of logs to return on each side of the selected log", example = "10")
            @RequestParam(value = "limit", required = false, defaultValue = "10") Integer limit,
            @Parameter(description = "Optional directional context page, either before or after")
            @RequestParam(value = "direction", required = false) String direction,
            @Parameter(description = "Optional directional cursor timestamp in nanoseconds")
            @RequestParam(value = "cursorLogTimeUnixNano", required = false) Long cursorLogTimeUnixNano,
            @Parameter(description = "Hide internal workspace infrastructure logs such as collector/exporter self logs", example = "true")
            @RequestParam(value = "hideInternal", required = false, defaultValue = "false") boolean hideInternal,
            @Parameter(description = "Hide demo infrastructure noise logs such as kafka/load-generator when focusing on business requests", example = "true")
            @RequestParam(value = "hideNoise", required = false, defaultValue = "false") boolean hideNoise) {
        return ResponseEntity.ok(Message.success(logQueryService.context(
                logTimeUnixNano, start, end, serviceName, serviceNamespace, environment,
                resourceFilter, attributeFilter, limit, direction, cursorLogTimeUnixNano, hideInternal, hideNoise)));
    }

    @GetMapping("/stats/overview")
    @Operation(summary = "Log overview statistics",
            description = "Overall counts and basic statistics with filters. Provides counts by severity levels according to OpenTelemetry standard.")
    public ResponseEntity<Message<Map<String, Object>>> overviewStats(
            @Parameter(description = "Start timestamp in milliseconds (Unix timestamp)", example = "1640995200000")
            @RequestParam(value = "start", required = false) Long start,
            @Parameter(description = "End timestamp in milliseconds (Unix timestamp)", example = "1641081600000")
            @RequestParam(value = "end", required = false) Long end,
            @Parameter(description = "Trace ID for distributed tracing", example = "1234567890abcdef")
            @RequestParam(value = "traceId", required = false) String traceId,
            @Parameter(description = "Span ID for distributed tracing", example = "abcdef1234567890")
            @RequestParam(value = "spanId", required = false) String spanId,
            @Parameter(description = "Log severity number (1-24 according to OpenTelemetry standard)", example = "9")
            @RequestParam(value = "severityNumber", required = false) Integer severityNumber,
            @Parameter(description = "Log severity text (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)", example = "INFO")
            @RequestParam(value = "severityText", required = false) String severityText,
            @Parameter(description = "Log content search keyword", example = "error")
            @RequestParam(value = "search", required = false) String search,
            @Parameter(description = "OTel service.name resource attribute", example = "checkout")
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @Parameter(description = "OTel service.namespace resource attribute", example = "payments")
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @Parameter(description = "OTel deployment.environment.name resource attribute", example = "prod")
            @RequestParam(value = "environment", required = false) String environment,
            @Parameter(description = "Resource attribute filter expression, for example service.version=1.2.3")
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @Parameter(description = "Log attribute filter expression, for example http.route:/checkout")
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @Parameter(description = "Hide internal workspace infrastructure logs such as collector/exporter self logs", example = "true")
            @RequestParam(value = "hideInternal", required = false, defaultValue = "false") boolean hideInternal,
            @Parameter(description = "Hide demo infrastructure noise logs such as kafka/load-generator when focusing on business requests", example = "true")
            @RequestParam(value = "hideNoise", required = false, defaultValue = "false") boolean hideNoise) {
        return ResponseEntity.ok(Message.success(logQueryService.overviewStats(
                start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                hideInternal, hideNoise)));
    }

    @GetMapping("/stats/trace-coverage")
    @Operation(summary = "Trace coverage statistics",
            description = "Statistics about trace information availability. Shows how many logs have trace IDs, span IDs, or both for distributed tracing analysis.")
    public ResponseEntity<Message<Map<String, Object>>> traceCoverageStats(
            @Parameter(description = "Start timestamp in milliseconds (Unix timestamp)", example = "1640995200000")
            @RequestParam(value = "start", required = false) Long start,
            @Parameter(description = "End timestamp in milliseconds (Unix timestamp)", example = "1641081600000")
            @RequestParam(value = "end", required = false) Long end,
            @Parameter(description = "Trace ID for distributed tracing", example = "1234567890abcdef")
            @RequestParam(value = "traceId", required = false) String traceId,
            @Parameter(description = "Span ID for distributed tracing", example = "abcdef1234567890")
            @RequestParam(value = "spanId", required = false) String spanId,
            @Parameter(description = "Log severity number (1-24 according to OpenTelemetry standard)", example = "9")
            @RequestParam(value = "severityNumber", required = false) Integer severityNumber,
            @Parameter(description = "Log severity text (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)", example = "INFO")
            @RequestParam(value = "severityText", required = false) String severityText,
            @Parameter(description = "Log content search keyword", example = "error")
            @RequestParam(value = "search", required = false) String search,
            @Parameter(description = "OTel service.name resource attribute", example = "checkout")
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @Parameter(description = "OTel service.namespace resource attribute", example = "payments")
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @Parameter(description = "OTel deployment.environment.name resource attribute", example = "prod")
            @RequestParam(value = "environment", required = false) String environment,
            @Parameter(description = "Resource attribute filter expression, for example service.version=1.2.3")
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @Parameter(description = "Log attribute filter expression, for example http.route:/checkout")
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @Parameter(description = "Hide internal workspace infrastructure logs such as collector/exporter self logs", example = "true")
            @RequestParam(value = "hideInternal", required = false, defaultValue = "false") boolean hideInternal,
            @Parameter(description = "Hide demo infrastructure noise logs such as kafka/load-generator when focusing on business requests", example = "true")
            @RequestParam(value = "hideNoise", required = false, defaultValue = "false") boolean hideNoise) {
        return ResponseEntity.ok(Message.success(logQueryService.traceCoverageStats(
                start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                hideInternal, hideNoise)));
    }

    @GetMapping("/stats/trend")
    @Operation(summary = "Log trend over time",
            description = "Count logs by hour intervals with filters. Groups logs by hour and provides time-series data for trend analysis.")
    public ResponseEntity<Message<Map<String, Object>>> trendStats(
            @Parameter(description = "Start timestamp in milliseconds (Unix timestamp)", example = "1640995200000")
            @RequestParam(value = "start", required = false) Long start,
            @Parameter(description = "End timestamp in milliseconds (Unix timestamp)", example = "1641081600000")
            @RequestParam(value = "end", required = false) Long end,
            @Parameter(description = "Trace ID for distributed tracing", example = "1234567890abcdef")
            @RequestParam(value = "traceId", required = false) String traceId,
            @Parameter(description = "Span ID for distributed tracing", example = "abcdef1234567890")
            @RequestParam(value = "spanId", required = false) String spanId,
            @Parameter(description = "Log severity number (1-24 according to OpenTelemetry standard)", example = "9")
            @RequestParam(value = "severityNumber", required = false) Integer severityNumber,
            @Parameter(description = "Log severity text (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)", example = "INFO")
            @RequestParam(value = "severityText", required = false) String severityText,
            @Parameter(description = "Log content search keyword", example = "error")
            @RequestParam(value = "search", required = false) String search,
            @Parameter(description = "OTel service.name resource attribute", example = "checkout")
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @Parameter(description = "OTel service.namespace resource attribute", example = "payments")
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @Parameter(description = "OTel deployment.environment.name resource attribute", example = "prod")
            @RequestParam(value = "environment", required = false) String environment,
            @Parameter(description = "Resource attribute filter expression, for example service.version=1.2.3")
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @Parameter(description = "Log attribute filter expression, for example http.route:/checkout")
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @Parameter(description = "Hide internal workspace infrastructure logs such as collector/exporter self logs", example = "true")
            @RequestParam(value = "hideInternal", required = false, defaultValue = "false") boolean hideInternal,
            @Parameter(description = "Hide demo infrastructure noise logs such as kafka/load-generator when focusing on business requests", example = "true")
            @RequestParam(value = "hideNoise", required = false, defaultValue = "false") boolean hideNoise) {
        return ResponseEntity.ok(Message.success(logQueryService.trendStats(
                start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                hideInternal, hideNoise)));
    }

    @GetMapping("/stats/group-by")
    @Operation(summary = "Log field group statistics",
            description = "Count logs grouped by a resource attribute, log attribute, or supported native log field.")
    public ResponseEntity<Message<Map<String, Object>>> groupByStats(
            @Parameter(description = "Start timestamp in milliseconds (Unix timestamp)", example = "1640995200000")
            @RequestParam(value = "start", required = false) Long start,
            @Parameter(description = "End timestamp in milliseconds (Unix timestamp)", example = "1641081600000")
            @RequestParam(value = "end", required = false) Long end,
            @Parameter(description = "Trace ID for distributed tracing", example = "1234567890abcdef")
            @RequestParam(value = "traceId", required = false) String traceId,
            @Parameter(description = "Span ID for distributed tracing", example = "abcdef1234567890")
            @RequestParam(value = "spanId", required = false) String spanId,
            @Parameter(description = "Log severity number (1-24 according to OpenTelemetry standard)", example = "9")
            @RequestParam(value = "severityNumber", required = false) Integer severityNumber,
            @Parameter(description = "Log severity text (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)", example = "INFO")
            @RequestParam(value = "severityText", required = false) String severityText,
            @Parameter(description = "Log content search keyword", example = "error")
            @RequestParam(value = "search", required = false) String search,
            @Parameter(description = "OTel service.name resource attribute", example = "checkout")
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @Parameter(description = "OTel service.namespace resource attribute", example = "payments")
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @Parameter(description = "OTel deployment.environment.name resource attribute", example = "prod")
            @RequestParam(value = "environment", required = false) String environment,
            @Parameter(description = "Resource attribute filter expression, for example service.version=1.2.3")
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @Parameter(description = "Log attribute filter expression, for example http.route:/checkout")
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @Parameter(description = "Group field, for example service.name, resource:service.version, or attribute:http.route")
            @RequestParam(value = "groupBy") String groupBy,
            @Parameter(description = "Maximum number of grouped rows to return", example = "20")
            @RequestParam(value = "limit", required = false) Integer limit,
            @Parameter(description = "Group result order, supported values: count-desc, count-asc", example = "count-desc")
            @RequestParam(value = "orderBy", required = false) String orderBy,
            @Parameter(description = "Minimum log count a group must have before it is returned", example = "5")
            @RequestParam(value = "minCount", required = false) Integer minCount,
            @Parameter(description = "Hide internal workspace infrastructure logs such as collector/exporter self logs", example = "true")
            @RequestParam(value = "hideInternal", required = false, defaultValue = "false") boolean hideInternal,
            @Parameter(description = "Hide demo infrastructure noise logs such as kafka/load-generator when focusing on business requests", example = "true")
            @RequestParam(value = "hideNoise", required = false, defaultValue = "false") boolean hideNoise) {
        return ResponseEntity.ok(Message.success(logQueryService.groupByStats(
                start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilter, attributeFilter, groupBy,
                limit, orderBy, minCount, hideInternal, hideNoise)));
    }
}
