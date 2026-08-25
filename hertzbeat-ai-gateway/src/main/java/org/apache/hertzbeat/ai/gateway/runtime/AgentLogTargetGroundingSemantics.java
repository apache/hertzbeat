/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.ai.gateway.runtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.hertzbeat.ai.gateway.application.AgentLogTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentLogRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;

/** Producer-shaped output semantics for one exact canonical Log Explore page target. */
final class AgentLogTargetGroundingSemantics {

    private static final Set<String> OUTPUT_KEYS = Set.of(
            "content", "pageIndex", "pageSize", "totalElements", "totalPages", "start", "end");
    private static final Set<String> ROW_KEYS = Set.of(
            "timeUnixNano", "observedTimeUnixNano", "severityNumber", "severityText", "body",
            "traceId", "spanId", "traceFlags", "attributes", "resource");
    private static final Pattern SIMPLE_FILTER = Pattern.compile("^\\s*([^:=\\s]+)\\s*[:=]\\s*(.+?)\\s*$");
    private static final ObjectMapper QUIET_JSON = JsonMapper.builder().build();

    boolean isCanonicalTarget(AgentTargetRef target) {
        AgentTargetAuthority authority = target == null ? null : target.getAuthority();
        return target != null && AgentLogTargetAuthorityService.TARGET_VERSION.equals(target.getVersion())
                && target.getLog() != null && authority != null && authority.getBindingId() == null
                && AgentLogTargetAuthorityService.AUTHORITY_VERSION.equals(authority.getVersion())
                && authority.getHash() != null && authority.getHash().matches("sha256:[0-9a-f]{64}")
                && target.getMonitorId() == null && target.getAlertId() == null && target.getAlertType() == null
                && target.getEntityId() == null && target.getCollector() == null && target.getSignal() == null
                && target.getTopology() == null && target.getTrace() == null && target.getService() == null;
    }

    int matchingObservationCount(AgentTargetRef target, AgentRuntimeToolCall call, Map<String, Object> output) {
        AgentLogRef log = target == null ? null : target.getLog();
        if (!isCanonicalTarget(target) || log == null || !"logs.query".equals(call.getToolName())
                || !argumentsMatch(log, call.getArguments()) || !OUTPUT_KEYS.equals(output.keySet())
                || !exactLong(output.get("start"), log.getStart()) || !exactLong(output.get("end"), log.getEnd())
                || !exactLong(output.get("pageIndex"), log.getPageIndex())
                || !exactLong(output.get("pageSize"), log.getPageSize())) {
            return 0;
        }
        long totalElements = nonnegativeLong(output.get("totalElements"));
        long totalPages = nonnegativeLong(output.get("totalPages"));
        if (totalElements <= 0 || totalPages != (totalElements + log.getPageSize() - 1) / log.getPageSize()
                || !(output.get("content") instanceof List<?> rows) || rows.isEmpty()
                || rows.size() > log.getPageSize()) {
            return 0;
        }
        long remaining = totalElements - (long) log.getPageIndex() * log.getPageSize();
        if (remaining <= 0 || rows.size() > Math.min(log.getPageSize(), remaining)) {
            return 0;
        }
        return rows.stream().allMatch(row -> row instanceof Map<?, ?> map && rowMatches(log, map))
                ? rows.size() : 0;
    }

    private boolean argumentsMatch(AgentLogRef log, Map<String, Object> arguments) {
        Map<String, Object> expected = new LinkedHashMap<>();
        expected.put("start", log.getStart());
        expected.put("end", log.getEnd());
        put(expected, "traceId", log.getTraceId());
        put(expected, "spanId", log.getSpanId());
        put(expected, "severityNumber", log.getSeverityNumber());
        put(expected, "severityText", log.getSeverityText());
        put(expected, "search", log.getSearch());
        put(expected, "serviceName", log.getServiceName());
        put(expected, "serviceNamespace", log.getServiceNamespace());
        put(expected, "environment", log.getEnvironment());
        put(expected, "resourceFilter", log.getResourceFilter());
        put(expected, "attributeFilter", log.getAttributeFilter());
        expected.put("hideInternal", log.getHideInternal());
        expected.put("hideNoise", log.getHideNoise());
        expected.put("pageIndex", log.getPageIndex());
        expected.put("pageSize", log.getPageSize());
        if (!expected.keySet().equals(arguments.keySet())) {
            return false;
        }
        return expected.entrySet().stream().allMatch(entry -> entry.getValue() instanceof Number number
                ? exactLong(arguments.get(entry.getKey()), number.longValue())
                : Objects.equals(entry.getValue(), arguments.get(entry.getKey())));
    }

