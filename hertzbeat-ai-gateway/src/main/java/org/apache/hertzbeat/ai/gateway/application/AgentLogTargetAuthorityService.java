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
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Pattern;
import org.apache.hertzbeat.ai.gateway.contract.AgentLogRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Resolves one exact non-live Log Explore page through the trusted-workspace query boundary. */
@Service
public class AgentLogTargetAuthorityService {

    public static final String TARGET_VERSION_PREFIX = "log-page.";
    public static final String AUTHORITY_VERSION_PREFIX = "log-page-authority.";
    public static final String TARGET_VERSION = "log-page.v1";
    public static final String AUTHORITY_VERSION = "log-page-authority.v1";

    private static final long MAX_RANGE_MILLIS = Duration.ofDays(7).toMillis();
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}");
    private static final Set<String> SEVERITIES = Set.of("TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL");

    private final LogQueryService logQueryService;

    public AgentLogTargetAuthorityService(LogQueryService logQueryService) {
        this.logQueryService = logQueryService;
    }

    public AgentTargetRef canonicalize(String workspaceId, AgentLogRef source) {
        AgentLogRef log = normalizeSource(source);
        Page<LogEntry> page;
        try {
            page = query(workspaceId, log);
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
        if (page == null || page.isEmpty() || page.getNumber() != log.getPageIndex()
                || page.getSize() != log.getPageSize()) {
            throw unavailable();
        }
        return AgentTargetRef.builder()
                .version(TARGET_VERSION)
                .log(log)
                .authority(AgentTargetAuthority.builder()
                        .version(AUTHORITY_VERSION)
                        .hash("sha256:" + GatewayText.sha256(authorityMaterial(workspaceId, log, page)))
                        .build())
                .build();
    }

    public boolean verify(String workspaceId, AgentTargetRef target) {
        if (!isCanonicalTarget(target)) {
            return false;
        }
        try {
            return Objects.equals(target, canonicalize(workspaceId, target.getLog()));
        } catch (UnavailableException ignored) {
            return false;
        }
    }

    public boolean isCanonicalTarget(AgentTargetRef target) {
        AgentTargetAuthority authority = target == null ? null : target.getAuthority();
        if (target == null || !TARGET_VERSION.equals(target.getVersion()) || target.getLog() == null
                || authority == null || authority.getBindingId() != null
                || !AUTHORITY_VERSION.equals(authority.getVersion())
                || authority.getHash() == null || !authority.getHash().matches("sha256:[0-9a-f]{64}")
                || target.getMonitorId() != null || target.getAlertId() != null || target.getAlertType() != null
                || target.getEntityId() != null || target.getCollector() != null || target.getSignal() != null
                || target.getTopology() != null || target.getTrace() != null || target.getService() != null) {
            return false;
        }
        try {
            return Objects.equals(target.getLog(), normalizeSource(target.getLog()));
        } catch (UnavailableException ignored) {
            return false;
        }
    }

    public AgentLogRef normalizeSource(AgentLogRef source) {
        if (source == null || source.getStart() == null || source.getEnd() == null || source.getStart() <= 0
                || source.getEnd() <= source.getStart() || source.getEnd() - source.getStart() > MAX_RANGE_MILLIS
                || !optionalSafeId(source.getTraceId()) || !optionalSafeId(source.getSpanId())
                || source.getSeverityNumber() != null
                && (source.getSeverityNumber() < 1 || source.getSeverityNumber() > 24)
                || source.getHideInternal() == null || source.getHideNoise() == null
                || source.getPageIndex() == null || source.getPageIndex() < 0 || source.getPageIndex() > 10_000
                || source.getPageSize() == null || source.getPageSize() < 1 || source.getPageSize() > 100) {
            throw unavailable();
        }
        String severity = text(source.getSeverityText(), 16);
        if (severity != null) {
            severity = severity.toUpperCase(Locale.ROOT);
            if (!SEVERITIES.contains(severity)) {
                throw unavailable();
            }
        }
        return AgentLogRef.builder()
                .start(source.getStart()).end(source.getEnd())
                .traceId(source.getTraceId()).spanId(source.getSpanId())
                .severityNumber(source.getSeverityNumber()).severityText(severity)
                .search(text(source.getSearch(), 256))
                .serviceName(text(source.getServiceName(), 512))
                .serviceNamespace(text(source.getServiceNamespace(), 512))
                .environment(text(source.getEnvironment(), 512))
                .resourceFilter(text(source.getResourceFilter(), 2048))
                .attributeFilter(text(source.getAttributeFilter(), 2048))
                .hideInternal(source.getHideInternal()).hideNoise(source.getHideNoise())
                .pageIndex(source.getPageIndex()).pageSize(source.getPageSize())
                .build();
    }

    private Page<LogEntry> query(String workspaceId, AgentLogRef log) {
        return logQueryService.list(workspaceId, null, log.getStart(), log.getEnd(), log.getTraceId(), log.getSpanId(),
                log.getSeverityNumber(), log.getSeverityText(), log.getSearch(), log.getServiceName(),
                log.getServiceNamespace(), log.getEnvironment(), log.getResourceFilter(), log.getAttributeFilter(),
                log.getPageIndex(), log.getPageSize(), log.getHideInternal(), log.getHideNoise());
    }

    private String authorityMaterial(String workspaceId, AgentLogRef log, Page<LogEntry> page) {
        StringBuilder material = new StringBuilder("log-page-authority.v1;");
        append(material, "workspaceId", workspaceId);
        append(material, "scope", JsonUtil.toJson(log));
        append(material, "number", page.getNumber());
        append(material, "size", page.getSize());
        append(material, "totalElements", page.getTotalElements());
        append(material, "totalPages", page.getTotalPages());
        for (LogEntry row : page.getContent()) {
            append(material, "timeUnixNano", row == null ? null : row.getTimeUnixNano());
            append(material, "observedTimeUnixNano", row == null ? null : row.getObservedTimeUnixNano());
            append(material, "severityNumber", row == null ? null : row.getSeverityNumber());
            append(material, "severityText", row == null ? null : row.getSeverityText());
            append(material, "body", row == null ? null : canonical(row.getBody()));
            append(material, "attributes", row == null ? null : canonical(row.getAttributes()));
            append(material, "droppedAttributesCount", row == null ? null : row.getDroppedAttributesCount());
            append(material, "traceId", row == null ? null : row.getTraceId());
            append(material, "spanId", row == null ? null : row.getSpanId());
            append(material, "traceFlags", row == null ? null : row.getTraceFlags());
            append(material, "resource", row == null ? null : canonical(row.getResource()));
            append(material, "resourceSchemaUrl", row == null ? null : row.getResourceSchemaUrl());
            append(material, "instrumentationScope", row == null ? null : canonical(row.getInstrumentationScope()));
            append(material, "scopeSchemaUrl", row == null ? null : row.getScopeSchemaUrl());
        }
        return material.toString();
    }

    private Object canonical(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> sorted = new TreeMap<>();
            map.forEach((key, nested) -> sorted.put(String.valueOf(key), canonical(nested)));
            return sorted;
        }
        if (value instanceof Iterable<?> iterable) {
            List<Object> values = new ArrayList<>();
            iterable.forEach(nested -> values.add(canonical(nested)));
            return values;
        }
        return value;
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

    private boolean optionalSafeId(String value) {
        return value == null || SAFE_ID.matcher(value).matches();
    }

    private void append(StringBuilder material, String field, Object value) {
        String text = value == null ? null : value instanceof String ? (String) value : JsonUtil.toJson(value);
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
            super("Log target is unavailable");
        }
    }
}
