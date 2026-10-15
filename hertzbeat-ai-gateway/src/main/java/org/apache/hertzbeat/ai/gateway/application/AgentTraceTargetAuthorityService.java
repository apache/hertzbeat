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

package org.apache.hertzbeat.ai.gateway.application;

import java.time.Duration;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.regex.Pattern;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTraceRef;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.observability.dto.trace.TraceDetailDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService.TraceDetailQuery;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Resolves one exact Trace Explore detail scope through the trusted-workspace query boundary. */
@Service
public class AgentTraceTargetAuthorityService {

    public static final String TARGET_VERSION_PREFIX = "trace-detail.";
    public static final String AUTHORITY_VERSION_PREFIX = "trace-detail-authority.";
    public static final String TARGET_VERSION = "trace-detail.v1";
    public static final String AUTHORITY_VERSION = "trace-detail-authority.v1";

    private static final long MAX_RANGE_MILLIS = Duration.ofDays(7).toMillis();
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}");

    private final EntityTraceQueryService traceQueryService;

    public AgentTraceTargetAuthorityService(EntityTraceQueryService traceQueryService) {
        this.traceQueryService = traceQueryService;
    }

    public AgentTargetRef canonicalize(String workspaceId, AgentTraceRef source) {
        AgentTraceRef trace = normalizeSource(source);
        TraceDetailDto detail;
        try {
            detail = traceQueryService.getTraceDetail(workspaceId, detailQuery(trace));
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
        if (detail == null || !Objects.equals(trace.getTraceId(), detail.getTraceId())) {
            throw unavailable();
        }
        return AgentTargetRef.builder()
                .version(TARGET_VERSION)
                .trace(trace)
                .authority(AgentTargetAuthority.builder()
                        .version(AUTHORITY_VERSION)
                        .hash("sha256:" + GatewayText.sha256(authorityMaterial(workspaceId, trace, detail)))
                        .build())
                .build();
    }

    public boolean verify(String workspaceId, AgentTargetRef target) {
        if (!isCanonicalTarget(target)) {
            return false;
        }
        try {
            return Objects.equals(target, canonicalize(workspaceId, target.getTrace()));
        } catch (UnavailableException ignored) {
            return false;
        }
    }

    public boolean isCanonicalTarget(AgentTargetRef target) {
        AgentTargetAuthority authority = target == null ? null : target.getAuthority();
        if (target == null || !TARGET_VERSION.equals(target.getVersion()) || target.getTrace() == null
                || authority == null || authority.getBindingId() != null
                || !AUTHORITY_VERSION.equals(authority.getVersion())
                || authority.getHash() == null || !authority.getHash().matches("sha256:[0-9a-f]{64}")
                || target.getMonitorId() != null || target.getAlertId() != null || target.getAlertType() != null
                || target.getEntityId() != null || target.getCollector() != null || target.getSignal() != null
                || target.getTopology() != null || target.getLog() != null || target.getService() != null) {
            return false;
        }
        try {
            return Objects.equals(target.getTrace(), normalizeSource(target.getTrace()));
        } catch (UnavailableException ignored) {
            return false;
        }
    }

    public AgentTraceRef normalizeSource(AgentTraceRef source) {
        if (source == null || !safeId(source.getTraceId()) || source.getSpanId() != null && !safeId(source.getSpanId())
                || source.getStart() == null || source.getEnd() == null || source.getStart() <= 0
                || source.getEnd() <= source.getStart() || source.getEnd() - source.getStart() > MAX_RANGE_MILLIS
                || source.getMinDurationMs() != null && source.getMinDurationMs() < 0
                || source.getMaxDurationMs() != null && source.getMaxDurationMs() < 0
                || source.getMinDurationMs() != null && source.getMaxDurationMs() != null
                && source.getMinDurationMs() > source.getMaxDurationMs()) {
            throw unavailable();
        }
        return AgentTraceRef.builder()
                .traceId(source.getTraceId())
                .spanId(source.getSpanId())
                .start(source.getStart())
                .end(source.getEnd())
                .serviceName(text(source.getServiceName(), 512))
                .serviceNamespace(text(source.getServiceNamespace(), 512))
                .environment(text(source.getEnvironment(), 512))
                .resourceFilter(text(source.getResourceFilter(), 2048))
                .attributeFilter(text(source.getAttributeFilter(), 2048))
                .minDurationMs(source.getMinDurationMs())
                .maxDurationMs(source.getMaxDurationMs())
                .build();
    }

    private TraceDetailQuery detailQuery(AgentTraceRef trace) {
        return new TraceDetailQuery(null, trace.getTraceId(), trace.getSpanId(), trace.getStart(), trace.getEnd(),
                trace.getServiceName(), trace.getServiceNamespace(), trace.getEnvironment(), trace.getResourceFilter(),
                trace.getAttributeFilter(), trace.getMinDurationMs(), trace.getMaxDurationMs());
    }

    private String authorityMaterial(String workspaceId, AgentTraceRef trace, TraceDetailDto detail) {
        StringBuilder material = new StringBuilder("trace-detail-authority.v1;");
        append(material, "workspaceId", workspaceId);
        append(material, "scope", JsonUtil.toJson(trace));
        append(material, "traceId", detail.getTraceId());
        append(material, "rootSpanId", detail.getRootSpanId());
        append(material, "serviceName", detail.getServiceName());
        append(material, "serviceNamespace", detail.getServiceNamespace());
        append(material, "rootSpanName", detail.getRootSpanName());
        append(material, "durationNanos", detail.getDurationNanos());
        append(material, "status", detail.getStatus());
        append(material, "startTime", detail.getStartTime());
        append(material, "errorSpanCount", detail.getErrorSpanCount());
        append(material, "resourceAttributes", sorted(detail.getResourceAttributes()));
        if (detail.getSpans() != null) {
            for (TraceSpanNodeDto span : detail.getSpans()) {
                appendSpan(material, span);
            }
        }
        return material.toString();
    }

    private void appendSpan(StringBuilder material, TraceSpanNodeDto span) {
        append(material, "span.traceId", span == null ? null : span.getTraceId());
        append(material, "span.spanId", span == null ? null : span.getSpanId());
        append(material, "span.parentSpanId", span == null ? null : span.getParentSpanId());
        append(material, "span.name", span == null ? null : span.getSpanName());
        append(material, "span.service", span == null ? null : span.getServiceName());
        append(material, "span.status", span == null ? null : span.getStatus());
        append(material, "span.kind", span == null ? null : span.getSpanKind());
        append(material, "span.duration", span == null ? null : span.getDurationNanos());
        append(material, "span.start", span == null ? null : span.getStartTime());
        append(material, "span.resource", span == null ? null : sorted(span.getResourceAttributes()));
        append(material, "span.attributes", span == null ? null : sorted(span.getSpanAttributes()));
    }

    private Map<String, String> sorted(Map<String, String> values) {
        return values == null ? Map.of() : new TreeMap<>(values);
    }

    private String text(String value, int maximumLength) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (!StringUtils.hasText(normalized) || normalized.length() > maximumLength
                || normalized.codePoints().anyMatch(code -> code < 32 || code == 127)
                || !Objects.equals(normalized, GatewayText.redactSecrets(normalized))) {
            throw unavailable();
        }
        return normalized;
    }

    private boolean safeId(String value) {
        return value != null && SAFE_ID.matcher(value).matches();
    }

    private void append(StringBuilder material, String field, Object value) {
        String text = value == null ? null : String.valueOf(value);
        material.append(field).append(':').append(text == null ? -1 : text.length()).append(':');
        if (text != null) {
            material.append(text);
        }
        material.append(';');
    }

    private UnavailableException unavailable() {
        return new UnavailableException();
    }

    /** Cause-free failure used at the channel boundary. */
    public static final class UnavailableException extends IllegalArgumentException {

        UnavailableException() {
            super("Trace target is unavailable");
        }
    }
}
