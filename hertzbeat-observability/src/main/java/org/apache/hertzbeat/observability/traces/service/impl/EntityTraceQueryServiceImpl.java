/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.traces.service.impl;

import org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics;
import org.apache.hertzbeat.observability.shared.util.SignalFilterScanner;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.common.observability.model.EntityCanonicalIdentityRegistry;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceDetailDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceRepresentativeSpanDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceOverviewDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceServiceStatsDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanEventDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanLinkDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationEnricher;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository.TraceSort;
import org.apache.hertzbeat.observability.traces.dto.TraceListPageDto;
import org.apache.hertzbeat.observability.traces.dto.TraceStructureQuery;
import org.apache.hertzbeat.observability.traces.dto.TraceStructureAnalysis;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository.TraceRowQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * Read-only trace query service backed by Greptime trace rows.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EntityTraceQueryServiceImpl implements EntityTraceQueryService {

    private static final ObjectMapper JSON_MAPPER = JsonMapper.builder().build();
    private static final int TRACE_LIST_SAMPLE_LIMIT = 1500;
    private static final int TRACE_DETAIL_LIMIT = 5000;
    private static final int DEFAULT_TRACE_LIST_PAGE_INDEX = 0;
    private static final int DEFAULT_TRACE_LIST_PAGE_SIZE = 20;
    private static final int MAX_TRACE_LIST_PAGE_SIZE = 1000;
    private static final int TRACE_GROUP_BY_LIMIT = 20;
    private static final int TRACE_GROUP_BY_MAX_LIMIT = 100;
    private static final long TRACE_GROUP_BY_MAX_MIN_COUNT = 1_000_000L;
    private static final long DEFAULT_LOOKBACK_MILLIS = Duration.ofHours(24).toMillis();
    private static final long ACTIVE_TRACE_WINDOW_MILLIS = Duration.ofMinutes(15).toMillis();
    private static final String RESOURCE_FILTER_CONTAINS_PREFIX = "__hz_contains__:";
    private static final String RESOURCE_FILTER_NOT_CONTAINS_PREFIX = "__hz_not_contains__:";
    private static final String RESOURCE_FILTER_EXISTS_VALUE = "__hz_exists__";
    private static final String RESOURCE_FILTER_NOT_EXISTS_VALUE = "__hz_not_exists__";
    private static final BigInteger LONG_MAX_VALUE = BigInteger.valueOf(Long.MAX_VALUE);
    private static final BigInteger LONG_MIN_VALUE = BigInteger.valueOf(Long.MIN_VALUE);
    private static final BigDecimal LONG_MAX_DECIMAL = BigDecimal.valueOf(Long.MAX_VALUE);
    private static final BigDecimal LONG_MIN_DECIMAL = BigDecimal.valueOf(Long.MIN_VALUE);
    private static final Pattern NON_NEGATIVE_DECIMAL_PATTERN = Pattern.compile("^(0|[1-9][0-9]*)$");
    private static final Pattern RESOURCE_FILTER_LIST_OPERATOR_PATTERN = Pattern.compile(
            "^\\s*([A-Za-z0-9._:-]+)\\s+(NOT\\s+IN|IN)\\s*(\\(.+\\))\\s*$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern RESOURCE_FILTER_NOT_EQUALS_PATTERN = Pattern.compile(
            "^\\s*([A-Za-z0-9._:-]+)\\s*!=\\s*(.+?)\\s*$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern RESOURCE_FILTER_TEXT_OPERATOR_PATTERN = Pattern.compile(
            "^\\s*([A-Za-z0-9._:-]+)\\s+(NOT\\s+CONTAINS|CONTAINS)\\s+(.+)\\s*$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern RESOURCE_FILTER_PRESENCE_OPERATOR_PATTERN = Pattern.compile(
            "^\\s*([A-Za-z0-9._:-]+)\\s+(NOT\\s+EXISTS|EXISTS)\\s*$",
            Pattern.CASE_INSENSITIVE);
    private static final Set<String> WORKSPACE_RESOURCE_KEYS = Set.of(
            OtlpCorrelationEnricher.WORKSPACE_ID_ATTRIBUTE,
            AuthTokenScopes.CLAIM_WORKSPACE_ID,
            "workspace.id"
    );
    private static final Set<String> ENTITY_SCOPE_RESOURCE_KEYS = Set.of(
            OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID,
            OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_TYPE,
            "service.name",
            "service.namespace",
            "deployment.environment.name"
    );

    private final TraceQueryRepository traceQueryRepository;
    private final ObservabilityWorkspaceQueryGateway workspaceQueryGateway;

    @Override
    public Page<TraceListItemDto> queryRecentTraces(String workspaceId, Long start, Long end, int limit) {
        String trustedWorkspaceId = requireTrustedWorkspaceId(workspaceId);
        if (!traceQueryRepository.supportsTraceListRows()) {
            throw new TelemetryStorageUnavailableException();
        }
        int pageSize = normalizeTraceListPageSize(limit);
        TraceQueryRepository.TraceListPage page = traceQueryRepository.queryTraceListRows(
                start, end, false, null, null, null, trustedWorkspaceId, Map.of(), false, 0, pageSize);
        List<TraceListItemDto> items = toTraceListItems(requireTracePageRows(page));
        long total = validatedTraceListTotal(page, 0L, items.size());
        return new PageImpl<>(items, PageRequest.of(0, pageSize), total);
    }

    private String trustedWorkspaceId() {
        return requireTrustedWorkspaceId(AuthTokenRequestContext.currentWorkspaceId());
    }

    private String requireTrustedWorkspaceId(String workspaceId) {
        if (!StringUtils.hasText(workspaceId)) {
            throw new TelemetryStorageUnavailableException();
        }
        return AuthTokenScopes.normalizeWorkspaceId(workspaceId);
    }

    @Override
    public EntityTraceSummaryDto buildEntityTraceSummary(ObservedEntityContext entityContext) {
        Map<String, Set<String>> identityValues = traceQueryIdentityValues(entityContext);
        if (identityValues.isEmpty()) {
            return new EntityTraceSummaryDto(0, 0, null, false, null);
        }
        long now = System.currentTimeMillis();
        if (traceQueryRepository.supportsTraceSummaryRows()) {
            Map<String, Object> row = traceQueryRepository.queryTraceSummaryRows(
                    Math.max(0L, now - DEFAULT_LOOKBACK_MILLIS),
                    now,
                    preferredIdentityValue(identityValues, "service.name"),
                    preferredIdentityValue(identityValues, "service.namespace"),
                    preferredIdentityValue(identityValues, "deployment.environment.name"),
                    AuthTokenRequestContext.currentWorkspaceId(),
                    identityValues,
                    false
            );
            EntityTraceSummaryDto summary = toEntityTraceSummary(row);
            if (summary != null) {
                return summary;
            }
        }
        List<TraceAggregate> traces = aggregateTraceRows(queryRecentRows(identityValues, now))
                .stream()
                .filter(trace -> matchesEntity(trace, identityValues))
                .filter(trace -> trace.getObservedEndTime() >= now - DEFAULT_LOOKBACK_MILLIS)
                .toList();
        Long latestObservedAt = traces.stream()
                .map(TraceAggregate::getObservedEndTime)
                .filter(Objects::nonNull)
                .max(Long::compareTo)
                .orElse(null);
        int errorCount = (int) traces.stream().filter(trace -> isErrorStatus(trace.getStatus())).count();
        boolean active = latestObservedAt != null && latestObservedAt >= now - ACTIVE_TRACE_WINDOW_MILLIS;
        String latestTraceId = traces.stream()
                .sorted(Comparator.comparing(TraceAggregate::getObservedEndTime, Comparator.reverseOrder()))
                .map(TraceAggregate::getTraceId)
                .filter(StringUtils::hasText)
                .findFirst()
                .orElse(null);
        return new EntityTraceSummaryDto(traces.size(), errorCount, latestObservedAt, active, latestTraceId);
    }

    @Override
    public List<EntityTraceQueryHintDto> buildEntityTraceQueryHints(ObservedEntityContext entityContext) {
        Map<String, Set<String>> identityValues = traceQueryIdentityValues(entityContext);
        if (identityValues.isEmpty()) {
            return Collections.emptyList();
        }
        Map<String, String> resourceFilters = new LinkedHashMap<>();
        putPreferredFilter(resourceFilters, identityValues, "service.name");
        putPreferredFilter(resourceFilters, identityValues, "service.namespace");
        putPreferredFilter(resourceFilters, identityValues, "deployment.environment.name");
        putPreferredFilter(resourceFilters, identityValues, "host.name");
        putPreferredFilter(resourceFilters, identityValues, "k8s.namespace.name");

        List<String> searchTerms = new ArrayList<>();
        searchTerms.addAll(preferredSearchTerms(identityValues));
        EntityTraceSummaryDto summary = buildEntityTraceSummary(entityContext);
        if (StringUtils.hasText(summary.getLatestTraceId())) {
            searchTerms.add(summary.getLatestTraceId());
        }
        searchTerms = searchTerms.stream()
                .filter(StringUtils::hasText)
                .distinct()
                .toList();

        String entityTitle = resolveEntityTitle(entityContext);
        Long end = summary.getLatestObservedAt();
        Long start = end == null ? null : Math.max(0L, end - Duration.ofMinutes(15).toMillis());
        return List.of(new EntityTraceQueryHintDto(
                entityTitle + " trace evidence",
                resourceFilters,
                searchTerms,
                summary.getLatestTraceId(),
                null,
                resourceFilters.get("service.name"),
                resourceFilters.get("service.namespace"),
                resourceFilters.get("deployment.environment.name"),
                start,
                end
        ));
    }

    @Override
    public Page<TraceListItemDto> queryTraceList(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                                 String serviceName, String serviceNamespace, String environment,
                                                 int pageIndex, int pageSize, Boolean hideInternal) {
        return queryTraceList(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                null, null, null, pageIndex, pageSize, hideInternal);
    }

    @Override
    public Page<TraceListItemDto> queryTraceList(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                                 String serviceName, String serviceNamespace, String environment,
                                                 String operationName, Long minDurationMs, Long maxDurationMs,
                                                 int pageIndex, int pageSize, Boolean hideInternal) {
        return queryTraceList(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                null, operationName, minDurationMs, maxDurationMs, pageIndex, pageSize, hideInternal);
    }

    @Override
    public Page<TraceListItemDto> queryTraceList(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                                 String serviceName, String serviceNamespace, String environment,
                                                 String resourceFilter, String operationName, Long minDurationMs, Long maxDurationMs,
                                                 int pageIndex, int pageSize, Boolean hideInternal) {
        return queryTraceList(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                resourceFilter, operationName, minDurationMs, maxDurationMs, pageIndex, pageSize, hideInternal, null);
    }

    @Override
    public Page<TraceListItemDto> queryTraceList(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                                 String serviceName, String serviceNamespace, String environment,
                                                 String resourceFilter, String operationName, Long minDurationMs,
                                                 Long maxDurationMs, int pageIndex, int pageSize,
                                                 Boolean hideInternal, String spanScope) {
        return queryTraceList(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                resourceFilter, operationName, minDurationMs, maxDurationMs, pageIndex, pageSize, hideInternal,
                spanScope, null);
    }

    @Override
    public Page<TraceListItemDto> queryTraceList(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                                 String serviceName, String serviceNamespace, String environment,
                                                 String resourceFilter, String operationName, Long minDurationMs,
                                                 Long maxDurationMs, int pageIndex, int pageSize,
                                                 Boolean hideInternal, String spanScope, String attributeFilter) {
        return queryTraceList(trustedWorkspaceId(), entityId, start, end, traceId, errorOnly, serviceName,
                serviceNamespace, environment, resourceFilter, operationName, minDurationMs, maxDurationMs,
                pageIndex, pageSize, hideInternal, spanScope, attributeFilter);
    }

    @Override
    public Page<TraceListItemDto> queryTraceList(String workspaceId, Long entityId, Long start, Long end,
                                                 String traceId, Boolean errorOnly, String serviceName,
                                                 String serviceNamespace, String environment, String resourceFilter,
                                                 String operationName, Long minDurationMs, Long maxDurationMs,
                                                 int pageIndex, int pageSize, Boolean hideInternal, String spanScope,
                                                 String attributeFilter) {
        return queryTraceList(workspaceId, entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace,
                environment, resourceFilter, operationName, minDurationMs, maxDurationMs, pageIndex, pageSize,
                hideInternal, spanScope, attributeFilter, TraceSort.NEWEST);
    }

    @Override
    public Page<TraceListItemDto> queryTraceList(String workspaceId, Long entityId, Long start, Long end,
                                               String traceId, Boolean errorOnly, String serviceName,
                                               String serviceNamespace, String environment, String resourceFilter,
                                               String operationName, Long minDurationMs, Long maxDurationMs,
                                               int pageIndex, int pageSize, Boolean hideInternal, String spanScope,
                                               String attributeFilter, TraceSort requestedSort) {
        return queryTraceList(workspaceId, entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace,
                environment, resourceFilter, operationName, minDurationMs, maxDurationMs, pageIndex, pageSize,
                hideInternal, spanScope, attributeFilter, requestedSort, false);
    }

    @Override
    public Page<TraceListItemDto> queryTraceList(String workspaceId, Long entityId, Long start, Long end,
                                               String traceId, Boolean errorOnly, String serviceName,
                                               String serviceNamespace, String environment, String resourceFilter,
                                               String operationName, Long minDurationMs, Long maxDurationMs,
                                               int pageIndex, int pageSize, Boolean hideInternal, String spanScope,
                                               String attributeFilter, TraceSort requestedSort, boolean endExclusive) {
        String trustedWorkspaceId = requireTrustedWorkspaceId(workspaceId);
        TraceSort sort = requestedSort == null ? TraceSort.NEWEST : requestedSort;
        var windowQuery = new TraceListPageDto.Query(sort.value(), "window", null, false);
        PageRequest pageRequest = PageRequest.of(
                normalizeTraceListPageIndex(pageIndex), normalizeTraceListPageSize(pageSize));
        ObservedEntityContext entityContext = entityId == null
                ? null : loadEntityContext(trustedWorkspaceId, entityId);
        if (missingRequestedEntity(entityId, entityContext)) {
            return new TraceListPageDto(List.of(), pageRequest, 0, windowQuery);
        }
        Map<String, Set<String>> identityValues = traceQueryIdentityValues(entityContext);
        TraceQueryScope queryScope = resolveTraceQueryScope(entityContext, identityValues, serviceName, serviceNamespace, environment);
        ResourceFilterSet resourceFilters = removeEntityScopeResourceFilters(
                identityValues, parseResourceFilters(resourceFilter));
        ResourceFilterSet attributeFilters = parseResourceFilters(attributeFilter);
        Map<String, Set<String>> pushedResourceFilters = mergeResourceFilters(identityValues, resourceFilters.pushableInclude());
        int repositoryOffset = Math.toIntExact(Math.min(pageRequest.getOffset(), Integer.MAX_VALUE));
        Long minDurationNanos = durationMillisToNanos(minDurationMs);
        Long maxDurationNanos = durationMillisToNanos(maxDurationMs);
        String normalizedSpanScope = normalizeSpanScope(spanScope);
        if (!StringUtils.hasText(traceId) && !resourceFilters.requiresRowFallback()
                && attributeFilters.isEmpty()
                && traceQueryRepository.supportsTraceListRows()) {
            TraceQueryRepository.TraceListPage page = traceQueryRepository.queryTraceListRows(
                            start,
                            end,
                            errorOnly,
                            queryScope.serviceName(),
                            queryScope.serviceNamespace(),
                            queryScope.environment(),
                            operationName,
                            minDurationNanos,
                            maxDurationNanos,
                            trustedWorkspaceId,
                            pushedResourceFilters,
                            hideInternal,
                            normalizedSpanScope,
                            repositoryOffset,
                            pageRequest.getPageSize(),
                            sort, endExclusive
                    );
            List<TraceListItemDto> items = toTraceListItems(requireTracePageRows(page));
            long total = validatedTraceListTotal(page, pageRequest.getOffset(), items.size());
            return new TraceListPageDto(items, pageRequest, total, windowQuery);
        }
        int rowLimit = StringUtils.hasText(traceId) ? TRACE_DETAIL_LIMIT : TRACE_LIST_SAMPLE_LIMIT;
        List<Map<String, Object>> rows = queryRowsForList(
                trustedWorkspaceId, traceId, start, end, queryScope.serviceName(), queryScope.serviceNamespace(),
                queryScope.environment(), operationName, minDurationNanos, maxDurationNanos, pushedResourceFilters,
                pushableSpanAttributeFilters(attributeFilters), hideInternal, rowLimit + 1);
        if (rows == null) {
            throw new TelemetryStorageUnavailableException();
        }
        boolean truncated = rows.size() > rowLimit;
        List<TraceAggregate> filtered = aggregateTraceRows(trustedWorkspaceId,
                rows.subList(0, Math.min(rowLimit, rows.size()))).stream()
                .filter(trace -> matchingTraceSpans(trace, identityValues, resourceFilters, start, end, traceId, errorOnly,
                        queryScope.serviceName(), queryScope.serviceNamespace(), queryScope.environment(), operationName,
                        minDurationNanos, maxDurationNanos, hideInternal, normalizedSpanScope, attributeFilters, endExclusive).findAny().isPresent())
                .sorted(traceListComparator(sort, trace -> matchingTraceSpans(trace, identityValues, resourceFilters, start, end,
                        traceId, false, queryScope.serviceName(), queryScope.serviceNamespace(), queryScope.environment(), operationName,
                        minDurationNanos, maxDurationNanos, hideInternal, normalizedSpanScope, attributeFilters, endExclusive)
                        .mapToLong(span -> trace.timings.get(span.getSpanId()).startNanos()).min().orElseThrow()))
                .toList();
        int safeStart = Math.min(repositoryOffset, filtered.size());
        int safeEnd = Math.min(safeStart + pageRequest.getPageSize(), filtered.size());
        List<TraceListItemDto> items = filtered.subList(safeStart, safeEnd).stream()
                .map(this::toTraceListItem)
                .toList();
        return new TraceListPageDto(items, pageRequest, filtered.size(),
                new TraceListPageDto.Query(sort.value(), "bounded", rowLimit, truncated));
    }

    @Override
    public Page<TraceListItemDto> queryTraceStructure(String workspaceId, TraceStructureQuery query) {
        StructureSample sample = structureSample(workspaceId, query);
        List<TraceAggregate> matched = sample.matched();
        PageRequest page = PageRequest.of(query.pageIndex(), query.pageSize());
        int from = Math.min(Math.toIntExact(Math.min(page.getOffset(), Integer.MAX_VALUE)), matched.size());
        int to = Math.min(from + page.getPageSize(), matched.size());
        return new TraceListPageDto(matched.subList(from, to).stream().map(this::toTraceListItem).toList(), page,
                matched.size(), new TraceListPageDto.Query("newest", "bounded", TRACE_LIST_SAMPLE_LIMIT, sample.truncated()));
    }

    @Override
    public TraceStructureAnalysis queryTraceStructureAnalysis(String workspaceId, TraceStructureQuery query) {
        StructureSample sample = structureSample(workspaceId, query);
        List<TraceStructureAnalyzer.TraceGraph> graphs = sample.matched().stream()
                .map(trace -> new TraceStructureAnalyzer.TraceGraph(trace.traceId, trace.spans)).toList();
        return TraceStructureAnalyzer.analyze(graphs, TRACE_LIST_SAMPLE_LIMIT, sample.scannedRows(), sample.truncated());
    }

    private StructureSample structureSample(String workspaceId, TraceStructureQuery query) {
        String workspace = requireTrustedWorkspaceId(workspaceId);
        List<Map<String, Object>> rows = queryRowsForList(workspace, null, query.start(), query.end(), null, null,
                null, null, null, null, Map.of(), Map.of(), false, TRACE_LIST_SAMPLE_LIMIT + 1);
        if (rows == null) throw new TelemetryStorageUnavailableException();
        boolean truncated = rows.size() > TRACE_LIST_SAMPLE_LIMIT;
        List<TraceAggregate> matched = aggregateTraceRows(workspace,
                rows.subList(0, Math.min(TRACE_LIST_SAMPLE_LIMIT, rows.size()))).stream()
                .filter(trace -> TraceStructureMatcher.matches(trace.spans, query.left(), query.right(), query.relation()))
                .sorted(traceListComparator(TraceSort.NEWEST,
                        trace -> trace.spans.stream().mapToLong(span -> trace.timings.get(span.getSpanId()).startNanos())
                                .min().orElseThrow()))
                .toList();
        return new StructureSample(matched, Math.min(TRACE_LIST_SAMPLE_LIMIT, rows.size()), truncated);
    }

    private record StructureSample(List<TraceAggregate> matched, int scannedRows, boolean truncated) { }

    private Comparator<TraceAggregate> traceListComparator(TraceSort sort, java.util.function.ToLongFunction<TraceAggregate> timestamp) {
        Comparator<TraceAggregate> newest = Comparator.comparingLong(timestamp)
                .reversed().thenComparing(TraceAggregate::getTraceId);
        return sort == TraceSort.DURATION_DESC
                ? Comparator.comparing(TraceAggregate::getDurationNanos, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(newest)
                : newest;
    }

    private int normalizeTraceListPageIndex(int pageIndex) {
        return Math.max(pageIndex, DEFAULT_TRACE_LIST_PAGE_INDEX);
    }

    private int normalizeTraceListPageSize(int pageSize) {
        if (pageSize <= 0) {
            return DEFAULT_TRACE_LIST_PAGE_SIZE;
        }
        return Math.min(pageSize, MAX_TRACE_LIST_PAGE_SIZE);
    }

    @Override
    public TraceDetailDto getTraceDetail(TraceDetailQuery query) {
        return getTraceDetail(trustedWorkspaceId(), query);
    }

    @Override
    public TraceDetailDto getTraceDetail(String workspaceId, TraceDetailQuery query) {
        String trustedWorkspaceId = requireTrustedWorkspaceId(workspaceId);
        if (query == null || !StringUtils.hasText(query.traceId())) {
            return null;
        }
        ObservedEntityContext entityContext = query.entityId() == null
                ? null : loadEntityContext(trustedWorkspaceId, query.entityId());
        if (missingRequestedEntity(query.entityId(), entityContext)) {
            return null;
        }
        Map<String, Set<String>> identityValues = canonicalIdentityValues(entityContext);
        TraceQueryScope queryScope = resolveTraceQueryScope(
                entityContext, identityValues, query.serviceName(), query.serviceNamespace(), query.environment());
        ResourceFilterSet resourceFilters = removeEntityScopeResourceFilters(
                identityValues, parseResourceFilters(query.resourceFilter()));
        ResourceFilterSet attributeFilters = parseResourceFilters(query.attributeFilter());
        TraceRowQuery rowQuery = new TraceRowQuery(
                query.traceId(),
                trimText(query.spanId()),
                query.start(),
                query.end(),
                queryScope.serviceName(),
                queryScope.serviceNamespace(),
                queryScope.environment(),
                null,
                durationMillisToNanos(query.minDurationMs()),
                durationMillisToNanos(query.maxDurationMs()),
                trustedWorkspaceId,
                mergeResourceFilters(identityValues, resourceFilters.pushableInclude()),
                pushableSpanAttributeFilters(attributeFilters),
                false);
        TraceAggregate aggregate = aggregateTraceRows(trustedWorkspaceId,
                traceQueryRepository.queryTraceRows(rowQuery, TRACE_DETAIL_LIMIT)).stream()
                .filter(trace -> identityValues.isEmpty() || matchesEntity(trace, identityValues))
                .filter(trace -> matchesResourceFilters(trace, resourceFilters))
                .filter(trace -> matchesSpanAttributeFilters(trace, attributeFilters))
                .findFirst()
                .orElse(null);
        return aggregate == null ? null : toTraceDetail(aggregate);
    }

    private Map<String, Set<String>> pushableSpanAttributeFilters(ResourceFilterSet attributeFilters) {
        Map<String, Set<String>> pushable = new LinkedHashMap<>(attributeFilters.pushableInclude());
        pushable.remove("span.name");
        pushable.remove("span_name");
        return pushable;
    }

    @Override
    public List<TraceSpanNodeDto> getTraceSpans(Long entityId, String traceId) {
        TraceDetailDto detail = getTraceDetail(entityId, traceId);
        return detail == null ? Collections.emptyList() : detail.getSpans();
    }

    @Override
    public TraceOverviewDto getTraceOverview(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                             String serviceName, String serviceNamespace, String environment, Boolean hideInternal) {
        return getTraceOverview(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                null, null, null, hideInternal);
    }

    @Override
    public TraceOverviewDto getTraceOverview(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                             String serviceName, String serviceNamespace, String environment,
                                             String operationName, Long minDurationMs, Long maxDurationMs, Boolean hideInternal) {
        return getTraceOverview(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                null, operationName, minDurationMs, maxDurationMs, hideInternal);
    }

    @Override
    public TraceOverviewDto getTraceOverview(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                             String serviceName, String serviceNamespace, String environment,
                                             String resourceFilter, String operationName, Long minDurationMs, Long maxDurationMs,
                                             Boolean hideInternal) {
        return getTraceOverview(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                resourceFilter, operationName, minDurationMs, maxDurationMs, hideInternal, null);
    }

    @Override
    public TraceOverviewDto getTraceOverview(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                             String serviceName, String serviceNamespace, String environment,
                                             String resourceFilter, String operationName, Long minDurationMs, Long maxDurationMs,
                                             Boolean hideInternal, String spanScope) {
        return getTraceOverview(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                resourceFilter, operationName, minDurationMs, maxDurationMs, hideInternal, spanScope, null);
    }

    @Override
    public TraceOverviewDto getTraceOverview(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                             String serviceName, String serviceNamespace, String environment,
                                             String resourceFilter, String operationName, Long minDurationMs, Long maxDurationMs,
                                             Boolean hideInternal, String spanScope, String attributeFilter) {
        return getTraceOverview(trustedWorkspaceId(), entityId, start, end, traceId, errorOnly, serviceName,
                serviceNamespace, environment, resourceFilter, operationName, minDurationMs, maxDurationMs,
                hideInternal, spanScope, attributeFilter);
    }

    @Override
    public TraceOverviewDto getTraceOverview(String workspaceId, Long entityId, Long start, Long end, String traceId,
                                             Boolean errorOnly, String serviceName, String serviceNamespace,
                                             String environment, String resourceFilter, String operationName,
                                             Long minDurationMs, Long maxDurationMs, Boolean hideInternal,
                                             String spanScope, String attributeFilter) {
        String trustedWorkspaceId = requireTrustedWorkspaceId(workspaceId);
        ObservedEntityContext entityContext = entityId == null
                ? null : loadEntityContext(trustedWorkspaceId, entityId);
        if (missingRequestedEntity(entityId, entityContext)) {
            return new TraceOverviewDto(0, 0, null, false);
        }
        Map<String, Set<String>> identityValues = traceQueryIdentityValues(entityContext);
        TraceQueryScope queryScope = resolveTraceQueryScope(entityContext, identityValues, serviceName, serviceNamespace, environment);
        ResourceFilterSet resourceFilters = removeEntityScopeResourceFilters(
                identityValues, parseResourceFilters(resourceFilter));
        ResourceFilterSet attributeFilters = parseResourceFilters(attributeFilter);
        Map<String, Set<String>> pushedResourceFilters = mergeResourceFilters(identityValues, resourceFilters.pushableInclude());
        Long minDurationNanos = durationMillisToNanos(minDurationMs);
        Long maxDurationNanos = durationMillisToNanos(maxDurationMs);
        String normalizedSpanScope = normalizeSpanScope(spanScope);
        if (StringUtils.hasText(traceId) && !resourceFilters.requiresRowFallback()
                && attributeFilters.isEmpty()
                && traceQueryRepository.supportsTraceIdOverviewRows()) {
            Map<String, Object> row = StringUtils.hasText(normalizedSpanScope)
                    ? traceQueryRepository.queryTraceIdOverviewRows(
                            traceId,
                            start,
                            end,
                            errorOnly,
                            queryScope.serviceName(),
                            queryScope.serviceNamespace(),
                            queryScope.environment(),
                            operationName,
                            minDurationNanos,
                            maxDurationNanos,
                            trustedWorkspaceId,
                            pushedResourceFilters,
                            hideInternal,
                            normalizedSpanScope
                    )
                    : traceQueryRepository.queryTraceIdOverviewRows(
                            traceId,
                            start,
                            end,
                            errorOnly,
                            queryScope.serviceName(),
                            queryScope.serviceNamespace(),
                            queryScope.environment(),
                            operationName,
                            minDurationNanos,
                            maxDurationNanos,
                            trustedWorkspaceId,
                            pushedResourceFilters,
                            hideInternal
                    );
            TraceOverviewDto overview = toTraceOverview(row);
            if (overview != null) {
                return overview;
            }
        }
        if (!StringUtils.hasText(traceId) && !resourceFilters.requiresRowFallback()
                && attributeFilters.isEmpty()
                && traceQueryRepository.supportsTraceOverviewRows()) {
            Map<String, Object> row = StringUtils.hasText(normalizedSpanScope)
                    ? traceQueryRepository.queryTraceOverviewRows(
                            start,
                            end,
                            errorOnly,
                            queryScope.serviceName(),
                            queryScope.serviceNamespace(),
                            queryScope.environment(),
                            operationName,
                            minDurationNanos,
                            maxDurationNanos,
                            trustedWorkspaceId,
                            pushedResourceFilters,
                            hideInternal,
                            normalizedSpanScope
                    )
                    : traceQueryRepository.queryTraceOverviewRows(
                            start,
                            end,
                            errorOnly,
                            queryScope.serviceName(),
                            queryScope.serviceNamespace(),
                            queryScope.environment(),
                            operationName,
                            minDurationNanos,
                            maxDurationNanos,
                            trustedWorkspaceId,
                            pushedResourceFilters,
                            hideInternal
                    );
            TraceOverviewDto overview = toTraceOverview(row);
            if (overview != null) {
                return overview;
            }
        }
        Page<TraceListItemDto> result = queryTraceList(trustedWorkspaceId, entityId, start, end, traceId, errorOnly,
                queryScope.serviceName(), queryScope.serviceNamespace(), queryScope.environment(),
                resourceFilter, operationName, minDurationMs, maxDurationMs, 0, TRACE_LIST_SAMPLE_LIMIT, hideInternal,
                normalizedSpanScope, attributeFilter);
        Long latestObservedAt = result.getContent().stream()
                .map(TraceListItemDto::getObservedEndTime)
                .filter(Objects::nonNull)
                .max(Long::compareTo)
                .orElse(null);
        int errorTraceCount = (int) result.getContent().stream().filter(item -> isErrorStatus(item.getStatus())).count();
        boolean active = latestObservedAt != null && latestObservedAt >= System.currentTimeMillis() - ACTIVE_TRACE_WINDOW_MILLIS;
        return new TraceOverviewDto((int) result.getTotalElements(), errorTraceCount, latestObservedAt, active);
    }

    @Override
    public Map<String, Object> getTraceGroupByStats(Long entityId, Long start, Long end, String traceId,
                                                    Boolean errorOnly, String serviceName, String serviceNamespace,
                                                    String environment, String resourceFilter, String operationName,
                                                    Long minDurationMs, Long maxDurationMs, String groupBy,
                                                    Integer limit, String orderBy, Integer minCount, Boolean hideInternal) {
        return getTraceGroupByStats(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace,
                environment, resourceFilter, operationName, minDurationMs, maxDurationMs, groupBy, limit, orderBy,
                minCount, hideInternal, null);
    }

    @Override
    public Map<String, Object> getTraceGroupByStats(Long entityId, Long start, Long end, String traceId,
                                                    Boolean errorOnly, String serviceName, String serviceNamespace,
                                                    String environment, String resourceFilter, String operationName,
                                                    Long minDurationMs, Long maxDurationMs, String groupBy,
                                                    Integer limit, String orderBy, Integer minCount, Boolean hideInternal,
                                                    String spanScope) {
        return getTraceGroupByStats(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace,
                environment, resourceFilter, operationName, minDurationMs, maxDurationMs, groupBy, limit, orderBy,
                minCount, hideInternal, spanScope, null);
    }

    @Override
    public Map<String, Object> getTraceGroupByStats(Long entityId, Long start, Long end, String traceId,
                                                    Boolean errorOnly, String serviceName, String serviceNamespace,
                                                    String environment, String resourceFilter, String operationName,
                                                    Long minDurationMs, Long maxDurationMs, String groupBy,
                                                    Integer limit, String orderBy, Integer minCount, Boolean hideInternal,
                                                    String spanScope, String attributeFilter) {
        return getTraceGroupByStats(trustedWorkspaceId(), entityId, start, end, traceId, errorOnly, serviceName,
                serviceNamespace, environment, resourceFilter, operationName, minDurationMs, maxDurationMs, groupBy,
                limit, orderBy, minCount, hideInternal, spanScope, attributeFilter);
    }

    @Override
    public Map<String, Object> getTraceGroupByStats(String workspaceId, Long entityId, Long start, Long end,
                                                    String traceId, Boolean errorOnly, String serviceName,
                                                    String serviceNamespace, String environment, String resourceFilter,
                                                    String operationName, Long minDurationMs, Long maxDurationMs,
                                                    String groupBy, Integer limit, String orderBy, Integer minCount,
                                                    Boolean hideInternal, String spanScope, String attributeFilter) {
        String trustedWorkspaceId = requireTrustedWorkspaceId(workspaceId);
        String normalizedGroupBy = normalizeTraceGroupBy(groupBy);
        int resolvedLimit = resolveTraceGroupByLimit(limit);
        long resolvedMinCount = resolveTraceGroupByMinCount(minCount);
        String normalizedSpanScope = normalizeSpanScope(spanScope);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("groupBy", normalizedGroupBy == null ? trimText(groupBy) : normalizedGroupBy);
        if (!StringUtils.hasText(normalizedGroupBy)) {
            result.put("groups", List.of());
            return result;
        }
        ObservedEntityContext entityContext = entityId == null
                ? null : loadEntityContext(trustedWorkspaceId, entityId);
        if (missingRequestedEntity(entityId, entityContext)) {
            result.put("groups", List.of());
            return result;
        }
        Map<String, Set<String>> identityValues = traceQueryIdentityValues(entityContext);
        TraceQueryScope queryScope = resolveTraceQueryScope(entityContext, identityValues, serviceName, serviceNamespace, environment);
        ResourceFilterSet resourceFilters = removeEntityScopeResourceFilters(
                identityValues, parseResourceFilters(resourceFilter));
        ResourceFilterSet attributeFilters = parseResourceFilters(attributeFilter);
        Map<String, Set<String>> pushedResourceFilters = mergeResourceFilters(identityValues, resourceFilters.pushableInclude());
        Long minDurationNanos = durationMillisToNanos(minDurationMs);
        Long maxDurationNanos = durationMillisToNanos(maxDurationMs);
        if (!StringUtils.hasText(traceId) && !resourceFilters.requiresRowFallback()
                && attributeFilters.isEmpty()
                && !isTraceAttributeGroupBy(normalizedGroupBy)
                && traceQueryRepository.supportsTraceGroupByRows()) {
            List<Map<String, Object>> rows = StringUtils.hasText(normalizedSpanScope)
                    ? traceQueryRepository.queryTraceGroupByRows(
                            start,
                            end,
                            errorOnly,
                            queryScope.serviceName(),
                            queryScope.serviceNamespace(),
                            queryScope.environment(),
                            operationName,
                            minDurationNanos,
                            maxDurationNanos,
                            trustedWorkspaceId,
                            pushedResourceFilters,
                            hideInternal,
                            normalizedSpanScope,
                            normalizedGroupBy,
                            orderBy,
                            resolvedMinCount,
                            resolvedLimit
                    )
                    : traceQueryRepository.queryTraceGroupByRows(
                            start,
                            end,
                            errorOnly,
                            queryScope.serviceName(),
                            queryScope.serviceNamespace(),
                            queryScope.environment(),
                            operationName,
                            minDurationNanos,
                            maxDurationNanos,
                            trustedWorkspaceId,
                            pushedResourceFilters,
                            hideInternal,
                            normalizedGroupBy,
                            orderBy,
                            resolvedMinCount,
                            resolvedLimit
                    );
            result.put("groups", rows.stream().map(this::toTraceGroupResult).toList());
            return result;
        }
        List<TraceAggregate> traces = aggregateTraceRows(trustedWorkspaceId, queryRowsForList(
                trustedWorkspaceId, traceId, start, end, queryScope.serviceName(), queryScope.serviceNamespace(),
                queryScope.environment(), operationName, minDurationNanos, maxDurationNanos, pushedResourceFilters,
                pushableSpanAttributeFilters(attributeFilters), hideInternal)).stream()
                .filter(trace -> matchesTraceFilters(trace, identityValues, resourceFilters, start, end, traceId, errorOnly,
                        queryScope.serviceName(), queryScope.serviceNamespace(), queryScope.environment(), operationName,
                        minDurationNanos, maxDurationNanos, hideInternal, normalizedSpanScope, attributeFilters))
                .toList();
        result.put("groups", buildTraceAggregateGroupResults(traces, normalizedGroupBy, resolvedLimit, orderBy, resolvedMinCount));
        return result;
    }

    private Map<String, Object> toTraceGroupResult(Map<String, Object> row) {
        Map<String, Object> group = new LinkedHashMap<>();
        group.put("value", defaultText(readTextValue(row, "group_value"), "unknown"));
        group.put("traceCount", Optional.ofNullable(readLongValue(row, "trace_count", "traceCount")).orElse(0L));
        group.put("errorTraceCount", Optional.ofNullable(readLongValue(row, "error_trace_count", "errorTraceCount")).orElse(0L));
        group.put("latencyAvgMs", readDoubleValue(row, "latency_avg_ms", "latencyAvgMs"));
        group.put("latencyP95Ms", readDoubleValue(row, "latency_p95_ms", "latencyP95Ms"));
        return group;
    }


    private List<Map<String, Object>> buildTraceAggregateGroupResults(List<TraceAggregate> traces, String groupBy,
                                                                      int limit, String orderBy, long minCount) {
        if (CollectionUtils.isEmpty(traces)) {
            return List.of();
        }
        Map<String, List<TraceAggregate>> grouped = new LinkedHashMap<>();
        for (TraceAggregate trace : traces) {
            String value = defaultText(resolveTraceAggregateGroupValue(trace, groupBy), "unknown");
            grouped.computeIfAbsent(value, ignored -> new ArrayList<>()).add(trace);
        }
        return grouped.entrySet().stream()
                .map(entry -> toTraceAggregateGroupResult(entry.getKey(), entry.getValue()))
                .filter(group -> ((Long) group.get("traceCount")) >= minCount)
                .sorted(resolveTraceGroupComparator(orderBy))
                .limit(limit)
                .toList();
    }

    private Comparator<Map<String, Object>> resolveTraceGroupComparator(String orderBy) {
        String normalized = StringUtils.trimWhitespace(orderBy);
        if ("error-count-desc".equalsIgnoreCase(normalized)) {
            return (left, right) -> Long.compare((Long) right.get("errorTraceCount"), (Long) left.get("errorTraceCount"));
        }
        if ("latency-p95-desc".equalsIgnoreCase(normalized)) {
            return Comparator.comparing((Map<String, Object> group) -> (Double) group.get("latencyP95Ms"),
                    Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(group -> (String) group.get("value"));
        }
        return (left, right) -> Long.compare((Long) right.get("traceCount"), (Long) left.get("traceCount"));
    }

    private int resolveTraceGroupByLimit(Integer limit) {
        if (limit == null || limit < 1) {
            return TRACE_GROUP_BY_LIMIT;
        }
        return Math.min(limit, TRACE_GROUP_BY_MAX_LIMIT);
    }

    private long resolveTraceGroupByMinCount(Integer minCount) {
        if (minCount == null || minCount < 1) {
            return 1L;
        }
        return Math.min(minCount.longValue(), TRACE_GROUP_BY_MAX_MIN_COUNT);
    }

    private Map<String, Object> toTraceGroupResult(String value, List<TraceListItemDto> traces) {
        Map<String, Object> group = new LinkedHashMap<>();
        List<Long> durations = traces.stream()
                .map(TraceListItemDto::getDurationNanos)
                .filter(Objects::nonNull)
                .filter(duration -> duration >= 0)
                .sorted()
                .toList();
        group.put("value", value);
        group.put("traceCount", (long) traces.size());
        group.put("errorTraceCount", traces.stream().filter(trace -> isErrorStatus(trace.getStatus())).count());
        group.put("latencyAvgMs", durations.isEmpty() ? null
                : durations.stream().mapToDouble(Long::doubleValue).average().orElse(0.0d) / 1_000_000.0d);
        group.put("latencyP95Ms", durations.isEmpty() ? null
                : durations.get(Math.min(durations.size() - 1, (int) Math.ceil(durations.size() * 0.95d) - 1)) / 1_000_000.0d);
        return group;
    }

    private Map<String, Object> toTraceAggregateGroupResult(String value, List<TraceAggregate> traces) {
        Map<String, Object> group = new LinkedHashMap<>();
        List<Long> durations = traces.stream()
                .map(TraceAggregate::getDurationNanos)
                .filter(Objects::nonNull)
                .filter(duration -> duration >= 0)
                .sorted()
                .toList();
        group.put("value", value);
        group.put("traceCount", (long) traces.size());
        group.put("errorTraceCount", traces.stream().filter(trace -> isErrorStatus(trace.getStatus())).count());
        group.put("latencyAvgMs", durations.isEmpty() ? null
                : durations.stream().mapToDouble(Long::doubleValue).average().orElse(0.0d) / 1_000_000.0d);
        group.put("latencyP95Ms", durations.isEmpty() ? null
                : durations.get(Math.min(durations.size() - 1, (int) Math.ceil(durations.size() * 0.95d) - 1)) / 1_000_000.0d);
        return group;
    }


    private String resolveTraceAggregateGroupValue(TraceAggregate trace, String groupBy) {
        if (trace == null || !StringUtils.hasText(groupBy)) {
            return null;
        }
        Map<String, String> resourceAttributes = trace.getResourceAttributes() == null
                ? Collections.emptyMap()
                : trace.getResourceAttributes();
        if ("service.name".equals(groupBy)) {
            return defaultText(trace.getServiceName(), resourceAttributes.get("service.name"));
        }
        if ("operation.name".equals(groupBy)) {
            return trace.getRootSpanName();
        }
        if ("status".equals(groupBy)) {
            return trace.getStatus() == null ? "UNKNOWN" : trace.getStatus().toUpperCase(Locale.ROOT);
        }
        if (groupBy.startsWith("resource:")) {
            return resourceAttributes.get(groupBy.substring("resource:".length()));
        }
        if (groupBy.startsWith("attribute:")) {
            String key = groupBy.substring("attribute:".length());
            return trace.spans.stream()
                    .map(TraceSpanNodeDto::getSpanAttributes)
                    .filter(attributes -> !CollectionUtils.isEmpty(attributes))
                    .map(attributes -> attributes.get(key))
                    .filter(StringUtils::hasText)
                    .findFirst()
                    .orElse(null);
        }
        return resourceAttributes.get(groupBy);
    }

    private String normalizeTraceGroupBy(String groupBy) {
        if (!StringUtils.hasText(groupBy)) {
            return null;
        }
        String normalized = groupBy.trim().toLowerCase(Locale.ROOT);
        if ("service_name".equals(normalized)) {
            return "service.name";
        }
        if ("operation".equals(normalized) || "operation.name".equals(normalized)
                || "span.name".equals(normalized) || "span_name".equals(normalized)) {
            return "operation.name";
        }
        if ("status".equals(normalized) || "error".equals(normalized)) {
            return "status";
        }
        if (normalized.startsWith("resource:")) {
            String key = normalized.substring("resource:".length());
            return isSafeResourceFilterKey(key) ? "resource:" + key : null;
        }
        if (normalized.startsWith("attribute:")) {
            String key = normalized.substring("attribute:".length());
            return isSafeResourceFilterKey(key) ? "attribute:" + key : null;
        }
        return isSafeResourceFilterKey(normalized) ? normalized : null;
    }

    private boolean isTraceAttributeGroupBy(String groupBy) {
        return StringUtils.hasText(groupBy) && groupBy.startsWith("attribute:");
    }

    private TraceOverviewDto toTraceOverview(Map<String, Object> row) {
        if (CollectionUtils.isEmpty(row)) {
            return null;
        }
        int totalTraceCount = Optional.ofNullable(readIntValue(row, "total_trace_count", "totalTraceCount"))
                .orElse(0);
        int errorTraceCount = Optional.ofNullable(readIntValue(row, "error_trace_count", "errorTraceCount"))
                .orElse(0);
        Long latestObservedAt = readTimestamp(row, "latest_observed_at");
        if (latestObservedAt == null) {
            latestObservedAt = readTimestamp(row, "latestObservedAt");
        }
        boolean active = latestObservedAt != null
                && latestObservedAt >= System.currentTimeMillis() - ACTIVE_TRACE_WINDOW_MILLIS;
        return new TraceOverviewDto(totalTraceCount, errorTraceCount, latestObservedAt, active);
    }

    private EntityTraceSummaryDto toEntityTraceSummary(Map<String, Object> row) {
        if (CollectionUtils.isEmpty(row)) {
            return null;
        }
        int totalTraceCount = Optional.ofNullable(readIntValue(row, "total_trace_count", "totalTraceCount"))
                .orElse(0);
        int errorTraceCount = Optional.ofNullable(readIntValue(row, "error_trace_count", "errorTraceCount"))
                .orElse(0);
        Long latestObservedAt = readTimestamp(row, "latest_observed_at");
        if (latestObservedAt == null) {
            latestObservedAt = readTimestamp(row, "latestObservedAt");
        }
        String latestTraceId = defaultText(readTextValue(row, "latest_trace_id"),
                readTextValue(row, "latestTraceId"));
        boolean active = latestObservedAt != null
                && latestObservedAt >= System.currentTimeMillis() - ACTIVE_TRACE_WINDOW_MILLIS;
        return new EntityTraceSummaryDto(totalTraceCount, errorTraceCount, latestObservedAt, active, latestTraceId);
    }

    private ObservedEntityContext loadEntityContext(String workspaceId, Long entityId) {
        if (entityId == null || entityId <= 0) {
            return null;
        }
        Optional<ObserveEntity> entityOptional = workspaceQueryGateway.findEntityById(workspaceId, entityId);
        if (entityOptional.isEmpty()) {
            return null;
        }
        return ObservedEntityContext.from(
                entityOptional.get(), workspaceQueryGateway.findIdentitiesByEntityId(workspaceId, entityId));
    }

    private boolean missingRequestedEntity(Long entityId, ObservedEntityContext entityContext) {
        return entityId != null && entityContext == null;
    }

    private TraceQueryScope resolveTraceQueryScope(ObservedEntityContext entityContext,
                                                   Map<String, Set<String>> identityValues,
                                                   String serviceName,
                                                   String serviceNamespace,
                                                   String environment) {
        return new TraceQueryScope(
                defaultText(preferredIdentityValue(identityValues, "service.name"),
                        fallbackServiceName(entityContext, serviceName)),
                defaultText(preferredIdentityValue(identityValues, "service.namespace"), serviceNamespace),
                defaultText(preferredIdentityValue(identityValues, "deployment.environment.name"), environment)
        );
    }

    private String fallbackServiceName(ObservedEntityContext entityContext, String serviceName) {
        if (StringUtils.hasText(serviceName)) {
            return serviceName;
        }
        if (entityContext == null || entityContext.getEntity() == null
                || !"service".equalsIgnoreCase(trimText(entityContext.getEntity().getType()))) {
            return null;
        }
        return trimText(entityContext.getEntity().getName());
    }

    private List<Map<String, Object>> queryRecentRows() {
        return traceQueryRepository.queryRecentTraceRows(TRACE_LIST_SAMPLE_LIMIT);
    }

    private List<Map<String, Object>> queryRecentRows(Map<String, Set<String>> identityValues, long now) {
        if (CollectionUtils.isEmpty(identityValues)) {
            return queryRecentRows();
        }
        return traceQueryRepository.queryRecentTraceRows(
                TRACE_LIST_SAMPLE_LIMIT,
                Math.max(0L, now - DEFAULT_LOOKBACK_MILLIS),
                now,
                preferredIdentityValue(identityValues, "service.name"),
                preferredIdentityValue(identityValues, "service.namespace"),
                preferredIdentityValue(identityValues, "deployment.environment.name"),
                AuthTokenRequestContext.currentWorkspaceId(),
                identityValues,
                false
        );
    }

    private List<Map<String, Object>> queryRowsForList(String workspaceId,
                                                       String traceId,
                                                       Long start,
                                                       Long end,
                                                       String serviceName,
                                                       String serviceNamespace,
                                                       String environment,
                                                       String operationName,
                                                       Long minDurationNanos,
                                                       Long maxDurationNanos,
                                                       Map<String, Set<String>> identityValues,
                                                       Map<String, Set<String>> attributeFilters,
                                                       Boolean hideInternal) {
        return queryRowsForList(workspaceId, traceId, start, end, serviceName, serviceNamespace, environment,
                operationName, minDurationNanos, maxDurationNanos, identityValues, attributeFilters,
                hideInternal, StringUtils.hasText(traceId) ? TRACE_DETAIL_LIMIT : TRACE_LIST_SAMPLE_LIMIT);
    }

    private List<Map<String, Object>> queryRowsForList(String workspaceId, String traceId, Long start, Long end,
                                                    String serviceName, String serviceNamespace, String environment,
                                                    String operationName, Long minDurationNanos, Long maxDurationNanos,
                                                    Map<String, Set<String>> identityValues,
                                                    Map<String, Set<String>> attributeFilters, Boolean hideInternal, int limit) {
        if (CollectionUtils.isEmpty(attributeFilters)) {
            if (StringUtils.hasText(traceId)) {
                return queryTraceRows(workspaceId, traceId, start, end, serviceName, serviceNamespace, environment,
                        operationName, minDurationNanos, maxDurationNanos, identityValues, hideInternal, limit);
            }
            return traceQueryRepository.queryRecentTraceRows(
                    limit,
                    start,
                    end,
                    serviceName,
                    serviceNamespace,
                    environment,
                    operationName,
                    minDurationNanos,
                    maxDurationNanos,
                    workspaceId,
                    identityValues,
                    hideInternal);
        }
        TraceRowQuery rowQuery = new TraceRowQuery(
                traceId,
                null,
                start,
                end,
                serviceName,
                serviceNamespace,
                environment,
                operationName,
                minDurationNanos,
                maxDurationNanos,
                workspaceId,
                identityValues,
                attributeFilters,
                hideInternal);
        return StringUtils.hasText(traceId)
                ? traceQueryRepository.queryTraceRows(rowQuery, limit)
                : traceQueryRepository.queryRecentTraceRows(rowQuery, limit);
    }

    private List<Map<String, Object>> queryTraceRows(String workspaceId,
                                                     String traceId,
                                                     Long start,
                                                     Long end,
                                                     String serviceName,
                                                     String serviceNamespace,
                                                     String environment,
                                                     String operationName,
                                                     Long minDurationNanos,
                                                     Long maxDurationNanos,
                                                     Map<String, Set<String>> identityValues,
                                                     Boolean hideInternal, int limit) {
        return traceQueryRepository.queryTraceRows(
                traceId,
                limit,
                start,
                end,
                serviceName,
                serviceNamespace,
                environment,
                operationName,
                minDurationNanos,
                maxDurationNanos,
                workspaceId,
                identityValues,
                hideInternal
        );
    }

    private List<TraceAggregate> aggregateTraceRows(List<Map<String, Object>> rows) {
        return aggregateTraceRows(AuthTokenRequestContext.currentWorkspaceId(), rows);
    }

    private List<TraceAggregate> aggregateTraceRows(String workspaceId, List<Map<String, Object>> rows) {
        if (CollectionUtils.isEmpty(rows)) {
            return Collections.emptyList();
        }
        Map<String, TraceAggregate> traceMap = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            TraceSpanNodeDto span = toSpanNode(row);
            if (!StringUtils.hasText(span.getTraceId())) {
                continue;
            }
            if (!matchesRequestWorkspace(workspaceId, span)) {
                continue;
            }
            TraceAggregate aggregate = traceMap.computeIfAbsent(span.getTraceId(), TraceAggregate::new);
            aggregate.accept(span, spanTiming(row, span.getDurationNanos()));
        }
        return traceMap.values().stream().map(TraceAggregate::normalize).toList();
    }

    private boolean matchesRequestWorkspace(String workspaceId, TraceSpanNodeDto span) {
        if (!StringUtils.hasText(workspaceId)) {
            return true;
        }
        String spanWorkspaceId = resolveWorkspaceId(span);
        String normalizedWorkspaceId = AuthTokenScopes.normalizeWorkspaceId(workspaceId);
        if (!StringUtils.hasText(spanWorkspaceId)) {
            return AuthTokenScopes.DEFAULT_WORKSPACE_ID.equals(normalizedWorkspaceId);
        }
        return normalizedWorkspaceId.equals(AuthTokenScopes.normalizeWorkspaceId(spanWorkspaceId));
    }

    private String resolveWorkspaceId(TraceSpanNodeDto span) {
        if (span == null || CollectionUtils.isEmpty(span.getResourceAttributes())) {
            return null;
        }
        for (String key : WORKSPACE_RESOURCE_KEYS) {
            String value = trimText(span.getResourceAttributes().get(key));
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    @Override
    public TraceAnalytics.Evidence<?> queryAnalytics(AnalyticsQuery query, TraceAnalytics.Options options) {
        String workspace = requireTrustedWorkspaceId(query.workspaceId());
        TraceAnalytics.population(query.population());
        ObservedEntityContext entity = query.entityId() == null ? null : loadEntityContext(workspace, query.entityId());
        var identities = traceQueryIdentityValues(entity);
        var scope = resolveTraceQueryScope(entity, identities, query.serviceName(), query.serviceNamespace(), query.environment());
        var resources = removeEntityScopeResourceFilters(identities, parseResourceFilters(query.resourceFilter()));
        var attributes = parseResourceFilters(query.attributeFilter());
        var pushed = mergeResourceFilters(identities, resources.pushableInclude());
        Long minimum = durationMillisToNanos(query.minDurationMs());
        Long maximum = durationMillisToNanos(query.maxDurationMs());
        String spanScope = normalizeSpanScope(query.spanScope());
        if (missingRequestedEntity(query.entityId(), entity)) {
            return analyticsResult(query, options, List.of(), new TraceAnalytics.Coverage("window", null, null, false));
        }
        try {
            if (!StringUtils.hasText(query.traceId()) && !resources.requiresRowFallback() && attributes.isEmpty()) {
                try {
                    var result = traceQueryRepository.queryAnalytics(new TraceAnalytics.Scope(query.window(), workspace,
                            query.traceId(), Boolean.TRUE.equals(query.errorOnly()), query.population(), scope.serviceName(),
                            scope.serviceNamespace(), scope.environment(), query.operationName(), minimum, maximum, spanScope,
                            Boolean.TRUE.equals(query.hideInternal()), pushed, Map.of()), options);
                    return result == null ? TraceAnalytics.Evidence.unavailable(query.window(), query.population()) : result;
                } catch (UnsupportedOperationException unsupported) {
                    // Older readers retain explicit bounded evidence rather than invented full-window counts.
                }
            }
            int limit = StringUtils.hasText(query.traceId()) ? TRACE_DETAIL_LIMIT : TRACE_LIST_SAMPLE_LIMIT;
            var rows = queryRowsForList(workspace, query.traceId(), query.window().start(), query.window().end(),
                    scope.serviceName(), scope.serviceNamespace(), scope.environment(), query.operationName(), minimum, maximum,
                    pushed, pushableSpanAttributeFilters(attributes), query.hideInternal(), limit + 1);
            if (rows == null) {
                return TraceAnalytics.Evidence.unavailable(query.window(), query.population());
            }
            var matched = aggregateTraceRows(workspace, rows.subList(0, Math.min(limit, rows.size()))).stream()
                    .flatMap(trace -> matchingTraceSpans(trace, identities, resources, query.window().start(), query.window().end(),
                            query.traceId(), false, scope.serviceName(), scope.serviceNamespace(), scope.environment(),
                            query.operationName(), minimum, maximum, query.hideInternal(), spanScope, attributes,
                            query.window().endExclusive()).map(span -> analyticsSpan(trace, span))).toList();
            return analyticsResult(query, options, matched,
                    new TraceAnalytics.Coverage("bounded", limit, Math.min(limit, rows.size()), rows.size() > limit));
        } catch (RuntimeException unavailable) {
            return TraceAnalytics.Evidence.unavailable(query.window(), query.population());
        }
    }

    private TraceAnalytics.SpanRow analyticsSpan(TraceAggregate trace, TraceSpanNodeDto span) {
        var resources = span.getResourceAttributes();
        String status = isErrorStatus(span.getStatus()) ? "ERROR"
                : "OK".equals(span.getStatus()) || "STATUS_CODE_OK".equals(span.getStatus()) ? "OK" : "UNSET";
        return new TraceAnalytics.SpanRow(trace.getTraceId(), span.getSpanId(), span.getParentSpanId(), span.getServiceName(),
                resources.get("service.namespace"), resources.get("deployment.environment.name"), span.getSpanName(),
                span.getSpanKind(), status, Long.toString(trace.timings.get(span.getSpanId()).startNanos()),
                span.getDurationNanos() == null ? null : Long.toString(span.getDurationNanos()));
    }

    private TraceAnalytics.Evidence<?> analyticsResult(AnalyticsQuery query, TraceAnalytics.Options options,
                                                       List<TraceAnalytics.SpanRow> rows, TraceAnalytics.Coverage coverage) {
        boolean errors = Boolean.TRUE.equals(query.errorOnly());
        Object data = switch (options.shape()) {
            case "spans" -> TraceAnalyticsAggregator.spans(rows, errors, options.pageIndex(), options.pageSize(), options.sort());
            case "histogram" -> TraceAnalyticsAggregator.histogram(rows, query.window(), query.population(), errors, options.bucketCount());
            case "facets" -> TraceAnalyticsAggregator.facets(rows, query.population(), errors, options.field(), options.limit());
            case "groups" -> TraceAnalyticsAggregator.groups(rows, query.population(), errors, options.field(), options.limit(), options.sort());
            default -> throw new IllegalArgumentException("Invalid trace analytics shape");
        };
        return new TraceAnalytics.Evidence<>("ready", query.window(), query.population(), coverage, data);
    }

    private boolean matchesTraceFilters(TraceAggregate trace, Map<String, Set<String>> identityValues,
                                        ResourceFilterSet resourceFilters, Long start, Long end,
                                        String traceId, Boolean errorOnly, String serviceName, String serviceNamespace,
                                        String environment, String operationName, Long minDurationNanos,
                                        Long maxDurationNanos, Boolean hideInternal, String spanScope,
                                        ResourceFilterSet attributeFilters) {
        return matchingTraceSpans(trace, identityValues, resourceFilters, start, end, traceId, errorOnly,
                serviceName, serviceNamespace, environment, operationName, minDurationNanos, maxDurationNanos,
                hideInternal, spanScope, attributeFilters, false).findAny().isPresent();
    }

    private java.util.stream.Stream<TraceSpanNodeDto> matchingTraceSpans(TraceAggregate trace, Map<String, Set<String>> identityValues,
                                        ResourceFilterSet resourceFilters, Long start, Long end,
                                        String traceId, Boolean errorOnly, String serviceName, String serviceNamespace,
                                        String environment, String operationName, Long minDurationNanos,
                                        Long maxDurationNanos, Boolean hideInternal, String spanScope,
                                        ResourceFilterSet attributeFilters, boolean endExclusive) {
        if (trace == null || StringUtils.hasText(traceId) && !traceId.equalsIgnoreCase(trace.getTraceId())) {
            return java.util.stream.Stream.empty();
        }
        String operation = StringUtils.trimWhitespace(operationName);
        // Root fields describe evidence, not query membership: bounded rows may have no unique root.
        // Every candidate predicate must match one observed span, as it does in the storage query.
        return trace.spans.stream().filter(span -> {
            if (!matchesSpanScope(span, spanScope)
                    || Boolean.TRUE.equals(errorOnly) && !isErrorStatus(span.getStatus())
                    || Boolean.TRUE.equals(hideInternal) && isSelfTelemetrySpan(span)) {
                return false;
            }
            long startNanos = trace.timings.get(span.getSpanId()).startNanos();
            long startMillis = Math.floorDiv(startNanos, 1_000_000L);
            if (start != null && startMillis < start
                    || end != null && (startMillis > end || startMillis == end && (endExclusive || startNanos % 1_000_000L != 0))) {
                return false;
            }
            Map<String, String> resources = new LinkedHashMap<>(span.getResourceAttributes());
            if (StringUtils.hasText(span.getServiceName())) {
                resources.put("service.name", span.getServiceName());
            }
            if (StringUtils.hasText(serviceName) && !serviceName.equals(resources.get("service.name"))
                    || StringUtils.hasText(serviceNamespace) && !serviceNamespace.equals(resources.get("service.namespace"))
                    || StringUtils.hasText(environment) && !"all".equalsIgnoreCase(environment.trim())
                    && !environment.equals(resources.get("deployment.environment.name"))
                    || StringUtils.hasText(operation) && !operation.equals(span.getSpanName())) {
                return false;
            }
            Long duration = span.getDurationNanos();
            if (minDurationNanos != null && (duration == null || duration < minDurationNanos)
                    || maxDurationNanos != null && (duration == null || duration > maxDurationNanos)) {
                return false;
            }
            return matchesIncludedFilterMap(resources, identityValues)
                    && matchesFilterMap(resources, resourceFilters)
                    && matchesFilterMap(spanAttributeFilterValues(span), attributeFilters);
        });
    }

    private String normalizeSpanScope(String spanScope) {
        String normalized = StringUtils.trimWhitespace(spanScope);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }
        normalized = normalized.toLowerCase(Locale.ROOT);
        if ("root".equals(normalized)) {
            return "root";
        }
        if ("entrypoint".equals(normalized) || "entrypoint-spans".equals(normalized) || "entry".equals(normalized)) {
            return "entrypoint";
        }
        return null;
    }

    private boolean matchesSpanScope(TraceSpanNodeDto span, String spanScope) {
        if (!StringUtils.hasText(spanScope)) {
            return true;
        }
        if ("root".equals(spanScope)) {
            return !StringUtils.hasText(span.getParentSpanId());
        }
        if ("entrypoint".equals(spanScope)) {
            return !StringUtils.hasText(span.getParentSpanId()) || isEntrypointSpanKind(span.getSpanKind());
        }
        return true;
    }

    private boolean isEntrypointSpanKind(String spanKind) {
        String normalized = StringUtils.trimWhitespace(spanKind);
        if (!StringUtils.hasText(normalized)) {
            return false;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        return "SPAN_KIND_SERVER".equals(normalized)
                || "SERVER".equals(normalized)
                || "SPAN_KIND_CONSUMER".equals(normalized)
                || "CONSUMER".equals(normalized);
    }

    private Long durationMillisToNanos(Long durationMillis) {
        if (durationMillis == null || durationMillis < 0) {
            return null;
        }
        if (durationMillis > Long.MAX_VALUE / 1_000_000L) {
            return Long.MAX_VALUE;
        }
        return durationMillis * 1_000_000L;
    }

    private boolean isSelfTelemetrySpan(TraceSpanNodeDto span) {
        if (span == null) {
            return false;
        }
        String serviceName = normalizeValue(defaultText(span.getServiceName(), span.getResourceAttributes().get("service.name")));
        String serviceNamespace = normalizeValue(span.getResourceAttributes().get("service.namespace"));
        return "hertzbeat".equals(serviceName)
                || "apache-hertzbeat".equals(serviceName)
                || "hertzbeat".equals(serviceNamespace)
                || "apache-hertzbeat".equals(serviceNamespace);
    }

    private String normalizeValue(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private boolean matchesEntity(TraceAggregate trace, Map<String, Set<String>> identityValues) {
        if (identityValues.isEmpty() || trace == null) {
            return false;
        }
        for (Map.Entry<String, Set<String>> entry : identityValues.entrySet()) {
            String actual = trimText(resolveCanonicalValue(trace.getResourceAttributes(), entry.getKey(), trace.getServiceName()));
            if (actual == null) {
                continue;
            }
            for (String expected : entry.getValue()) {
                if (actual.equalsIgnoreCase(expected)) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean matchesResourceFilters(TraceAggregate trace, ResourceFilterSet resourceFilters) {
        return matchesIncludedResourceFilters(trace, resourceFilters.include())
                && matchesExcludedResourceFilters(trace, resourceFilters.exclude());
    }

    private boolean matchesSpanAttributeFilters(TraceAggregate trace, ResourceFilterSet attributeFilters) {
        if (attributeFilters == null || attributeFilters.isEmpty()) {
            return true;
        }
        if (trace == null || CollectionUtils.isEmpty(trace.spans)) {
            return false;
        }
        return trace.spans.stream()
                .anyMatch(span -> matchesFilterMap(spanAttributeFilterValues(span), attributeFilters));
    }

    private Map<String, String> spanAttributeFilterValues(TraceSpanNodeDto span) {
        if (span == null) {
            return Collections.emptyMap();
        }
        Map<String, String> values = new LinkedHashMap<>();
        if (!CollectionUtils.isEmpty(span.getSpanAttributes())) {
            values.putAll(span.getSpanAttributes());
        }
        String spanName = trimText(span.getSpanName());
        if (spanName != null) {
            values.putIfAbsent("span.name", spanName);
            values.putIfAbsent("span_name", spanName);
            values.putIfAbsent("spanName", spanName);
        }
        return values;
    }

    private boolean matchesFilterMap(Map<String, String> values, ResourceFilterSet filters) {
        Map<String, String> source = values == null ? Collections.emptyMap() : values;
        return matchesIncludedFilterMap(source, filters.include())
                && matchesExcludedFilterMap(source, filters.exclude());
    }

    private boolean matchesIncludedFilterMap(Map<String, String> source, Map<String, Set<String>> filters) {
        if (filters.isEmpty()) {
            return true;
        }
        for (Map.Entry<String, Set<String>> entry : filters.entrySet()) {
            String actual = trimText(source.get(entry.getKey()));
            boolean keyExists = source.containsKey(entry.getKey());
            boolean matched = entry.getValue().stream()
                    .filter(StringUtils::hasText)
                    .anyMatch(expected -> matchesResourceFilterValue(actual, expected, keyExists));
            if (!matched) {
                return false;
            }
        }
        return true;
    }

    private boolean matchesExcludedFilterMap(Map<String, String> source, Map<String, Set<String>> filters) {
        if (filters.isEmpty()) {
            return true;
        }
        for (Map.Entry<String, Set<String>> entry : filters.entrySet()) {
            String actual = trimText(source.get(entry.getKey()));
            if (!StringUtils.hasText(actual)) {
                continue;
            }
            boolean excluded = entry.getValue().stream()
                    .filter(StringUtils::hasText)
                    .anyMatch(expected -> matchesExactResourceFilterValue(actual, expected));
            if (excluded) {
                return false;
            }
        }
        return true;
    }

    private boolean matchesIncludedResourceFilters(TraceAggregate trace, Map<String, Set<String>> resourceFilters) {
        if (resourceFilters.isEmpty()) {
            return true;
        }
        if (trace == null) {
            return false;
        }
        for (Map.Entry<String, Set<String>> entry : resourceFilters.entrySet()) {
            String actual = trimText(resolveCanonicalValue(trace.getResourceAttributes(), entry.getKey(), trace.getServiceName()));
            boolean keyExists = resourceKeyExists(trace, entry.getKey());
            boolean matched = entry.getValue().stream()
                    .filter(StringUtils::hasText)
                    .anyMatch(expected -> matchesResourceFilterValue(actual, expected, keyExists));
            if (!matched) {
                return false;
            }
        }
        return true;
    }

    private boolean matchesExcludedResourceFilters(TraceAggregate trace, Map<String, Set<String>> resourceFilters) {
        if (resourceFilters.isEmpty()) {
            return true;
        }
        if (trace == null) {
            return false;
        }
        for (Map.Entry<String, Set<String>> entry : resourceFilters.entrySet()) {
            String actual = trimText(resolveCanonicalValue(trace.getResourceAttributes(), entry.getKey(), trace.getServiceName()));
            if (!StringUtils.hasText(actual)) {
                continue;
            }
            boolean excluded = entry.getValue().stream()
                    .filter(StringUtils::hasText)
                    .anyMatch(expected -> matchesExactResourceFilterValue(actual, expected));
            if (excluded) {
                return false;
            }
        }
        return true;
    }

    private boolean matchesResourceFilterValue(String actualValue, String expectedValue, boolean keyExists) {
        if (isExistsResourceFilterValue(expectedValue)) {
            return keyExists;
        }
        if (isNotExistsResourceFilterValue(expectedValue)) {
            return !keyExists;
        }
        if (isContainsResourceFilterValue(expectedValue)) {
            return matchesContainedResourceFilterValue(actualValue,
                    expectedValue.substring(RESOURCE_FILTER_CONTAINS_PREFIX.length()));
        }
        if (isNotContainsResourceFilterValue(expectedValue)) {
            return !matchesContainedResourceFilterValue(actualValue,
                    expectedValue.substring(RESOURCE_FILTER_NOT_CONTAINS_PREFIX.length()));
        }
        return matchesExactResourceFilterValue(actualValue, expectedValue);
    }

    private boolean matchesExactResourceFilterValue(String actualValue, String expectedValue) {
        return StringUtils.hasText(actualValue) && StringUtils.hasText(expectedValue)
                && actualValue.equalsIgnoreCase(expectedValue);
    }

    private boolean matchesContainedResourceFilterValue(String actualValue, String expectedValue) {
        if (!StringUtils.hasText(actualValue) || !StringUtils.hasText(expectedValue)) {
            return false;
        }
        return actualValue.toLowerCase(Locale.ROOT).contains(expectedValue.toLowerCase(Locale.ROOT));
    }

    private ResourceFilterSet parseResourceFilters(String resourceFilter) {
        if (!StringUtils.hasText(resourceFilter)) {
            return ResourceFilterSet.empty();
        }
        Map<String, Set<String>> includeFilters = new LinkedHashMap<>();
        Map<String, Set<String>> excludeFilters = new LinkedHashMap<>();
        for (String clause : SignalFilterScanner.splitClauses(resourceFilter)) {
            String trimmedClause = trimText(clause);
            if (!StringUtils.hasText(trimmedClause)) {
                continue;
            }
            if (appendResourceFilterListValues(includeFilters, excludeFilters, trimmedClause)) {
                continue;
            }
            if (appendResourceFilterTextValue(includeFilters, trimmedClause)) {
                continue;
            }
            if (appendResourceFilterPresenceValue(includeFilters, trimmedClause)) {
                continue;
            }
            if (appendResourceFilterNotEqualsValue(excludeFilters, trimmedClause)) {
                continue;
            }
            int separatorIndex = resourceFilterSeparatorIndex(trimmedClause);
            if (separatorIndex <= 0 || separatorIndex >= trimmedClause.length() - 1) {
                throw new ObservabilityQueryRequestException();
            }
            String key = trimText(trimmedClause.substring(0, separatorIndex));
            String value = stripResourceFilterQuotes(trimText(trimmedClause.substring(separatorIndex + 1)));
            if (!isSafeResourceFilterKey(key) || !StringUtils.hasText(value)) {
                throw new ObservabilityQueryRequestException();
            }
            includeFilters.computeIfAbsent(key, ignored -> new LinkedHashSet<>()).add(value);
        }
        return new ResourceFilterSet(includeFilters, excludeFilters);
    }

    private boolean appendResourceFilterTextValue(Map<String, Set<String>> includeFilters, String clause) {
        Matcher matcher = RESOURCE_FILTER_TEXT_OPERATOR_PATTERN.matcher(clause);
        if (!matcher.matches()) {
            return false;
        }
        String key = trimText(matcher.group(1));
        String operator = trimText(matcher.group(2));
        String value = stripResourceFilterQuotes(trimText(matcher.group(3)));
        if (!isSafeResourceFilterKey(key) || !StringUtils.hasText(operator) || !StringUtils.hasText(value)) {
            return false;
        }
        String prefix = operator.replaceAll("\\s+", " ").equalsIgnoreCase("not contains")
                ? RESOURCE_FILTER_NOT_CONTAINS_PREFIX
                : RESOURCE_FILTER_CONTAINS_PREFIX;
        includeFilters.computeIfAbsent(key, ignored -> new LinkedHashSet<>()).add(prefix + value);
        return true;
    }

    private boolean appendResourceFilterPresenceValue(Map<String, Set<String>> includeFilters, String clause) {
        Matcher matcher = RESOURCE_FILTER_PRESENCE_OPERATOR_PATTERN.matcher(clause);
        if (!matcher.matches()) {
            return false;
        }
        String key = trimText(matcher.group(1));
        String operator = trimText(matcher.group(2));
        if (!isSafeResourceFilterKey(key) || !StringUtils.hasText(operator)) {
            return false;
        }
        String value = operator.replaceAll("\\s+", " ").equalsIgnoreCase("not exists")
                ? RESOURCE_FILTER_NOT_EXISTS_VALUE
                : RESOURCE_FILTER_EXISTS_VALUE;
        includeFilters.computeIfAbsent(key, ignored -> new LinkedHashSet<>()).add(value);
        return true;
    }

    private boolean appendResourceFilterListValues(Map<String, Set<String>> includeFilters,
                                                   Map<String, Set<String>> excludeFilters,
                                                   String clause) {
        Matcher matcher = RESOURCE_FILTER_LIST_OPERATOR_PATTERN.matcher(clause);
        if (!matcher.matches()) {
            return false;
        }
        String key = trimText(matcher.group(1));
        String operator = trimText(matcher.group(2));
        String valueList = trimText(matcher.group(3));
        if (!isSafeResourceFilterKey(key) || !StringUtils.hasText(operator) || !StringUtils.hasText(valueList)
                || valueList.length() < 2 || !valueList.startsWith("(") || !valueList.endsWith(")")) {
            return false;
        }
        Map<String, Set<String>> target = operator.replaceAll("\\s+", " ").equalsIgnoreCase("not in")
                ? excludeFilters
                : includeFilters;
        for (String value : SignalFilterScanner.splitListValues(valueList.substring(1, valueList.length() - 1))) {
            String normalizedValue = stripResourceFilterQuotes(trimText(value));
            if (StringUtils.hasText(normalizedValue)) {
                target.computeIfAbsent(key, ignored -> new LinkedHashSet<>()).add(normalizedValue);
            }
        }
        return target.containsKey(key);
    }

    private boolean appendResourceFilterNotEqualsValue(Map<String, Set<String>> excludeFilters, String clause) {
        Matcher matcher = RESOURCE_FILTER_NOT_EQUALS_PATTERN.matcher(clause);
        if (!matcher.matches()) {
            return false;
        }
        String key = trimText(matcher.group(1));
        String value = stripResourceFilterQuotes(trimText(matcher.group(2)));
        if (!isSafeResourceFilterKey(key) || !StringUtils.hasText(value)) {
            return false;
        }
        excludeFilters.computeIfAbsent(key, ignored -> new LinkedHashSet<>()).add(value);
        return true;
    }





    private int resourceFilterSeparatorIndex(String clause) {
        int equalsIndex = clause.indexOf('=');
        int colonIndex = clause.indexOf(':');
        if (equalsIndex < 0) {
            return colonIndex;
        }
        if (colonIndex < 0) {
            return equalsIndex;
        }
        return Math.min(equalsIndex, colonIndex);
    }

    private String stripResourceFilterQuotes(String value) {
        if (value == null || value.length() < 2) {
            return value;
        }
        char first = value.charAt(0);
        char last = value.charAt(value.length() - 1);
        if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
            return trimText(value.substring(1, value.length() - 1));
        }
        return value;
    }

    private boolean isSafeResourceFilterKey(String key) {
        if (!StringUtils.hasText(key)) {
            return false;
        }
        for (int index = 0; index < key.length(); index++) {
            char character = key.charAt(index);
            if (!Character.isLetterOrDigit(character) && character != '.' && character != '_' && character != '-' && character != ':') {
                return false;
            }
        }
        return true;
    }

    private Map<String, Set<String>> mergeResourceFilters(Map<String, Set<String>> identityValues,
                                                          Map<String, Set<String>> resourceFilters) {
        if (CollectionUtils.isEmpty(identityValues) && CollectionUtils.isEmpty(resourceFilters)) {
            return Collections.emptyMap();
        }
        Map<String, Set<String>> merged = new LinkedHashMap<>();
        identityValues.forEach((key, values) -> merged.put(key, new LinkedHashSet<>(values)));
        resourceFilters.forEach((key, values) -> merged.computeIfAbsent(key, ignored -> new LinkedHashSet<>()).addAll(values));
        return merged;
    }

    private ResourceFilterSet removeEntityScopeResourceFilters(Map<String, Set<String>> identityValues,
                                                               ResourceFilterSet resourceFilters) {
        if (resourceFilters == null || resourceFilters.isEmpty()) {
            return ResourceFilterSet.empty();
        }
        return new ResourceFilterSet(
                removeEntityScopeResourceFilterMap(identityValues, resourceFilters.include()),
                removeEntityScopeResourceFilterMap(identityValues, resourceFilters.exclude())
        );
    }

    private Map<String, Set<String>> removeEntityScopeResourceFilterMap(Map<String, Set<String>> identityValues,
                                                                        Map<String, Set<String>> resourceFilters) {
        if (CollectionUtils.isEmpty(identityValues) || CollectionUtils.isEmpty(resourceFilters)) {
            return resourceFilters;
        }
        Map<String, Set<String>> filtered = new LinkedHashMap<>();
        resourceFilters.forEach((key, values) -> {
            if (ENTITY_SCOPE_RESOURCE_KEYS.contains(key) && identityValues.containsKey(key)) {
                return;
            }
            filtered.put(key, values);
        });
        return filtered;
    }

    private String resolveCanonicalValue(Map<String, String> resourceAttributes, String key, String serviceName) {
        if ("service.name".equals(key)) {
            return defaultText(serviceName, resourceAttributes.get(key));
        }
        return resourceAttributes.get(key);
    }

    private boolean resourceKeyExists(TraceAggregate trace, String key) {
        if (trace == null || !StringUtils.hasText(key)) {
            return false;
        }
        if ("service.name".equals(key) && StringUtils.hasText(trace.getServiceName())) {
            return true;
        }
        return trace.getResourceAttributes().containsKey(key);
    }

    private static boolean isComplexResourceFilterValue(String value) {
        return isContainsResourceFilterValue(value)
                || isNotContainsResourceFilterValue(value)
                || isExistsResourceFilterValue(value)
                || isNotExistsResourceFilterValue(value);
    }

    private static boolean isContainsResourceFilterValue(String value) {
        return value != null && value.startsWith(RESOURCE_FILTER_CONTAINS_PREFIX);
    }

    private static boolean isNotContainsResourceFilterValue(String value) {
        return value != null && value.startsWith(RESOURCE_FILTER_NOT_CONTAINS_PREFIX);
    }

    private static boolean isExistsResourceFilterValue(String value) {
        return RESOURCE_FILTER_EXISTS_VALUE.equals(value);
    }

    private static boolean isNotExistsResourceFilterValue(String value) {
        return RESOURCE_FILTER_NOT_EXISTS_VALUE.equals(value);
    }

    private Map<String, Set<String>> canonicalIdentityValues(ObservedEntityContext entityContext) {
        if (entityContext == null) {
            return Collections.emptyMap();
        }
        Map<String, Set<String>> values = new LinkedHashMap<>();
        if (entityContext.getEntity() != null && entityContext.getEntity().getId() != null
                && entityContext.getEntity().getId() > 0) {
            values.computeIfAbsent(OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID, ignored -> new LinkedHashSet<>())
                    .add(String.valueOf(entityContext.getEntity().getId()));
        }
        if (!CollectionUtils.isEmpty(entityContext.getIdentities())) {
            for (EntityIdentity identity : entityContext.getIdentities()) {
                String key = trimText(identity.getIdentityKey());
                String value = trimText(identity.getIdentityValue());
                if (!StringUtils.hasText(key) || !StringUtils.hasText(value)
                        || !EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey(key)) {
                    continue;
                }
                values.computeIfAbsent(key, ignored -> new LinkedHashSet<>()).add(value);
            }
        }
        return values.isEmpty() ? Collections.emptyMap() : values;
    }

    private Map<String, Set<String>> traceQueryIdentityValues(ObservedEntityContext entityContext) {
        Map<String, Set<String>> values = canonicalIdentityValues(entityContext);
        if (values.size() <= 1
                || !values.containsKey(OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID)
                || hasExplicitEntityIdIdentity(entityContext)) {
            return values;
        }
        Map<String, Set<String>> relaxedValues = new LinkedHashMap<>(values);
        relaxedValues.remove(OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID);
        return relaxedValues.isEmpty() ? values : relaxedValues;
    }

    private boolean hasExplicitEntityIdIdentity(ObservedEntityContext entityContext) {
        if (entityContext == null || CollectionUtils.isEmpty(entityContext.getIdentities())) {
            return false;
        }
        return entityContext.getIdentities().stream()
                .anyMatch(identity -> OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID.equals(
                        trimText(identity.getIdentityKey())));
    }

    private List<String> preferredSearchTerms(Map<String, Set<String>> identityValues) {
        List<String> preferredKeys = List.of("service.name", "service.instance.id", "host.name", "k8s.deployment.name", "cloud.resource_id");
        List<String> terms = new ArrayList<>();
        for (String key : preferredKeys) {
            Set<String> values = identityValues.get(key);
            if (!CollectionUtils.isEmpty(values)) {
                values.stream().filter(StringUtils::hasText).findFirst().ifPresent(terms::add);
            }
        }
        return terms;
    }

    private void putPreferredFilter(Map<String, String> filters, Map<String, Set<String>> identityValues, String key) {
        Set<String> values = identityValues.get(key);
        if (!CollectionUtils.isEmpty(values)) {
            values.stream().filter(StringUtils::hasText).findFirst().ifPresent(value -> filters.put(key, value));
        }
    }

    private String preferredIdentityValue(Map<String, Set<String>> identityValues, String key) {
        Set<String> values = identityValues.get(key);
        if (CollectionUtils.isEmpty(values)) {
            return null;
        }
        return values.stream().filter(StringUtils::hasText).findFirst().orElse(null);
    }

    private TraceListItemDto toTraceListItem(TraceAggregate aggregate) {
        Map<String, TraceServiceStatsDto> namedStats = new LinkedHashMap<>();
        TraceServiceStatsDto unattributed = null;
        TraceSpanNodeDto representative = aggregate.spans.getFirst();
        long observedStart = Long.MAX_VALUE;
        long observedEnd = 0L;
        for (TraceSpanNodeDto span : aggregate.spans) {
            if (span.getStartTime() == null || span.getStartTime() < 0 || span.getDurationNanos() == null
                    || span.getDurationNanos() < 0) {
                throw new TelemetryStorageUnavailableException();
            }
            SpanTiming timing = aggregate.timings.get(span.getSpanId());
            observedStart = Math.min(observedStart, timing.startNanos() / 1_000_000L);
            observedEnd = Math.max(observedEnd, Math.ceilDiv(timing.endNanos(), 1_000_000L));
            String service = trimText(span.getServiceName());
            TraceServiceStatsDto stats;
            if (service == null) {
                if (unattributed == null) {
                    unattributed = new TraceServiceStatsDto(0, 0);
                }
                stats = unattributed;
            } else {
                stats = namedStats.computeIfAbsent(service, ignored -> new TraceServiceStatsDto(0, 0));
            }
            stats.setSpanCount(stats.getSpanCount() + 1);
            stats.setErrorCount(stats.getErrorCount() + (isErrorStatus(span.getStatus()) ? 1 : 0));
        }
        return new TraceListItemDto(
                aggregate.getTraceId(),
                aggregate.getRootSpanId(),
                aggregate.getServiceName(),
                aggregate.getServiceNamespace(),
                aggregate.getRootSpanName(),
                aggregate.getDurationNanos(),
                aggregate.getStatus(),
                aggregate.getStartTime(),
                aggregate.getErrorSpanCount(),
                (long) aggregate.spans.size(),
                namedStats,
                aggregate.rootSpanCount == 1 ? aggregate.getResourceAttributes() : null,
                rootState(aggregate.rootSpanCount), aggregate.rootSpanCount,
                new TraceRepresentativeSpanDto(representative.getSpanId(), representative.getSpanName(),
                        representative.getServiceName(), representative.getResourceAttributes().get("service.namespace"),
                        representative.getStartTime(), representative.getDurationNanos()),
                observedStart, observedEnd, unattributed
        );
    }

    private List<TraceListItemDto> toTraceListItems(List<Map<String, Object>> rows) {
        if (CollectionUtils.isEmpty(rows)) {
            return List.of();
        }
        if (rows.size() > TraceQueryRepository.MAX_TRACE_LIST_SERVICE_ROWS) {
            throw new TelemetryStorageUnavailableException();
        }
        Long serviceRowCount = readConsistentNonNegativeLong(rows, "service_row_count", "serviceRowCount");
        if (serviceRowCount == null || serviceRowCount != rows.size()
                || serviceRowCount > TraceQueryRepository.MAX_TRACE_LIST_SERVICE_ROWS) {
            throw new TelemetryStorageUnavailableException();
        }
        Map<String, List<Map<String, Object>>> rowsByTrace = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            String traceId = readText(row, "trace_id");
            if (!StringUtils.hasText(traceId)) {
                throw new TelemetryStorageUnavailableException();
            }
            rowsByTrace.computeIfAbsent(traceId, ignored -> new ArrayList<>()).add(row);
        }
        return rowsByTrace.values().stream().map(this::toTraceListItem).toList();
    }

    private List<Map<String, Object>> requireTracePageRows(TraceQueryRepository.TraceListPage page) {
        if (page == null || page.rows() == null || page.totalCount() < 0 || page.totalCount() > 9_007_199_254_740_991L) {
            throw new TelemetryStorageUnavailableException();
        }
        return page.rows();
    }

    private long validatedTraceListTotal(TraceQueryRepository.TraceListPage page, long offset, int itemCount) {
        List<Map<String, Object>> rows = page.rows();
        long minimumTotal;
        try {
            minimumTotal = Math.addExact(offset, itemCount);
        } catch (ArithmeticException ignored) {
            throw new TelemetryStorageUnavailableException();
        }
        if (CollectionUtils.isEmpty(rows)) {
            return page.totalCount();
        }
        Long total = null;
        for (Map<String, Object> row : rows) {
            Long rowTotal = readOptionalNonNegativeLong(row, "total_count", "totalCount");
            if (rowTotal == null || rowTotal < 0 || total != null && !total.equals(rowTotal)) {
                throw new TelemetryStorageUnavailableException();
            }
            total = rowTotal;
        }
        if (total == null || total < minimumTotal || total != page.totalCount()) {
            throw new TelemetryStorageUnavailableException();
        }
        return total;
    }

    private TraceListItemDto toTraceListItem(List<Map<String, Object>> traceRows) {
        Map<String, Object> firstRow = traceRows.getFirst();
        Long rootSpanCount = readConsistentNonNegativeLong(traceRows, "root_span_count", "rootSpanCount");
        List<Map<String, Object>> rootRows = traceRows.stream()
                .filter(row -> StringUtils.hasText(readText(row, "root_span_id")))
                .toList();
        boolean hasUniqueRoot = Long.valueOf(1L).equals(rootSpanCount) && rootRows.size() == 1;
        if (rootSpanCount == null || rootSpanCount == 1L && !hasUniqueRoot) {
            throw new TelemetryStorageUnavailableException();
        }
        Map<String, Object> rootRow = hasUniqueRoot ? rootRows.getFirst() : firstRow;
        Map<String, String> resourceAttributes = hasUniqueRoot
                ? parseAttributes("resource_attributes.", rootRow) : Collections.emptyMap();
        String serviceName = hasUniqueRoot
                ? defaultText(readText(rootRow, "service_name"), resourceAttributes.get("service.name")) : null;
        String serviceNamespace = hasUniqueRoot
                ? defaultText(readText(rootRow, "service_namespace"), resourceAttributes.get("service.namespace")) : null;
        String status = normalizeStatus(defaultText(
                readText(firstRow, "span_status_code"), readText(firstRow, "status")));
        Long errorCount = readConsistentNonNegativeLong(traceRows, "error_span_count", "errorSpanCount");
        Long spanCount = readConsistentNonNegativeLong(traceRows, "span_count", "spanCount");
        if (errorCount == null || errorCount > Integer.MAX_VALUE) {
            throw new TelemetryStorageUnavailableException();
        }
        ServiceStatsEvidence serviceStats = validatedServiceStats(
                traceRows, spanCount, errorCount);
        Long observedStartNanos = readConsistentNonNegativeLong(traceRows, "observed_start_nanos");
        Long observedEndNanos = readConsistentNonNegativeLong(traceRows, "observed_end_nanos");
        Long representativeStart = readConsistentNonNegativeLong(traceRows, "representative_start_nanos");
        Long representativeDuration = readConsistentNonNegativeLong(traceRows, "representative_duration_nano");
        Long evidenceCount = readConsistentNonNegativeLong(traceRows, "evidence_span_count");
        Long distinctCount = readConsistentNonNegativeLong(traceRows, "evidence_distinct_span_count");
        Long invalidCount = readConsistentNonNegativeLong(traceRows, "invalid_span_count");
        if (serviceStats == null || rootSpanCount > spanCount || observedStartNanos == null || observedEndNanos == null
                || observedEndNanos < observedStartNanos || representativeStart == null
                || !representativeStart.equals(observedStartNanos) || representativeDuration == null
                || !Objects.equals(spanCount, evidenceCount) || !Objects.equals(spanCount, distinctCount)
                || !Long.valueOf(0).equals(invalidCount)) {
            throw new TelemetryStorageUnavailableException();
        }
        TraceRepresentativeSpanDto representative = new TraceRepresentativeSpanDto(
                readConsistentText(traceRows, "representative_span_id"),
                readConsistentText(traceRows, "representative_span_name"),
                readConsistentText(traceRows, "representative_service_name"),
                readConsistentText(traceRows, "representative_service_namespace"),
                representativeStart / 1_000_000L, representativeDuration);
        if (!StringUtils.hasText(representative.spanId())) {
            throw new TelemetryStorageUnavailableException();
        }
        return new TraceListItemDto(
                readText(firstRow, "trace_id"),
                hasUniqueRoot ? readText(rootRow, "root_span_id") : null,
                serviceName,
                serviceNamespace,
                hasUniqueRoot ? readText(rootRow, "root_span_name") : null,
                hasUniqueRoot ? readOptionalNonNegativeLong(rootRow, "duration_nano") : null,
                status,
                hasUniqueRoot ? readTimestamp(rootRow, "timestamp") : null,
                errorCount.intValue(),
                spanCount,
                serviceStats.named(),
                hasUniqueRoot ? resourceAttributes : null,
                rootState(rootSpanCount), rootSpanCount, representative,
                observedStartNanos / 1_000_000L, Math.ceilDiv(observedEndNanos, 1_000_000L), serviceStats.unattributed()
        );
    }

    private static String rootState(long count) {
        return count == 0 ? "missing" : count == 1 ? "unique" : "ambiguous";
    }

    private String readConsistentText(List<Map<String, Object>> rows, String key) {
        String expected = readText(rows.getFirst(), key);
        if (rows.stream().anyMatch(row -> !Objects.equals(expected, readText(row, key)))) {
            throw new TelemetryStorageUnavailableException();
        }
        return expected;
    }

    private Long readConsistentNonNegativeLong(List<Map<String, Object>> rows, String... keys) {
        Long expected = null;
        for (Map<String, Object> row : rows) {
            Long value = readOptionalNonNegativeLong(row, keys);
            if (value == null || expected != null && !expected.equals(value)) {
                return null;
            }
            expected = value;
        }
        return expected;
    }

    private ServiceStatsEvidence validatedServiceStats(List<Map<String, Object>> rows,
                                                                     Long spanCount,
                                                                     Long errorCount) {
        if (spanCount == null || spanCount <= 0 || errorCount == null || errorCount > spanCount) {
            return null;
        }
        Map<String, TraceServiceStatsDto> stats = new LinkedHashMap<>();
        TraceServiceStatsDto unattributed = null;
        long totalSpans = 0L;
        long totalErrors = 0L;
        try {
            for (Map<String, Object> row : rows) {
                String service = readText(row, "stats_service_name");
                Long serviceSpanCount = readOptionalNonNegativeLong(
                        row, "service_span_count", "serviceSpanCount");
                Long serviceErrorCount = readOptionalNonNegativeLong(
                        row, "service_error_span_count", "serviceErrorSpanCount");
                if (serviceSpanCount == null || serviceSpanCount <= 0
                        || serviceErrorCount == null || serviceErrorCount > serviceSpanCount) {
                    return null;
                }
                TraceServiceStatsDto serviceStats = new TraceServiceStatsDto(serviceSpanCount, serviceErrorCount);
                if (!StringUtils.hasText(service)) {
                    if (unattributed != null) {
                        unattributed.setSpanCount(Math.addExact(unattributed.getSpanCount(), serviceSpanCount));
                        unattributed.setErrorCount(Math.addExact(unattributed.getErrorCount(), serviceErrorCount));
                    } else {
                        unattributed = serviceStats;
                    }
                } else if (stats.putIfAbsent(service, serviceStats) != null) {
                    return null;
                }
                totalSpans = Math.addExact(totalSpans, serviceSpanCount);
                totalErrors = Math.addExact(totalErrors, serviceErrorCount);
            }
        } catch (ArithmeticException ignored) {
            return null;
        }
        if (totalSpans != spanCount || totalErrors != errorCount) {
            return null;
        }
        return new ServiceStatsEvidence(Collections.unmodifiableMap(stats), unattributed);
    }

    private record ServiceStatsEvidence(Map<String, TraceServiceStatsDto> named, TraceServiceStatsDto unattributed) {
    }

    private Long readOptionalNonNegativeLong(Map<String, Object> row, String... keys) {
        for (String key : keys) {
            Object value = row.get(key);
            if (value != null) {
                if ((value instanceof Double || value instanceof Float)
                        && Math.abs(((Number) value).doubleValue()) > 9_007_199_254_740_991L) {
                    return null;
                }
                try {
                    long exact = new BigDecimal(value.toString()).longValueExact();
                    return exact < 0 ? null : exact;
                } catch (NumberFormatException | ArithmeticException ignored) {
                    return null;
                }
            }
        }
        return null;
    }

    private record SpanTiming(long startNanos, long endNanos) {
    }

    private SpanTiming spanTiming(Map<String, Object> row, Long duration) {
        if (duration == null || duration < 0 || duration > 9_007_199_254_740_991L) {
            throw new TelemetryStorageUnavailableException();
        }
        try {
            long start = timestampNanos(row.get("timestamp"));
            long expectedEnd = Math.addExact(start, duration);
            long end = row.get("timestamp_end") == null ? expectedEnd : timestampNanos(row.get("timestamp_end"));
            if (start < 0 || end != expectedEnd) {
                throw new TelemetryStorageUnavailableException();
            }
            return new SpanTiming(start, end);
        } catch (ArithmeticException ignored) {
            throw new TelemetryStorageUnavailableException();
        }
    }

    private long timestampNanos(Object value) {
        Instant instant;
        if (value instanceof java.sql.Timestamp timestamp) {
            instant = timestamp.toInstant();
        } else if (value instanceof Instant timestamp) {
            instant = timestamp;
        } else if (value instanceof java.util.Date timestamp) {
            instant = Instant.ofEpochMilli(timestamp.getTime());
        } else if (value instanceof OffsetDateTime timestamp) {
            instant = timestamp.toInstant();
        } else if (value instanceof ZonedDateTime timestamp) {
            instant = timestamp.toInstant();
        } else if (value instanceof LocalDateTime timestamp) {
            instant = timestamp.atZone(ZoneId.systemDefault()).toInstant();
        } else if (value != null && value.toString().matches("[0-9]+")) {
            long numeric = new BigDecimal(value.toString()).longValueExact();
            if (numeric < 100_000_000_000L) {
                return Math.multiplyExact(numeric, 1_000_000_000L);
            }
            if (numeric < 100_000_000_000_000L) {
                return Math.multiplyExact(numeric, 1_000_000L);
            }
            return numeric < 100_000_000_000_000_000L ? Math.multiplyExact(numeric, 1_000L) : numeric;
        } else {
            try {
                String text = Objects.toString(value, "").replace(' ', 'T');
                try {
                    instant = OffsetDateTime.parse(text).toInstant();
                } catch (java.time.format.DateTimeParseException ignored) {
                    instant = LocalDateTime.parse(text).atZone(ZoneId.systemDefault()).toInstant();
                }
            } catch (java.time.format.DateTimeParseException ignored) {
                throw new TelemetryStorageUnavailableException();
            }
        }
        return Math.addExact(Math.multiplyExact(instant.getEpochSecond(), 1_000_000_000L), instant.getNano());
    }

    private TraceDetailDto toTraceDetail(TraceAggregate aggregate) {
        return new TraceDetailDto(
                aggregate.getTraceId(),
                aggregate.getRootSpanId(),
                aggregate.getServiceName(),
                aggregate.getServiceNamespace(),
                aggregate.getRootSpanName(),
                aggregate.getDurationNanos(),
                aggregate.getStatus(),
                aggregate.getStartTime(),
                aggregate.getErrorSpanCount(),
                aggregate.getResourceAttributes(),
                aggregate.getOrderedSpans()
        );
    }

    private TraceSpanNodeDto toSpanNode(Map<String, Object> row) {
        Map<String, String> resourceAttributes = parseAttributes("resource_attributes.", row);
        Map<String, String> spanAttributes = parseAttributes("span_attributes.", row);
        String status = normalizeStatus(readText(row, "span_status_code"));
        TraceSpanNodeDto span = new TraceSpanNodeDto();
        span.setTraceId(readText(row, "trace_id"));
        span.setSpanId(readText(row, "span_id"));
        span.setParentSpanId(readText(row, "parent_span_id"));
        span.setSpanName(defaultText(readText(row, "span_name"), readText(row, "name")));
        span.setServiceName(defaultText(readText(row, "service_name"), resourceAttributes.get("service.name")));
        span.setStatus(status);
        span.setSpanKind(readText(row, "span_kind"));
        span.setStatusMessage(readText(row, "span_status_message"));
        span.setTraceState(readText(row, "trace_state"));
        span.setScopeName(readText(row, "scope_name"));
        span.setScopeVersion(readText(row, "scope_version"));
        span.setDurationNanos(readOptionalNonNegativeLong(row, "duration_nano"));
        span.setStartTime(readTimestamp(row, "timestamp"));
        span.setHighlighted(isErrorStatus(status));
        span.setResourceAttributes(resourceAttributes);
        span.setSpanAttributes(spanAttributes);
        span.setEvents(parseSpanEvents(row.get("span_events")));
        span.setLinks(parseSpanLinks(row.get("span_links")));
        span.setCodeNavigationHint(null);
        return span;
    }

    private List<TraceSpanEventDto> parseSpanEvents(Object rawValue) {
        List<Map<String, Object>> items = parseJsonObjectList(rawValue);
        if (CollectionUtils.isEmpty(items)) {
            return Collections.emptyList();
        }
        List<TraceSpanEventDto> events = new ArrayList<>(items.size());
        for (Map<String, Object> item : items) {
            if (CollectionUtils.isEmpty(item)) {
                continue;
            }
            events.add(new TraceSpanEventDto(
                    readNonNegativeDecimalString(item, "time_unix_nano", "timeUnixNano"),
                    defaultText(readTextValue(item, "name"), readTextValue(item, "event_name")),
                    readObjectMap(item, "attributes"),
                    readNonNegativeIntValue(item, "dropped_attributes_count", "droppedAttributesCount")
            ));
        }
        return events;
    }

    private String readNonNegativeDecimalString(Map<String, Object> row, String... keys) {
        Object value = null;
        for (String key : keys) {
            if (row.containsKey(key)) {
                value = row.get(key);
                break;
            }
        }
        if (value instanceof BigInteger integer) {
            return integer.signum() >= 0 ? integer.toString() : null;
        }
        if (value instanceof BigDecimal decimal) {
            try {
                BigInteger integer = decimal.toBigIntegerExact();
                return integer.signum() >= 0 ? integer.toString() : null;
            } catch (ArithmeticException ignored) {
                return null;
            }
        }
        if (value instanceof Byte || value instanceof Short || value instanceof Integer || value instanceof Long) {
            long number = ((Number) value).longValue();
            return number >= 0 ? Long.toString(number) : null;
        }
        String text = value instanceof String string ? string.trim() : null;
        return text != null && NON_NEGATIVE_DECIMAL_PATTERN.matcher(text).matches() ? text : null;
    }

    private List<TraceSpanLinkDto> parseSpanLinks(Object rawValue) {
        List<Map<String, Object>> items = parseJsonObjectList(rawValue);
        if (CollectionUtils.isEmpty(items)) {
            return Collections.emptyList();
        }
        List<TraceSpanLinkDto> links = new ArrayList<>(items.size());
        for (Map<String, Object> item : items) {
            if (CollectionUtils.isEmpty(item)) {
                continue;
            }
            links.add(new TraceSpanLinkDto(
                    defaultText(readTextValue(item, "trace_id"), readTextValue(item, "traceId")),
                    defaultText(readTextValue(item, "span_id"), readTextValue(item, "spanId")),
                    defaultText(readTextValue(item, "trace_state"), readTextValue(item, "traceState")),
                    readObjectMap(item, "attributes"),
                    readNonNegativeIntValue(item, "dropped_attributes_count", "droppedAttributesCount")
            ));
        }
        return links;
    }

    private List<Map<String, Object>> parseJsonObjectList(Object rawValue) {
        if (rawValue == null) {
            return Collections.emptyList();
        }
        try {
            if (rawValue instanceof String rawText) {
                String normalized = trimText(rawText);
                if (!StringUtils.hasText(normalized)) {
                    return Collections.emptyList();
                }
                return JSON_MAPPER.readValue(normalized, new TypeReference<>() {
                });
            }
            return JSON_MAPPER.convertValue(rawValue, new TypeReference<>() {
            });
        } catch (Exception ignored) {
            log.debug("Trace JSON list parse failed");
            return Collections.emptyList();
        }
    }

    private Map<String, Object> readObjectMap(Map<String, Object> row, String key) {
        Object value = row.get(key);
        if (value == null) {
            return Collections.emptyMap();
        }
        try {
            Map<String, Object> parsed = JSON_MAPPER.convertValue(value, new TypeReference<>() {
            });
            return parsed == null ? Collections.emptyMap() : parsed;
        } catch (IllegalArgumentException ex) {
            return Collections.emptyMap();
        }
    }

    private String readTextValue(Map<String, Object> row, String key) {
        if (row == null || !row.containsKey(key)) {
            return null;
        }
        return trimText(Objects.toString(row.get(key), null));
    }

    private Long readLongValue(Map<String, Object> row, String... keys) {
        if (row == null || keys == null) {
            return null;
        }
        for (String key : keys) {
            if (!StringUtils.hasText(key) || !row.containsKey(key)) {
                continue;
            }
            Long value = coerceLong(row.get(key));
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private Double readDoubleValue(Map<String, Object> row, String... keys) {
        if (row == null || keys == null) {
            return null;
        }
        for (String key : keys) {
            if (!StringUtils.hasText(key) || !row.containsKey(key)) {
                continue;
            }
            Object value = row.get(key);
            if (value instanceof Number number) {
                return number.doubleValue();
            }
            String text = trimText(Objects.toString(value, null));
            if (!StringUtils.hasText(text)) {
                continue;
            }
            try {
                return Double.parseDouble(text);
            } catch (NumberFormatException ignored) {
                // Try the next key.
            }
        }
        return null;
    }

    private Integer readIntValue(Map<String, Object> row, String... keys) {
        Long value = readLongValue(row, keys);
        if (value == null) {
            return null;
        }
        if (value > Integer.MAX_VALUE) {
            return Integer.MAX_VALUE;
        }
        if (value < Integer.MIN_VALUE) {
            return Integer.MIN_VALUE;
        }
        return value.intValue();
    }

    private Integer readNonNegativeIntValue(Map<String, Object> row, String... keys) {
        Integer value = readIntValue(row, keys);
        return value == null ? null : Math.max(0, value);
    }

    private Map<String, String> parseAttributes(String prefix, Map<String, Object> row) {
        Map<String, String> values = new LinkedHashMap<>();
        row.forEach((key, value) -> {
            String normalizedKey = trimText(key);
            if (normalizedKey == null || !normalizedKey.startsWith(prefix)) {
                return;
            }
            String suffix = trimText(normalizedKey.substring(prefix.length()));
            String normalizedValue = trimText(Objects.toString(value, null));
            if (suffix != null && normalizedValue != null) {
                values.putIfAbsent(suffix, normalizedValue);
            }
        });
        return values;
    }

    private String resolveEntityTitle(ObservedEntityContext entityContext) {
        if (entityContext == null || entityContext.getEntity() == null) {
            return "entity";
        }
        return defaultText(trimText(entityContext.getEntity().getDisplayName()),
                defaultText(trimText(entityContext.getEntity().getName()), "entity"));
    }

    private String readText(Map<String, Object> row, String key) {
        return trimText(Objects.toString(row.get(key), null));
    }

    private record ResourceFilterSet(Map<String, Set<String>> include, Map<String, Set<String>> exclude) {

        private static ResourceFilterSet empty() {
            return new ResourceFilterSet(Collections.emptyMap(), Collections.emptyMap());
        }

        private ResourceFilterSet {
            include = include == null ? Collections.emptyMap() : include;
            exclude = exclude == null ? Collections.emptyMap() : exclude;
        }

        private boolean isEmpty() {
            return include.isEmpty() && exclude.isEmpty();
        }

        private boolean hasExclusions() {
            return !exclude.isEmpty();
        }

        private boolean requiresRowFallback() {
            return hasExclusions() || containsComplexResourceFilterValue(include);
        }

        private Map<String, Set<String>> pushableInclude() {
            if (include.isEmpty()) {
                return Collections.emptyMap();
            }
            Map<String, Set<String>> pushable = new LinkedHashMap<>();
            include.forEach((key, values) -> {
                Set<String> exactValues = new LinkedHashSet<>();
                values.stream()
                        .filter(value -> !isComplexResourceFilterValue(value))
                        .forEach(exactValues::add);
                if (!exactValues.isEmpty()) {
                    pushable.put(key, exactValues);
                }
            });
            return pushable;
        }

        private boolean containsComplexResourceFilterValue(Map<String, Set<String>> resourceFilters) {
            if (resourceFilters.isEmpty()) {
                return false;
            }
            return resourceFilters.values().stream()
                    .flatMap(Set::stream)
                    .anyMatch(EntityTraceQueryServiceImpl::isComplexResourceFilterValue);
        }
    }

    private record TraceQueryScope(String serviceName, String serviceNamespace, String environment) {
    }

    private Long readLong(Map<String, Object> row, String key) {
        return coerceLong(row.get(key));
    }


    private Long coerceLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigInteger bigInteger) {
            return clampLong(bigInteger);
        }
        if (value instanceof BigDecimal bigDecimal) {
            return clampLong(bigDecimal);
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        String text = trimText(Objects.toString(value, null));
        if (!StringUtils.hasText(text)) {
            return null;
        }
        try {
            return Long.parseLong(text);
        } catch (NumberFormatException ex) {
            try {
                return clampLong(new BigInteger(text));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
    }

    private Long clampLong(BigInteger value) {
        if (value.compareTo(LONG_MAX_VALUE) > 0) {
            return Long.MAX_VALUE;
        }
        if (value.compareTo(LONG_MIN_VALUE) < 0) {
            return Long.MIN_VALUE;
        }
        return value.longValue();
    }

    private Long clampLong(BigDecimal value) {
        if (value.compareTo(LONG_MAX_DECIMAL) > 0) {
            return Long.MAX_VALUE;
        }
        if (value.compareTo(LONG_MIN_DECIMAL) < 0) {
            return Long.MIN_VALUE;
        }
        return value.longValue();
    }

    private Long readTimestamp(Map<String, Object> row, String key) {
        Object value = row.get(key);
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant().toEpochMilli();
        }
        if (value instanceof java.util.Date date) {
            return date.getTime();
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        }
        if (value instanceof Instant instant) {
            return instant.toEpochMilli();
        }
        if (value instanceof ZonedDateTime dateTime) {
            return dateTime.toInstant().toEpochMilli();
        }
        if (value instanceof Number number) {
            return normalizeEpochMillis(number.longValue());
        }
        String text = trimText(Objects.toString(value, null));
        if (!StringUtils.hasText(text)) {
            return null;
        }
        if (text.matches("-?\\d+")) {
            Long numeric = coerceLong(text);
            return numeric == null ? null : normalizeEpochMillis(numeric);
        }
        try {
            return Instant.parse(text).toEpochMilli();
        } catch (Exception ignored) {
            // Try offset and local date time fallbacks.
        }
        String normalizedText = text.replace(' ', 'T');
        try {
            return OffsetDateTime.parse(normalizedText).toInstant().toEpochMilli();
        } catch (Exception ignored) {
            // Try local date time fallback.
        }
        try {
            return LocalDateTime.parse(normalizedText).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        } catch (Exception ignored) {
            return null;
        }
    }

    private long normalizeEpochMillis(long numeric) {
        long magnitude = numeric == Long.MIN_VALUE ? Long.MAX_VALUE : Math.abs(numeric);
        if (magnitude < 100_000_000_000L) {
            return numeric * 1_000L;
        }
        if (magnitude < 100_000_000_000_000L) {
            return numeric;
        }
        if (magnitude < 100_000_000_000_000_000L) {
            return numeric / 1_000L;
        }
        return numeric / 1_000_000L;
    }

    private String normalizeStatus(String rawStatus) {
        String normalized = trimText(rawStatus);
        if (normalized == null) {
            return "unknown";
        }
        String lower = normalized.toLowerCase(Locale.ROOT);
        if (lower.contains("error") || "2".equals(lower)) {
            return "error";
        }
        if (lower.contains("unset") || "0".equals(lower)) {
            return "unset";
        }
        if (lower.contains("ok") || "1".equals(lower)) {
            return "ok";
        }
        return lower;
    }

    private boolean isErrorStatus(String status) {
        return "error".equalsIgnoreCase(trimText(status));
    }

    private String trimText(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String defaultText(String primary, String fallback) {
        return StringUtils.hasText(primary) ? primary : trimText(fallback);
    }

    private static final class TraceAggregate {
        private final String traceId;
        private String rootSpanId;
        private String serviceName;
        private String serviceNamespace;
        private String rootSpanName;
        private Long durationNanos;
        private String status;
        private Long startTime;
        private int errorSpanCount;
        private int rootSpanCount;
        private int okSpanCount;
        private Map<String, String> resourceAttributes = Collections.emptyMap();
        private final List<TraceSpanNodeDto> spans = new ArrayList<>();
        private final Map<String, SpanTiming> timings = new HashMap<>();

        private TraceAggregate(String traceId) {
            this.traceId = traceId;
        }

        private void accept(TraceSpanNodeDto span, SpanTiming timing) {
            if (!StringUtils.hasText(span.getSpanId()) || timings.putIfAbsent(span.getSpanId(), timing) != null) {
                throw new TelemetryStorageUnavailableException();
            }
            this.spans.add(span);
            if ("ok".equals(span.getStatus())) {
                this.okSpanCount++;
            }
            if (span.isHighlighted()) {
                this.errorSpanCount++;
                this.status = "error";
            } else if (!StringUtils.hasText(this.status)) {
                this.status = span.getStatus();
            }
            if (!StringUtils.hasText(this.serviceName)) {
                this.serviceName = span.getServiceName();
            }
            if (this.serviceNamespace == null) {
                this.serviceNamespace = span.getResourceAttributes().get("service.namespace");
            }
            if (this.startTime == null || (span.getStartTime() != null && span.getStartTime() < this.startTime)) {
                this.startTime = span.getStartTime();
            }
            TraceSpanNodeDto currentRoot = isRoot(span) ? span : null;
            if (currentRoot != null) {
                this.rootSpanCount++;
                this.rootSpanId = currentRoot.getSpanId();
                this.rootSpanName = currentRoot.getSpanName();
                this.durationNanos = currentRoot.getDurationNanos();
                this.resourceAttributes = currentRoot.getResourceAttributes();
            }
        }

        private TraceAggregate normalize() {
            this.spans.sort(Comparator.comparingLong((TraceSpanNodeDto span) -> timings.get(span.getSpanId()).startNanos())
                    .thenComparing(TraceSpanNodeDto::getSpanId, Comparator.nullsLast(Comparator.naturalOrder())));
            TraceSpanNodeDto rootSpan = this.rootSpanCount == 1 ? findRootSpan() : null;
            if (rootSpan != null) {
                this.serviceName = preferText(rootSpan.getServiceName(),
                        rootSpan.getResourceAttributes().get("service.name"));
                this.serviceNamespace = preferText(rootSpan.getResourceAttributes().get("service.namespace"));
                this.startTime = rootSpan.getStartTime();
                if (!CollectionUtils.isEmpty(rootSpan.getResourceAttributes())) {
                    this.resourceAttributes = rootSpan.getResourceAttributes();
                }
            } else {
                this.rootSpanId = null;
                this.serviceName = null;
                this.serviceNamespace = null;
                this.rootSpanName = null;
                this.durationNanos = null;
                this.startTime = null;
                this.resourceAttributes = Collections.emptyMap();
            }
            this.status = this.errorSpanCount > 0 ? "error" : this.okSpanCount == this.spans.size() ? "ok" : "unset";
            return this;
        }

        private TraceSpanNodeDto findRootSpan() {
            if (!StringUtils.hasText(this.rootSpanId)) {
                return null;
            }
            return this.spans.stream()
                    .filter(span -> this.rootSpanId.equals(span.getSpanId()))
                    .findFirst()
                    .orElse(null);
        }

        private Long getObservedEndTime() {
            return timings.values().stream().map(timing -> Math.ceilDiv(timing.endNanos(), 1_000_000L))
                    .max(Long::compareTo).orElse(null);
        }

        private long getObservedStartNanos() {
            return timings.values().stream().mapToLong(SpanTiming::startNanos).min().orElseThrow();
        }

        private String preferText(String... values) {
            for (String value : values) {
                if (StringUtils.hasText(value)) {
                    return value.trim();
                }
            }
            return null;
        }

        private boolean isRoot(TraceSpanNodeDto span) {
            return !StringUtils.hasText(span.getParentSpanId());
        }

        private List<TraceSpanNodeDto> getOrderedSpans() {
            Map<String, List<TraceSpanNodeDto>> children = new LinkedHashMap<>();
            List<TraceSpanNodeDto> roots = new ArrayList<>();
            for (TraceSpanNodeDto span : this.spans) {
                if (!StringUtils.hasText(span.getParentSpanId())) {
                    roots.add(span);
                    continue;
                }
                children.computeIfAbsent(span.getParentSpanId(), ignored -> new ArrayList<>()).add(span);
            }
            roots.sort(Comparator.comparing(TraceSpanNodeDto::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())));
            children.values().forEach(list -> list.sort(Comparator.comparing(TraceSpanNodeDto::getStartTime,
                    Comparator.nullsLast(Comparator.naturalOrder()))));
            List<TraceSpanNodeDto> ordered = new ArrayList<>();
            for (TraceSpanNodeDto root : roots) {
                appendNode(root, children, ordered);
            }
            for (TraceSpanNodeDto span : this.spans) {
                if (!ordered.contains(span)) {
                    ordered.add(span);
                }
            }
            return ordered;
        }

        private void appendNode(TraceSpanNodeDto node, Map<String, List<TraceSpanNodeDto>> children,
                                List<TraceSpanNodeDto> ordered) {
            ordered.add(node);
            for (TraceSpanNodeDto child : children.getOrDefault(node.getSpanId(), List.of())) {
                appendNode(child, children, ordered);
            }
        }

        private String getTraceId() {
            return traceId;
        }

        private String getRootSpanId() {
            return rootSpanId;
        }

        private String getServiceName() {
            return serviceName;
        }

        private String getServiceNamespace() {
            return serviceNamespace;
        }

        private String getRootSpanName() {
            return rootSpanName;
        }

        private Long getDurationNanos() {
            return durationNanos;
        }

        private String getStatus() {
            return status;
        }

        private Long getStartTime() {
            return startTime;
        }

        private int getErrorSpanCount() {
            return errorSpanCount;
        }

        private Map<String, String> getResourceAttributes() {
            return resourceAttributes;
        }
    }
}
