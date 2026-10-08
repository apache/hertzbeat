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

package org.apache.hertzbeat.observability.traces.controller;

import org.apache.hertzbeat.common.observability.dto.trace.TraceAnalytics;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import java.util.regex.Pattern;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationWindow;
import org.apache.hertzbeat.common.observability.dto.investigation.TraceInvestigationView;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceOverviewDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceServiceStatsDto;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.apache.hertzbeat.observability.shared.query.CollectorResourceScope;
import org.apache.hertzbeat.observability.shared.query.TelemetryQueryContextScope;
import org.apache.hertzbeat.observability.investigation.service.TraceInvestigationReadModelService;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.observability.traces.dto.TraceStructureQuery;
import org.apache.hertzbeat.observability.traces.dto.TraceStructureAnalysis;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.springframework.data.domain.Page;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Trace query APIs for entity workspace and trace center.
 */
@RestController
@RequestMapping(path = "/api/traces", produces = "application/json")
@Tag(name = "Trace Query Controller")
public class TraceQueryController {

    private static final Pattern TRACE_ID = Pattern.compile("[0-9a-f]{32}");
    private static final Pattern SPAN_ID = Pattern.compile("[0-9a-f]{16}");
    private static final long MAX_SAFE_WIRE_INTEGER = 9_007_199_254_740_991L;

    private final EntityTraceQueryService entityTraceQueryService;
    private final ObservabilityQueryAdmissionService queryAdmissionService;
    private final TraceInvestigationReadModelService traceInvestigationReadModelService;

    @Autowired
    public TraceQueryController(EntityTraceQueryService entityTraceQueryService,
                                ObservabilityQueryAdmissionService queryAdmissionService,
                                TraceInvestigationReadModelService traceInvestigationReadModelService) {
        this.entityTraceQueryService = entityTraceQueryService;
        this.queryAdmissionService = queryAdmissionService;
        this.traceInvestigationReadModelService = traceInvestigationReadModelService;
    }

