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
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceDetailDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceOverviewDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanEventDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanLinkDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.apache.hertzbeat.observability.ingestion.enricher.OtlpCorrelationEnricher;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository;
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
    public EntityTraceSummaryDto buildEntityTraceSummary(ObservedEntityContext entityContext) {
        Map<String, Set<String>> identityValues = canonicalIdentityValues(entityContext);
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
                .filter(trace -> trace.getStartTime() == null || trace.getStartTime() >= now - DEFAULT_LOOKBACK_MILLIS)
                .toList();
        Long latestObservedAt = traces.stream()
                .map(TraceAggregate::getStartTime)
                .filter(Objects::nonNull)
                .max(Long::compareTo)
                .orElse(null);
        int errorCount = (int) traces.stream().filter(trace -> isErrorStatus(trace.getStatus())).count();
        boolean active = latestObservedAt != null && latestObservedAt >= now - ACTIVE_TRACE_WINDOW_MILLIS;
        String latestTraceId = traces.stream()
                .sorted(Comparator.comparing(TraceAggregate::getStartTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(TraceAggregate::getTraceId)
                .filter(StringUtils::hasText)
                .findFirst()
                .orElse(null);
        return new EntityTraceSummaryDto(traces.size(), errorCount, latestObservedAt, active, latestTraceId);
    }

    @Override
    public List<EntityTraceQueryHintDto> buildEntityTraceQueryHints(ObservedEntityContext entityContext) {
        Map<String, Set<String>> identityValues = canonicalIdentityValues(entityContext);
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
        ObservedEntityContext entityContext = entityId == null ? null : loadEntityContext(entityId);
        Map<String, Set<String>> identityValues = canonicalIdentityValues(entityContext);
        TraceQueryScope queryScope = resolveTraceQueryScope(entityContext, identityValues, serviceName, serviceNamespace, environment);
        ResourceFilterSet resourceFilters = removeEntityScopeResourceFilters(
                identityValues, parseResourceFilters(resourceFilter));
        ResourceFilterSet attributeFilters = parseResourceFilters(attributeFilter);
        Map<String, Set<String>> pushedResourceFilters = mergeResourceFilters(identityValues, resourceFilters.pushableInclude());
        PageRequest pageRequest = PageRequest.of(normalizeTraceListPageIndex(pageIndex), normalizeTraceListPageSize(pageSize));
        int repositoryOffset = Math.toIntExact(Math.min(pageRequest.getOffset(), Integer.MAX_VALUE));
        Long minDurationNanos = durationMillisToNanos(minDurationMs);
        Long maxDurationNanos = durationMillisToNanos(maxDurationMs);
        String normalizedSpanScope = normalizeSpanScope(spanScope);
        if (!StringUtils.hasText(traceId) && !resourceFilters.requiresRowFallback()
                && attributeFilters.isEmpty()
                && traceQueryRepository.supportsTraceListRows()) {
            List<Map<String, Object>> rows = StringUtils.hasText(normalizedSpanScope)
                    ? traceQueryRepository.queryTraceListRows(
                            start,
                            end,
                            errorOnly,
                            queryScope.serviceName(),
                            queryScope.serviceNamespace(),
                            queryScope.environment(),
                            operationName,
                            minDurationNanos,
                            maxDurationNanos,
                            AuthTokenRequestContext.currentWorkspaceId(),
                            pushedResourceFilters,
                            hideInternal,
                            normalizedSpanScope,
                            repositoryOffset,
                            pageRequest.getPageSize()
                    )
                    : traceQueryRepository.queryTraceListRows(
                            start,
                            end,
                            errorOnly,
                            queryScope.serviceName(),
                            queryScope.serviceNamespace(),
                            queryScope.environment(),
                            operationName,
                            minDurationNanos,
                            maxDurationNanos,
                            AuthTokenRequestContext.currentWorkspaceId(),
                            pushedResourceFilters,
                            hideInternal,
                            repositoryOffset,
                            pageRequest.getPageSize()
                    );
            List<TraceListItemDto> items = rows.stream()
                    .map(this::toTraceListItem)
                    .toList();
            long total = rows.stream()
                    .map(row -> readLongValue(row, "total_count", "totalCount"))
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse((long) pageRequest.getOffset() + items.size());
            return new PageImpl<>(items, pageRequest, total);
        }
        List<TraceAggregate> filtered = aggregateTraceRows(queryRowsForList(traceId, start, end, queryScope.serviceName(),
                queryScope.serviceNamespace(), queryScope.environment(), operationName, minDurationNanos,
                maxDurationNanos, pushedResourceFilters, hideInternal)).stream()
                .filter(trace -> matchesSpanScope(trace, normalizedSpanScope))
                .filter(trace -> matchesTraceFilters(trace, identityValues, resourceFilters, start, end, traceId, errorOnly,
                        queryScope.serviceName(), queryScope.serviceNamespace(), queryScope.environment(), operationName,
                        minDurationNanos, maxDurationNanos, hideInternal, attributeFilters))
                .sorted(Comparator.comparing(TraceAggregate::getStartTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        int safeStart = Math.min(repositoryOffset, filtered.size());
        int safeEnd = Math.min(safeStart + pageRequest.getPageSize(), filtered.size());
        List<TraceListItemDto> items = filtered.subList(safeStart, safeEnd).stream()
                .map(this::toTraceListItem)
                .toList();
        return new PageImpl<>(items, pageRequest, filtered.size());
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
    public TraceDetailDto getTraceDetail(Long entityId, String traceId) {
        if (!StringUtils.hasText(traceId)) {
            return null;
        }
        Map<String, Set<String>> identityValues = entityId == null ? Collections.emptyMap() : canonicalIdentityValues(loadEntityContext(entityId));
        TraceAggregate aggregate = aggregateTraceRows(queryTraceRows(traceId, null, null, null, null, null,
                identityValues, false)).stream()
                .filter(trace -> identityValues.isEmpty() || matchesEntity(trace, identityValues))
                .findFirst()
                .orElse(null);
        return aggregate == null ? null : toTraceDetail(aggregate);
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
        ObservedEntityContext entityContext = entityId == null ? null : loadEntityContext(entityId);
        Map<String, Set<String>> identityValues = canonicalIdentityValues(entityContext);
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
                            AuthTokenRequestContext.currentWorkspaceId(),
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
                            AuthTokenRequestContext.currentWorkspaceId(),
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
                            AuthTokenRequestContext.currentWorkspaceId(),
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
                            AuthTokenRequestContext.currentWorkspaceId(),
                            pushedResourceFilters,
                            hideInternal
                    );
            TraceOverviewDto overview = toTraceOverview(row);
            if (overview != null) {
                return overview;
            }
        }
        Page<TraceListItemDto> result = queryTraceList(entityId, start, end, traceId, errorOnly,
                queryScope.serviceName(), queryScope.serviceNamespace(), queryScope.environment(),
                resourceFilter, operationName, minDurationMs, maxDurationMs, 0, TRACE_LIST_SAMPLE_LIMIT, hideInternal,
                normalizedSpanScope, attributeFilter);
        Long latestObservedAt = result.getContent().stream()
                .map(TraceListItemDto::getStartTime)
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
        ObservedEntityContext entityContext = entityId == null ? null : loadEntityContext(entityId);
        Map<String, Set<String>> identityValues = canonicalIdentityValues(entityContext);
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
                            AuthTokenRequestContext.currentWorkspaceId(),
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
                            AuthTokenRequestContext.currentWorkspaceId(),
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
        List<TraceAggregate> traces = aggregateTraceRows(queryRowsForList(traceId, start, end, queryScope.serviceName(),
                queryScope.serviceNamespace(), queryScope.environment(), operationName, minDurationNanos,
                maxDurationNanos, pushedResourceFilters, hideInternal)).stream()
                .filter(trace -> matchesSpanScope(trace, normalizedSpanScope))
                .filter(trace -> matchesTraceFilters(trace, identityValues, resourceFilters, start, end, traceId, errorOnly,
                        queryScope.serviceName(), queryScope.serviceNamespace(), queryScope.environment(), operationName,
                        minDurationNanos, maxDurationNanos, hideInternal, attributeFilters))
                .toList();
        result.put("groups", buildTraceAggregateGroupResults(traces, normalizedGroupBy, resolvedLimit, orderBy, resolvedMinCount));
        return result;
    }

    private Map<String, Object> toTraceGroupResult(Map<String, Object> row) {
        Map<String, Object> group = new LinkedHashMap<>();
        group.put("value", defaultText(readTextValue(row, "group_value"), "unknown"));
        group.put("traceCount", Optional.ofNullable(readLongValue(row, "trace_count", "traceCount")).orElse(0L));
        group.put("errorTraceCount", Optional.ofNullable(readLongValue(row, "error_trace_count", "errorTraceCount")).orElse(0L));
        group.put("latencyAvgMs", Optional.ofNullable(readDoubleValue(row, "latency_avg_ms", "latencyAvgMs")).orElse(0.0d));
        group.put("latencyP95Ms", Optional.ofNullable(readDoubleValue(row, "latency_p95_ms", "latencyP95Ms")).orElse(0.0d));
        return group;
    }

    private List<Map<String, Object>> buildTraceGroupResults(List<TraceListItemDto> traces, String groupBy, int limit, String orderBy, long minCount) {
        if (CollectionUtils.isEmpty(traces)) {
            return List.of();
        }
        Map<String, List<TraceListItemDto>> grouped = new LinkedHashMap<>();
        for (TraceListItemDto trace : traces) {
            String value = defaultText(resolveTraceListGroupValue(trace, groupBy), "unknown");
            grouped.computeIfAbsent(value, ignored -> new ArrayList<>()).add(trace);
        }
        return grouped.entrySet().stream()
                .map(entry -> toTraceGroupResult(entry.getKey(), entry.getValue()))
                .filter(group -> ((Long) group.get("traceCount")) >= minCount)
                .sorted(resolveTraceGroupComparator(orderBy))
                .limit(limit)
                .toList();
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
            return (left, right) -> Double.compare((Double) right.get("latencyP95Ms"), (Double) left.get("latencyP95Ms"));
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
        group.put("latencyAvgMs", durations.isEmpty() ? 0.0d
                : durations.stream().mapToDouble(Long::doubleValue).average().orElse(0.0d) / 1_000_000.0d);
        group.put("latencyP95Ms", durations.isEmpty() ? 0.0d
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
        group.put("latencyAvgMs", durations.isEmpty() ? 0.0d
                : durations.stream().mapToDouble(Long::doubleValue).average().orElse(0.0d) / 1_000_000.0d);
        group.put("latencyP95Ms", durations.isEmpty() ? 0.0d
                : durations.get(Math.min(durations.size() - 1, (int) Math.ceil(durations.size() * 0.95d) - 1)) / 1_000_000.0d);
        return group;
    }

    private String resolveTraceListGroupValue(TraceListItemDto trace, String groupBy) {
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
            return isErrorStatus(trace.getStatus()) ? "ERROR" : "OK";
        }
        if (groupBy.startsWith("resource:")) {
            return resourceAttributes.get(groupBy.substring("resource:".length()));
        }
        return resourceAttributes.get(groupBy);
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
            return isErrorStatus(trace.getStatus()) ? "ERROR" : "OK";
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

    private ObservedEntityContext loadEntityContext(Long entityId) {
        if (entityId == null || entityId <= 0) {
            return null;
        }
        Optional<ObserveEntity> entityOptional = workspaceQueryGateway.findEntityById(entityId);
        if (entityOptional.isEmpty()) {
            return null;
        }
        return ObservedEntityContext.from(entityOptional.get(), workspaceQueryGateway.findIdentitiesByEntityId(entityId));
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

    private List<Map<String, Object>> queryRowsForList(String traceId,
                                                       Long start,
                                                       Long end,
                                                       String serviceName,
                                                       String serviceNamespace,
                                                       String environment,
                                                       String operationName,
                                                       Long minDurationNanos,
                                                       Long maxDurationNanos,
                                                       Map<String, Set<String>> identityValues,
                                                       Boolean hideInternal) {
        if (StringUtils.hasText(traceId)) {
            return queryTraceRows(traceId, start, end, serviceName, serviceNamespace, environment,
                    operationName, minDurationNanos, maxDurationNanos,
                    identityValues, hideInternal);
        }
        return traceQueryRepository.queryRecentTraceRows(
                TRACE_LIST_SAMPLE_LIMIT,
                start,
                end,
                serviceName,
                serviceNamespace,
                environment,
                operationName,
                minDurationNanos,
                maxDurationNanos,
                AuthTokenRequestContext.currentWorkspaceId(),
                identityValues,
                hideInternal
        );
    }

    private List<Map<String, Object>> queryTraceRows(String traceId) {
        return queryTraceRows(traceId, null, null, null, null, null, Collections.emptyMap(), false);
    }

    private List<Map<String, Object>> queryTraceRows(String traceId,
                                                     Long start,
                                                     Long end,
                                                     String serviceName,
                                                     String serviceNamespace,
                                                     String environment,
                                                     Map<String, Set<String>> identityValues,
                                                     Boolean hideInternal) {
        return queryTraceRows(traceId, start, end, serviceName, serviceNamespace, environment,
                null, null, null, identityValues, hideInternal);
    }

    private List<Map<String, Object>> queryTraceRows(String traceId,
                                                     Long start,
                                                     Long end,
                                                     String serviceName,
                                                     String serviceNamespace,
                                                     String environment,
                                                     String operationName,
                                                     Long minDurationNanos,
                                                     Long maxDurationNanos,
                                                     Map<String, Set<String>> identityValues,
                                                     Boolean hideInternal) {
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        if (!hasTraceRowPushdownFilters(start, end, serviceName, serviceNamespace, environment,
                operationName, minDurationNanos, maxDurationNanos, workspaceId, identityValues, hideInternal)) {
            return traceQueryRepository.queryTraceRows(traceId, TRACE_DETAIL_LIMIT);
        }
        return traceQueryRepository.queryTraceRows(
                traceId,
                TRACE_DETAIL_LIMIT,
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

    private boolean hasTraceRowPushdownFilters(Long start,
                                               Long end,
                                               String serviceName,
                                               String serviceNamespace,
                                               String environment,
                                               String operationName,
                                               Long minDurationNanos,
                                               Long maxDurationNanos,
                                               String workspaceId,
                                               Map<String, Set<String>> identityValues,
                                               Boolean hideInternal) {
        return start != null
                || end != null
                || StringUtils.hasText(serviceName)
                || StringUtils.hasText(serviceNamespace)
                || StringUtils.hasText(environment)
                || StringUtils.hasText(operationName)
                || minDurationNanos != null
                || maxDurationNanos != null
                || StringUtils.hasText(workspaceId)
                || !CollectionUtils.isEmpty(identityValues)
                || Boolean.TRUE.equals(hideInternal);
    }

    private List<TraceAggregate> aggregateTraceRows(List<Map<String, Object>> rows) {
        if (CollectionUtils.isEmpty(rows)) {
            return Collections.emptyList();
        }
        Map<String, TraceAggregate> traceMap = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            TraceSpanNodeDto span = toSpanNode(row);
            if (!StringUtils.hasText(span.getTraceId())) {
                continue;
            }
            if (!matchesRequestWorkspace(span)) {
                continue;
            }
            TraceAggregate aggregate = traceMap.computeIfAbsent(span.getTraceId(), TraceAggregate::new);
            aggregate.accept(span);
        }
        return traceMap.values().stream().map(TraceAggregate::normalize).toList();
    }

    private boolean matchesRequestWorkspace(TraceSpanNodeDto span) {
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
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

    private boolean matchesTraceFilters(TraceAggregate trace, Map<String, Set<String>> identityValues,
                                        ResourceFilterSet resourceFilters, Long start, Long end,
                                        String traceId, Boolean errorOnly, String serviceName, String serviceNamespace,
                                        String environment, String operationName, Long minDurationNanos,
                                        Long maxDurationNanos, Boolean hideInternal,
                                        ResourceFilterSet attributeFilters) {
        if (trace == null) {
            return false;
        }
        if (Boolean.TRUE.equals(hideInternal) && isSelfTelemetryTrace(trace)) {
            return false;
        }
        if (StringUtils.hasText(traceId) && !traceId.equalsIgnoreCase(trace.getTraceId())) {
            return false;
        }
        Long startTime = trace.getStartTime();
        if (start != null && startTime != null && startTime < start) {
            return false;
        }
        if (end != null && startTime != null && startTime > end) {
            return false;
        }
        if (Boolean.TRUE.equals(errorOnly) && !isErrorStatus(trace.getStatus())) {
            return false;
        }
        if (StringUtils.hasText(serviceName) && !serviceName.equalsIgnoreCase(defaultText(trace.getServiceName(),
                trace.getResourceAttributes().get("service.name")))) {
            return false;
        }
        if (StringUtils.hasText(serviceNamespace) && !serviceNamespace.equalsIgnoreCase(trace.getServiceNamespace())) {
            return false;
        }
        if (StringUtils.hasText(environment)
                && !environment.equalsIgnoreCase(trace.getResourceAttributes().get("deployment.environment.name"))) {
            return false;
        }
        if (!matchesTraceOperation(trace, operationName)) {
            return false;
        }
        if (minDurationNanos != null && (trace.getDurationNanos() == null || trace.getDurationNanos() < minDurationNanos)) {
            return false;
        }
        if (maxDurationNanos != null && (trace.getDurationNanos() == null || trace.getDurationNanos() > maxDurationNanos)) {
            return false;
        }
        if (!identityValues.isEmpty() && !matchesEntity(trace, identityValues)) {
            return false;
        }
        return (resourceFilters.isEmpty() || matchesResourceFilters(trace, resourceFilters))
                && matchesSpanAttributeFilters(trace, attributeFilters);
    }

    private boolean matchesTraceOperation(TraceAggregate trace, String operationName) {
        String normalizedOperationName = StringUtils.trimWhitespace(operationName);
        if (!StringUtils.hasText(normalizedOperationName)) {
            return true;
        }
        if (normalizedOperationName.equalsIgnoreCase(trace.getRootSpanName())) {
            return true;
        }
        return trace.spans.stream()
                .map(TraceSpanNodeDto::getSpanName)
                .filter(StringUtils::hasText)
                .anyMatch(normalizedOperationName::equalsIgnoreCase);
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

    private boolean matchesSpanScope(TraceAggregate trace, String spanScope) {
        if (!StringUtils.hasText(spanScope) || trace == null) {
            return true;
        }
        if ("root".equals(spanScope)) {
            return trace.spans.stream().anyMatch(span -> !StringUtils.hasText(span.getParentSpanId()));
        }
        if ("entrypoint".equals(spanScope)) {
            return trace.spans.stream().anyMatch(span -> !StringUtils.hasText(span.getParentSpanId())
                    || isEntrypointSpanKind(span.getSpanKind()));
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

    private boolean isSelfTelemetryTrace(TraceAggregate trace) {
        if (trace == null) {
            return false;
        }
        String serviceName = normalizeValue(defaultText(trace.getServiceName(), trace.getResourceAttributes().get("service.name")));
        String serviceNamespace = normalizeValue(trace.getResourceAttributes().get("service.namespace"));
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
                .anyMatch(span -> matchesFilterMap(span.getSpanAttributes(), attributeFilters));
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
        for (String clause : splitResourceFilterClauses(resourceFilter)) {
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
                continue;
            }
            String key = trimText(trimmedClause.substring(0, separatorIndex));
            String value = stripResourceFilterQuotes(trimText(trimmedClause.substring(separatorIndex + 1)));
            if (!isSafeResourceFilterKey(key) || !StringUtils.hasText(value)) {
                continue;
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
        for (String value : splitResourceFilterListValues(valueList.substring(1, valueList.length() - 1))) {
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

    private List<String> splitResourceFilterClauses(String resourceFilter) {
        List<String> clauses = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int depth = 0;
        char quote = 0;
        for (int index = 0; index < resourceFilter.length(); index++) {
            char character = resourceFilter.charAt(index);
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
                addResourceFilterClause(clauses, current);
                continue;
            }
            if (depth == 0 && isResourceFilterAndDelimiter(resourceFilter, index)) {
                addResourceFilterClause(clauses, current);
                index += 4;
                continue;
            }
            current.append(character);
        }
        addResourceFilterClause(clauses, current);
        return clauses;
    }

    private List<String> splitResourceFilterListValues(String values) {
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
                addResourceFilterClause(result, current);
                continue;
            }
            current.append(character);
        }
        addResourceFilterClause(result, current);
        return result;
    }

    private void addResourceFilterClause(List<String> clauses, StringBuilder current) {
        String clause = trimText(current.toString());
        if (StringUtils.hasText(clause)) {
            clauses.add(clause);
        }
        current.setLength(0);
    }

    private boolean isResourceFilterAndDelimiter(String value, int index) {
        return index + 5 <= value.length() && value.regionMatches(true, index, " and ", 0, 5);
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
                aggregate.getResourceAttributes()
        );
    }

    private TraceListItemDto toTraceListItem(Map<String, Object> row) {
        Map<String, String> resourceAttributes = parseAttributes(row.get("resource_attributes"), "resource_attributes.", row);
        String serviceName = defaultText(readText(row, "service_name"), resourceAttributes.get("service.name"));
        String serviceNamespace = defaultText(readText(row, "service_namespace"),
                resourceAttributes.get("service.namespace"));
        String status = normalizeStatus(defaultText(readText(row, "span_status_code"), readText(row, "status")));
        Integer errorSpanCount = readNonNegativeIntValue(row, "error_span_count", "errorSpanCount");
        return new TraceListItemDto(
                readText(row, "trace_id"),
                defaultText(readText(row, "root_span_id"), readText(row, "span_id")),
                serviceName,
                serviceNamespace,
                defaultText(readText(row, "root_span_name"), defaultText(readText(row, "span_name"), readText(row, "name"))),
                readNonNegativeLong(row, "duration_nano"),
                status,
                readTimestamp(row, "timestamp"),
                errorSpanCount == null ? ("error".equals(status) ? 1 : 0) : errorSpanCount,
                resourceAttributes
        );
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
        Map<String, String> resourceAttributes = parseAttributes(row.get("resource_attributes"), "resource_attributes.", row);
        Map<String, String> spanAttributes = parseAttributes(row.get("span_attributes"), "span_attributes.", row);
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
        span.setDurationNanos(readNonNegativeLong(row, "duration_nano"));
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
                    readLongValue(item, "time_unix_nano", "timeUnixNano"),
                    defaultText(readTextValue(item, "name"), readTextValue(item, "event_name")),
                    readObjectMap(item, "attributes"),
                    readNonNegativeIntValue(item, "dropped_attributes_count", "droppedAttributesCount")
            ));
        }
        return events;
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
        } catch (Exception ex) {
            log.debug("Parse trace json list failed, value={}, message={}", rawValue, ex.getMessage());
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

    private Map<String, String> parseAttributes(Object rawValue, String prefix, Map<String, Object> row) {
        Map<String, String> values = new LinkedHashMap<>();
        if (rawValue instanceof String rawText && StringUtils.hasText(rawText)) {
            try {
                Object parsed = JSON_MAPPER.readValue(rawText, new TypeReference<>() {
                });
                collectTraceAttributes(values, parsed);
            } catch (Exception ignored) {
                // Keep fallback scan below.
            }
        } else {
            collectTraceAttributes(values, rawValue);
        }
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

    private void collectTraceAttributes(Map<String, String> values, Object rawValue) {
        if (rawValue instanceof Map<?, ?> rawMap) {
            Object key = rawMap.get("key");
            if (key != null && rawMap.containsKey("value")) {
                putTraceAttribute(values, key, rawMap.get("value"));
                return;
            }
            rawMap.forEach((attributeKey, attributeValue) -> putTraceAttribute(values, attributeKey, attributeValue));
            return;
        }
        if (rawValue instanceof Iterable<?> items) {
            items.forEach(item -> collectTraceAttributes(values, item));
        }
    }

    private void putTraceAttribute(Map<String, String> values, Object key, Object value) {
        String normalizedKey = trimText(Objects.toString(key, null));
        String normalizedValue = traceAttributeValue(value);
        if (normalizedKey != null && normalizedValue != null) {
            values.put(normalizedKey, normalizedValue);
        }
    }

    private String traceAttributeValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Map<?, ?> rawMap) {
            for (String key : List.of("stringValue", "string_value", "intValue", "int_value",
                    "doubleValue", "double_value", "boolValue", "bool_value")) {
                if (rawMap.containsKey(key)) {
                    return traceAttributeValue(rawMap.get(key));
                }
            }
            if (rawMap.containsKey("value")) {
                return traceAttributeValue(rawMap.get("value"));
            }
        }
        return trimText(Objects.toString(value, null));
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

    private Long readNonNegativeLong(Map<String, Object> row, String key) {
        Long value = readLong(row, key);
        return value == null ? null : Math.max(0L, value);
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
        if (lower.contains("ok") || "1".equals(lower) || lower.contains("unset") || "0".equals(lower)) {
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
        private Map<String, String> resourceAttributes = Collections.emptyMap();
        private final List<TraceSpanNodeDto> spans = new ArrayList<>();

        private TraceAggregate(String traceId) {
            this.traceId = traceId;
        }

        private void accept(TraceSpanNodeDto span) {
            this.spans.add(span);
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
                this.rootSpanId = currentRoot.getSpanId();
                this.rootSpanName = currentRoot.getSpanName();
                this.durationNanos = currentRoot.getDurationNanos();
                this.resourceAttributes = currentRoot.getResourceAttributes();
            }
        }

        private TraceAggregate normalize() {
            this.spans.sort(Comparator.comparing(TraceSpanNodeDto::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())));
            if (!StringUtils.hasText(this.rootSpanId) && !this.spans.isEmpty()) {
                TraceSpanNodeDto first = this.spans.getFirst();
                this.rootSpanId = first.getSpanId();
                this.rootSpanName = first.getSpanName();
                this.durationNanos = first.getDurationNanos();
                this.resourceAttributes = first.getResourceAttributes();
            }
            TraceSpanNodeDto rootSpan = findRootSpan();
            if (rootSpan != null) {
                this.serviceName = preferText(rootSpan.getServiceName(),
                        rootSpan.getResourceAttributes().get("service.name"),
                        this.serviceName);
                this.serviceNamespace = preferText(rootSpan.getResourceAttributes().get("service.namespace"),
                        this.serviceNamespace);
                if (!CollectionUtils.isEmpty(rootSpan.getResourceAttributes())) {
                    this.resourceAttributes = rootSpan.getResourceAttributes();
                }
            }
            if (!StringUtils.hasText(this.serviceName) && !this.spans.isEmpty()) {
                this.serviceName = this.spans.getFirst().getServiceName();
            }
            if (!StringUtils.hasText(this.serviceNamespace) && !CollectionUtils.isEmpty(this.resourceAttributes)) {
                this.serviceNamespace = this.resourceAttributes.get("service.namespace");
            }
            if (!StringUtils.hasText(this.status)) {
                this.status = "unknown";
            }
            if (this.durationNanos == null) {
                this.durationNanos = this.spans.stream()
                        .map(TraceSpanNodeDto::getDurationNanos)
                        .filter(Objects::nonNull)
                        .max(Long::compareTo)
                        .orElse(null);
            }
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
