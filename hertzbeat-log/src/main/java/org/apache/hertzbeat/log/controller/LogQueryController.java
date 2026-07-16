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

package org.apache.hertzbeat.log.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.dto.observability.LogQueryFilter;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.log.service.SignalWorkloadGuard;
import org.apache.hertzbeat.log.service.SignalWorkloadGuard.Workload;
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
@Slf4j
public class LogQueryController {

    private static final int MAX_PAGE_SIZE = 200;

    private final HistoryDataReader historyDataReader;
    private final SignalWorkloadGuard workloadGuard;

    public LogQueryController(HistoryDataReader historyDataReader, SignalWorkloadGuard workloadGuard) {
        this.historyDataReader = historyDataReader;
        this.workloadGuard = workloadGuard;
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
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "resource", required = false) String resource,
            @Parameter(description = "Page index starting from 0", example = "0")
            @RequestParam(value = "pageIndex", required = false, defaultValue = "0") Integer pageIndex,
            @Parameter(description = "Number of items per page", example = "20")
            @RequestParam(value = "pageSize", required = false, defaultValue = "20") Integer pageSize) {
        return workloadGuard.execute(Workload.LOG_LIST, () -> {
            LogQueryFilter filter = filter(start, end, traceId, spanId, severityNumber, severityText, search,
                    serviceName, serviceNamespace, environment, resource);
            Page<LogEntry> result = getPagedLogs(filter, pageIndex, pageSize);
            return ResponseEntity.ok(Message.success(result));
        });
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
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "resource", required = false) String resource) {
        return workloadGuard.execute(Workload.LOG_AGGREGATE,
                () -> doOverviewStats(filter(start, end, traceId, spanId, severityNumber, severityText, search,
                        serviceName, serviceNamespace, environment, resource)));
    }

    private ResponseEntity<Message<Map<String, Object>>> doOverviewStats(LogQueryFilter filter) {
        return ResponseEntity.ok(Message.success(historyDataReader.queryLogOverviewAggregate(filter)));
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
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "resource", required = false) String resource) {
        return workloadGuard.execute(Workload.LOG_AGGREGATE,
                () -> doTraceCoverageStats(filter(start, end, traceId, spanId, severityNumber, severityText, search,
                        serviceName, serviceNamespace, environment, resource)));
    }

    private ResponseEntity<Message<Map<String, Object>>> doTraceCoverageStats(LogQueryFilter filter) {
        Map<String, Object> result = new HashMap<>();
        result.put("traceCoverage", historyDataReader.queryLogOverviewAggregate(filter).get("traceCoverage"));
        return ResponseEntity.ok(Message.success(result));
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
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "resource", required = false) String resource) {
        return workloadGuard.execute(Workload.LOG_AGGREGATE,
                () -> doTrendStats(filter(start, end, traceId, spanId, severityNumber, severityText, search,
                        serviceName, serviceNamespace, environment, resource)));
    }

    private ResponseEntity<Message<Map<String, Object>>> doTrendStats(LogQueryFilter filter) {
        Map<String, Object> result = new HashMap<>();
        result.put("hourlyStats", historyDataReader.queryLogTrendAggregate(filter));
        return ResponseEntity.ok(Message.success(result));
    }

    private LogQueryFilter filter(Long start, Long end, String traceId, String spanId, Integer severityNumber,
                                  String severityText, String search, String serviceName, String serviceNamespace,
                                  String environment, String resource) {
        return new LogQueryFilter(start, end, traceId, spanId, severityNumber, severityText, search, serviceName,
                serviceNamespace, environment, resource);
    }

    private Page<LogEntry> getPagedLogs(LogQueryFilter filter, Integer pageIndex, Integer pageSize) {
        int effectivePage = Math.max(pageIndex == null ? 0 : pageIndex, 0);
        int effectiveSize = Math.max(1, Math.min(pageSize == null ? 20 : pageSize, MAX_PAGE_SIZE));
        int offset = effectivePage * effectiveSize;

        long totalElements = historyDataReader.countObservabilityLogs(filter);
        List<LogEntry> pagedLogs = historyDataReader.queryObservabilityLogs(filter, offset, effectiveSize);

        Sort sort = Sort.by(Sort.Direction.DESC, "timeUnixNano");
        PageRequest pageRequest = PageRequest.of(effectivePage, effectiveSize, sort);

        return new PageImpl<>(pagedLogs, pageRequest, totalElements);
    }
}
