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
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
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

    private static final int DEFAULT_GROUP_BY_LIMIT = 20;
    private static final int MAX_GROUP_BY_LIMIT = 100;
    private static final long MAX_GROUP_BY_MIN_COUNT = 1_000_000L;
    private static final int DEFAULT_LIST_PAGE_INDEX = 0;
    private static final int DEFAULT_LIST_PAGE_SIZE = 20;
    private static final int MAX_LIST_PAGE_SIZE = 1000;
    private static final int DEFAULT_CONTEXT_LIMIT = 10;
    private static final int MAX_CONTEXT_LIMIT = 50;
    private static final long DEFAULT_CONTEXT_WINDOW_MS = 300_000L;
    private static final String LOG_FILTER_NEGATION_PREFIX = "!";
    private static final String LOG_FILTER_IN_PREFIX = "__hz_in__:";
    private static final String LOG_FILTER_NOT_IN_PREFIX = "__hz_not_in__:";
    private static final String LOG_FILTER_VALUE_DELIMITER = "\u001F";
    private static final Pattern LOG_FILTER_LIST_OPERATOR_PATTERN = Pattern.compile(
            "^\\s*([A-Za-z0-9._:-]+)\\s+(NOT\\s+IN|IN)\\s*(\\(.+\\))\\s*$",
            Pattern.CASE_INSENSITIVE);

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
    private static final Set<String> ENTITY_SCOPE_RESOURCE_KEYS = Set.of(
            "service.name",
            "service.namespace",
            "deployment.environment.name"
    );

    private final List<HistoryDataReader> historyDataReaders;
    private final ObservabilityWorkspaceQueryGateway workspaceQueryGateway;

    @Autowired
    public LogQueryServiceImpl(List<HistoryDataReader> historyDataReaders,
                               Optional<ObservabilityWorkspaceQueryGateway> workspaceQueryGateway) {
        this.historyDataReaders = historyDataReaders == null ? List.of()
                : historyDataReaders.stream().filter(Objects::nonNull).toList();
        this.workspaceQueryGateway = workspaceQueryGateway.orElse(null);
    }

    public LogQueryServiceImpl(List<HistoryDataReader> historyDataReaders) {
        this(historyDataReaders, Optional.empty());
    }

    @Override
    public Page<LogEntry> list(Long start, Long end, String traceId, String spanId,
                               Integer severityNumber, String severityText, String search,
                               String serviceName, String serviceNamespace, String environment,
                               Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise) {
        return list(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, null, null,
                pageIndex, pageSize, hideInternal, hideNoise);
    }

    @Override
    public Page<LogEntry> list(Long start, Long end, String traceId, String spanId,
                               Integer severityNumber, String severityText, String search,
                               String serviceName, String serviceNamespace, String environment,
                               String resourceFilter, String attributeFilter,
                               Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise) {
        Map<String, String> resourceFilters = parseLogAttributeFilter(resourceFilter, true);
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter, true);
        return getPagedLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                pageIndex, pageSize, hideInternal, hideNoise);
    }

    @Override
    public Page<LogEntry> list(Long entityId, Long start, Long end, String traceId, String spanId,
                               Integer severityNumber, String severityText, String search,
                               String serviceName, String serviceNamespace, String environment,
                               String resourceFilter, String attributeFilter,
                               Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise) {
        LogServiceContext context = resolveEntityFirstLogServiceContext(entityId, serviceName, serviceNamespace, environment);
        Map<String, String> resourceFilters = removeEntityScopeResourceFilters(
                context, parseLogAttributeFilter(resourceFilter, true));
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter, true);
        return getPagedLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                context.serviceName(), context.serviceNamespace(), context.environment(), resourceFilters, attributeFilters,
                pageIndex, pageSize, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> overviewStats(Long start, Long end, String traceId, String spanId,
                                             Integer severityNumber, String severityText, String search,
                                             String serviceName, String serviceNamespace, String environment,
                                             boolean hideInternal, boolean hideNoise) {
        return overviewStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, null, null, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> overviewStats(Long start, Long end, String traceId, String spanId,
                                             Integer severityNumber, String severityText, String search,
                                             String serviceName, String serviceNamespace, String environment,
                                             String resourceFilter, String attributeFilter,
                                             boolean hideInternal, boolean hideNoise) {
        Map<String, String> resourceFilters = parseLogAttributeFilter(resourceFilter, true);
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter, true);
        return overviewStatsWithFilters(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> overviewStats(Long entityId, Long start, Long end, String traceId, String spanId,
                                             Integer severityNumber, String severityText, String search,
                                             String serviceName, String serviceNamespace, String environment,
                                             String resourceFilter, String attributeFilter,
                                             boolean hideInternal, boolean hideNoise) {
        LogServiceContext context = resolveEntityFirstLogServiceContext(entityId, serviceName, serviceNamespace, environment);
        Map<String, String> resourceFilters = removeEntityScopeResourceFilters(
                context, parseLogAttributeFilter(resourceFilter, true));
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter, true);
        return overviewStatsWithFilters(start, end, traceId, spanId, severityNumber, severityText, search,
                context.serviceName(), context.serviceNamespace(), context.environment(), resourceFilters, attributeFilters,
                hideInternal, hideNoise);
    }

    private Map<String, Object> overviewStatsWithFilters(Long start, Long end, String traceId, String spanId,
                                                         Integer severityNumber, String severityText, String search,
                                                         String serviceName, String serviceNamespace, String environment,
                                                         Map<String, String> resourceFilters,
                                                         Map<String, String> attributeFilters,
                                                         boolean hideInternal, boolean hideNoise) {
        if (!hasComplexAttributeFilters(resourceFilters, attributeFilters)) {
            Map<String, Long> aggregate = readSeverityBuckets(start, end, traceId, spanId, severityNumber,
                    severityText, search, serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    hideInternal, hideNoise);
            if (aggregate != null) {
                return new HashMap<>(aggregate);
            }
        }

        List<LogEntry> logs = getFilteredLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise);

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
                                                  String serviceName, String serviceNamespace, String environment,
                                                  boolean hideInternal, boolean hideNoise) {
        return traceCoverageStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, null, null, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> traceCoverageStats(Long start, Long end, String traceId, String spanId,
                                                  Integer severityNumber, String severityText, String search,
                                                  String serviceName, String serviceNamespace, String environment,
                                                  String resourceFilter, String attributeFilter,
                                                  boolean hideInternal, boolean hideNoise) {
        Map<String, String> resourceFilters = parseLogAttributeFilter(resourceFilter, true);
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter, true);
        return traceCoverageStatsWithFilters(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> traceCoverageStats(Long entityId, Long start, Long end, String traceId, String spanId,
                                                  Integer severityNumber, String severityText, String search,
                                                  String serviceName, String serviceNamespace, String environment,
                                                  String resourceFilter, String attributeFilter,
                                                  boolean hideInternal, boolean hideNoise) {
        LogServiceContext context = resolveEntityFirstLogServiceContext(entityId, serviceName, serviceNamespace, environment);
        Map<String, String> resourceFilters = removeEntityScopeResourceFilters(
                context, parseLogAttributeFilter(resourceFilter, true));
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter, true);
        return traceCoverageStatsWithFilters(start, end, traceId, spanId, severityNumber, severityText, search,
                context.serviceName(), context.serviceNamespace(), context.environment(), resourceFilters, attributeFilters,
                hideInternal, hideNoise);
    }

    private Map<String, Object> traceCoverageStatsWithFilters(Long start, Long end, String traceId, String spanId,
                                                              Integer severityNumber, String severityText, String search,
                                                              String serviceName, String serviceNamespace, String environment,
                                                              Map<String, String> resourceFilters,
                                                              Map<String, String> attributeFilters,
                                                              boolean hideInternal, boolean hideNoise) {
        Map<String, Long> aggregate = null;
        if (!hasComplexAttributeFilters(resourceFilters, attributeFilters)) {
            aggregate = readTraceCoverage(start, end, traceId, spanId, severityNumber,
                    severityText, search, serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    hideInternal, hideNoise);
        }
        if (aggregate != null) {
            Map<String, Object> result = new HashMap<>();
            result.put("traceCoverage", aggregate);
            return result;
        }

        List<LogEntry> logs = getFilteredLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise);

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
                                          String serviceName, String serviceNamespace, String environment,
                                          boolean hideInternal, boolean hideNoise) {
        return trendStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, null, null, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> trendStats(Long start, Long end, String traceId, String spanId,
                                          Integer severityNumber, String severityText, String search,
                                          String serviceName, String serviceNamespace, String environment,
                                          String resourceFilter, String attributeFilter,
                                          boolean hideInternal, boolean hideNoise) {
        Map<String, String> resourceFilters = parseLogAttributeFilter(resourceFilter, true);
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter, true);
        return trendStatsWithFilters(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> trendStats(Long entityId, Long start, Long end, String traceId, String spanId,
                                          Integer severityNumber, String severityText, String search,
                                          String serviceName, String serviceNamespace, String environment,
                                          String resourceFilter, String attributeFilter,
                                          boolean hideInternal, boolean hideNoise) {
        LogServiceContext context = resolveEntityFirstLogServiceContext(entityId, serviceName, serviceNamespace, environment);
        Map<String, String> resourceFilters = removeEntityScopeResourceFilters(
                context, parseLogAttributeFilter(resourceFilter, true));
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter, true);
        return trendStatsWithFilters(start, end, traceId, spanId, severityNumber, severityText, search,
                context.serviceName(), context.serviceNamespace(), context.environment(), resourceFilters, attributeFilters,
                hideInternal, hideNoise);
    }

    private Map<String, Object> trendStatsWithFilters(Long start, Long end, String traceId, String spanId,
                                                      Integer severityNumber, String severityText, String search,
                                                      String serviceName, String serviceNamespace, String environment,
                                                      Map<String, String> resourceFilters,
                                                      Map<String, String> attributeFilters,
                                                      boolean hideInternal, boolean hideNoise) {
        Map<String, Long> aggregate = null;
        if (!hasComplexAttributeFilters(resourceFilters, attributeFilters)) {
            aggregate = readHourlyStats(start, end, traceId, spanId, severityNumber,
                    severityText, search, serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    hideInternal, hideNoise);
        }
        if (aggregate != null) {
            Map<String, Object> result = new HashMap<>();
            result.put("hourlyStats", aggregate);
            return result;
        }

        List<LogEntry> logs = getFilteredLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise);

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

    @Override
    public Map<String, Object> groupByStats(Long start, Long end, String traceId, String spanId,
                                            Integer severityNumber, String severityText, String search,
                                            String serviceName, String serviceNamespace, String environment,
                                            String resourceFilter, String attributeFilter, String groupBy,
                                            Integer limit, String orderBy, Integer minCount,
                                            boolean hideInternal, boolean hideNoise) {
        String normalizedGroupBy = normalizeGroupBy(groupBy);
        int resolvedLimit = resolveGroupByLimit(limit);
        long resolvedMinCount = resolveGroupByMinCount(minCount);
        if (!StringUtils.hasText(normalizedGroupBy)) {
            return groupByResult("", Map.of(), resolvedLimit, orderBy, resolvedMinCount);
        }
        Map<String, String> resourceFilters = parseLogAttributeFilter(resourceFilter, true);
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter, true);
        return groupByStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, normalizedGroupBy,
                resolvedLimit, orderBy, resolvedMinCount, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> groupByStats(Long entityId, Long start, Long end, String traceId, String spanId,
                                            Integer severityNumber, String severityText, String search,
                                            String serviceName, String serviceNamespace, String environment,
                                            String resourceFilter, String attributeFilter, String groupBy,
                                            Integer limit, String orderBy, Integer minCount,
                                            boolean hideInternal, boolean hideNoise) {
        String normalizedGroupBy = normalizeGroupBy(groupBy);
        int resolvedLimit = resolveGroupByLimit(limit);
        long resolvedMinCount = resolveGroupByMinCount(minCount);
        if (!StringUtils.hasText(normalizedGroupBy)) {
            return groupByResult("", Map.of(), resolvedLimit, orderBy, resolvedMinCount);
        }
        LogServiceContext context = resolveEntityFirstLogServiceContext(entityId, serviceName, serviceNamespace, environment);
        Map<String, String> resourceFilters = removeEntityScopeResourceFilters(
                context, parseLogAttributeFilter(resourceFilter, true));
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter, true);
        return groupByStats(start, end, traceId, spanId, severityNumber, severityText, search,
                context.serviceName(), context.serviceNamespace(), context.environment(), resourceFilters, attributeFilters,
                normalizedGroupBy, resolvedLimit, orderBy, resolvedMinCount, hideInternal, hideNoise);
    }

    private Map<String, Object> groupByStats(Long start, Long end, String traceId, String spanId,
                                            Integer severityNumber, String severityText, String search,
                                            String serviceName, String serviceNamespace, String environment,
                                            Map<String, String> resourceFilters, Map<String, String> attributeFilters,
                                            String normalizedGroupBy, int resolvedLimit, String orderBy,
                                            long resolvedMinCount, boolean hideInternal, boolean hideNoise) {
        Map<String, Long> aggregate = null;
        if (!hasComplexAttributeFilters(resourceFilters, attributeFilters)) {
            aggregate = readGroupStats(start, end, traceId, spanId, severityNumber,
                    severityText, search, serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    normalizedGroupBy, hideInternal, hideNoise);
        }
        if (aggregate != null) {
            return groupByResult(normalizedGroupBy, aggregate, resolvedLimit, orderBy, resolvedMinCount);
        }

        List<LogEntry> logs = getFilteredLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise);
        Map<String, Long> grouped = logs.stream()
                .collect(Collectors.groupingBy(log -> resolveLogGroupValue(log, normalizedGroupBy), Collectors.counting()));
        return groupByResult(normalizedGroupBy, grouped, resolvedLimit, orderBy, resolvedMinCount);
    }

    @Override
    public Map<String, Object> context(Long logTimeUnixNano, Long start, Long end,
                                       String serviceName, String serviceNamespace, String environment,
                                       String resourceFilter, String attributeFilter,
                                       Integer limit, boolean hideInternal, boolean hideNoise) {
        return context(logTimeUnixNano, start, end, serviceName, serviceNamespace, environment,
                resourceFilter, attributeFilter, limit, null, null, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> context(Long logTimeUnixNano, Long start, Long end,
                                       String serviceName, String serviceNamespace, String environment,
                                       String resourceFilter, String attributeFilter,
                                       Integer limit, String direction, Long cursorLogTimeUnixNano,
                                       boolean hideInternal, boolean hideNoise) {
        return contextWithFilters(logTimeUnixNano, start, end, serviceName, serviceNamespace, environment,
                parseLogAttributeFilter(resourceFilter, true), parseLogAttributeFilter(attributeFilter, true), limit, direction,
                cursorLogTimeUnixNano, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> context(Long entityId, Long logTimeUnixNano, Long start, Long end,
                                       String serviceName, String serviceNamespace, String environment,
                                       String resourceFilter, String attributeFilter,
                                       Integer limit, String direction, Long cursorLogTimeUnixNano,
                                       boolean hideInternal, boolean hideNoise) {
        LogServiceContext context = resolveEntityFirstLogServiceContext(entityId, serviceName, serviceNamespace, environment);
        Map<String, String> resourceFilters = removeEntityScopeResourceFilters(
                context, parseLogAttributeFilter(resourceFilter, true));
        return contextWithFilters(logTimeUnixNano, start, end, context.serviceName(), context.serviceNamespace(),
                context.environment(), resourceFilters, parseLogAttributeFilter(attributeFilter, true), limit, direction,
                cursorLogTimeUnixNano, hideInternal, hideNoise);
    }

    private Map<String, Object> contextWithFilters(Long logTimeUnixNano, Long start, Long end,
                                                   String serviceName, String serviceNamespace, String environment,
                                                   Map<String, String> resourceFilters,
                                                   Map<String, String> attributeFilters,
                                                   Integer limit, String direction, Long cursorLogTimeUnixNano,
                                                   boolean hideInternal, boolean hideNoise) {
        long targetTimeUnixNano = logTimeUnixNano == null ? 0L : logTimeUnixNano;
        String normalizedDirection = normalizeContextDirection(direction);
        boolean beforePage = "before".equals(normalizedDirection);
        boolean afterPage = "after".equals(normalizedDirection);
        long cursorTimeUnixNano = cursorLogTimeUnixNano == null ? targetTimeUnixNano : cursorLogTimeUnixNano;
        long targetTimeMillis = targetTimeUnixNano / 1_000_000L;
        long resolvedStart = start == null ? targetTimeMillis - DEFAULT_CONTEXT_WINDOW_MS : start;
        long resolvedEnd = end == null ? targetTimeMillis + DEFAULT_CONTEXT_WINDOW_MS : end;
        if (resolvedStart > resolvedEnd) {
            long previousStart = resolvedStart;
            resolvedStart = resolvedEnd;
            resolvedEnd = previousStart;
        }
        int resolvedLimit = resolveContextLimit(limit);
        List<LogEntry> contextLogs = getFilteredLogs(resolvedStart, resolvedEnd, null, null, null, null, null,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                hideInternal, hideNoise);

        List<LogEntry> beforeCandidates = contextLogs.stream()
                .filter(log -> hasComparableLogTime(log) && log.getTimeUnixNano() < (beforePage ? cursorTimeUnixNano : targetTimeUnixNano))
                .sorted(Comparator.comparing(LogEntry::getTimeUnixNano).reversed())
                .toList();
        List<LogEntry> afterCandidates = contextLogs.stream()
                .filter(log -> hasComparableLogTime(log) && log.getTimeUnixNano() > (afterPage ? cursorTimeUnixNano : targetTimeUnixNano))
                .sorted(Comparator.comparing(LogEntry::getTimeUnixNano))
                .toList();
        LogEntry selected = beforePage || afterPage ? null : contextLogs.stream()
                .filter(log -> hasComparableLogTime(log) && log.getTimeUnixNano() == targetTimeUnixNano)
                .findFirst()
                .orElse(null);
        List<LogEntry> before = afterPage ? List.of() : beforeCandidates.stream()
                .limit(resolvedLimit)
                .sorted(Comparator.comparing(LogEntry::getTimeUnixNano))
                .toList();
        List<LogEntry> after = beforePage ? List.of() : afterCandidates.stream()
                .limit(resolvedLimit)
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("targetTimeUnixNano", targetTimeUnixNano);
        result.put("windowStart", resolvedStart);
        result.put("windowEnd", resolvedEnd);
        result.put("limit", resolvedLimit);
        if (StringUtils.hasText(normalizedDirection)) {
            result.put("direction", normalizedDirection);
            result.put("cursorLogTimeUnixNano", cursorTimeUnixNano);
        }
        result.put("before", before);
        if (!beforePage && !afterPage) {
            result.put("selected", selected);
        }
        result.put("after", after);
        result.put("hasMoreBefore", !afterPage && beforeCandidates.size() > resolvedLimit);
        result.put("hasMoreAfter", !beforePage && afterCandidates.size() > resolvedLimit);
        return result;
    }

    private String normalizeContextDirection(String direction) {
        if (!StringUtils.hasText(direction)) {
            return "";
        }
        String normalized = direction.trim().toLowerCase();
        return "before".equals(normalized) || "after".equals(normalized) ? normalized : "";
    }

    private Map<String, Object> groupByResult(String groupBy, Map<String, Long> aggregate, int limit, String orderBy, long minCount) {
        List<Map<String, Object>> groups = aggregate.entrySet().stream()
                .filter(entry -> StringUtils.hasText(entry.getKey()))
                .filter(entry -> entry.getValue() >= minCount)
                .sorted(resolveLogGroupComparator(orderBy))
                .limit(limit)
                .map(entry -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("value", entry.getKey());
                    row.put("count", entry.getValue());
                    return row;
                })
                .toList();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("groupBy", groupBy);
        result.put("groups", groups);
        return result;
    }

    private Comparator<Map.Entry<String, Long>> resolveLogGroupComparator(String orderBy) {
        if ("count-asc".equalsIgnoreCase(StringUtils.trimWhitespace(orderBy))) {
            return Comparator.comparingLong(Map.Entry::getValue);
        }
        return (left, right) -> Long.compare(right.getValue(), left.getValue());
    }

    private int resolveGroupByLimit(Integer limit) {
        if (limit == null || limit < 1) {
            return DEFAULT_GROUP_BY_LIMIT;
        }
        return Math.min(limit, MAX_GROUP_BY_LIMIT);
    }

    private long resolveGroupByMinCount(Integer minCount) {
        if (minCount == null || minCount < 1) {
            return 1L;
        }
        return Math.min(minCount.longValue(), MAX_GROUP_BY_MIN_COUNT);
    }

    private int resolveContextLimit(Integer limit) {
        if (limit == null || limit < 1) {
            return DEFAULT_CONTEXT_LIMIT;
        }
        return Math.min(limit, MAX_CONTEXT_LIMIT);
    }

    private boolean hasComparableLogTime(LogEntry logEntry) {
        return logEntry != null && logEntry.getTimeUnixNano() != null;
    }

    private Map<String, Long> readGroupStats(Long start, Long end, String traceId, String spanId,
                                             Integer severityNumber, String severityText, String search,
                                             String serviceName, String serviceNamespace, String environment,
                                             Map<String, String> resourceFilters,
                                             Map<String, String> attributeFilters,
                                             String groupBy, boolean hideInternal, boolean hideNoise) {
        String normalizedWorkspaceId = hasWorkspaceContext()
                ? AuthTokenScopes.normalizeWorkspaceId(AuthTokenRequestContext.currentWorkspaceId())
                : null;
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                Map<String, Long> aggregate = historyDataReader.countLogsByGroup(
                        start, end, traceId, spanId, severityNumber, severityText, search,
                        hiddenServiceNames(hideInternal, hideNoise),
                        shouldRequireServiceName(hideInternal, hideNoise), normalizedWorkspaceId,
                        serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, groupBy);
                if (aggregate != null && !aggregate.isEmpty()) {
                    return aggregate;
                }
            } catch (UnsupportedOperationException ex) {
                // Fall back to row-based grouping for history stores without native group-by support.
            }
        }
        return null;
    }

    private Map<String, Long> readSeverityBuckets(Long start, Long end, String traceId, String spanId,
                                                  Integer severityNumber, String severityText, String search,
                                                  String serviceName, String serviceNamespace, String environment,
                                                  Map<String, String> resourceFilters,
                                                  Map<String, String> attributeFilters,
                                                  boolean hideInternal, boolean hideNoise) {
        String normalizedWorkspaceId = hasWorkspaceContext()
                ? AuthTokenScopes.normalizeWorkspaceId(AuthTokenRequestContext.currentWorkspaceId())
                : null;
        boolean hasAttributeFilters = hasAttributeFilters(resourceFilters, attributeFilters);
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                Map<String, Long> aggregate;
                if (hasAttributeFilters) {
                    aggregate = historyDataReader.countLogsBySeverityBuckets(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), normalizedWorkspaceId,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters);
                } else if (hasServiceContext(serviceName, serviceNamespace, environment)) {
                    aggregate = historyDataReader.countLogsBySeverityBuckets(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), normalizedWorkspaceId,
                            serviceName, serviceNamespace, environment);
                } else if (StringUtils.hasText(normalizedWorkspaceId)) {
                    aggregate = historyDataReader.countLogsBySeverityBuckets(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), normalizedWorkspaceId);
                } else {
                    aggregate = historyDataReader.countLogsBySeverityBuckets(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise));
                }
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
                                                String serviceName, String serviceNamespace, String environment,
                                                Map<String, String> resourceFilters,
                                                Map<String, String> attributeFilters,
                                                boolean hideInternal, boolean hideNoise) {
        String normalizedWorkspaceId = hasWorkspaceContext()
                ? AuthTokenScopes.normalizeWorkspaceId(AuthTokenRequestContext.currentWorkspaceId())
                : null;
        boolean hasAttributeFilters = hasAttributeFilters(resourceFilters, attributeFilters);
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                Map<String, Long> aggregate;
                if (hasAttributeFilters) {
                    aggregate = historyDataReader.countLogTraceCoverage(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), normalizedWorkspaceId,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters);
                } else if (hasServiceContext(serviceName, serviceNamespace, environment)) {
                    aggregate = historyDataReader.countLogTraceCoverage(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), normalizedWorkspaceId,
                            serviceName, serviceNamespace, environment);
                } else if (StringUtils.hasText(normalizedWorkspaceId)) {
                    aggregate = historyDataReader.countLogTraceCoverage(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), normalizedWorkspaceId);
                } else {
                    aggregate = historyDataReader.countLogTraceCoverage(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise));
                }
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
                                              String serviceName, String serviceNamespace, String environment,
                                              Map<String, String> resourceFilters,
                                              Map<String, String> attributeFilters,
                                              boolean hideInternal, boolean hideNoise) {
        String normalizedWorkspaceId = hasWorkspaceContext()
                ? AuthTokenScopes.normalizeWorkspaceId(AuthTokenRequestContext.currentWorkspaceId())
                : null;
        boolean hasAttributeFilters = hasAttributeFilters(resourceFilters, attributeFilters);
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                Map<String, Long> aggregate;
                if (hasAttributeFilters) {
                    aggregate = historyDataReader.countLogsByHour(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), normalizedWorkspaceId,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters);
                } else if (hasServiceContext(serviceName, serviceNamespace, environment)) {
                    aggregate = historyDataReader.countLogsByHour(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), normalizedWorkspaceId,
                            serviceName, serviceNamespace, environment);
                } else if (StringUtils.hasText(normalizedWorkspaceId)) {
                    aggregate = historyDataReader.countLogsByHour(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), normalizedWorkspaceId);
                } else {
                    aggregate = historyDataReader.countLogsByHour(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise));
                }
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
                                           String serviceName, String serviceNamespace, String environment,
                                           Map<String, String> resourceFilters,
                                           Map<String, String> attributeFilters,
                                           boolean hideInternal, boolean hideNoise) {
        boolean hasAttributeFilters = hasAttributeFilters(resourceFilters, attributeFilters);
        if (hasComplexAttributeFilters(resourceFilters, attributeFilters)) {
            return getRowFilteredLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    hideInternal, hideNoise);
        }
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                List<LogEntry> logs;
                if (hasAttributeFilters) {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise),
                            null, serviceName, serviceNamespace, environment, resourceFilters, attributeFilters);
                } else if (hasServiceContext(serviceName, serviceNamespace, environment)) {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise),
                            null, serviceName, serviceNamespace, environment);
                } else if (hideInternal || hideNoise) {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise));
                } else {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search);
                }
                if (logs != null && !logs.isEmpty()) {
                    return filterQueryLogs(logs, serviceName, serviceNamespace, environment,
                            resourceFilters, attributeFilters, hideInternal, hideNoise);
                }
            } catch (UnsupportedOperationException ex) {
                // Try the next reader. Not every history store supports log queries.
            }
        }
        if (hasExtendedFilterContext(serviceName, serviceNamespace, environment, resourceFilters, attributeFilters)) {
            return getRowFilteredLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    hideInternal, hideNoise);
        }
        return Collections.emptyList();
    }

    private List<LogEntry> getRowFilteredLogs(Long start, Long end, String traceId, String spanId,
                                              Integer severityNumber, String severityText, String search,
                                              String serviceName, String serviceNamespace, String environment,
                                              Map<String, String> resourceFilters,
                                              Map<String, String> attributeFilters,
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
                    return filterQueryLogs(logs, serviceName, serviceNamespace, environment,
                            resourceFilters, attributeFilters, hideInternal, hideNoise);
                }
            } catch (UnsupportedOperationException ex) {
                // Try the next reader. Not every history store supports log queries.
            }
        }
        return Collections.emptyList();
    }

    private Page<LogEntry> getPagedLogs(Long start, Long end, String traceId, String spanId,
                                        Integer severityNumber, String severityText, String search,
                                        String serviceName, String serviceNamespace, String environment,
                                        Map<String, String> resourceFilters,
                                        Map<String, String> attributeFilters,
                                        Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise) {
        int resolvedPageIndex = normalizeListPageIndex(pageIndex);
        int resolvedPageSize = normalizeListPageSize(pageSize);
        int offset = Math.toIntExact(Math.min((long) resolvedPageIndex * resolvedPageSize, Integer.MAX_VALUE));
        Sort sort = Sort.by(Sort.Direction.DESC, "timeUnixNano");
        PageRequest pageRequest = PageRequest.of(resolvedPageIndex, resolvedPageSize, sort);

        if (hasComplexAttributeFilters(resourceFilters, attributeFilters)) {
            return getRowFilteredPagedLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    pageRequest, offset, resolvedPageSize, hideInternal, hideNoise);
        }

        if (hasWorkspaceContext()) {
            return getWorkspacePagedLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    pageRequest, offset, resolvedPageSize, hideInternal, hideNoise);
        }

        boolean hasAttributeFilters = hasAttributeFilters(resourceFilters, attributeFilters);
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                if (hasAttributeFilters) {
                    Set<String> hiddenServiceNames = hiddenServiceNames(hideInternal, hideNoise);
                    boolean requireServiceName = shouldRequireServiceName(hideInternal, hideNoise);
                    long totalElements = historyDataReader.countLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames, requireServiceName, null, serviceName, serviceNamespace, environment,
                            resourceFilters, attributeFilters);
                    if (totalElements <= 0) {
                        continue;
                    }
                    List<LogEntry> pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                            start, end, traceId, spanId, severityNumber, severityText, search, offset, resolvedPageSize,
                            hiddenServiceNames, requireServiceName, null, serviceName, serviceNamespace, environment,
                            resourceFilters, attributeFilters);
                    List<LogEntry> filteredLogs = filterQueryLogs(pagedLogs,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                            hideInternal, hideNoise);
                    long safeTotal = filteredLogs.size() < (pagedLogs == null ? 0 : pagedLogs.size())
                            ? offset + filteredLogs.size()
                            : totalElements;
                    return new PageImpl<>(filteredLogs, pageRequest, safeTotal);
                } else if (hasServiceContext(serviceName, serviceNamespace, environment)) {
                    Set<String> hiddenServiceNames = hiddenServiceNames(hideInternal, hideNoise);
                    boolean requireServiceName = shouldRequireServiceName(hideInternal, hideNoise);
                    long totalElements = historyDataReader.countLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames, requireServiceName, null, serviceName, serviceNamespace, environment);
                    if (totalElements <= 0) {
                        continue;
                    }
                    List<LogEntry> pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                            start, end, traceId, spanId, severityNumber, severityText, search, offset, resolvedPageSize,
                            hiddenServiceNames, requireServiceName, null, serviceName, serviceNamespace, environment);
                    List<LogEntry> filteredLogs = filterQueryLogs(pagedLogs,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                            hideInternal, hideNoise);
                    long safeTotal = filteredLogs.size() < (pagedLogs == null ? 0 : pagedLogs.size())
                            ? offset + filteredLogs.size()
                            : totalElements;
                    return new PageImpl<>(filteredLogs, pageRequest, safeTotal);
                } else if (hideInternal || hideNoise) {
                    Set<String> hiddenServiceNames = hiddenServiceNames(hideInternal, hideNoise);
                    boolean requireServiceName = shouldRequireServiceName(hideInternal, hideNoise);
                    long totalElements = historyDataReader.countLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames, requireServiceName);
                    if (totalElements <= 0) {
                        continue;
                    }
                    List<LogEntry> pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                            start, end, traceId, spanId, severityNumber, severityText, search, offset, resolvedPageSize,
                            hiddenServiceNames, requireServiceName);
                    List<LogEntry> filteredLogs = filterQueryLogs(pagedLogs,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                            hideInternal, hideNoise);
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
                        start, end, traceId, spanId, severityNumber, severityText, search, offset, resolvedPageSize);
                List<LogEntry> filteredLogs = filterQueryLogs(pagedLogs,
                        serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                        hideInternal, hideNoise);
                long safeTotal = filteredLogs.size() < (pagedLogs == null ? 0 : pagedLogs.size())
                        ? offset + filteredLogs.size()
                        : totalElements;
                return new PageImpl<>(filteredLogs, pageRequest, safeTotal);
            } catch (UnsupportedOperationException ex) {
                // Try the next reader. Not every history store supports log queries.
            }
        }
        if (hasExtendedFilterContext(serviceName, serviceNamespace, environment, resourceFilters, attributeFilters)) {
            return getRowFilteredPagedLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    pageRequest, offset, resolvedPageSize, hideInternal, hideNoise);
        }
        return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
    }

    private int normalizeListPageIndex(Integer pageIndex) {
        if (pageIndex == null || pageIndex < DEFAULT_LIST_PAGE_INDEX) {
            return DEFAULT_LIST_PAGE_INDEX;
        }
        return pageIndex;
    }

    private int normalizeListPageSize(Integer pageSize) {
        if (pageSize == null || pageSize <= 0) {
            return DEFAULT_LIST_PAGE_SIZE;
        }
        return Math.min(pageSize, MAX_LIST_PAGE_SIZE);
    }

    private Page<LogEntry> getWorkspacePagedLogs(Long start, Long end, String traceId, String spanId,
                                                 Integer severityNumber, String severityText, String search,
                                                 String serviceName, String serviceNamespace, String environment,
                                                 Map<String, String> resourceFilters,
                                                 Map<String, String> attributeFilters,
                                                 PageRequest pageRequest, int offset, int pageSize,
                                                 boolean hideInternal, boolean hideNoise) {
        String normalizedWorkspaceId = AuthTokenScopes.normalizeWorkspaceId(AuthTokenRequestContext.currentWorkspaceId());
        Set<String> hiddenServiceNames = hiddenServiceNames(hideInternal, hideNoise);
        boolean requireServiceName = shouldRequireServiceName(hideInternal, hideNoise);
        boolean hasAttributeFilters = hasAttributeFilters(resourceFilters, attributeFilters);
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                long totalElements;
                if (hasAttributeFilters) {
                    if (hasServiceContext(serviceName, serviceNamespace, environment)) {
                        totalElements = historyDataReader.countLogsByMultipleConditions(
                                start, end, traceId, spanId, severityNumber, severityText, search,
                                hiddenServiceNames, requireServiceName, normalizedWorkspaceId,
                                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters);
                    } else {
                        totalElements = historyDataReader.countLogsByMultipleConditions(
                                start, end, traceId, spanId, severityNumber, severityText, search,
                                hiddenServiceNames, requireServiceName, normalizedWorkspaceId,
                                resourceFilters, attributeFilters);
                    }
                } else if (hasServiceContext(serviceName, serviceNamespace, environment)) {
                    totalElements = historyDataReader.countLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames, requireServiceName, normalizedWorkspaceId,
                            serviceName, serviceNamespace, environment);
                } else {
                    totalElements = historyDataReader.countLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames, requireServiceName, normalizedWorkspaceId);
                }
                if (totalElements <= 0) {
                    continue;
                }
                List<LogEntry> pagedLogs;
                if (hasAttributeFilters) {
                    if (hasServiceContext(serviceName, serviceNamespace, environment)) {
                        pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                                start, end, traceId, spanId, severityNumber, severityText, search, offset, pageSize,
                                hiddenServiceNames, requireServiceName, normalizedWorkspaceId,
                                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters);
                    } else {
                        pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                                start, end, traceId, spanId, severityNumber, severityText, search, offset, pageSize,
                                hiddenServiceNames, requireServiceName, normalizedWorkspaceId,
                                resourceFilters, attributeFilters);
                    }
                } else if (hasServiceContext(serviceName, serviceNamespace, environment)) {
                    pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                            start, end, traceId, spanId, severityNumber, severityText, search, offset, pageSize,
                            hiddenServiceNames, requireServiceName, normalizedWorkspaceId,
                            serviceName, serviceNamespace, environment);
                } else {
                    pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                            start, end, traceId, spanId, severityNumber, severityText, search, offset, pageSize,
                            hiddenServiceNames, requireServiceName, normalizedWorkspaceId);
                }
                List<LogEntry> guardedLogs = filterQueryLogs(pagedLogs,
                        serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                        hideInternal, hideNoise);
                long safeTotal = guardedLogs.size() < (pagedLogs == null ? 0 : pagedLogs.size())
                        ? offset + guardedLogs.size()
                        : totalElements;
                return new PageImpl<>(guardedLogs, pageRequest, safeTotal);
            } catch (UnsupportedOperationException ex) {
                // Fall back to row-based workspace filtering for history stores without native workspace predicates.
            }
        }

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
                List<LogEntry> filteredLogs = filterQueryLogs(logs,
                        serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                        hideInternal, hideNoise);
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

    private Page<LogEntry> getRowFilteredPagedLogs(Long start, Long end, String traceId, String spanId,
                                                   Integer severityNumber, String severityText, String search,
                                                   String serviceName, String serviceNamespace, String environment,
                                                   Map<String, String> resourceFilters,
                                                   Map<String, String> attributeFilters,
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
                List<LogEntry> filteredLogs = filterQueryLogs(logs,
                        serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                        hideInternal, hideNoise);
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

    private LogServiceContext resolveEntityFirstLogServiceContext(Long entityId, String serviceName,
                                                                  String serviceNamespace, String environment) {
        String resolvedServiceName = trimToNull(serviceName);
        String resolvedServiceNamespace = trimToNull(serviceNamespace);
        String resolvedEnvironment = trimToNull(environment);
        if (entityId == null || workspaceQueryGateway == null) {
            return new LogServiceContext(resolvedServiceName, resolvedServiceNamespace, resolvedEnvironment);
        }
        Optional<ObserveEntity> entity = workspaceQueryGateway.findEntityById(entityId);
        Set<String> resolvedIdentityKeys = new LinkedHashSet<>();
        for (EntityIdentity identity : rankedEntityIdentities(workspaceQueryGateway.findIdentitiesByEntityId(entityId))) {
            if (!StringUtils.hasText(identity.getIdentityKey()) || !StringUtils.hasText(identity.getIdentityValue())) {
                continue;
            }
            if (!resolvedIdentityKeys.add(identity.getIdentityKey())) {
                continue;
            }
            switch (identity.getIdentityKey()) {
                case "service.name" -> resolvedServiceName = trimToNull(identity.getIdentityValue());
                case "service.namespace" -> resolvedServiceNamespace = trimToNull(identity.getIdentityValue());
                case "deployment.environment.name" -> resolvedEnvironment = trimToNull(identity.getIdentityValue());
                default -> {
                }
            }
        }
        if (!StringUtils.hasText(resolvedServiceName) && entity.isPresent()
                && "service".equalsIgnoreCase(trimToNull(entity.get().getType()))) {
            resolvedServiceName = trimToNull(entity.get().getName());
        }
        if (!StringUtils.hasText(resolvedServiceNamespace) && entity.isPresent()) {
            resolvedServiceNamespace = trimToNull(entity.get().getNamespace());
        }
        if (!StringUtils.hasText(resolvedEnvironment) && entity.isPresent()) {
            resolvedEnvironment = trimToNull(entity.get().getEnvironment());
        }
        return new LogServiceContext(resolvedServiceName, resolvedServiceNamespace, resolvedEnvironment);
    }

    private List<EntityIdentity> rankedEntityIdentities(List<EntityIdentity> identities) {
        if (identities == null || identities.isEmpty()) {
            return List.of();
        }
        return identities.stream()
                .sorted(Comparator.comparing(EntityIdentity::isPrimaryIdentity).reversed()
                        .thenComparing(EntityIdentity::getPriority, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(EntityIdentity::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
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

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private record LogServiceContext(String serviceName, String serviceNamespace, String environment) {
    }

    private boolean hasServiceContext(String serviceName, String serviceNamespace, String environment) {
        return StringUtils.hasText(serviceName)
                || StringUtils.hasText(serviceNamespace)
                || StringUtils.hasText(environment);
    }

    private boolean hasExtendedFilterContext(String serviceName, String serviceNamespace, String environment,
                                             Map<String, String> resourceFilters,
                                             Map<String, String> attributeFilters) {
        return hasServiceContext(serviceName, serviceNamespace, environment)
                || hasAttributeFilters(resourceFilters, attributeFilters);
    }

    private boolean hasAttributeFilters(Map<String, String> resourceFilters, Map<String, String> attributeFilters) {
        return (resourceFilters != null && !resourceFilters.isEmpty())
                || (attributeFilters != null && !attributeFilters.isEmpty());
    }

    private boolean hasComplexAttributeFilters(Map<String, String> resourceFilters, Map<String, String> attributeFilters) {
        return hasComplexAttributeFilterValues(resourceFilters) || hasComplexAttributeFilterValues(attributeFilters);
    }

    private boolean hasComplexAttributeFilterValues(Map<String, String> filters) {
        return filters != null && filters.values().stream().anyMatch(this::isListLogAttributeFilter);
    }

    private Map<String, String> parseLogAttributeFilter(String filterExpression) {
        return parseLogAttributeFilter(filterExpression, false);
    }

    private Map<String, String> parseLogAttributeFilter(String filterExpression, boolean allowListOperators) {
        if (!StringUtils.hasText(filterExpression)) {
            return Collections.emptyMap();
        }
        Map<String, String> filters = new HashMap<>();
        for (String token : splitLogFilterClauses(filterExpression)) {
            if (!StringUtils.hasText(token)) {
                continue;
            }
            if (allowListOperators && appendLogFilterListValues(filters, token)) {
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
            if (depth == 0 && character == ',') {
                addLogFilterClause(clauses, current);
                continue;
            }
            if (depth == 0 && isLogFilterAndDelimiter(filterExpression, index)) {
                addLogFilterClause(clauses, current);
                index += 4;
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

    private Map<String, String> removeEntityScopeResourceFilters(LogServiceContext context,
                                                                 Map<String, String> resourceFilters) {
        if (context == null || resourceFilters == null || resourceFilters.isEmpty()) {
            return resourceFilters;
        }
        Map<String, String> filtered = new LinkedHashMap<>();
        resourceFilters.forEach((key, value) -> {
            if (ENTITY_SCOPE_RESOURCE_KEYS.contains(key) && hasResolvedEntityScopeValue(context, key)) {
                return;
            }
            filtered.put(key, value);
        });
        return filtered.isEmpty() ? Collections.emptyMap() : Map.copyOf(filtered);
    }

    private boolean hasResolvedEntityScopeValue(LogServiceContext context, String key) {
        return switch (key) {
            case "service.name" -> StringUtils.hasText(context.serviceName());
            case "service.namespace" -> StringUtils.hasText(context.serviceNamespace());
            case "deployment.environment.name" -> StringUtils.hasText(context.environment());
            default -> false;
        };
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

    private String normalizeGroupBy(String groupBy) {
        if (!StringUtils.hasText(groupBy)) {
            return null;
        }
        String normalized = groupBy.trim();
        return isSafeAttributeKey(normalized) ? normalized : null;
    }

    private List<LogEntry> filterQueryLogs(List<LogEntry> logs, String serviceName, String serviceNamespace,
                                           String environment, Map<String, String> resourceFilters,
                                           Map<String, String> attributeFilters,
                                           boolean hideInternal, boolean hideNoise) {
        if (logs == null || logs.isEmpty()) {
            return logs == null ? Collections.emptyList() : logs;
        }
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        if (!StringUtils.hasText(workspaceId) && !hideInternal && !hideNoise
                && !hasExtendedFilterContext(serviceName, serviceNamespace, environment,
                resourceFilters, attributeFilters)) {
            return logs;
        }
        String normalizedWorkspaceId = StringUtils.hasText(workspaceId)
                ? AuthTokenScopes.normalizeWorkspaceId(workspaceId)
                : null;
        return logs.stream()
                .filter(log -> !shouldHideWorkspaceLog(log, hideInternal, hideNoise))
                .filter(log -> matchesWorkspace(log, normalizedWorkspaceId))
                .filter(log -> matchesServiceContext(log, serviceName, serviceNamespace, environment))
                .filter(log -> matchesAttributes(log.getResource(), resourceFilters))
                .filter(log -> matchesAttributes(log.getAttributes(), attributeFilters))
                .toList();
    }

    private boolean matchesAttributes(Map<String, Object> source, Map<String, String> expectedAttributes) {
        if (expectedAttributes == null || expectedAttributes.isEmpty()) {
            return true;
        }
        if (source == null || source.isEmpty()) {
            return expectedAttributes.values().stream().allMatch(this::isExclusionLogAttributeFilter);
        }
        return expectedAttributes.entrySet().stream()
                .allMatch(entry -> matchesAttributeFilter(resolveMapValue(source, entry.getKey()), entry.getValue()));
    }

    private boolean matchesAttributeFilter(String actualValue, String expectedValue) {
        if (isInLogAttributeFilter(expectedValue)) {
            return splitListLogAttributeValues(expectedValue.substring(LOG_FILTER_IN_PREFIX.length())).stream()
                    .anyMatch(expected -> matchesOptionalResourceValue(actualValue, expected));
        }
        if (isNotInLogAttributeFilter(expectedValue)) {
            return splitListLogAttributeValues(expectedValue.substring(LOG_FILTER_NOT_IN_PREFIX.length())).stream()
                    .noneMatch(expected -> matchesOptionalResourceValue(actualValue, expected));
        }
        if (isNegatedLogAttributeFilter(expectedValue)) {
            return !matchesOptionalResourceValue(actualValue, expectedValue.substring(LOG_FILTER_NEGATION_PREFIX.length()));
        }
        return matchesOptionalResourceValue(actualValue, expectedValue);
    }

    private boolean isNegatedLogAttributeFilter(String expectedValue) {
        return expectedValue != null && expectedValue.startsWith(LOG_FILTER_NEGATION_PREFIX);
    }

    private boolean isExclusionLogAttributeFilter(String expectedValue) {
        return isNegatedLogAttributeFilter(expectedValue) || isNotInLogAttributeFilter(expectedValue);
    }

    private boolean isListLogAttributeFilter(String expectedValue) {
        return isInLogAttributeFilter(expectedValue) || isNotInLogAttributeFilter(expectedValue);
    }

    private boolean isInLogAttributeFilter(String expectedValue) {
        return expectedValue != null && expectedValue.startsWith(LOG_FILTER_IN_PREFIX);
    }

    private boolean isNotInLogAttributeFilter(String expectedValue) {
        return expectedValue != null && expectedValue.startsWith(LOG_FILTER_NOT_IN_PREFIX);
    }

    private List<String> splitListLogAttributeValues(String encodedValues) {
        if (!StringUtils.hasText(encodedValues)) {
            return List.of();
        }
        return List.of(encodedValues.split(Pattern.quote(LOG_FILTER_VALUE_DELIMITER), -1)).stream()
                .filter(StringUtils::hasText)
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

    private boolean matchesServiceContext(LogEntry logEntry, String serviceName, String serviceNamespace,
                                          String environment) {
        return matchesOptionalResourceValue(resolveServiceName(logEntry), serviceName)
                && matchesOptionalResourceValue(resolveResourceValue(logEntry,
                        "service.namespace", "service_namespace"), serviceNamespace)
                && matchesOptionalResourceValue(resolveResourceValue(logEntry,
                        "deployment.environment.name", "deployment_environment_name", "environment"), environment);
    }

    private boolean matchesOptionalResourceValue(String actualValue, String expectedValue) {
        if (!StringUtils.hasText(expectedValue)) {
            return true;
        }
        return StringUtils.hasText(actualValue)
                && actualValue.equalsIgnoreCase(expectedValue.trim());
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
        return resolveResourceValue(logEntry, "service.name", "service_name");
    }

    private String resolveLogGroupValue(LogEntry logEntry, String groupBy) {
        if (!StringUtils.hasText(groupBy)) {
            return "unknown";
        }
        String normalized = groupBy.trim();
        String value;
        if ("service.name".equalsIgnoreCase(normalized) || "service_name".equalsIgnoreCase(normalized)) {
            value = resolveServiceName(logEntry);
        } else if ("severity".equalsIgnoreCase(normalized) || "severity_text".equalsIgnoreCase(normalized)) {
            value = normalizeRawValue(logEntry == null ? null : logEntry.getSeverityText());
        } else if (normalized.startsWith("resource:")) {
            value = resolveMapValue(logEntry == null ? null : logEntry.getResource(),
                    normalized.substring("resource:".length()));
        } else if (normalized.startsWith("attribute:")) {
            value = resolveMapValue(logEntry == null ? null : logEntry.getAttributes(),
                    normalized.substring("attribute:".length()));
        } else {
            value = resolveResourceValue(logEntry, normalized);
        }
        return StringUtils.hasText(value) ? value : "unknown";
    }

    private String resolveResourceValue(LogEntry logEntry, String... keys) {
        if (logEntry == null || keys == null || keys.length == 0) {
            return null;
        }
        String value = resolveMapValue(logEntry.getResource(), keys);
        if (!StringUtils.hasText(value)) {
            value = resolveMapValue(logEntry.getAttributes(), keys);
        }
        return value;
    }

    private String resolveMapValue(Map<String, Object> source, String... keys) {
        if (source == null || source.isEmpty()) {
            return null;
        }
        for (String key : keys) {
            String value = normalizeResourceValue(source.get(key));
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
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
