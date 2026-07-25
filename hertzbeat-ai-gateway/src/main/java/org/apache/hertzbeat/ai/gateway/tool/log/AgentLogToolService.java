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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeTextSanitizer;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/**
 * Bounded OpenTelemetry log query tools.
 */
@Service
public class AgentLogToolService {

    private static final long MAX_RANGE_MILLIS = Duration.ofDays(7).toMillis();
    private static final Set<String> SEVERITIES = Set.of("TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL");

    private final HistoryDataReader historyDataReader;

    public AgentLogToolService(HistoryDataReader historyDataReader) {
        this.historyDataReader = historyDataReader;
    }

    @Tool(name = "logs.query",
            description = "Query OpenTelemetry logs in a bounded time range with exact trace and severity filters.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> queryLogs(
            @ToolParam(required = false,
                    description = "Start Unix timestamp in milliseconds; defaults to one hour before end.") Long start,
            @ToolParam(required = false,
                    description = "End Unix timestamp in milliseconds; defaults to the current time.") Long end,
            @ToolParam(required = false, description = "Exact OpenTelemetry trace id.") String traceId,
            @ToolParam(required = false, description = "Exact OpenTelemetry span id.") String spanId,
            @ToolParam(required = false, description = "OpenTelemetry severity number from 1 to 24.")
            Integer severityNumber,
            @ToolParam(required = false, description = "Severity text: TRACE, DEBUG, INFO, WARN, ERROR, or FATAL.")
            String severityText,
            @ToolParam(required = false, description = "Log body search text; maximum 256 characters.") String search,
            @ToolParam(required = false, description = "Zero-based page index; maximum 10000.") Integer pageIndex,
            @ToolParam(required = false, description = "Page size; maximum 100.") Integer pageSize) {
        long resolvedEnd = end == null ? System.currentTimeMillis() : end;
        long resolvedStart = start == null ? resolvedEnd - Duration.ofHours(1).toMillis() : start;
        if (resolvedStart < 0 || resolvedEnd <= resolvedStart || resolvedEnd - resolvedStart > MAX_RANGE_MILLIS) {
            throw new IllegalArgumentException("Log time range must be positive, ordered, and no longer than 7 days");
        }
        if (severityNumber != null && (severityNumber < 1 || severityNumber > 24)) {
            throw new IllegalArgumentException("severityNumber must be from 1 to 24");
        }
        String resolvedSeverity = severityText;
        if (severityText != null && !severityText.isBlank()) {
            // OpenTelemetry producers vary severity casing; this boundary uses the canonical filter values.
            resolvedSeverity = severityText.toUpperCase(Locale.ROOT);
            if (!SEVERITIES.contains(resolvedSeverity)) {
                throw new IllegalArgumentException("severityText must be TRACE, DEBUG, INFO, WARN, ERROR, or FATAL");
            }
        }
        if (search != null && search.length() > 256) {
            throw new IllegalArgumentException("search must not exceed 256 characters");
        }
        int resolvedPageIndex = AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, 10_000);
        int resolvedPageSize = AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100);
        int offset = resolvedPageIndex * resolvedPageSize;
        long totalElements = historyDataReader.countLogsByMultipleConditions(resolvedStart, resolvedEnd, traceId,
                spanId, severityNumber, resolvedSeverity, search);
        List<LogEntry> logs = historyDataReader.queryLogsByMultipleConditionsWithPagination(resolvedStart,
                resolvedEnd, traceId, spanId, severityNumber, resolvedSeverity, search, offset, resolvedPageSize);
        long totalPages = totalElements == 0 ? 0 : (totalElements + resolvedPageSize - 1) / resolvedPageSize;
        return Map.of("content", logs.stream().map(this::logRow).toList(),
                "pageIndex", resolvedPageIndex, "pageSize", resolvedPageSize,
                "totalElements", totalElements, "totalPages", totalPages,
                "start", resolvedStart, "end", resolvedEnd);
    }

    private Map<String, Object> logRow(LogEntry log) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("timeUnixNano", log.getTimeUnixNano());
        row.put("observedTimeUnixNano", log.getObservedTimeUnixNano());
        row.put("severityNumber", log.getSeverityNumber());
        row.put("severityText", log.getSeverityText());
        // Log bodies are untrusted telemetry crossing into model context, so redact secrets and bound their size.
        String body = AgentRuntimeTextSanitizer.sanitizeAndLimit(
                log.getBody() instanceof String text ? text : JsonUtil.toJson(log.getBody()), 4096);
        row.put("body", body);
        row.put("traceId", log.getTraceId());
        row.put("spanId", log.getSpanId());
        row.put("traceFlags", log.getTraceFlags());
        // Log attributes are untrusted telemetry crossing into model context, so redact secrets and bound their size.
        String attributes = AgentRuntimeTextSanitizer.sanitizeAndLimit(JsonUtil.toJson(log.getAttributes()), 4096);
        row.put("attributes", attributes);
        // Resource attributes are untrusted telemetry crossing into model context, so redact secrets and bound their size.
        String resource = AgentRuntimeTextSanitizer.sanitizeAndLimit(JsonUtil.toJson(log.getResource()), 2048);
        row.put("resource", resource);
        return row;
    }
}
