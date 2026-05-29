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

package org.apache.hertzbeat.observability.logs.service.impl;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationEnricher;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Default log query service.
 */
@Service
@Slf4j
public class LogQueryServiceImpl implements LogQueryService {

    private static final Set<String> WORKSPACE_INFRA_SERVICE_NAMES = Set.of(
            "otelcol-contrib",
            "otel-collector",
            "opentelemetry-collector",
            "jaeger",
            "prometheus",
            "grafana",
            "opensearch",
            "frontend-proxy"
    );
    private static final Set<String> DEMO_INFRA_SERVICE_NAMES = Set.of(
            "kafka",
            "load-generator",
            "valkey-cart",
            "postgresql",
            "flagd",
            "flagd-ui"
    );
    private static final Set<String> WORKSPACE_RESOURCE_KEYS = Set.of(
            OtlpCorrelationEnricher.WORKSPACE_ID_ATTRIBUTE,
            AuthTokenScopes.CLAIM_WORKSPACE_ID,
            "workspace.id"
    );

    private final List<HistoryDataReader> historyDataReaders;

    @Autowired
    public LogQueryServiceImpl(List<HistoryDataReader> historyDataReaders) {
        this.historyDataReaders = historyDataReaders == null ? List.of()
                : historyDataReaders.stream().filter(Objects::nonNull).toList();
    }

    @Override
    public Page<LogEntry> list(Long start, Long end, String traceId, String spanId,
                               Integer severityNumber, String severityText, String search,
                               Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise) {
        return getPagedLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                pageIndex, pageSize, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> overviewStats(Long start, Long end, String traceId, String spanId,
                                             Integer severityNumber, String severityText, String search,
                                             boolean hideInternal, boolean hideNoise) {
        Map<String, Long> aggregate = readSeverityBuckets(start, end, traceId, spanId, severityNumber,
                severityText, search, hideInternal, hideNoise);
        if (aggregate != null) {
            return new HashMap<>(aggregate);
        }

        List<LogEntry> logs = getFilteredLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                hideInternal, hideNoise);

        Map<String, Object> overview = new HashMap<>();
        overview.put("totalCount", logs.size());

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

        return overview;
    }

    @Override
    public Map<String, Object> traceCoverageStats(Long start, Long end, String traceId, String spanId,
                                                  Integer severityNumber, String severityText, String search,
                                                  boolean hideInternal, boolean hideNoise) {
        Map<String, Long> aggregate = readTraceCoverage(start, end, traceId, spanId, severityNumber,
                severityText, search, hideInternal, hideNoise);
        if (aggregate != null) {
            Map<String, Object> result = new HashMap<>();
            result.put("traceCoverage", aggregate);
            return result;
        }

        List<LogEntry> logs = getFilteredLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                hideInternal, hideNoise);

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

