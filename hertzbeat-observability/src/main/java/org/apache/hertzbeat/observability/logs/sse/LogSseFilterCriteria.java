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

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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

    private static final String LOG_FILTER_NEGATION_PREFIX = "!";
    private static final String LOG_FILTER_IN_PREFIX = "__in__:";
    private static final String LOG_FILTER_NOT_IN_PREFIX = "__not_in__:";
    private static final String LOG_FILTER_CONTAINS_PREFIX = "__contains__:";
    private static final String LOG_FILTER_NOT_CONTAINS_PREFIX = "__not_contains__:";
    private static final String LOG_FILTER_EXISTS_PREFIX = "__exists__";
    private static final String LOG_FILTER_NOT_EXISTS_PREFIX = "__not_exists__";
    private static final String LOG_FILTER_VALUE_DELIMITER = "\u001F";
    private static final Pattern LOG_FILTER_LIST_OPERATOR_PATTERN = Pattern.compile(
            "^([A-Za-z0-9_.:-]+)\\s+(NOT\\s+IN|IN)\\s*(\\(.+\\))$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern LOG_FILTER_TEXT_OPERATOR_PATTERN = Pattern.compile(
            "^([A-Za-z0-9_.:-]+)\\s+(NOT\\s+CONTAINS|CONTAINS)\\s+(.+)$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern LOG_FILTER_PRESENCE_OPERATOR_PATTERN = Pattern.compile(
            "^([A-Za-z0-9_.:-]+)\\s+(NOT\\s+EXISTS|EXISTS)$",
            Pattern.CASE_INSENSITIVE);

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

    @Schema(description = "Resource attribute filter expression, for example service.version=1.2.3", accessMode = READ_WRITE)
    private String resourceFilter;

    @Schema(description = "Log attribute filter expression, for example http.route:/checkout", accessMode = READ_WRITE)
    private String attributeFilter;

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
        if (!matchesAttributes(log.getResource(), parseLogAttributeFilter(resourceFilter))) {
            return false;
        }
        if (!matchesAttributes(log.getAttributes(), parseLogAttributeFilter(attributeFilter))) {
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

    private Map<String, String> parseLogAttributeFilter(String filterExpression) {
        if (!StringUtils.hasText(filterExpression)) {
            return Collections.emptyMap();
        }
        Map<String, String> filters = new LinkedHashMap<>();
        for (String token : splitLogFilterClauses(filterExpression)) {
            if (!StringUtils.hasText(token)) {
                continue;
            }
            if (appendLogFilterListValues(filters, token)
                    || appendLogFilterTextValue(filters, token)
                    || appendLogFilterPresenceValue(filters, token)) {
                continue;
            }
            boolean negate = false;
            int separatorIndex = token.indexOf("!=");
            if (separatorIndex >= 0) {
                negate = true;
            } else {
                separatorIndex = token.indexOf('=');
            }
            if (separatorIndex < 0) {
                separatorIndex = token.indexOf(':');
            }
            if (separatorIndex <= 0 || separatorIndex >= token.length() - 1) {
                continue;
            }
            String key = token.substring(0, separatorIndex).trim();
            String value = stripFilterQuotes(token.substring(separatorIndex + (negate ? 2 : 1)).trim());
            if (!isSafeAttributeKey(key) || !StringUtils.hasText(value)) {
                continue;
            }
            filters.put(key, negate ? LOG_FILTER_NEGATION_PREFIX + value : value);
        }
        return filters.isEmpty() ? Collections.emptyMap() : Map.copyOf(filters);
    }

    private boolean appendLogFilterListValues(Map<String, String> filters, String token) {
        Matcher matcher = LOG_FILTER_LIST_OPERATOR_PATTERN.matcher(token);
        if (!matcher.matches()) {
            return false;
        }
        String key = matcher.group(1).trim();
        String operator = matcher.group(2).trim().replaceAll("\\s+", " ");
        String valueList = matcher.group(3).trim();
        if (!isSafeAttributeKey(key) || valueList.length() < 2
                || !valueList.startsWith("(") || !valueList.endsWith(")")) {
            return false;
        }
        List<String> values = splitLogFilterListValues(valueList.substring(1, valueList.length() - 1)).stream()
                .map(value -> stripFilterQuotes(value.trim()))
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
        if (values.isEmpty()) {
            return false;
        }
        String prefix = "not in".equalsIgnoreCase(operator) ? LOG_FILTER_NOT_IN_PREFIX : LOG_FILTER_IN_PREFIX;
        filters.put(key, prefix + String.join(LOG_FILTER_VALUE_DELIMITER, values));
        return true;
    }

    private boolean appendLogFilterTextValue(Map<String, String> filters, String token) {
        Matcher matcher = LOG_FILTER_TEXT_OPERATOR_PATTERN.matcher(token);
        if (!matcher.matches()) {
            return false;
        }
        String key = matcher.group(1).trim();
        String operator = matcher.group(2).trim().replaceAll("\\s+", " ");
        String value = stripFilterQuotes(matcher.group(3).trim());
        if (!isSafeAttributeKey(key) || !StringUtils.hasText(value)) {
            return false;
        }
        filters.put(key, "not contains".equalsIgnoreCase(operator)
                ? LOG_FILTER_NOT_CONTAINS_PREFIX + value
                : LOG_FILTER_CONTAINS_PREFIX + value);
        return true;
    }

    private boolean appendLogFilterPresenceValue(Map<String, String> filters, String token) {
        Matcher matcher = LOG_FILTER_PRESENCE_OPERATOR_PATTERN.matcher(token);
        if (!matcher.matches()) {
            return false;
        }
        String key = matcher.group(1).trim();
        String operator = matcher.group(2).trim().replaceAll("\\s+", " ");
        if (!isSafeAttributeKey(key)) {
            return false;
        }
        filters.put(key, "not exists".equalsIgnoreCase(operator)
                ? LOG_FILTER_NOT_EXISTS_PREFIX
                : LOG_FILTER_EXISTS_PREFIX);
        return true;
    }

    private List<String> splitLogFilterClauses(String filterExpression) {
        List<String> clauses = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int depth = 0;
        char quote = 0;
        for (int index = 0; index < filterExpression.length(); index++) {
            char character = filterExpression.charAt(index);
            if (quote != 0) {
                current.append(character);
                if (character == quote) {
                    quote = 0;
                }
                continue;
            }
            if (character == '\'' || character == '"') {
                quote = character;
                current.append(character);
                continue;
            }
            if (character == '(') {
                depth++;
                current.append(character);
                continue;
            }
            if (character == ')') {
                depth = Math.max(0, depth - 1);
                current.append(character);
                continue;
            }
            if (depth == 0 && (character == ',' || isLogFilterAndDelimiter(filterExpression, index))) {
                addLogFilterClause(clauses, current);
                if (character != ',') {
                    index += 4;
                }
                continue;
            }
            current.append(character);
        }
        addLogFilterClause(clauses, current);
        return clauses;
    }

    private List<String> splitLogFilterListValues(String values) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        char quote = 0;
        for (int index = 0; index < values.length(); index++) {
            char character = values.charAt(index);
            if (quote != 0) {
                current.append(character);
                if (character == quote) {
                    quote = 0;
                }
                continue;
            }
            if (character == '\'' || character == '"') {
                quote = character;
                current.append(character);
                continue;
            }
            if (character == ',') {
                addLogFilterClause(result, current);
                continue;
            }
            current.append(character);
        }
        addLogFilterClause(result, current);
        return result;
    }

    private void addLogFilterClause(List<String> clauses, StringBuilder current) {
        String clause = current.toString().trim();
        if (StringUtils.hasText(clause)) {
            clauses.add(clause);
        }
        current.setLength(0);
    }

    private boolean isLogFilterAndDelimiter(String value, int index) {
        return index + 5 <= value.length() && value.regionMatches(true, index, " and ", 0, 5);
    }

    private String stripFilterQuotes(String value) {
        if (value.length() < 2) {
            return value;
        }
        char first = value.charAt(0);
        char last = value.charAt(value.length() - 1);
        if ((first == '\'' && last == '\'') || (first == '"' && last == '"')) {
            return value.substring(1, value.length() - 1).trim();
        }
        return value;
    }

    private boolean isSafeAttributeKey(String key) {
        return StringUtils.hasText(key) && key.matches("[A-Za-z0-9_.:-]+");
    }

    private boolean matchesAttributes(Map<String, Object> source, Map<String, String> expectedAttributes) {
        if (expectedAttributes == null || expectedAttributes.isEmpty()) {
            return true;
        }
        if (source == null || source.isEmpty()) {
            return expectedAttributes.values().stream().allMatch(this::isExclusionLogAttributeFilter);
        }
        return expectedAttributes.entrySet().stream()
                .allMatch(entry -> matchesAttributeFilter(resolveValue(source, entry.getKey()), entry.getValue(),
                        source.containsKey(entry.getKey())));
    }

    private boolean matchesAttributeFilter(String actualValue, String expectedValue, boolean keyExists) {
        if (LOG_FILTER_EXISTS_PREFIX.equals(expectedValue)) {
            return keyExists;
        }
        if (LOG_FILTER_NOT_EXISTS_PREFIX.equals(expectedValue)) {
            return !keyExists;
        }
        if (expectedValue != null && expectedValue.startsWith(LOG_FILTER_IN_PREFIX)) {
            return splitListLogAttributeValues(expectedValue.substring(LOG_FILTER_IN_PREFIX.length())).stream()
                    .anyMatch(expected -> matchesOptionalValue(actualValue, expected));
        }
        if (expectedValue != null && expectedValue.startsWith(LOG_FILTER_NOT_IN_PREFIX)) {
            return splitListLogAttributeValues(expectedValue.substring(LOG_FILTER_NOT_IN_PREFIX.length())).stream()
                    .noneMatch(expected -> matchesOptionalValue(actualValue, expected));
        }
        if (expectedValue != null && expectedValue.startsWith(LOG_FILTER_CONTAINS_PREFIX)) {
            return matchesContainedValue(actualValue, expectedValue.substring(LOG_FILTER_CONTAINS_PREFIX.length()));
        }
        if (expectedValue != null && expectedValue.startsWith(LOG_FILTER_NOT_CONTAINS_PREFIX)) {
            return !matchesContainedValue(actualValue, expectedValue.substring(LOG_FILTER_NOT_CONTAINS_PREFIX.length()));
        }
        if (expectedValue != null && expectedValue.startsWith(LOG_FILTER_NEGATION_PREFIX)) {
            return !matchesOptionalValue(actualValue, expectedValue.substring(LOG_FILTER_NEGATION_PREFIX.length()));
        }
        return matchesOptionalValue(actualValue, expectedValue);
    }

    private boolean isExclusionLogAttributeFilter(String expectedValue) {
        return (expectedValue != null && expectedValue.startsWith(LOG_FILTER_NEGATION_PREFIX))
                || (expectedValue != null && expectedValue.startsWith(LOG_FILTER_NOT_IN_PREFIX))
                || (expectedValue != null && expectedValue.startsWith(LOG_FILTER_NOT_CONTAINS_PREFIX))
                || LOG_FILTER_NOT_EXISTS_PREFIX.equals(expectedValue);
    }

    private List<String> splitListLogAttributeValues(String encodedValues) {
        if (!StringUtils.hasText(encodedValues)) {
            return List.of();
        }
        return List.of(encodedValues.split(Pattern.quote(LOG_FILTER_VALUE_DELIMITER), -1)).stream()
                .filter(StringUtils::hasText)
                .toList();
    }

    private boolean matchesContainedValue(String actualValue, String expectedValue) {
        if (!StringUtils.hasText(expectedValue)) {
            return true;
        }
        return StringUtils.hasText(actualValue)
                && actualValue.toLowerCase(Locale.ROOT).contains(expectedValue.trim().toLowerCase(Locale.ROOT));
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
