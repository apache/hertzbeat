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

package org.apache.hertzbeat.ai.gateway.tool.trace;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Supplier;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeTextSanitizer;
import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.Field;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.GroupOrder;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.Population;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.Selection;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.SpanSort;
import org.apache.hertzbeat.ai.gateway.tool.trace.AgentTraceToolArguments.StructureSelection;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.dto.trace.TraceDetailDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;
import org.apache.hertzbeat.common.observability.dto.trace.TraceSpanNodeDto;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.traces.controller.TraceQueryController;
import org.apache.hertzbeat.observability.traces.dto.TraceListPageDto;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService.TraceDetailQuery;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.apache.hertzbeat.warehouse.repository.TraceQueryRepository.TraceSort;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/** Bounded trace investigation tools backed by the product trace query service. */
@Service
public class AgentTraceToolService {

    private static final long MAX_RANGE_MILLIS = Duration.ofDays(7).toMillis();
    private static final int MAX_DETAIL_SPANS = 200;

    private static final JsonMapper PROJECTION_MAPPER = JsonMapper.builder().build();

    private final EntityTraceQueryService traceQueryService;
    private final TraceQueryController traceQueryController;
    private final ObservabilityQueryAdmissionService queryAdmissionService;

    /** Compatibility constructor for existing standalone integrations. */
    public AgentTraceToolService(EntityTraceQueryService traceQueryService) {
        this(traceQueryService, null,
                new ObservabilityQueryAdmissionService(8, 8, 8, 4, 8, Duration.ofMillis(100)));
    }

    @Autowired
    public AgentTraceToolService(EntityTraceQueryService traceQueryService, TraceQueryController traceQueryController,
                                 ObservabilityQueryAdmissionService queryAdmissionService) {
        this.traceQueryService = Objects.requireNonNull(traceQueryService);
        this.traceQueryController = traceQueryController;
        this.queryAdmissionService = Objects.requireNonNull(queryAdmissionService);
    }

