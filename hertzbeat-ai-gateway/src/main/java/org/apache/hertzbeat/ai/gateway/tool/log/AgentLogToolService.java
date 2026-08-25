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
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeTextSanitizer;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Bounded OpenTelemetry log query tools backed by the product workspace query service. */
@Service
public class AgentLogToolService {

    private static final long MAX_RANGE_MILLIS = Duration.ofDays(7).toMillis();
    private static final Set<String> SEVERITIES = Set.of("TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL");

    private final LogQueryService logQueryService;

    @Autowired
    public AgentLogToolService(ObjectProvider<LogQueryService> logQueryService) {
        this(logQueryService.getIfAvailable());
    }

    public AgentLogToolService(LogQueryService logQueryService) {
        this.logQueryService = logQueryService;
    }

    @Tool(name = "logs.query",
            description = "Query one exact workspace-owned OpenTelemetry log page in a bounded time range.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
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
            @ToolParam(required = false, description = "Exact OpenTelemetry service name.") String serviceName,
            @ToolParam(required = false, description = "Exact OpenTelemetry service namespace.")
            String serviceNamespace,
            @ToolParam(required = false, description = "Exact deployment environment.") String environment,
            @ToolParam(required = false, description = "Exact resource attribute filter.") String resourceFilter,
            @ToolParam(required = false, description = "Exact log attribute filter.") String attributeFilter,
            @ToolParam(required = false, description = "Hide internal workspace infrastructure logs.")
            Boolean hideInternal,
            @ToolParam(required = false, description = "Hide known demo infrastructure noise logs.") Boolean hideNoise,
            @ToolParam(required = false, description = "Zero-based page index; maximum 10000.") Integer pageIndex,
            @ToolParam(required = false, description = "Page size; maximum 100.") Integer pageSize) {
        long resolvedEnd = end == null ? System.currentTimeMillis() : end;
        long resolvedStart = start == null ? resolvedEnd - Duration.ofHours(1).toMillis() : start;
        validateRange(resolvedStart, resolvedEnd);
        if (severityNumber != null && (severityNumber < 1 || severityNumber > 24)) {
            throw new IllegalArgumentException("severityNumber must be from 1 to 24");
        }
        String resolvedSeverity = severityText;
        if (StringUtils.hasText(severityText)) {
            resolvedSeverity = severityText.toUpperCase(Locale.ROOT);
            if (!SEVERITIES.contains(resolvedSeverity)) {
                throw new IllegalArgumentException("severityText must be TRACE, DEBUG, INFO, WARN, ERROR, or FATAL");
            }
        }
        validateText(search, 256, "search");
        validateText(serviceName, 512, "serviceName");
        validateText(serviceNamespace, 512, "serviceNamespace");
        validateText(environment, 512, "environment");
        validateText(resourceFilter, 2048, "resourceFilter");
        validateText(attributeFilter, 2048, "attributeFilter");
        int resolvedPageIndex = AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, 10_000);
        int resolvedPageSize = AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100);
        if (logQueryService == null) {
            throw new CommonException("log_query_service_unavailable");
        }
        Page<LogEntry> page = logQueryService.list(workspaceId(), null, resolvedStart, resolvedEnd, traceId, spanId,
                severityNumber, resolvedSeverity, search, serviceName, serviceNamespace, environment,
                resourceFilter, attributeFilter, resolvedPageIndex, resolvedPageSize,
                Boolean.TRUE.equals(hideInternal), Boolean.TRUE.equals(hideNoise));
        return Map.of("content", page.getContent().stream().map(this::logRow).toList(),
                "pageIndex", page.getNumber(), "pageSize", page.getSize(),
                "totalElements", page.getTotalElements(), "totalPages", page.getTotalPages(),
                "start", resolvedStart, "end", resolvedEnd);
    }

    private Map<String, Object> logRow(LogEntry log) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("timeUnixNano", log.getTimeUnixNano());
        row.put("observedTimeUnixNano", log.getObservedTimeUnixNano());
        row.put("severityNumber", log.getSeverityNumber());
        row.put("severityText", log.getSeverityText());
        String body = AgentRuntimeTextSanitizer.sanitizeAndLimit(
                log.getBody() instanceof String text ? text : JsonUtil.toJson(log.getBody()), 4096);
        row.put("body", body);
        row.put("traceId", log.getTraceId());
        row.put("spanId", log.getSpanId());
        row.put("traceFlags", log.getTraceFlags());
        String attributes = AgentRuntimeTextSanitizer.sanitizeAndLimit(JsonUtil.toJson(log.getAttributes()), 4096);
        row.put("attributes", attributes);
        String resource = AgentRuntimeTextSanitizer.sanitizeAndLimit(JsonUtil.toJson(log.getResource()), 2048);
        row.put("resource", resource);
        return row;
    }

    private void validateRange(long start, long end) {
        if (start < 0 || end <= start || end - start > MAX_RANGE_MILLIS) {
            throw new IllegalArgumentException("Log time range must be positive, ordered, and no longer than 7 days");
        }
    }

    private void validateText(String value, int maximumLength, String field) {
        if (value != null && (value.length() > maximumLength
                || value.codePoints().anyMatch(code -> code < 32 || code == 127))) {
            throw new IllegalArgumentException(field + " is invalid");
        }
    }

    private String workspaceId() {
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        if (!StringUtils.hasText(workspaceId)) {
            throw new CommonException("log_workspace_unavailable");
        }
        return AuthTokenScopes.normalizeWorkspaceId(workspaceId);
    }
}
