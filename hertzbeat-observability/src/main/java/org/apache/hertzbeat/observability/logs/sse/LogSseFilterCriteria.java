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

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.observability.shared.query.TelemetryQueryContextScope;
import org.springframework.util.StringUtils;

/**
 * Log filtering criteria for SSE (Server-Sent Events) log streaming.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Log filtering criteria for SSE (Server-Sent Events) log streaming")
public class LogSseFilterCriteria {

    private static final Set<String> WORKSPACE_RESOURCE_KEYS = Set.of(
            "hertzbeat.workspace_id",
            "hertzbeat_workspace_id",
            AuthTokenScopes.CLAIM_WORKSPACE_ID,
            "workspace.id"
    );

    @Schema(description = "Numerical value of the severity.", example = "1", accessMode = READ_WRITE)
    private Integer severityNumber;

    @Schema(description = "The severity text.", example = "INFO", accessMode = READ_WRITE)
    private String severityText;

    @Schema(description = "Log content text filtering", example = "error occurred", accessMode = READ_WRITE)
    private String logContent;

    @Schema(description = "A unique identifier for a trace.", example = "1234567890", accessMode = READ_WRITE)
    private String traceId;

    @Schema(description = "A unique identifier for a span.", example = "1234567890", accessMode = READ_WRITE)
    private String spanId;

    @Schema(description = "OTel service.name resource attribute.", example = "checkout", accessMode = READ_WRITE)
    private String serviceName;

    @Schema(description = "OTel service.namespace resource attribute.", example = "payments", accessMode = READ_WRITE)
    private String serviceNamespace;

    @Schema(description = "OTel deployment.environment.name resource attribute.", example = "prod",
            accessMode = READ_WRITE)
    private String environment;

    @Schema(description = "HertzBeat entity id resource attribute.", example = "42", accessMode = READ_WRITE)
    private String entityId;

    @Schema(description = "HertzBeat entity type resource attribute.", example = "service", accessMode = READ_WRITE)
    private String entityType;

    @Schema(description = "HertzBeat Collector resource identity.", example = "collector-a", accessMode = READ_WRITE)
    private String collectorId;

    @Schema(description = "OTel service.instance.id resource attribute.", example = "checkout-7d9",
            accessMode = READ_WRITE)
    private String instance;

    @Schema(description = "Low-cardinality HTTP route template from the http.route log attribute.",
            example = "/checkout", accessMode = READ_WRITE)
    private String endpoint;

    @Schema(description = "Resource attribute filter expression, for example service.version=1.2.3",
            accessMode = READ_WRITE)
    private String resourceFilter;

    @Schema(description = "Log attribute filter expression, for example http.route:/checkout",
            accessMode = READ_WRITE)
    private String attributeFilter;

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
     * Determine whether a log entry matches every live-stream dimension.
     */
    public boolean matches(LogEntry log) {
        return compile().test(log);
    }

    public void validate() {
        compile();
    }

    Predicate<LogEntry> compile() {
        return new CompiledMatcher(
                severityNumber,
                severityText,
                logContent,
                traceId,
                spanId,
                serviceName,
                serviceNamespace,
                environment,
                entityId,
                entityType,
                collectorId,
                instance,
                endpoint,
                AuthTokenScopes.normalizeWorkspaceId(workspaceId),
                LogSseAttributeFilter.parse(resourceFilter),
                LogSseAttributeFilter.parse(attributeFilter));
    }

    public void normalizeQueryContext() {
        TelemetryQueryContextScope scope = new TelemetryQueryContextScope(instance, endpoint);
        instance = scope.instance();
        endpoint = scope.endpoint();
        resourceFilter = scope.applyResourceFilter(resourceFilter);
        attributeFilter = scope.applyAttributeFilter(attributeFilter);
    }

    private static boolean matchesLogContent(Object body, String expectedContent) {
        if (body == null) {
            return false;
        }
        String bodyText = String.valueOf(body);
        return StringUtils.hasText(bodyText)
                && bodyText.toLowerCase(Locale.ROOT).contains(expectedContent.toLowerCase(Locale.ROOT));
    }

    private static boolean matchesServiceContext(LogEntry log, CompiledMatcher matcher) {
        return matchesOptionalValue(resolveValue(log, "service.name", "service_name"), matcher.serviceName)
                && matchesOptionalValue(resolveValue(log,
                        "service.namespace", "service_namespace"), matcher.serviceNamespace)
                && matchesOptionalValue(resolveValue(log,
                        "deployment.environment.name", "deployment_environment_name", "environment"),
                        matcher.environment)
                && matchesOptionalValue(resolveValue(log,
                        "hertzbeat.entity_id", "hertzbeat_entity_id"), matcher.entityId)
                && matchesOptionalValue(resolveValue(log,
                        "hertzbeat.entity_type", "hertzbeat_entity_type"), matcher.entityType)
                && matchesOptionalValue(resolveValue(log,
                        "hertzbeat.collector.id", "hertzbeat_collector_id"), matcher.collectorId)
                && matchesOptionalValue(resolveValue(log,
                        "service.instance.id", "service_instance_id"), matcher.instance);
    }

    private static boolean matchesOptionalValue(String actualValue, String expectedValue) {
        if (!StringUtils.hasText(expectedValue)) {
            return true;
        }
        return StringUtils.hasText(actualValue) && expectedValue.trim().equalsIgnoreCase(actualValue);
    }

    private static boolean matchesWorkspace(LogEntry log, String normalizedWorkspaceId) {
        String logWorkspaceId = resolveWorkspaceId(log.getResource());
        if (!StringUtils.hasText(logWorkspaceId)) {
            return AuthTokenScopes.DEFAULT_WORKSPACE_ID.equals(normalizedWorkspaceId);
        }
        return normalizedWorkspaceId.equals(AuthTokenScopes.normalizeWorkspaceId(logWorkspaceId));
    }

    private static String resolveValue(LogEntry log, String... keys) {
        if (log == null || keys == null || keys.length == 0) {
            return null;
        }
        String value = resolveValue(log.getResource(), keys);
        return StringUtils.hasText(value) ? value : resolveValue(log.getAttributes(), keys);
    }

    private static String resolveValue(Map<String, Object> source, String... keys) {
        if (source == null || source.isEmpty()) {
            return null;
        }
        for (String key : keys) {
            Object value = source.get(key);
            if (value == null) {
                value = source.get(normalizeKey(key));
            }
            if (value != null && StringUtils.hasText(String.valueOf(value))) {
                return String.valueOf(value).trim();
            }
        }
        return null;
    }

    private static String resolveWorkspaceId(Map<String, Object> resource) {
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

    private static String normalizeKey(String key) {
        return key == null ? null : key.replace(".", "_").replace(" ", "_");
    }

    private record CompiledMatcher(
            Integer severityNumber,
            String severityText,
            String logContent,
            String traceId,
            String spanId,
            String serviceName,
            String serviceNamespace,
            String environment,
            String entityId,
            String entityType,
            String collectorId,
            String instance,
            String endpoint,
            String workspaceId,
            LogSseAttributeFilter resourceAttributes,
            LogSseAttributeFilter logAttributes) implements Predicate<LogEntry> {

        @Override
        public boolean test(LogEntry log) {
            if (log == null || !matchesWorkspace(log, workspaceId)) {
                return false;
            }
            if (StringUtils.hasText(severityText) && !severityText.equalsIgnoreCase(log.getSeverityText())) {
                return false;
            }
            if (severityNumber != null && !severityNumber.equals(log.getSeverityNumber())) {
                return false;
            }
            if (StringUtils.hasText(logContent) && !matchesLogContent(log.getBody(), logContent)) {
                return false;
            }
            if (StringUtils.hasText(traceId) && !traceId.equalsIgnoreCase(log.getTraceId())) {
                return false;
            }
            if (StringUtils.hasText(spanId) && !spanId.equalsIgnoreCase(log.getSpanId())) {
                return false;
            }
            return matchesServiceContext(log, this)
                    && resourceAttributes.matches(log.getResource())
                    && logAttributes.matches(log.getAttributes())
                    && matchesOptionalValue(resolveValue(log.getAttributes(),
                            "http.route", "http_route"), endpoint);
        }
    }
}