    @Tool(name = "traces.query", description = "Query traces in a bounded time range using entity and service filters.")
    @AgentToolPolicy
    public Map<String, Object> queryTraces(
            @ToolParam(required = false, description = "Observable entity id.") Long entityId,
            @ToolParam(required = false, description = "Start Unix timestamp in milliseconds.") Long start,
            @ToolParam(required = false, description = "End Unix timestamp in milliseconds.") Long end,
            @ToolParam(required = false, description = "Exact trace id.") String traceId,
            @ToolParam(required = false, description = "Return only traces with errors.") Boolean errorOnly,
            @ToolParam(required = false, description = "OpenTelemetry service name.") String serviceName,
            @ToolParam(required = false, description = "OpenTelemetry service namespace.") String serviceNamespace,
            @ToolParam(required = false, description = "Deployment environment.") String environment,
            @ToolParam(required = false, description = "Root operation name.") String operationName,
            @ToolParam(required = false, description = "Zero-based page index.") Integer pageIndex,
            @ToolParam(required = false, description = "Page size; maximum 50.") Integer pageSize,
            @ToolParam(required = false, description = "Hide internal spans; defaults to true.") Boolean hideInternal,
            @ToolParam(required = false, description = "NEWEST by default; DURATION_DESC ranks the slowest matching traces.")
            TraceSort sort) {
        long[] range = range(start, end);
        int resolvedPageIndex = AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, 10_000);
        int resolvedPageSize = AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 50);
        boolean resolvedHideInternal = hideInternal == null || hideInternal;
        String workspace = workspaceId();
        TraceSort resolvedSort = sort == null ? TraceSort.NEWEST : sort;
        Page<TraceListItemDto> page = admitted(() -> sort == null
                ? traceQueryService.queryTraceList(workspace, entityId,
                        range[0], range[1], traceId, errorOnly, serviceName, serviceNamespace, environment,
                        null, operationName, null, null, resolvedPageIndex, resolvedPageSize, resolvedHideInternal,
                        null, null)
                : traceQueryService.queryTraceList(workspace, entityId,
                        range[0], range[1], traceId, errorOnly, serviceName, serviceNamespace, environment,
                        null, operationName, null, null, resolvedPageIndex, resolvedPageSize, resolvedHideInternal,
                        null, null, resolvedSort));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", page.getContent().stream().map(this::traceRow).toList());
        result.put("pageIndex", page.getNumber());
        result.put("pageSize", page.getSize());
        result.put("totalElements", page.getTotalElements());
        result.put("totalPages", page.getTotalPages());
        result.put("start", range[0]);
        result.put("end", range[1]);
        result.put("sort", resolvedSort.value());
        result.put("returnedRows", page.getNumberOfElements());
        result.put("partial", page.getNumberOfElements() < page.getTotalElements());
        return result;
    }

    public Map<String, Object> queryTraces(Long entityId, Long start, Long end, String traceId, Boolean errorOnly,
                                         String serviceName, String serviceNamespace, String environment,
                                         String operationName, Integer pageIndex, Integer pageSize, Boolean hideInternal) {
        return queryTraces(entityId, start, end, traceId, errorOnly, serviceName, serviceNamespace, environment,
                operationName, pageIndex, pageSize, hideInternal, null);
    }

    @Tool(name = "traces.get", description = "Get a bounded trace span tree using exact trace context.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> getTrace(
            @ToolParam(description = "Exact trace id.") String traceId,
            @ToolParam(required = false, description = "Selected exact span id.") String spanId,
            @ToolParam(required = false, description = "Start Unix timestamp in milliseconds.") Long start,
            @ToolParam(required = false, description = "End Unix timestamp in milliseconds.") Long end,
            @ToolParam(required = false, description = "OpenTelemetry service name.") String serviceName,
            @ToolParam(required = false, description = "OpenTelemetry service namespace.") String serviceNamespace,
            @ToolParam(required = false, description = "Deployment environment.") String environment,
            @ToolParam(required = false, description = "Exact resource attribute filter.") String resourceFilter,
            @ToolParam(required = false, description = "Exact span attribute filter.") String attributeFilter,
            @ToolParam(required = false, description = "Minimum trace duration in milliseconds.") Long minDurationMs,
            @ToolParam(required = false, description = "Maximum trace duration in milliseconds.") Long maxDurationMs) {
        if (traceId == null || traceId.isBlank()) {
            throw new IllegalArgumentException("traces.get requires traceId");
        }
        validateOptionalRange(start, end);
        validateDurationRange(minDurationMs, maxDurationMs);
        String workspace = workspaceId();
        TraceDetailDto detail = admitted(() -> traceQueryService.getTraceDetail(workspace, new TraceDetailQuery(null, traceId,
                spanId, start, end, serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                minDurationMs, maxDurationMs)));
        if (detail == null) {
            throw new IllegalArgumentException("Trace not found: " + traceId);
        }
        Map<String, Object> result = traceRow(detail);
        List<TraceSpanNodeDto> spans = detail.getSpans() == null ? List.of() : detail.getSpans();
        result.put("spans", spans.stream().limit(MAX_DETAIL_SPANS).map(this::spanRow).toList());
        result.put("spanCount", spans.size());
        result.put("partial", spans.size() > MAX_DETAIL_SPANS);
        return result;
    }

    @Tool(name = "traces.list", description = "List trace evidence with the full product selection, source filters and sort; maximum 50 rows.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> listTraces(
            @ToolParam(description = "Bounded trace selection; no workspace or raw query parameters.") Selection selection,
            @ToolParam(required = false) Integer pageIndex,
            @ToolParam(required = false) Integer pageSize,
            @ToolParam(required = false) TraceSort sort,
            @ToolParam(required = false) Boolean endExclusive) {
        Selection q = selection(selection);
        int index = AgentTraceToolArguments.integer(pageIndex, 0, 0, 10_000);
        int size = AgentTraceToolArguments.integer(pageSize, 20, 1, 50);
        Page<TraceListItemDto> page = data(controller().list(q.entityId(), q.entityType(), q.start(), q.end(),
                q.traceId(), q.errorOnly(), q.serviceName(), q.serviceNamespace(), q.environment(), q.collectorId(),
                q.instance(), q.endpoint(), q.resourceFilter(), q.attributeFilter(), q.operationName(),
                q.minDurationMs(), q.maxDurationMs(), spanScope(q), q.hideInternal(), index, size,
                (sort == null ? TraceSort.NEWEST : sort).value(), Boolean.toString(Boolean.TRUE.equals(endExclusive)),
                "matched_traces"));
        return pageResult(page, q.start(), q.end());
    }

    @Tool(name = "traces.structure", description = "Find observed same-trace relationships between two named span clauses within 24 hours.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> structure(@ToolParam(description = "Two typed span clauses and their relation.") StructureSelection query) {
        Objects.requireNonNull(query, "Structural query is required");
        return pageResult(data(controller().structure(query.parameters())), query.start(), query.end());
    }

    @Tool(name = "traces.structure_analysis", description = "Analyze observed structural trace patterns and parent edges; preserves scan and truncation evidence.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> structureAnalysis(@ToolParam(description = "Two typed span clauses and their relation.") StructureSelection query) {
        Objects.requireNonNull(query, "Structural query is required");
        Map<String, Object> result = projected(data(controller().structureAnalysis(query.parameters())));
        result.put("coverage", "bounded");
        result.put("partial", true);
        return result;
    }

    @Tool(name = "traces.spans", description = "Read a bounded matched-span page, preserving population and storage coverage; at most 24 hours and 50 rows.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> spans(
            @ToolParam(description = "Trace selection with a window no longer than 24 hours.") Selection selection,
            @ToolParam(required = false) Integer pageIndex,
            @ToolParam(required = false) Integer pageSize,
            @ToolParam(required = false) SpanSort sort,
            @ToolParam(required = false) Boolean endExclusive) {
        Map<String, String> params = analyticsParameters(selection, Population.matched_spans, endExclusive);
        params.put("pageIndex", Integer.toString(AgentTraceToolArguments.integer(pageIndex, 0, 0, 10_000)));
        params.put("pageSize", Integer.toString(AgentTraceToolArguments.integer(pageSize, 20, 1, 50)));
        params.put("sort", (sort == null ? SpanSort.newest : sort).name());
        return projected(data(controller().spans(params)));
    }

    @Tool(name = "traces.histogram", description = "Get a trace or span histogram with exact bucket boundaries and explicit population coverage; maximum 60 buckets.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> histogram(
            @ToolParam(description = "Trace selection with a window no longer than 24 hours.") Selection selection,
            @ToolParam(required = false) Population population,
            @ToolParam(required = false) Integer bucketCount,
            @ToolParam(required = false) Boolean endExclusive) {
        Map<String, String> params = analyticsParameters(selection, population, endExclusive);
        params.put("bucketCount", Integer.toString(AgentTraceToolArguments.integer(bucketCount, 30, 1, 60)));
        return projected(data(controller().histogram(params)));
    }

    @Tool(name = "traces.facet_values", description = "Read bounded trace facet values for service, operation or environment; preserves missing and overlapping memberships.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> facetValues(
            @ToolParam(description = "Trace selection with a window no longer than 24 hours.") Selection selection,
            @ToolParam(description = "Product facet field.") Field field,
            @ToolParam(required = false) Population population,
            @ToolParam(required = false) Integer limit,
            @ToolParam(required = false) Boolean endExclusive) {
        Map<String, String> params = analyticsParameters(selection, population, endExclusive);
        params.put("field", Objects.requireNonNull(field, "Facet field is required").name());
        params.put("limit", Integer.toString(AgentTraceToolArguments.integer(limit, 20, 1, 50)));
        return projected(data(controller().facetValues(params)));
    }

    @Tool(name = "traces.groups", description = "Rank bounded trace analytics groups by count or error count with explicit population coverage.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> groups(
            @ToolParam(description = "Trace selection with a window no longer than 24 hours.") Selection selection,
            @ToolParam(description = "Product group field.") Field groupBy,
            @ToolParam(required = false) Population population,
            @ToolParam(required = false) Integer limit,
            @ToolParam(required = false, description = "COUNT_DESC or ERROR_COUNT_DESC.") GroupOrder orderBy,
            @ToolParam(required = false) Boolean endExclusive) {
        Map<String, String> params = analyticsParameters(selection, population, endExclusive);
        if (orderBy == GroupOrder.LATENCY_P95_DESC) {
            throw new IllegalArgumentException("Trace analytics groups do not infer root latency");
        }
        params.put("groupBy", Objects.requireNonNull(groupBy, "Group field is required").name());
        params.put("limit", Integer.toString(AgentTraceToolArguments.integer(limit, 20, 1, 50)));
        params.put("orderBy", (orderBy == null ? GroupOrder.COUNT_DESC : orderBy).value());
        return projected(data(controller().groups(params)));
    }

    @Tool(name = "traces.overview", description = "Get the native trace overview for a bounded, workspace-scoped selection.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> overview(@ToolParam(description = "Bounded trace selection.") Selection selection) {
        Selection q = selection(selection);
        Map<String, Object> result = projected(data(controller().overview(q.entityId(), q.entityType(), q.start(), q.end(), q.traceId(),
                q.errorOnly(), q.serviceName(), q.serviceNamespace(), q.environment(), q.collectorId(), q.instance(),
                q.endpoint(), q.resourceFilter(), q.attributeFilter(), q.operationName(), q.minDurationMs(),
                q.maxDurationMs(), spanScope(q), q.hideInternal())));
        result.put("coverage", "unspecified");
        result.put("partial", true);
        return result;
    }

    @Tool(name = "traces.group_by", description = "Read native trace aggregate groups by service, operation, status or an exact resource/attribute key; maximum 50 groups.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> groupBy(
            @ToolParam(description = "Bounded trace selection.") Selection selection,
            @ToolParam(description = "Native group field such as service.name, operation.name, status, resource:key or attribute:key.") String groupBy,
            @ToolParam(required = false) Integer limit,
            @ToolParam(required = false) GroupOrder orderBy,
            @ToolParam(required = false) Integer minCount) {
        Selection q = selection(selection);
        AgentTraceToolArguments.text(groupBy, 256);
        if (groupBy == null || !groupBy.matches("(?:resource:|attribute:)?[A-Za-z0-9_.-]+")) {
            throw new IllegalArgumentException("Invalid trace aggregate group field");
        }
        int size = AgentTraceToolArguments.integer(limit, 20, 1, 50);
        int count = AgentTraceToolArguments.integer(minCount, 1, 1, 1_000_000);
        Map<String, Object> result = projected(data(controller().groupBy(q.entityId(), q.entityType(), q.start(),
                q.end(), q.traceId(), q.errorOnly(), q.serviceName(), q.serviceNamespace(), q.environment(),
                q.collectorId(), q.instance(), q.endpoint(), q.resourceFilter(), q.attributeFilter(), q.operationName(),
                q.minDurationMs(), q.maxDurationMs(), groupBy, size,
                (orderBy == null ? GroupOrder.COUNT_DESC : orderBy).value(), count, spanScope(q), q.hideInternal())));
        // This legacy product shape does not report scan coverage or the total number of groups.
        result.put("coverage", "unspecified");
        result.put("partial", true);
        return result;
    }

    @Tool(name = "traces.detail", description = "Read the native bounded trace investigation, including Gantt, related logs, RED, metrics and dependencies with evidence states.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> detail(
            @ToolParam(description = "Exact 32-character lowercase hexadecimal trace id.") String traceId,
            @ToolParam(required = false, description = "Exact 16-character lowercase hexadecimal span id.") String spanId,
            @ToolParam(description = "Start Unix timestamp in milliseconds.") long start,
            @ToolParam(description = "End Unix timestamp in milliseconds; window at most 24 hours.") long end) {
        return projected(data(controller().detail(traceId, start, end, spanId)));
    }

    private Selection selection(Selection selection) {
        return Objects.requireNonNull(selection, "Trace selection is required");
    }

    private String spanScope(Selection selection) {
        return selection.spanScope() == null ? null : selection.spanScope().name();
    }

    private Map<String, String> analyticsParameters(Selection selection, Population population, Boolean endExclusive) {
        Map<String, String> values = selection(selection).parameters();
        values.put("population", (population == null ? Population.matched_traces : population).name());
        values.put("endExclusive", Boolean.toString(Boolean.TRUE.equals(endExclusive)));
        return values;
    }

    private TraceQueryController controller() {
        String trustedWorkspace = workspaceId();
        String invocationWorkspace = AgentToolContextSupport.invocation().getRequest().getWorkspaceId();
        if (!StringUtils.hasText(invocationWorkspace)
                || !trustedWorkspace.equals(AuthTokenScopes.normalizeWorkspaceId(invocationWorkspace))) {
            throw new CommonException("trace_workspace_mismatch");
        }
        if (traceQueryController == null) {
            throw new CommonException("trace_query_controller_unavailable");
        }
        return traceQueryController;
    }

    private <T> T admitted(Supplier<T> operation) {
        return queryAdmissionService.execute("traces", operation);
    }

    private <T> T data(ResponseEntity<Message<T>> response) {
        if (response == null || !response.getStatusCode().is2xxSuccessful() || response.getBody() == null
                || response.getBody().getData() == null) {
            throw new TelemetryStorageUnavailableException();
        }
        return response.getBody().getData();
    }

    private Map<String, Object> pageResult(Page<TraceListItemDto> page, long start, long end) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("pageIndex", page.getNumber());
        result.put("pageSize", page.getSize());
        result.put("totalElements", page.getTotalElements());
        result.put("totalPages", page.getTotalPages());
        result.put("start", start);
        result.put("end", end);
        result.put("hasNext", page.hasNext());
        result.put("hasPrevious", page.hasPrevious());
        if (page instanceof TraceListPageDto nativePage && nativePage.getQuery() != null) {
            result.put("query", nativePage.getQuery());
            result.put("partial", page.hasNext() || page.hasPrevious()
                    || !"window".equals(nativePage.getQuery().coverage())
                    || Boolean.TRUE.equals(nativePage.getQuery().truncated()));
        } else {
            result.put("coverage", "unspecified");
            result.put("partial", true);
        }
        result.put("content", page.getContent());
        return projected(result);
    }

    /** Preserve native evidence fields while bounding every collection, string, depth and total display size. */
    private Map<String, Object> projected(Object value) {
        Map<String, Object> raw = PROJECTION_MAPPER.convertValue(value, new TypeReference<>() { });
        ProjectionBudget budget = new ProjectionBudget();
        Map<String, Object> result = projectMap(raw, budget, 0);
        result.put("partial", budget.partial || Boolean.TRUE.equals(result.get("partial")));
        result.put("outputTruncated", budget.truncated);
        return result;
    }

    private Map<String, Object> projectMap(Map<?, ?> values, ProjectionBudget budget, int depth) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (values.get("content") instanceof List<?> rows && values.get("totalElements") instanceof Number total
                && total.longValue() > rows.size()) {
            budget.partial = true;
        }
        int count = 0;
        for (Map.Entry<?, ?> entry : values.entrySet()) {
            if (count++ >= 200 || budget.remainingNodes <= 0 || budget.remainingCharacters <= 0) {
                budget.truncated = true;
                break;
            }
            String key = String.valueOf(entry.getKey());
            if ((key.equals("partial") || key.endsWith("Truncated") || key.equals("truncated"))
                    && Boolean.TRUE.equals(entry.getValue())
                    || key.equals("mode") && "bounded".equals(entry.getValue())
                    || key.equals("state") && "unavailable".equals(entry.getValue())) {
                budget.partial = true;
            }
            String safeKey = safe(key, Math.min(256, budget.remainingCharacters));
            budget.remainingCharacters -= safeKey.length();
            if (key.length() > 256) {
                budget.truncated = true;
            }
            // Check the original key without copying or redacting an unbounded child collection.
            boolean secret = GatewaySecretRedactor.REDACTED.equals(
                    GatewaySecretRedactor.redactMap(Map.of(key, "value")).get(key));
            result.put(safeKey, projectValue(secret ? GatewaySecretRedactor.REDACTED : entry.getValue(), budget, depth + 1));
        }
        budget.partial |= budget.truncated;
        return result;
    }

    private Object projectValue(Object value, ProjectionBudget budget, int depth) {
        if (--budget.remainingNodes < 0 || depth > 12) {
            budget.truncated = true;
            return null;
        }
        if (value instanceof Map<?, ?> map) {
            return projectMap(map, budget, depth);
        }
        if (value instanceof List<?> list) {
            List<Object> result = new ArrayList<>();
            for (Object item : list) {
                if (result.size() >= 200 || budget.remainingNodes <= 0 || budget.remainingCharacters <= 0) {
                    budget.truncated = true;
                    break;
                }
                result.add(projectValue(item, budget, depth + 1));
            }
            return result;
        }
        if (value instanceof String text) {
            int maximum = Math.max(0, Math.min(2048, budget.remainingCharacters));
            budget.truncated |= text.length() > maximum;
            String sanitized = safe(text, maximum);
            budget.remainingCharacters -= sanitized.length();
            return sanitized;
        }
        return value;
    }

    private static final class ProjectionBudget {
        private int remainingNodes = 4_000;
        private int remainingCharacters = 32_000;
        private boolean partial;
        private boolean truncated;
    }

    private Map<String, Object> traceRow(TraceListItemDto trace) {
        Map<String, Object> row = new LinkedHashMap<>();
        put(row, "traceId", trace.getTraceId());
        put(row, "rootSpanId", trace.getRootSpanId());
        put(row, "serviceName", safe(trace.getServiceName(), 256));
        put(row, "serviceNamespace", safe(trace.getServiceNamespace(), 256));
        put(row, "rootSpanName", safe(trace.getRootSpanName(), 512));
        put(row, "durationNanos", trace.getDurationNanos());
        put(row, "status", trace.getStatus());
        put(row, "startTime", trace.getStartTime());
        row.put("errorSpanCount", trace.getErrorSpanCount());
        row.put("resourceAttributes", trace.getResourceAttributes() == null ? null : redact(trace.getResourceAttributes()));
        row.put("rootState", trace.getRootState());
        row.put("rootSpanCount", trace.getRootSpanCount());
        if (trace.getRepresentativeSpan() == null) {
            row.put("representativeSpan", null);
        } else {
            var span = trace.getRepresentativeSpan();
            Map<String, Object> representative = new LinkedHashMap<>();
            representative.put("spanId", span.spanId());
            representative.put("spanName", safe(span.spanName(), 512));
            representative.put("serviceName", safe(span.serviceName(), 256));
            representative.put("serviceNamespace", safe(span.serviceNamespace(), 256));
            representative.put("startTime", span.startTime());
            representative.put("durationNanos", span.durationNanos());
            row.put("representativeSpan", representative);
        }
        row.put("observedStartTime", trace.getObservedStartTime());
        row.put("observedEndTime", trace.getObservedEndTime());
        row.put("spanCount", trace.getSpanCount());
        row.put("unattributedServiceStats", trace.getUnattributedServiceStats());
        return row;
    }

    private Map<String, Object> traceRow(TraceDetailDto trace) {
        Map<String, Object> row = new LinkedHashMap<>();
        put(row, "traceId", trace.getTraceId());
        put(row, "rootSpanId", trace.getRootSpanId());
        put(row, "serviceName", safe(trace.getServiceName(), 256));
        put(row, "serviceNamespace", safe(trace.getServiceNamespace(), 256));
        put(row, "rootSpanName", safe(trace.getRootSpanName(), 512));
        put(row, "durationNanos", trace.getDurationNanos());
        put(row, "status", trace.getStatus());
        put(row, "startTime", trace.getStartTime());
        row.put("errorSpanCount", trace.getErrorSpanCount());
        row.put("resourceAttributes", trace.getResourceAttributes() == null ? null : redact(trace.getResourceAttributes()));
        return row;
    }

    private Map<String, Object> spanRow(TraceSpanNodeDto span) {
        Map<String, Object> row = new LinkedHashMap<>();
        put(row, "traceId", span.getTraceId());
        put(row, "spanId", span.getSpanId());
        put(row, "parentSpanId", span.getParentSpanId());
        put(row, "spanName", safe(span.getSpanName(), 512));
        put(row, "serviceName", safe(span.getServiceName(), 256));
        put(row, "status", span.getStatus());
        put(row, "spanKind", span.getSpanKind());
        put(row, "statusMessage", safe(span.getStatusMessage(), 1024));
        put(row, "durationNanos", span.getDurationNanos());
        put(row, "startTime", span.getStartTime());
        row.put("resourceAttributes", redact(span.getResourceAttributes()));
        row.put("spanAttributes", redact(span.getSpanAttributes()));
        return row;
    }

    private Map<String, Object> redact(Map<String, String> values) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        return GatewaySecretRedactor.redactMap(new LinkedHashMap<>(values));
    }

    private long[] range(Long start, Long end) {
        long resolvedEnd = end == null ? System.currentTimeMillis() : end;
        long resolvedStart = start == null ? resolvedEnd - Duration.ofHours(1).toMillis() : start;
        validateRange(resolvedStart, resolvedEnd);
        return new long[] {resolvedStart, resolvedEnd};
    }

    private void validateOptionalRange(Long start, Long end) {
        if (start != null && end != null) {
            validateRange(start, end);
        }
    }

    private void validateRange(long start, long end) {
        if (start < 0 || end <= start || end - start > MAX_RANGE_MILLIS) {
            throw new IllegalArgumentException("Trace time range must be positive, ordered, and no longer than 7 days");
        }
    }

    private void validateDurationRange(Long minimum, Long maximum) {
        if (minimum != null && minimum < 0 || maximum != null && maximum < 0
                || minimum != null && maximum != null && minimum > maximum) {
            throw new IllegalArgumentException("Trace duration range must be positive and ordered");
        }
    }

    private String workspaceId() {
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        if (!StringUtils.hasText(workspaceId)) {
            throw new CommonException("trace_workspace_unavailable");
        }
        return AuthTokenScopes.normalizeWorkspaceId(workspaceId);
    }

    private String safe(String value, int maxLength) {
        return value == null ? null : AgentRuntimeTextSanitizer.sanitizeAndLimit(value, maxLength);
    }

    private void put(Map<String, Object> target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }
}
