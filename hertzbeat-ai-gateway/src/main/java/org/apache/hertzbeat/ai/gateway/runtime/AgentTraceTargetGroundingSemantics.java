/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.ai.gateway.runtime;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.hertzbeat.ai.gateway.application.AgentTraceTargetAuthorityService;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTraceRef;
import org.springframework.util.StringUtils;

/** Production-shaped output semantics for one canonical Trace Explore detail observation. */
final class AgentTraceTargetGroundingSemantics {

    private static final Set<String> TRACE_KEYS = Set.of(
            "traceId", "rootSpanId", "serviceName", "serviceNamespace", "rootSpanName", "durationNanos",
            "status", "startTime", "errorSpanCount", "resourceAttributes", "spans", "spanCount", "partial");
    private static final Set<String> TRACE_REQUIRED_KEYS = Set.of(
            "traceId", "durationNanos", "startTime", "errorSpanCount", "resourceAttributes",
            "spans", "spanCount", "partial");
    private static final Set<String> SPAN_KEYS = Set.of(
            "traceId", "spanId", "parentSpanId", "spanName", "serviceName", "status", "spanKind",
            "statusMessage", "durationNanos", "startTime", "resourceAttributes", "spanAttributes");
    private static final Set<String> SPAN_REQUIRED_KEYS = Set.of(
            "traceId", "spanId", "spanName", "serviceName", "durationNanos", "startTime",
            "resourceAttributes", "spanAttributes");
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}");
    private static final Pattern SIMPLE_FILTER = Pattern.compile("\\s*([A-Za-z0-9_.-]{1,256})\\s*=\\s*([^,;]+?)\\s*");
    private static final int MAX_SPANS = 200;
    private static final int MAX_MAP_ENTRIES = 1_024;
    private static final int MAX_TEXT_LENGTH = 2_048;

    boolean isCanonicalTarget(AgentTargetRef target) {
        AgentTargetAuthority authority = target == null ? null : target.getAuthority();
        AgentTraceRef trace = target == null ? null : target.getTrace();
        return target != null && AgentTraceTargetAuthorityService.TARGET_VERSION.equals(target.getVersion())
                && normalizedTrace(trace) && authority != null && authority.getBindingId() == null
                && AgentTraceTargetAuthorityService.AUTHORITY_VERSION.equals(authority.getVersion())
                && authority.getHash() != null && authority.getHash().matches("sha256:[0-9a-f]{64}")
                && target.getMonitorId() == null && target.getAlertId() == null && target.getAlertType() == null
                && target.getEntityId() == null && target.getCollector() == null && target.getSignal() == null
                && target.getTopology() == null && target.getLog() == null && target.getService() == null;
    }

    int matchingObservationCount(AgentTargetRef target, AgentRuntimeToolCall call, Map<String, Object> output) {
        AgentTraceRef trace = target == null ? null : target.getTrace();
        if (!isCanonicalTarget(target) || !matchesCall(trace, call)
                || !TRACE_KEYS.containsAll(output.keySet()) || !output.keySet().containsAll(TRACE_REQUIRED_KEYS)
                || !Objects.equals(trace.getTraceId(), output.get("traceId"))
                || !matchesTraceSummary(trace, output)) {
            return -1;
        }
        List<?> spans = output.get("spans") instanceof List<?> values ? values : null;
        long spanCount = nonnegativeLong(output.get("spanCount"));
        if (spans == null || spans.isEmpty() || spans.size() > MAX_SPANS || spanCount < spans.size()
                || spans.size() != Math.min(spanCount, MAX_SPANS)
                || !(output.get("partial") instanceof Boolean partial)
                || partial != (spanCount > MAX_SPANS)) {
            return -1;
        }
        Set<String> spanIds = new HashSet<>();
        boolean selectedSpanPresent = trace.getSpanId() == null;
        boolean attributeFilterMatched = !isSimpleFilter(trace.getAttributeFilter());
        for (Object value : spans) {
            if (!(value instanceof Map<?, ?> span) || !matchesSpan(trace, span)) {
                return -1;
            }
            String spanId = (String) span.get("spanId");
            if (!spanIds.add(spanId)) {
                return -1;
            }
            selectedSpanPresent |= Objects.equals(trace.getSpanId(), spanId);
            attributeFilterMatched |= matchesSimpleFilter(trace.getAttributeFilter(), span.get("spanAttributes"));
        }
        return selectedSpanPresent && attributeFilterMatched ? spans.size() : -1;
    }

    private boolean normalizedTrace(AgentTraceRef trace) {
        return trace != null && safeId(trace.getTraceId())
                && (trace.getSpanId() == null || safeId(trace.getSpanId()))
                && trace.getStart() != null && trace.getStart() > 0
                && trace.getEnd() != null && trace.getEnd() > trace.getStart()
                && trace.getEnd() - trace.getStart() <= java.time.Duration.ofDays(7).toMillis()
                && normalizedText(trace.getServiceName(), 512)
                && normalizedText(trace.getServiceNamespace(), 512)
                && normalizedText(trace.getEnvironment(), 512)
                && normalizedText(trace.getResourceFilter(), MAX_TEXT_LENGTH)
                && normalizedText(trace.getAttributeFilter(), MAX_TEXT_LENGTH)
                && nonnegative(trace.getMinDurationMs()) && nonnegative(trace.getMaxDurationMs())
                && (trace.getMinDurationMs() == null || trace.getMaxDurationMs() == null
                || trace.getMinDurationMs() <= trace.getMaxDurationMs());
    }

    private boolean matchesCall(AgentTraceRef trace, AgentRuntimeToolCall call) {
        if (!"traces.get".equals(call.getToolName())) {
            return false;
        }
        Map<String, Object> expected = new LinkedHashMap<>();
        expected.put("traceId", trace.getTraceId());
        put(expected, "spanId", trace.getSpanId());
        expected.put("start", trace.getStart());
        expected.put("end", trace.getEnd());
        put(expected, "serviceName", trace.getServiceName());
        put(expected, "serviceNamespace", trace.getServiceNamespace());
        put(expected, "environment", trace.getEnvironment());
        put(expected, "resourceFilter", trace.getResourceFilter());
        put(expected, "attributeFilter", trace.getAttributeFilter());
        put(expected, "minDurationMs", trace.getMinDurationMs());
        put(expected, "maxDurationMs", trace.getMaxDurationMs());
        if (!expected.keySet().equals(call.getArguments().keySet())) {
            return false;
        }
        return expected.entrySet().stream().allMatch(entry -> entry.getValue() instanceof Number number
                ? exactLong(call.getArguments().get(entry.getKey()), number.longValue())
                : Objects.equals(entry.getValue(), call.getArguments().get(entry.getKey())));
    }

    private boolean matchesTraceSummary(AgentTraceRef trace, Map<String, Object> output) {
        long startTime = nonnegativeLong(output.get("startTime"));
        BigDecimal durationNanos = nonnegativeNumber(output.get("durationNanos"));
        if (startTime < trace.getStart() || startTime > trace.getEnd() || durationNanos == null
                || nonnegativeLong(output.get("errorSpanCount")) < 0
                || !nullableText(output.get("rootSpanId")) || !nullableText(output.get("rootSpanName"))
                || !nullableText(output.get("status"))
                || !equalsIgnoreCaseIfPresent(trace.getServiceName(), output.get("serviceName"))
                || !equalsIgnoreCaseIfPresent(trace.getServiceNamespace(), output.get("serviceNamespace"))
                || !stringMap(output.get("resourceAttributes"))) {
            return false;
        }
        if (trace.getMinDurationMs() != null
                && durationNanos.compareTo(BigDecimal.valueOf(trace.getMinDurationMs()).movePointRight(6)) < 0
                || trace.getMaxDurationMs() != null
                && durationNanos.compareTo(BigDecimal.valueOf(trace.getMaxDurationMs()).movePointRight(6)) > 0) {
            return false;
        }
        Map<?, ?> resources = (Map<?, ?>) output.get("resourceAttributes");
        return equalsIgnoreCaseIfPresent(trace.getEnvironment(), resources.get("deployment.environment.name"))
                && (!isSimpleFilter(trace.getResourceFilter())
                || matchesSimpleFilter(trace.getResourceFilter(), resources));
    }

    private boolean matchesSpan(AgentTraceRef trace, Map<?, ?> span) {
        return SPAN_KEYS.containsAll(span.keySet()) && span.keySet().containsAll(SPAN_REQUIRED_KEYS)
                && Objects.equals(trace.getTraceId(), span.get("traceId"))
                && span.get("spanId") instanceof String spanId && safeId(spanId)
                && nullableText(span.get("parentSpanId")) && requiredText(span.get("spanName"))
                && requiredText(span.get("serviceName")) && nullableText(span.get("status"))
                && nullableText(span.get("spanKind")) && nullableText(span.get("statusMessage"))
                && nonnegativeNumber(span.get("durationNanos")) != null
                && nonnegativeLong(span.get("startTime")) >= 0
                && stringMap(span.get("resourceAttributes")) && stringMap(span.get("spanAttributes"));
    }

    private boolean matchesSimpleFilter(String filter, Object value) {
        if (!(value instanceof Map<?, ?> map)) {
            return false;
        }
        Matcher matcher = SIMPLE_FILTER.matcher(filter == null ? "" : filter);
        return matcher.matches() && Objects.toString(map.get(matcher.group(1)), "")
                .equalsIgnoreCase(matcher.group(2).trim());
    }

    private boolean isSimpleFilter(String filter) {
        return filter != null && SIMPLE_FILTER.matcher(filter).matches();
    }

    private boolean equalsIgnoreCaseIfPresent(String expected, Object actual) {
        return expected == null || actual instanceof String text && expected.equalsIgnoreCase(text);
    }

    private boolean stringMap(Object value) {
        return value instanceof Map<?, ?> map && map.size() <= MAX_MAP_ENTRIES
                && map.entrySet().stream().allMatch(entry -> entry.getKey() instanceof String key
                && key.length() <= MAX_TEXT_LENGTH && (entry.getValue() == null
                || entry.getValue() instanceof String text && text.length() <= MAX_TEXT_LENGTH));
    }

    private boolean normalizedText(String value, int maximumLength) {
        return value == null || StringUtils.hasText(value) && value.equals(value.trim())
                && value.length() <= maximumLength
                && value.codePoints().noneMatch(code -> code < 32 || code == 127);
    }

    private boolean safeId(String value) {
        return value != null && SAFE_ID.matcher(value).matches();
    }

    private boolean requiredText(Object value) {
        return value instanceof String text && StringUtils.hasText(text) && text.length() <= MAX_TEXT_LENGTH;
    }

    private boolean nullableText(Object value) {
        return value == null || value instanceof String text && text.length() <= MAX_TEXT_LENGTH;
    }

    private boolean nonnegative(Long value) {
        return value == null || value >= 0;
    }

    private long nonnegativeLong(Object value) {
        BigDecimal number = nonnegativeNumber(value);
        if (number == null) {
            return -1;
        }
        try {
            return number.longValueExact();
        } catch (ArithmeticException ignored) {
            return -1;
        }
    }

    private BigDecimal nonnegativeNumber(Object value) {
        if (!(value instanceof Number number)) {
            return null;
        }
        try {
            BigDecimal converted = new BigDecimal(number.toString());
            return converted.signum() >= 0 ? converted : null;
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private boolean exactLong(Object value, long expected) {
        return nonnegativeLong(value) == expected;
    }

    private void put(Map<String, Object> values, String key, Object value) {
        if (value != null) {
            values.put(key, value);
        }
    }
}