    @GetMapping("/list")
    @Operation(summary = "Query traces with entity context and canonical resource filters")
    public ResponseEntity<Message<Page<TraceListItemDto>>> list(
            @RequestParam(value = "entityId", required = false) Long entityId,
            @RequestParam(value = "entityType", required = false) String entityType,
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "traceId", required = false) String traceId,
            @RequestParam(value = "errorOnly", required = false) Boolean errorOnly,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "collectorId", required = false) String collectorId,
            @RequestParam(value = "instance", required = false) String instance,
            @RequestParam(value = "endpoint", required = false) String endpoint,
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @RequestParam(value = "operationName", required = false) String operationName,
            @RequestParam(value = "minDurationMs", required = false) Long minDurationMs,
            @RequestParam(value = "maxDurationMs", required = false) Long maxDurationMs,
            @RequestParam(value = "spanScope", required = false) String spanScope,
            @RequestParam(value = "hideInternal", required = false) Boolean hideInternal,
            @RequestParam(value = "pageIndex", defaultValue = "0") Integer pageIndex,
            @RequestParam(value = "pageSize", defaultValue = "20") Integer pageSize,
            @RequestParam(value = "sort", required = false) String sort,
            @RequestParam(value = "endExclusive", required = false) String endExclusive,
            @RequestParam(value = "population", required = false) String population) {
        String workspaceId = trustedWorkspaceId();
        var traceSort = EntityTraceQueryService.parseTraceSort(sort);
        boolean exclusive;
        try {
            exclusive = booleanParameter(endExclusive == null ? Map.of() : Map.of("endExclusive", endExclusive), "endExclusive");
            if (population != null && !"matched_traces".equals(population)) {
                throw new IllegalArgumentException("Invalid trace population");
            }
        } catch (IllegalArgumentException exception) {
            throw new ObservabilityQueryRequestException();
        }
        ScopedFilters scopedFilters = scopeFilters(
                entityId, entityType, collectorId, instance, endpoint, resourceFilter, attributeFilter);
        Page<TraceListItemDto> page = queryAdmissionService.execute("traces",
                () -> requireTraceEvidenceRows(entityTraceQueryService.queryTraceList(
                        workspaceId, entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                        scopedFilters.resourceFilter(), operationName, minDurationMs, maxDurationMs, pageIndex, pageSize,
                        hideInternal, spanScope, scopedFilters.attributeFilter(), traceSort, exclusive)));
        return ResponseEntity.ok(Message.success(page));
    }

    @GetMapping("/structure")
    @Operation(summary = "Query observed same-trace relationships between two named span clauses")
    public ResponseEntity<Message<Page<TraceListItemDto>>> structure(@RequestParam Map<String, String> params) {
        TraceStructureQuery query = parseStructureQuery(params);
        String workspace = trustedWorkspaceId();
        Page<TraceListItemDto> page = queryAdmissionService.execute("traces",
                () -> requireTraceEvidenceRows(entityTraceQueryService.queryTraceStructure(workspace, query)));
        return ResponseEntity.ok(Message.success(page));
    }

    @GetMapping("/structure/analysis")
    @Operation(summary = "Analyze observed patterns and cross-service parent edges in a structural trace query")
    public ResponseEntity<Message<TraceStructureAnalysis>> structureAnalysis(@RequestParam Map<String, String> params) {
        TraceStructureQuery query = parseStructureQuery(params);
        String workspace = trustedWorkspaceId();
        TraceStructureAnalysis analysis = queryAdmissionService.execute("traces",
                () -> entityTraceQueryService.queryTraceStructureAnalysis(workspace, query));
        return ResponseEntity.ok(Message.success(analysis));
    }

    private TraceStructureQuery parseStructureQuery(Map<String, String> params) {
        TraceStructureQuery query;
        try {
            if (!java.util.Set.of("start", "end", "aServiceName", "aOperationName", "aStatus", "bServiceName",
                    "bOperationName", "bStatus", "relation", "pageIndex", "pageSize").containsAll(params.keySet())) {
                throw new IllegalArgumentException("Unknown structural query parameter");
            }
            query = new TraceStructureQuery(Long.parseLong(params.get("start")), Long.parseLong(params.get("end")),
                    new TraceStructureQuery.Clause(params.get("aServiceName"), params.get("aOperationName"),
                            params.get("aStatus")),
                    new TraceStructureQuery.Clause(params.get("bServiceName"), params.get("bOperationName"),
                            params.get("bStatus")),
                    TraceStructureQuery.Relation.valueOf(params.get("relation").toUpperCase(java.util.Locale.ROOT)),
                    integerParameter(params, "pageIndex", 0), integerParameter(params, "pageSize", 20));
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new ObservabilityQueryRequestException();
        }
        return query;
    }

    @GetMapping("/spans")
    public ResponseEntity<Message<TraceAnalytics.Evidence<?>>> spans(@RequestParam Map<String, String> params) {
        return analytics(params, "spans");
    }

    @GetMapping("/stats/histogram")
    public ResponseEntity<Message<TraceAnalytics.Evidence<?>>> histogram(@RequestParam Map<String, String> params) {
        return analytics(params, "histogram");
    }

    @GetMapping("/facets/values")
    public ResponseEntity<Message<TraceAnalytics.Evidence<?>>> facetValues(@RequestParam Map<String, String> params) {
        return analytics(params, "facets");
    }

    @GetMapping("/stats/groups")
    public ResponseEntity<Message<TraceAnalytics.Evidence<?>>> groups(@RequestParam Map<String, String> params) {
        return analytics(params, "groups");
    }

    private ResponseEntity<Message<TraceAnalytics.Evidence<?>>> analytics(Map<String, String> params, String shape) {
        String workspace = trustedWorkspaceId();
        EntityTraceQueryService.AnalyticsQuery query;
        TraceAnalytics.Options options;
        try {
            Long entityId = optionalNumber(params, "entityId");
            String traceId = params.get("traceId");
            if (entityId != null && entityId <= 0 || traceId != null
                    && (!TRACE_ID.matcher(traceId).matches() || traceId.equals("0".repeat(32)))) {
                throw new IllegalArgumentException("Invalid trace identity");
            }
            var filters = scopeFilters(entityId, params.get("entityType"), params.get("collectorId"),
                    params.get("instance"), params.get("endpoint"), params.get("resourceFilter"), params.get("attributeFilter"));
            String population = params.getOrDefault("population", "spans".equals(shape) ? "matched_spans" : "matched_traces");
            TraceAnalytics.population(population);
            if ("spans".equals(shape) && !"matched_spans".equals(population)) {
                throw new IllegalArgumentException("Invalid span population");
            }
            var window = new TraceAnalytics.Window(Long.parseLong(params.get("start")), Long.parseLong(params.get("end")),
                    booleanParameter(params, "endExclusive"));
            Long minimum = optionalNumber(params, "minDurationMs");
            Long maximum = optionalNumber(params, "maxDurationMs");
            if (minimum != null && minimum < 0 || maximum != null && (maximum < 0 || minimum != null && maximum < minimum)) {
                throw new IllegalArgumentException("Invalid duration range");
            }
            String spanScope = params.get("spanScope");
            if (spanScope != null && !java.util.List.of("", "all", "root", "entrypoint", "entrypoint-spans", "entry").contains(spanScope)) {
                throw new IllegalArgumentException("Invalid span scope");
            }
            query = new EntityTraceQueryService.AnalyticsQuery(workspace, entityId, window, population, params.get("traceId"),
                    booleanParameter(params, "errorOnly"), params.get("serviceName"), params.get("serviceNamespace"),
                    params.get("environment"), filters.resourceFilter(), filters.attributeFilter(), params.get("operationName"),
                    minimum, maximum, spanScope, booleanParameter(params, "hideInternal"));
            options = new TraceAnalytics.Options(shape, params.get("groups".equals(shape) ? "groupBy" : "field"),
                    integerParameter(params, "limit", 20), integerParameter(params, "bucketCount", 30),
                    integerParameter(params, "pageIndex", 0), integerParameter(params, "pageSize", 20),
                    params.getOrDefault("groups".equals(shape) ? "orderBy" : "sort", "groups".equals(shape) ? "count-desc" : "newest"));
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new ObservabilityQueryRequestException();
        }
        return ResponseEntity.ok(Message.success(queryAdmissionService.execute("traces",
                () -> entityTraceQueryService.queryAnalytics(query, options))));
    }

    private static Long optionalNumber(Map<String, String> params, String key) {
        return params.containsKey(key) ? Long.valueOf(params.get(key)) : null;
    }

    private static int integerParameter(Map<String, String> params, String key, int fallback) {
        return params.containsKey(key) ? Integer.parseInt(params.get(key)) : fallback;
    }

    private static boolean booleanParameter(Map<String, String> params, String key) {
        String value = params.get(key);
        if (value != null && !"true".equals(value) && !"false".equals(value)) {
            throw new IllegalArgumentException("Invalid boolean parameter");
        }
        return "true".equals(value);
    }

    private static Page<TraceListItemDto> requireTraceEvidenceRows(Page<TraceListItemDto> page) {
        if (page == null) {
            throw new TelemetryStorageUnavailableException();
        }
        page.forEach(TraceQueryController::requireTraceEvidenceRow);
        return page;
    }

    private static void requireTraceEvidenceRow(TraceListItemDto item) {
        if (item == null || !StringUtils.hasText(item.getTraceId()) || !TRACE_ID.matcher(item.getTraceId()).matches()
                || item.getTraceId().equals("0".repeat(32))
                || item.getSpanCount() == null || item.getSpanCount() <= 0
                || item.getSpanCount() > MAX_SAFE_WIRE_INTEGER
                || item.getErrorSpanCount() < 0 || item.getErrorSpanCount() > item.getSpanCount()
                || item.getServiceStats() == null || item.getRootSpanCount() < 0
                || item.getRootSpanCount() > item.getSpanCount()
                || !safeNonNegative(item.getObservedStartTime()) || !safeNonNegative(item.getObservedEndTime())
                || item.getObservedEndTime() < item.getObservedStartTime()) {
            throw new TelemetryStorageUnavailableException();
        }
        String rootState = item.getRootSpanCount() == 0 ? "missing" : item.getRootSpanCount() == 1 ? "unique" : "ambiguous";
        if (!rootState.equals(item.getRootState())) {
            throw new TelemetryStorageUnavailableException();
        }
        if (item.getRootSpanCount() == 1) {
            if (!validSpanId(item.getRootSpanId()) || !nullableName(item.getRootSpanName())
                    || !nullableName(item.getServiceName()) || !nullableName(item.getServiceNamespace())
                    || !validSpanWindow(item.getStartTime(), item.getDurationNanos(), item)) {
                throw new TelemetryStorageUnavailableException();
            }
        } else if (item.getRootSpanId() != null || item.getRootSpanName() != null || item.getServiceName() != null
                || item.getServiceNamespace() != null || item.getStartTime() != null || item.getDurationNanos() != null
                || item.getResourceAttributes() != null) {
            throw new TelemetryStorageUnavailableException();
        }
        var representative = item.getRepresentativeSpan();
        if (representative == null || !validSpanId(representative.spanId())
                || !nullableName(representative.spanName()) || !nullableName(representative.serviceName())
                || !nullableName(representative.serviceNamespace())
                || !validSpanWindow(representative.startTime(), representative.durationNanos(), item)
                || !representative.startTime().equals(item.getObservedStartTime())) {
            throw new TelemetryStorageUnavailableException();
        }
        long totalSpans = 0L;
        long totalErrors = 0L;
        try {
            if (item.getUnattributedServiceStats() != null) {
                requireServiceStats(item.getUnattributedServiceStats());
                totalSpans = item.getUnattributedServiceStats().getSpanCount();
                totalErrors = item.getUnattributedServiceStats().getErrorCount();
            }
            for (Map.Entry<String, TraceServiceStatsDto> entry : item.getServiceStats().entrySet()) {
                TraceServiceStatsDto service = entry.getValue();
                if (!StringUtils.hasText(entry.getKey())) {
                    throw new TelemetryStorageUnavailableException();
                }
                requireServiceStats(service);
                totalSpans = Math.addExact(totalSpans, service.getSpanCount());
                totalErrors = Math.addExact(totalErrors, service.getErrorCount());
            }
        } catch (ArithmeticException ignored) {
            throw new TelemetryStorageUnavailableException();
        }
        if (totalSpans != item.getSpanCount() || totalErrors != item.getErrorSpanCount()) {
            throw new TelemetryStorageUnavailableException();
        }
    }

    private static boolean validSpanId(String value) {
        return value != null && value.matches("[0-9a-f]{16}") && !value.equals("0".repeat(16));
    }

    private static boolean nullableName(String value) {
        return value == null || StringUtils.hasText(value);
    }

    private static boolean safeNonNegative(Long value) {
        return value != null && value >= 0 && value <= MAX_SAFE_WIRE_INTEGER;
    }

    private static boolean validSpanWindow(Long start, Long duration, TraceListItemDto item) {
        return safeNonNegative(start) && safeNonNegative(duration) && start >= item.getObservedStartTime()
                && start <= item.getObservedEndTime()
                && Math.ceilDiv(duration, 1_000_000L) <= item.getObservedEndTime() - start;
    }

    private static void requireServiceStats(TraceServiceStatsDto stats) {
        if (stats == null || stats.getSpanCount() <= 0 || stats.getSpanCount() > MAX_SAFE_WIRE_INTEGER
                || stats.getErrorCount() < 0 || stats.getErrorCount() > stats.getSpanCount()) {
            throw new TelemetryStorageUnavailableException();
        }
    }

    @GetMapping("/stats/overview")
    @Operation(summary = "Trace overview statistics")
    public ResponseEntity<Message<TraceOverviewDto>> overview(
            @RequestParam(value = "entityId", required = false) Long entityId,
            @RequestParam(value = "entityType", required = false) String entityType,
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "traceId", required = false) String traceId,
            @RequestParam(value = "errorOnly", required = false) Boolean errorOnly,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "collectorId", required = false) String collectorId,
            @RequestParam(value = "instance", required = false) String instance,
            @RequestParam(value = "endpoint", required = false) String endpoint,
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @RequestParam(value = "operationName", required = false) String operationName,
            @RequestParam(value = "minDurationMs", required = false) Long minDurationMs,
            @RequestParam(value = "maxDurationMs", required = false) Long maxDurationMs,
            @RequestParam(value = "spanScope", required = false) String spanScope,
            @RequestParam(value = "hideInternal", required = false) Boolean hideInternal) {
        String workspaceId = trustedWorkspaceId();
        ScopedFilters scopedFilters = scopeFilters(
                entityId, entityType, collectorId, instance, endpoint, resourceFilter, attributeFilter);
        return ResponseEntity.ok(Message.success(queryAdmissionService.execute("traces",
                () -> entityTraceQueryService.getTraceOverview(
                        workspaceId, entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                        scopedFilters.resourceFilter(), operationName, minDurationMs, maxDurationMs, hideInternal,
                        spanScope, scopedFilters.attributeFilter()))));
    }

    @GetMapping("/stats/group-by")
    @Operation(summary = "Trace group-by statistics")
    public ResponseEntity<Message<Map<String, Object>>> groupBy(
            @RequestParam(value = "entityId", required = false) Long entityId,
            @RequestParam(value = "entityType", required = false) String entityType,
            @RequestParam(value = "start", required = false) Long start,
            @RequestParam(value = "end", required = false) Long end,
            @RequestParam(value = "traceId", required = false) String traceId,
            @RequestParam(value = "errorOnly", required = false) Boolean errorOnly,
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "collectorId", required = false) String collectorId,
            @RequestParam(value = "instance", required = false) String instance,
            @RequestParam(value = "endpoint", required = false) String endpoint,
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @RequestParam(value = "operationName", required = false) String operationName,
            @RequestParam(value = "minDurationMs", required = false) Long minDurationMs,
            @RequestParam(value = "maxDurationMs", required = false) Long maxDurationMs,
            @RequestParam(value = "groupBy") String groupBy,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "orderBy", required = false) String orderBy,
            @RequestParam(value = "minCount", required = false) Integer minCount,
            @RequestParam(value = "spanScope", required = false) String spanScope,
            @RequestParam(value = "hideInternal", required = false) Boolean hideInternal) {
        String workspaceId = trustedWorkspaceId();
        ScopedFilters scopedFilters = scopeFilters(
                entityId, entityType, collectorId, instance, endpoint, resourceFilter, attributeFilter);
        return ResponseEntity.ok(Message.success(queryAdmissionService.execute("traces",
                () -> entityTraceQueryService.getTraceGroupByStats(
                        workspaceId, entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                        scopedFilters.resourceFilter(), operationName, minDurationMs, maxDurationMs, groupBy, limit,
                        orderBy, minCount, hideInternal, spanScope, scopedFilters.attributeFilter()))));
    }

    @GetMapping("/{traceId}")
    @Operation(summary = "Query one bounded Trace investigation")
    public ResponseEntity<Message<TraceInvestigationView>> detail(
            @PathVariable("traceId") String traceId,
            @RequestParam("start") long start,
            @RequestParam("end") long end,
            @RequestParam(value = "spanId", required = false) String spanId) {
        validateInvestigationSelection(traceId, spanId, start, end);
        String workspaceId = trustedWorkspaceId();
        return ResponseEntity.ok(Message.success(queryAdmissionService.execute("traces",
                () -> traceInvestigationReadModelService.query(workspaceId, traceId, spanId, start, end))));
    }

    private static void validateInvestigationSelection(String traceId, String spanId, long start, long end) {
        if (traceId == null || !TRACE_ID.matcher(traceId).matches()) {
            throw new IllegalArgumentException("traceId must be 32 lowercase hexadecimal characters");
        }
        if (spanId != null && !SPAN_ID.matcher(spanId).matches()) {
            throw new IllegalArgumentException("spanId must be 16 lowercase hexadecimal characters");
        }
        new InvestigationWindow(start, end);
    }

    private String mergeEntityContextResourceFilter(Long entityId, String entityType, String resourceFilter) {
        String normalizedResourceFilter = StringUtils.trimWhitespace(resourceFilter);
        String scopedResourceFilter = normalizedResourceFilter;
        String normalizedEntityType = StringUtils.trimWhitespace(entityType);
        if (!StringUtils.hasText(normalizedEntityType) || !normalizedEntityType.matches("[A-Za-z0-9_.:-]+")) {
            return scopedResourceFilter;
        }
        if (StringUtils.hasText(scopedResourceFilter)
                && scopedResourceFilter.contains(OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_TYPE)) {
            return scopedResourceFilter;
        }
        String entityTypeFilter = OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_TYPE + "=\"" + normalizedEntityType + "\"";
        return StringUtils.hasText(scopedResourceFilter)
                ? scopedResourceFilter + " and " + entityTypeFilter
                : entityTypeFilter;
    }

    private String trustedWorkspaceId() {
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        if (!StringUtils.hasText(workspaceId)) {
            throw new TelemetryStorageUnavailableException();
        }
        return AuthTokenScopes.normalizeWorkspaceId(workspaceId);
    }

    private ScopedFilters scopeFilters(Long entityId, String entityType, String collectorId, String instance,
                                       String endpoint, String resourceFilter, String attributeFilter) {
        TelemetryQueryContextScope queryContextScope = new TelemetryQueryContextScope(instance, endpoint);
        String collectorScopedResourceFilter = CollectorResourceScope.apply(
                mergeEntityContextResourceFilter(entityId, entityType, resourceFilter), collectorId);
        return new ScopedFilters(
                queryContextScope.applyResourceFilter(collectorScopedResourceFilter),
                queryContextScope.applyAttributeFilter(attributeFilter));
    }

    private record ScopedFilters(String resourceFilter, String attributeFilter) {
    }
}