        Map<String, Object> result = new HashMap<>();
        result.put("traceCoverage", traceCoverage);
        return result;
    }

    @Override
    public Map<String, Object> trendStats(Long start, Long end, String traceId, String spanId,
                                          Integer severityNumber, String severityText, String search,
                                          boolean hideInternal, boolean hideNoise) {
        Map<String, Long> aggregate = readHourlyStats(start, end, traceId, spanId, severityNumber,
                severityText, search, hideInternal, hideNoise);
        if (aggregate != null) {
            Map<String, Object> result = new HashMap<>();
            result.put("hourlyStats", aggregate);
            return result;
        }

        List<LogEntry> logs = getFilteredLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                hideInternal, hideNoise);

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
        return result;
    }

    private Map<String, Long> readSeverityBuckets(Long start, Long end, String traceId, String spanId,
                                                  Integer severityNumber, String severityText, String search,
                                                  boolean hideInternal, boolean hideNoise) {
        if (hasWorkspaceContext()) {
            return null;
        }
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                Map<String, Long> aggregate = historyDataReader.countLogsBySeverityBuckets(
                        start, end, traceId, spanId, severityNumber, severityText, search,
                        hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise));
                if (aggregate != null && !aggregate.isEmpty()) {
                    return aggregate;
                }
            } catch (UnsupportedOperationException ex) {
                // Fall back to row-based aggregation for history stores without native aggregate support.
            }
        }
        return null;
    }

    private Map<String, Long> readTraceCoverage(Long start, Long end, String traceId, String spanId,
                                                Integer severityNumber, String severityText, String search,
                                                boolean hideInternal, boolean hideNoise) {
        if (hasWorkspaceContext()) {
            return null;
        }
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                Map<String, Long> aggregate = historyDataReader.countLogTraceCoverage(
                        start, end, traceId, spanId, severityNumber, severityText, search,
                        hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise));
                if (aggregate != null && !aggregate.isEmpty()) {
                    return aggregate;
                }
            } catch (UnsupportedOperationException ex) {
                // Fall back to row-based aggregation for history stores without native aggregate support.
            }
        }
        return null;
    }

    private Map<String, Long> readHourlyStats(Long start, Long end, String traceId, String spanId,
                                              Integer severityNumber, String severityText, String search,
                                              boolean hideInternal, boolean hideNoise) {
        if (hasWorkspaceContext()) {
            return null;
        }
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                Map<String, Long> aggregate = historyDataReader.countLogsByHour(
                        start, end, traceId, spanId, severityNumber, severityText, search,
                        hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise));
                if (aggregate != null && !aggregate.isEmpty()) {
                    return aggregate;
                }
            } catch (UnsupportedOperationException ex) {
                // Fall back to row-based aggregation for history stores without native aggregate support.
            }
        }
        return null;
    }

    private List<LogEntry> getFilteredLogs(Long start, Long end, String traceId, String spanId,
                                           Integer severityNumber, String severityText, String search,
                                           boolean hideInternal, boolean hideNoise) {
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                List<LogEntry> logs;
                if (hideInternal || hideNoise) {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise));
                } else {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search);
                }
                if (logs != null && !logs.isEmpty()) {
                    return filterQueryLogs(logs, hideInternal, hideNoise);
                }
            } catch (UnsupportedOperationException ex) {
                // Try the next reader. Not every history store supports log queries.
            }
        }
        return Collections.emptyList();
    }

    private Page<LogEntry> getPagedLogs(Long start, Long end, String traceId, String spanId,
                                        Integer severityNumber, String severityText, String search,
                                        Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise) {
        int offset = pageIndex * pageSize;
        Sort sort = Sort.by(Sort.Direction.DESC, "timeUnixNano");
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sort);

        if (hasWorkspaceContext()) {
            return getWorkspacePagedLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                    pageRequest, offset, pageSize, hideInternal, hideNoise);
        }

        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                if (hideInternal || hideNoise) {
                    Set<String> hiddenServiceNames = hiddenServiceNames(hideInternal, hideNoise);
                    boolean requireServiceName = shouldRequireServiceName(hideInternal, hideNoise);
                    long totalElements = historyDataReader.countLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames, requireServiceName);
                    if (totalElements <= 0) {
                        continue;
                    }
                    List<LogEntry> pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                            start, end, traceId, spanId, severityNumber, severityText, search, offset, pageSize,
                            hiddenServiceNames, requireServiceName);
                    List<LogEntry> filteredLogs = filterQueryLogs(pagedLogs, hideInternal, hideNoise);
                    long safeTotal = filteredLogs.size() < (pagedLogs == null ? 0 : pagedLogs.size())
                            ? offset + filteredLogs.size()
                            : totalElements;
                    return new PageImpl<>(filteredLogs, pageRequest, safeTotal);
                }
                long totalElements = historyDataReader.countLogsByMultipleConditions(
                        start, end, traceId, spanId, severityNumber, severityText, search);
                if (totalElements <= 0) {
                    continue;
                }
                List<LogEntry> pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                        start, end, traceId, spanId, severityNumber, severityText, search, offset, pageSize);
                List<LogEntry> filteredLogs = filterQueryLogs(pagedLogs, hideInternal, hideNoise);
                long safeTotal = filteredLogs.size() < (pagedLogs == null ? 0 : pagedLogs.size())
                        ? offset + filteredLogs.size()
                        : totalElements;
                return new PageImpl<>(filteredLogs, pageRequest, safeTotal);
            } catch (UnsupportedOperationException ex) {
                // Try the next reader. Not every history store supports log queries.
            }
        }
        return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
    }

    private Page<LogEntry> getWorkspacePagedLogs(Long start, Long end, String traceId, String spanId,
                                                 Integer severityNumber, String severityText, String search,
                                                 PageRequest pageRequest, int offset, int pageSize,
                                                 boolean hideInternal, boolean hideNoise) {
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                List<LogEntry> logs;
                if (hideInternal || hideNoise) {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise));
                } else {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search);
                }
                if (logs == null || logs.isEmpty()) {
                    continue;
                }
                List<LogEntry> filteredLogs = filterQueryLogs(logs, hideInternal, hideNoise);
                int fromIndex = Math.min(offset, filteredLogs.size());
                int toIndex = Math.min(fromIndex + pageSize, filteredLogs.size());
                return new PageImpl<>(List.copyOf(filteredLogs.subList(fromIndex, toIndex)),
                        pageRequest, filteredLogs.size());
            } catch (UnsupportedOperationException ex) {
                // Try the next reader. Not every history store supports log queries.
            }
        }
        return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
    }

    private Set<String> hiddenServiceNames(boolean hideInternal, boolean hideNoise) {
        if (!hideInternal && !hideNoise) {
            return Collections.emptySet();
        }
        Set<String> names = new LinkedHashSet<>();
        if (hideInternal || hideNoise) {
            names.addAll(WORKSPACE_INFRA_SERVICE_NAMES);
        }
        if (hideNoise) {
            names.addAll(DEMO_INFRA_SERVICE_NAMES);
        }
        return names;
    }

    private boolean shouldRequireServiceName(boolean hideInternal, boolean hideNoise) {
        return hideInternal || hideNoise;
    }

    private List<LogEntry> filterQueryLogs(List<LogEntry> logs, boolean hideInternal, boolean hideNoise) {
        if (logs == null || logs.isEmpty()) {
            return logs == null ? Collections.emptyList() : logs;
        }
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        if (!StringUtils.hasText(workspaceId) && !hideInternal && !hideNoise) {
            return logs;
        }
        String normalizedWorkspaceId = StringUtils.hasText(workspaceId)
                ? AuthTokenScopes.normalizeWorkspaceId(workspaceId)
                : null;
        return logs.stream()
                .filter(log -> !shouldHideWorkspaceLog(log, hideInternal, hideNoise))
                .filter(log -> matchesWorkspace(log, normalizedWorkspaceId))
                .toList();
    }

    private boolean shouldHideWorkspaceLog(LogEntry logEntry, boolean hideInternal, boolean hideNoise) {
        String serviceName = resolveServiceName(logEntry);
        if (!StringUtils.hasText(serviceName)) {
            return hideInternal || hideNoise;
        }
        if ((hideInternal || hideNoise) && WORKSPACE_INFRA_SERVICE_NAMES.contains(serviceName)) {
            return true;
        }
        return hideNoise && DEMO_INFRA_SERVICE_NAMES.contains(serviceName);
    }

    private boolean hasWorkspaceContext() {
        return StringUtils.hasText(AuthTokenRequestContext.currentWorkspaceId());
    }

    private boolean matchesWorkspace(LogEntry logEntry, String workspaceId) {
        if (!StringUtils.hasText(workspaceId)) {
            return true;
        }
        String logWorkspaceId = resolveWorkspaceId(logEntry);
        if (!StringUtils.hasText(logWorkspaceId)) {
            return AuthTokenScopes.DEFAULT_WORKSPACE_ID.equals(workspaceId);
        }
        return workspaceId.equals(AuthTokenScopes.normalizeWorkspaceId(logWorkspaceId));
    }

    private String resolveWorkspaceId(LogEntry logEntry) {
        if (logEntry == null || logEntry.getResource() == null || logEntry.getResource().isEmpty()) {
            return null;
        }
        for (String key : WORKSPACE_RESOURCE_KEYS) {
            String value = normalizeRawValue(logEntry.getResource().get(key));
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private String resolveServiceName(LogEntry logEntry) {
        if (logEntry == null || logEntry.getResource() == null || logEntry.getResource().isEmpty()) {
            return null;
        }
        String serviceName = normalizeResourceValue(logEntry.getResource().get("service.name"));
        if (!StringUtils.hasText(serviceName)) {
            serviceName = normalizeResourceValue(logEntry.getResource().get("service_name"));
        }
        return serviceName;
    }

    private String normalizeRawValue(Object rawValue) {
        if (rawValue == null) {
            return null;
        }
        String normalized = String.valueOf(rawValue).trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeResourceValue(Object rawValue) {
        if (rawValue == null) {
            return null;
        }
        String normalized = String.valueOf(rawValue).trim().toLowerCase();
        return normalized.isEmpty() ? null : normalized;
    }
}