    private boolean rowMatches(AgentLogRef log, Map<?, ?> row) {
        if (!ROW_KEYS.equals(row.keySet()) || !boundedText(row.get("body"), 4096)
                || !boundedText(row.get("severityText"), 128) || !boundedText(row.get("traceId"), 128)
                || !boundedText(row.get("spanId"), 128) || !nullableNonnegative(row.get("timeUnixNano"))
                || !nullableNonnegative(row.get("observedTimeUnixNano"))
                || !nullableInteger(row.get("severityNumber"), 1, 24)
                || !nullableInteger(row.get("traceFlags"), 0, Integer.MAX_VALUE)) {
            return false;
        }
        Long timeNanos = nullableLong(row.get("timeUnixNano"));
        Long observedNanos = nullableLong(row.get("observedTimeUnixNano"));
        if (!withinWindow(log, timeNanos) && !withinWindow(log, observedNanos)) {
            return false;
        }
        Map<String, Object> attributes = jsonMap(row.get("attributes"), 4096);
        Map<String, Object> resource = jsonMap(row.get("resource"), 2048);
        if (attributes == null || resource == null
                || log.getTraceId() != null && !Objects.equals(log.getTraceId(), row.get("traceId"))
                || log.getSpanId() != null && !Objects.equals(log.getSpanId(), row.get("spanId"))
                || log.getSeverityNumber() != null && !exactLong(row.get("severityNumber"), log.getSeverityNumber())
                || log.getSeverityText() != null && !equalsIgnoreCase(log.getSeverityText(), row.get("severityText"))
                || !containsIgnoreCase(row.get("body"), log.getSearch())
                || !resourceValue(resource, "service.name", log.getServiceName())
                || !resourceValue(resource, "service.namespace", log.getServiceNamespace())
                || !resourceValue(resource, "deployment.environment.name", log.getEnvironment())
                || !simpleFilterMatches(resource, log.getResourceFilter())
                || !simpleFilterMatches(attributes, log.getAttributeFilter())) {
            return false;
        }
        return true;
    }

    private boolean withinWindow(AgentLogRef log, Long nanos) {
        if (nanos == null || nanos < 0) {
            return false;
        }
        long millis = nanos / 1_000_000L;
        return millis >= log.getStart() && millis <= log.getEnd();
    }

    private boolean simpleFilterMatches(Map<String, Object> values, String filter) {
        if (filter == null) {
            return true;
        }
        Matcher matcher = SIMPLE_FILTER.matcher(filter);
        if (!matcher.matches()) {
            return false;
        }
        Object actual = values.get(matcher.group(1).trim());
        return actual != null && Objects.equals(matcher.group(2).trim(), String.valueOf(actual));
    }

    private boolean resourceValue(Map<String, Object> resource, String key, String expected) {
        return expected == null || Objects.equals(expected, resource.get(key));
    }

    private boolean containsIgnoreCase(Object value, String search) {
        return search == null || value instanceof String text
                && text.toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT));
    }

    private boolean equalsIgnoreCase(String expected, Object actual) {
        return actual instanceof String text && expected.equalsIgnoreCase(text);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> jsonMap(Object value, int maximumLength) {
        if (!(value instanceof String text) || text.length() > maximumLength) {
            return null;
        }
        try {
            Object parsed = QUIET_JSON.readValue(text, Object.class);
            return parsed instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
        } catch (IOException ignored) {
            return null;
        }
    }

    private boolean boundedText(Object value, int maximumLength) {
        return value == null || value instanceof String text && text.length() <= maximumLength;
    }

    private boolean nullableNonnegative(Object value) {
        return value == null || nonnegativeLong(value) >= 0;
    }

    private boolean nullableInteger(Object value, int minimum, int maximum) {
        if (value == null) {
            return true;
        }
        long converted = nonnegativeLong(value);
        return converted >= minimum && converted <= maximum;
    }

    private Long nullableLong(Object value) {
        if (value == null) {
            return null;
        }
        long converted = nonnegativeLong(value);
        return converted < 0 ? null : converted;
    }

    private boolean exactLong(Object value, long expected) {
        return nonnegativeLong(value) == expected;
    }

    private long nonnegativeLong(Object value) {
        if (!(value instanceof Number number)) {
            return -1;
        }
        try {
            long converted = new BigDecimal(number.toString()).longValueExact();
            return converted >= 0 ? converted : -1;
        } catch (ArithmeticException | NumberFormatException ignored) {
            return -1;
        }
    }

    private void put(Map<String, Object> values, String key, Object value) {
        if (value != null) {
            values.put(key, value);
        }
    }
}
