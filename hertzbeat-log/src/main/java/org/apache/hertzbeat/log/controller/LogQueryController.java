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

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class LogQueryController {

    private final HistoryDataReader historyDataReader;

    public LogQueryController(HistoryDataReader historyDataReader) {
        this.historyDataReader = historyDataReader;
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
            @Parameter(description = "Page index starting from 0", example = "0")
            @RequestParam(value = "pageIndex", required = false, defaultValue = "0") Integer pageIndex,
            @Parameter(description = "Number of items per page", example = "20")
            @RequestParam(value = "pageSize", required = false, defaultValue = "20") Integer pageSize) {
        Page<LogEntry> result = getPagedLogs(start, end, traceId, spanId, severityNumber, severityText, search, pageIndex, pageSize);
        return ResponseEntity.ok(Message.success(result));
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
            @RequestParam(value = "search", required = false) String search) {
        List<LogEntry> logs = getFilteredLogs(start, end, traceId, spanId, severityNumber, severityText, search);

        Map<String, Object> overview = new HashMap<>();
        overview.put("totalCount", logs.size());

        // Count by severity levels according to OpenTelemetry standard
        // TRACE: 1-4, DEBUG: 5-8, INFO: 9-12, WARN: 13-16, ERROR: 17-20, FATAL: 21-24
        long fatalCount = logs.stream().filter(log -> log.getSeverityNumber() != null && log.getSeverityNumber() >= 21 && log.getSeverityNumber() <= 24).count();
        long errorCount = logs.stream().filter(log -> log.getSeverityNumber() != null && log.getSeverityNumber() >= 17 && log.getSeverityNumber() <= 20).count();
        long warnCount = logs.stream().filter(log -> log.getSeverityNumber() != null && log.getSeverityNumber() >= 13 && log.getSeverityNumber() <= 16).count();
        long infoCount = logs.stream().filter(log -> log.getSeverityNumber() != null && log.getSeverityNumber() >= 9 && log.getSeverityNumber() <= 12).count();
        long debugCount = logs.stream().filter(log -> log.getSeverityNumber() != null && log.getSeverityNumber() >= 5 && log.getSeverityNumber() <= 8).count();
        long traceCount = logs.stream().filter(log -> log.getSeverityNumber() != null && log.getSeverityNumber() >= 1 && log.getSeverityNumber() <= 4).count();

        overview.put("fatalCount", fatalCount);
        overview.put("errorCount", errorCount);
        overview.put("warnCount", warnCount);
        overview.put("infoCount", infoCount);
        overview.put("debugCount", debugCount);
        overview.put("traceCount", traceCount);

        return ResponseEntity.ok(Message.success(overview));
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
            @RequestParam(value = "search", required = false) String search) {
        List<LogEntry> logs = getFilteredLogs(start, end, traceId, spanId, severityNumber, severityText, search);

        Map<String, Object> result = new HashMap<>();

        // Trace coverage statistics
        long withTraceId = logs.stream().filter(log -> log.getTraceId() != null && !log.getTraceId().isEmpty()).count();
        long withSpanId = logs.stream().filter(log -> log.getSpanId() != null && !log.getSpanId().isEmpty()).count();
        long withBothTraceAndSpan = logs.stream().filter(log ->
                log.getTraceId() != null && !log.getTraceId().isEmpty()
                        && log.getSpanId() != null && !log.getSpanId().isEmpty()).count();
        long withoutTrace = logs.size() - withTraceId;

        Map<String, Long> traceCoverage = new HashMap<>();
        traceCoverage.put("withTrace", withTraceId);
        traceCoverage.put("withoutTrace", withoutTrace);
        traceCoverage.put("withSpan", withSpanId);
        traceCoverage.put("withBothTraceAndSpan", withBothTraceAndSpan);

        result.put("traceCoverage", traceCoverage);
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
            @RequestParam(value = "search", required = false) String search) {
        List<LogEntry> logs = getFilteredLogs(start, end, traceId, spanId, severityNumber, severityText, search);

        // Group by hour
        Map<String, Long> hourlyStats = logs.stream()
                .filter(log -> log.getTimeUnixNano() != null)
                .collect(Collectors.groupingBy(
                        log -> {
                            long timestampMs = log.getTimeUnixNano() / 1_000_000L;
                            LocalDateTime dateTime = LocalDateTime.ofInstant(
                                    Instant.ofEpochMilli(timestampMs),
                                    ZoneId.systemDefault());
                            return dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:00"));
                        },
                        Collectors.counting()));

        Map<String, Object> result = new HashMap<>();
        result.put("hourlyStats", hourlyStats);
        return ResponseEntity.ok(Message.success(result));
    }

    private List<LogEntry> getFilteredLogs(Long start, Long end, String traceId, String spanId,
                                           Integer severityNumber, String severityText, String search) {
        // Use the new multi-condition query method
        return historyDataReader.queryLogsByMultipleConditions(start, end, traceId, spanId, severityNumber, severityText, search);
    }

    private Page<LogEntry> getPagedLogs(Long start, Long end, String traceId, String spanId,
                                        Integer severityNumber, String severityText, String search,
                                        Integer pageIndex, Integer pageSize) {
        // Calculate pagination parameters
        int offset = pageIndex * pageSize;

        // Get total count and paginated data
        long totalElements = historyDataReader.countLogsByMultipleConditions(start, end, traceId, spanId, severityNumber, severityText, search);
        List<LogEntry> pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                start, end, traceId, spanId, severityNumber, severityText, search, offset, pageSize);

        // Create PageRequest (sorted by timestamp descending)
        Sort sort = Sort.by(Sort.Direction.DESC, "timeUnixNano");
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sort);

        // Return Spring Data Page object
        return new PageImpl<>(pagedLogs, pageRequest, totalElements);
    }
}