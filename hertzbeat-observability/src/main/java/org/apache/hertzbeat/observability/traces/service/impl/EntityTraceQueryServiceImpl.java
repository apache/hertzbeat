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
    private static final long DEFAULT_LOOKBACK_MILLIS = Duration.ofHours(24).toMillis();
    private static final long ACTIVE_TRACE_WINDOW_MILLIS = Duration.ofMinutes(15).toMillis();
    private static final BigInteger LONG_MAX_VALUE = BigInteger.valueOf(Long.MAX_VALUE);
    private static final BigInteger LONG_MIN_VALUE = BigInteger.valueOf(Long.MIN_VALUE);
    private static final BigDecimal LONG_MAX_DECIMAL = BigDecimal.valueOf(Long.MAX_VALUE);
    private static final BigDecimal LONG_MIN_DECIMAL = BigDecimal.valueOf(Long.MIN_VALUE);
    private static final Set<String> WORKSPACE_RESOURCE_KEYS = Set.of(
            OtlpCorrelationEnricher.WORKSPACE_ID_ATTRIBUTE,
            AuthTokenScopes.CLAIM_WORKSPACE_ID,
            "workspace.id"
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
        Map<String, Set<String>> identityValues = entityId == null ? Collections.emptyMap() : canonicalIdentityValues(loadEntityContext(entityId));
        PageRequest pageRequest = PageRequest.of(Math.max(pageIndex, 0), Math.max(pageSize, 1));
        if (!StringUtils.hasText(traceId) && traceQueryRepository.supportsTraceListRows()) {
            List<Map<String, Object>> rows = traceQueryRepository.queryTraceListRows(
                    start,
                    end,
                    errorOnly,
                    serviceName,
                    serviceNamespace,
                    environment,
                    AuthTokenRequestContext.currentWorkspaceId(),
                    identityValues,
                    hideInternal,
                    Math.toIntExact(pageRequest.getOffset()),
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
        List<TraceAggregate> filtered = aggregateTraceRows(queryRowsForList(traceId, start, end, serviceName,
                serviceNamespace, environment, identityValues, hideInternal)).stream()
                .filter(trace -> matchesTraceFilters(trace, identityValues, start, end, traceId, errorOnly,
                        serviceName, serviceNamespace, environment, hideInternal))
                .sorted(Comparator.comparing(TraceAggregate::getStartTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        int safeStart = Math.min((int) pageRequest.getOffset(), filtered.size());
        int safeEnd = Math.min(safeStart + pageRequest.getPageSize(), filtered.size());
        List<TraceListItemDto> items = filtered.subList(safeStart, safeEnd).stream()
                .map(this::toTraceListItem)
                .toList();
        return new PageImpl<>(items, pageRequest, filtered.size());
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
        Page<TraceListItemDto> result = queryTraceList(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment, 0,
                TRACE_LIST_SAMPLE_LIMIT, hideInternal);
        Long latestObservedAt = result.getContent().stream()
                .map(TraceListItemDto::getStartTime)
                .filter(Objects::nonNull)
                .max(Long::compareTo)
                .orElse(null);
        int errorTraceCount = (int) result.getContent().stream().filter(item -> isErrorStatus(item.getStatus())).count();
        boolean active = latestObservedAt != null && latestObservedAt >= System.currentTimeMillis() - ACTIVE_TRACE_WINDOW_MILLIS;
        return new TraceOverviewDto((int) result.getTotalElements(), errorTraceCount, latestObservedAt, active);
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
                                                       Map<String, Set<String>> identityValues,
                                                       Boolean hideInternal) {
        if (StringUtils.hasText(traceId)) {
            return queryTraceRows(traceId, start, end, serviceName, serviceNamespace, environment,
                    identityValues, hideInternal);
        }
        return traceQueryRepository.queryRecentTraceRows(
                TRACE_LIST_SAMPLE_LIMIT,
                start,
                end,
                serviceName,
                serviceNamespace,
                environment,
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
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        if (!hasTraceRowPushdownFilters(start, end, serviceName, serviceNamespace, environment,
                workspaceId, identityValues, hideInternal)) {
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
                                               String workspaceId,
                                               Map<String, Set<String>> identityValues,
                                               Boolean hideInternal) {
        return start != null
                || end != null
                || StringUtils.hasText(serviceName)
                || StringUtils.hasText(serviceNamespace)
                || StringUtils.hasText(environment)
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

    private boolean matchesTraceFilters(TraceAggregate trace, Map<String, Set<String>> identityValues, Long start, Long end,
                                        String traceId, Boolean errorOnly, String serviceName, String serviceNamespace,
                                        String environment, Boolean hideInternal) {
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
        return identityValues.isEmpty() || matchesEntity(trace, identityValues);
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

    private String resolveCanonicalValue(Map<String, String> resourceAttributes, String key, String serviceName) {
        if ("service.name".equals(key)) {
            return defaultText(serviceName, resourceAttributes.get(key));
        }
        return resourceAttributes.get(key);
    }

    private Map<String, Set<String>> canonicalIdentityValues(ObservedEntityContext entityContext) {
        if (entityContext == null || CollectionUtils.isEmpty(entityContext.getIdentities())) {
            return Collections.emptyMap();
        }
        Map<String, Set<String>> values = new LinkedHashMap<>();
        for (EntityIdentity identity : entityContext.getIdentities()) {
            String key = trimText(identity.getIdentityKey());
            String value = trimText(identity.getIdentityValue());
            if (!StringUtils.hasText(key) || !StringUtils.hasText(value)
                    || !EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey(key)) {
                continue;
            }
            values.computeIfAbsent(key, ignored -> new LinkedHashSet<>()).add(value);
        }
        return values;
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
