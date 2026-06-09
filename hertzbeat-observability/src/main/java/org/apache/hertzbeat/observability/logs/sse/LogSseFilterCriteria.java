/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.observability.logs.sse;

import java.util.Map;
import java.util.Set;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.springframework.util.StringUtils;
import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;

/**
 * Log filtering criteria for SSE (Server-Sent Events) log streaming
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Log filtering criteria for SSE (Server-Sent Events) log streaming")
public class LogSseFilterCriteria {

    private static final Set<String> WORKSPACE_RESOURCE_KEYS = Set.of(
            "hertzbeat.workspace_id",
            AuthTokenScopes.CLAIM_WORKSPACE_ID,
            "workspace.id"
    );

    /**
     * Numerical value of the severity.
     * Smaller numerical values correspond to less severe events (such as debug events),
     * larger numerical values correspond to more severe events (such as errors and critical events).
     */
    @Schema(description = "Numerical value of the severity.", example = "1", accessMode = READ_WRITE)
    private Integer severityNumber;

    /**
     * The severity text (also known as log level).
     * This is the original string representation of the severity as it is known at the source.
     */
    @Schema(description = "The severity text (also known as log level).", example = "INFO", accessMode = READ_WRITE)
    private String severityText;

    /**
     * Log content text filtering (case-insensitive contains match).
     */
    @Schema(description = "Log content text filtering", example = "error occurred", accessMode = READ_WRITE)
    private String logContent;

    /**
     * A unique identifier for a trace.
     * All spans from the same trace share the same trace_id.
     * The ID is a 16-byte array represented as a hex string.
     */
    @Schema(description = "A unique identifier for a trace.", example = "1234567890", accessMode = READ_WRITE)
    private String traceId;

    /**
     * A unique identifier for a span within a trace.
     * The ID is an 8-byte array represented as a hex string.
     */
    @Schema(description = "A unique identifier for a span.", example = "1234567890", accessMode = READ_WRITE)
    private String spanId;

    @Schema(description = "OTel service.name resource attribute.", example = "checkout", accessMode = READ_WRITE)
    private String serviceName;

    @Schema(description = "OTel service.namespace resource attribute.", example = "payments", accessMode = READ_WRITE)
    private String serviceNamespace;

    @Schema(description = "OTel deployment.environment.name resource attribute.", example = "prod", accessMode = READ_WRITE)
    private String environment;

    @Schema(description = "HertzBeat entity id resource attribute.", example = "42", accessMode = READ_WRITE)
    private String entityId;

    @Schema(description = "HertzBeat entity type resource attribute.", example = "service", accessMode = READ_WRITE)
    private String entityType;

    /**
     * Workspace boundary captured from the authenticated request.
     */
    @Schema(description = "Server-bound workspace boundary.", accessMode = READ_ONLY)
    private String workspaceId;

    public LogSseFilterCriteria(Integer severityNumber, String severityText, String logContent, String traceId,
                                String spanId) {
        this.severityNumber = severityNumber;
        this.severityText = severityText;
        this.logContent = logContent;
        this.traceId = traceId;
        this.spanId = spanId;
    }

    /**
     * Core filtering logic to determine if a log entry matches the criteria
     * @param log Log entry to be checked
     * @return boolean Whether the log entry matches the filter criteria
     */
    public boolean matches(LogEntry log) {
        if (log == null) return false;
        if (!matchesWorkspace(log)) {
            return false;
        }
        // Check severity text match
        if (StringUtils.hasText(severityText) && !severityText.equalsIgnoreCase(log.getSeverityText())) {
            return false;
        }

        // Check severity number match (if both are present)
        if (severityNumber != null && log.getSeverityNumber() != null
                && !severityNumber.equals(log.getSeverityNumber())) {
            return false;
        }

        // Check log content match
        if (StringUtils.hasText(logContent)) {
            Object body = log.getBody();
            if (body == null) {
                return false;
            }
            String bodyStr = body.toString();
            if (!StringUtils.hasText(bodyStr) || !bodyStr.toLowerCase().contains(logContent.toLowerCase())) {
                return false;
            }
        }

        // Check trace ID match
        if (StringUtils.hasText(traceId) && !traceId.equalsIgnoreCase(log.getTraceId())) {
            return false;
        }

        // Check span ID match
        if (StringUtils.hasText(spanId) && !spanId.equalsIgnoreCase(log.getSpanId())) {
            return false;
        }
        if (!matchesServiceContext(log)) {
            return false;
        }
        return true;
    }

    private boolean matchesServiceContext(LogEntry log) {
        return matchesOptionalValue(resolveValue(log, "service.name", "service_name"), serviceName)
                && matchesOptionalValue(resolveValue(log, "service.namespace", "service_namespace"), serviceNamespace)
                && matchesOptionalValue(resolveValue(log,
                        "deployment.environment.name", "deployment_environment_name", "environment"), environment)
                && matchesOptionalValue(resolveValue(log, "hertzbeat.entity_id", "hertzbeat_entity_id"), entityId)
                && matchesOptionalValue(resolveValue(log, "hertzbeat.entity_type", "hertzbeat_entity_type"), entityType);
    }

    private boolean matchesOptionalValue(String actualValue, String expectedValue) {
        if (!StringUtils.hasText(expectedValue)) {
            return true;
        }
        return StringUtils.hasText(actualValue) && expectedValue.trim().equalsIgnoreCase(actualValue);
    }

    private boolean matchesWorkspace(LogEntry log) {
        if (!StringUtils.hasText(workspaceId)) {
            return true;
        }
        String normalizedWorkspaceId = AuthTokenScopes.normalizeWorkspaceId(workspaceId);
        String logWorkspaceId = resolveWorkspaceId(log.getResource());
        if (!StringUtils.hasText(logWorkspaceId)) {
            return AuthTokenScopes.DEFAULT_WORKSPACE_ID.equals(normalizedWorkspaceId);
        }
        return normalizedWorkspaceId.equals(AuthTokenScopes.normalizeWorkspaceId(logWorkspaceId));
    }

    private String resolveValue(LogEntry log, String... keys) {
        if (log == null || keys == null || keys.length == 0) {
            return null;
        }
        String value = resolveValue(log.getResource(), keys);
        if (!StringUtils.hasText(value)) {
            value = resolveValue(log.getAttributes(), keys);
        }
        return value;
    }

    private String resolveValue(Map<String, Object> source, String... keys) {
        if (source == null || source.isEmpty()) {
            return null;
        }
        for (String key : keys) {
            Object value = source.get(key);
            if (value != null && StringUtils.hasText(String.valueOf(value))) {
                return String.valueOf(value).trim();
            }
        }
        return null;
    }

    private String resolveWorkspaceId(Map<String, Object> resource) {
        if (resource == null || resource.isEmpty()) {
            return null;
        }
        for (String key : WORKSPACE_RESOURCE_KEYS) {
            Object value = resource.get(key);
            if (value != null && StringUtils.hasText(String.valueOf(value))) {
                return String.valueOf(value);
            }
        }
        return null;
    }
}
