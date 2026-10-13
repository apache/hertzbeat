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

package org.apache.hertzbeat.observability.metrics.service.impl;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsInventoryDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricLabelsDto;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpMetricSemanticLabels;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.apache.hertzbeat.observability.ingestion.service.OtlpIngestionWorkspaceService;
import org.apache.hertzbeat.observability.metrics.service.CollectorScopedMetricsQueryService;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.observability.shared.query.TelemetryQueryContextScope;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Collector-scoped metrics query boundary. It never rewrites arbitrary PromQL.
 */
@Service
@RequiredArgsConstructor
public class CollectorScopedMetricsQueryServiceImpl implements CollectorScopedMetricsQueryService {

    private static final Pattern SIMPLE_METRIC_NAME = Pattern.compile("[A-Za-z_:][A-Za-z0-9_:]*");
    private static final Pattern COLLECTOR_ID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}");
    private static final Duration MAX_TIME_RANGE = Duration.ofDays(1);
    private static final int MAX_SERIES = 32;
    private static final int MAX_POINTS_PER_SERIES = 1_200;
    private static final int MAX_HISTOGRAM_SERIES = 64;
    private static final int MAX_TOTAL_POINTS = MAX_SERIES * MAX_POINTS_PER_SERIES;
    private static final Set<String> AGGREGATIONS = Set.of("avg", "sum", "min", "max", "count");
    private static final Set<String> TEMPORAL_AGGREGATIONS = Set.of("raw", "rate", "increase", "delta");

    private final OtlpIngestionWorkspaceService workspaceService;

    @Override
    public OtlpMetricsConsoleDto query(Request request) {
        String workspaceId = requireWorkspaceId(request.workspaceId());
        long start = requireExactTimeWindow(request.start(), request.end());
        long end = request.end();
        String collectorId = normalizeCollectorId(request.collectorId());
        TelemetryQueryContextScope queryContextScope = new TelemetryQueryContextScope(
                request.instance(), request.endpoint());
        String query = StringUtils.trimWhitespace(request.query());
        if (!StringUtils.hasText(query) || !SIMPLE_METRIC_NAME.matcher(query).matches()) {
            throw new ObservabilityQueryRequestException();
        }
        String aggregation = normalizeAllowlistedControl(request.aggregation(), "sum", AGGREGATIONS);
        String temporalAggregation = normalizeTemporalAggregation(request.temporalAggregation());
        String rollupStep = temporalAggregation.startsWith("rollup_")
                ? temporalAggregation.substring(temporalAggregation.lastIndexOf('_') + 1)
                : temporalAggregation.startsWith("nested_") ? temporalAggregation.split("_")[2] : null;
        String step = resolveEffectiveStep(start, end,
                StringUtils.hasText(request.step()) ? request.step() : rollupStep);
        if (rollupStep != null && !rollupStep.equals(step)) {
            throw new ObservabilityQueryRequestException();
        }
        int maxSeries = query.endsWith("_bucket") ? MAX_HISTOGRAM_SERIES : MAX_SERIES;
        String limit = resolveSeriesLimit(request.limit(), maxSeries);
        String scopedFilter = applyCollectorFilter(request.filter(), collectorId);
        queryContextScope.validateMetricFilter(scopedFilter);
        OtlpMetricsConsoleDto result = workspaceService.getBoundedMetricsConsole(
                workspaceId, request.entityId(), request.entityType(), start, end, request.serviceName(),
                request.serviceNamespace(), request.environment(), collectorId, queryContextScope.instance(),
                queryContextScope.endpoint(), query, scopedFilter, request.groupBy(), aggregation,
                temporalAggregation, step, limit, request.operationName());
        sanitizeAndBoundResponse(result, maxSeries);
        if (result != null && result.getContext() != null) {
            result.getContext().setCollectorId(collectorId);
            result.getContext().setInstance(queryContextScope.instance());
            result.getContext().setEndpoint(queryContextScope.endpoint());
        }
        return result;
    }

    @Override
    public OtlpMetricsInventoryDto inventory(InventoryRequest request) {
        String workspaceId = requireWorkspaceId(request.workspaceId());
        String collectorId = normalizeCollectorId(request.collectorId());
        TelemetryQueryContextScope queryContextScope = new TelemetryQueryContextScope(
                request.instance(), request.endpoint());
        OtlpMetricsInventoryDto result = workspaceService.getMetricsInventory(
                workspaceId, request.entityId(), request.entityType(), request.start(), request.end(), request.serviceName(),
                request.serviceNamespace(), request.environment(), collectorId, queryContextScope.instance(),
                queryContextScope.endpoint(), request.search(), request.limit());
        if (result != null && result.getContext() != null) {
            result.getContext().setCollectorId(collectorId);
            result.getContext().setInstance(queryContextScope.instance());
            result.getContext().setEndpoint(queryContextScope.endpoint());
        }
        return result;
    }

    @Override
    public OtlpMetricLabelsDto labels(LabelsRequest request) {
        requireExactTimeWindow(request.start(), request.end());
        String workspace = requireWorkspaceId(request.workspaceId());
        String collector = normalizeCollectorId(request.collectorId());
        var context = new TelemetryQueryContextScope(request.instance(), request.endpoint());
        String filter;
        try {
            filter = applyCollectorFilter(request.filter(), collector);
        } catch (IllegalArgumentException exception) {
            throw new ObservabilityQueryRequestException();
        }
        return workspaceService.getMetricLabels(new LabelsRequest(workspace, request.entityId(), request.entityType(),
                request.start(), request.end(), request.serviceName(), request.serviceNamespace(), request.environment(),
                collector, context.instance(), context.endpoint(), request.query(), filter, request.label(), request.limit(), request.operationName()));
    }

    private String normalizeCollectorId(String collectorId) {
        String normalized = StringUtils.trimWhitespace(collectorId);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }
        if (!COLLECTOR_ID.matcher(normalized).matches()) {
            throw new ObservabilityQueryRequestException();
        }
        return normalized;
    }

    private String applyCollectorFilter(String filter, String collectorId) {
        String normalizedFilter = StringUtils.trimWhitespace(filter);
        if (containsWorkspaceSelector(normalizedFilter)) {
            throw new IllegalArgumentException("Workspace must use the authenticated query scope");
        }
        if (!StringUtils.hasText(collectorId)) {
            return normalizedFilter;
        }
        if (StringUtils.hasText(normalizedFilter)
                && normalizedFilter.contains(OtlpMetricSemanticLabels.HERTZBEAT_COLLECTOR_ID)) {
            throw new IllegalArgumentException("Collector ID must use the dedicated query parameter");
        }
        return normalizedFilter;
    }

    private boolean containsWorkspaceSelector(String filter) {
        if (!StringUtils.hasText(filter)) {
            return false;
        }
        return filter.contains(OtlpMetricSemanticLabels.HERTZBEAT_WORKSPACE_ID)
                || OtlpResourceSemanticAttributes.HERTZBEAT_WORKSPACE_ID_KEYS.stream().anyMatch(filter::contains);
    }

    private String requireWorkspaceId(String workspaceId) {
        String normalized = StringUtils.trimWhitespace(workspaceId);
        if (!StringUtils.hasText(normalized)) {
            throw new TelemetryStorageUnavailableException();
        }
        return normalized;
    }

    private long requireExactTimeWindow(Long start, Long end) {
        if (start == null || end == null || start <= 0 || end <= start
                || end - start > MAX_TIME_RANGE.toMillis()) {
            throw new ObservabilityQueryRequestException();
        }
        return start;
    }

    private String normalizeAllowlistedControl(String value, String defaultValue, Set<String> allowedValues) {
        String normalized = StringUtils.trimWhitespace(value);
        if (!StringUtils.hasText(normalized)) {
            return defaultValue;
        }
        normalized = normalized.toLowerCase(Locale.ROOT);
        if (!allowedValues.contains(normalized)) {
            throw new ObservabilityQueryRequestException();
        }
        return normalized;
    }

    private String normalizeTemporalAggregation(String value) {
        String normalized = StringUtils.trimWhitespace(value);
        if (!StringUtils.hasText(normalized)) {
            return "raw";
        }
        normalized = normalized.toLowerCase(Locale.ROOT);
        if (TEMPORAL_AGGREGATIONS.contains(normalized)) {
            return normalized;
        }
        if (normalized.matches("nested_(avg|sum|min|max|count)_[1-9][0-9]{0,4}_after_"
                + "(avg|sum|min|max|count)_[1-9][0-9]{0,4}")) {
            String[] parts = normalized.split("_");
            long outer = Long.parseLong(parts[2]);
            long inner = Long.parseLong(parts[5]);
            if (outer > 86400 || inner > 86400 || outer <= inner) {
                throw new ObservabilityQueryRequestException();
            }
            return normalized;
        }
        if (!normalized.matches("rollup_(avg|sum|min|max|count)_[1-9][0-9]{0,4}")) {
            throw new ObservabilityQueryRequestException();
        }
        long seconds = Long.parseLong(normalized.substring(normalized.lastIndexOf('_') + 1));
        if (seconds > 86400) {
            throw new ObservabilityQueryRequestException();
        }
        return normalized;
    }

    private String resolveEffectiveStep(long start, long end, String requestedStep) {
        long minimumStepSeconds = Math.max(
                1L,
                Math.ceilDiv(end - start, 1_000L * (MAX_POINTS_PER_SERIES - 1)));
        String normalized = StringUtils.trimWhitespace(requestedStep);
        long requestedSeconds = defaultStepSeconds(end - start);
        if (StringUtils.hasText(normalized)) {
            if (!normalized.matches("[1-9]\\d*")) {
                throw new ObservabilityQueryRequestException();
            }
            try {
                requestedSeconds = Long.parseLong(normalized);
            } catch (NumberFormatException exception) {
                throw new ObservabilityQueryRequestException();
            }
            if (requestedSeconds > Duration.ofDays(1).toSeconds()) {
                throw new ObservabilityQueryRequestException();
            }
        }
        return Long.toString(Math.max(requestedSeconds, minimumStepSeconds));
    }

    private long defaultStepSeconds(long rangeMillis) {
        if (rangeMillis <= Duration.ofHours(1).toMillis()) {
            return 30L;
        }
        if (rangeMillis <= Duration.ofHours(6).toMillis()) {
            return 60L;
        }
        return 300L;
    }

    private String resolveSeriesLimit(String requestedLimit, int maxSeries) {
        String normalized = StringUtils.trimWhitespace(requestedLimit);
        if (!StringUtils.hasText(normalized)) {
            return Integer.toString(maxSeries);
        }
        if (!normalized.matches("[1-9]\\d*")) {
            throw new ObservabilityQueryRequestException();
        }
        try {
            return Integer.toString(Math.min(Integer.parseInt(normalized), maxSeries));
        } catch (NumberFormatException exception) {
            throw new ObservabilityQueryRequestException();
        }
    }

    private void sanitizeAndBoundResponse(OtlpMetricsConsoleDto result, int maxSeries) {
        if (result == null) {
            return;
        }
        result.setErrorMessage(null);
        if (result.getResults() == null) {
            return;
        }
        DatasourceQueryData results = result.getResults();
        results.setMsg(null);
        List<DatasourceQueryData.SchemaData> frames = results.getFrames();
        if (frames == null) {
            return;
        }
        long totalPoints = frames.stream().filter(java.util.Objects::nonNull)
                .filter(frame -> frame.getData() != null).mapToLong(frame -> frame.getData().size()).sum();
        if (frames.size() > maxSeries || totalPoints > MAX_TOTAL_POINTS
                || frames.stream().anyMatch(this::exceedsPointBudget)) {
            throw new TelemetryStorageUnavailableException();
        }
    }

    private boolean exceedsPointBudget(DatasourceQueryData.SchemaData frame) {
        return frame != null && frame.getData() != null && frame.getData().size() > MAX_POINTS_PER_SERIES;
    }
}
