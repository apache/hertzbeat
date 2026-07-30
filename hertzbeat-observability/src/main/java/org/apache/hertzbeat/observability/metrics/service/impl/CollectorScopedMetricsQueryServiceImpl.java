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

import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsInventoryDto;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpMetricSemanticLabels;
import org.apache.hertzbeat.observability.ingestion.service.OtlpIngestionWorkspaceService;
import org.apache.hertzbeat.observability.metrics.service.CollectorScopedMetricsQueryService;
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

    private final OtlpIngestionWorkspaceService workspaceService;

    @Override
    public OtlpMetricsConsoleDto query(Request request) {
        String collectorId = normalizeCollectorId(request.collectorId());
        TelemetryQueryContextScope queryContextScope = new TelemetryQueryContextScope(
                request.instance(), request.endpoint());
        String query = StringUtils.trimWhitespace(request.query());
        if (StringUtils.hasText(collectorId) && StringUtils.hasText(query)
                && !SIMPLE_METRIC_NAME.matcher(query).matches()) {
            return unsupportedQuery(request, collectorId, queryContextScope);
        }
        String scopedFilter = applyCollectorFilter(request.filter(), collectorId);
        queryContextScope.validateMetricFilter(scopedFilter);
        OtlpMetricsConsoleDto result = workspaceService.getMetricsConsole(
                request.entityId(), request.entityType(), request.start(), request.end(), request.serviceName(),
                request.serviceNamespace(), request.environment(), collectorId, queryContextScope.instance(),
                queryContextScope.endpoint(), request.query(), scopedFilter, request.groupBy(), request.aggregation(),
                request.temporalAggregation(), request.step(), request.limit(), request.operationName());
        if (result != null && result.getContext() != null) {
            result.getContext().setCollectorId(collectorId);
            result.getContext().setInstance(queryContextScope.instance());
            result.getContext().setEndpoint(queryContextScope.endpoint());
        }
        return result;
    }

    @Override
    public OtlpMetricsInventoryDto inventory(InventoryRequest request) {
        String collectorId = normalizeCollectorId(request.collectorId());
        TelemetryQueryContextScope queryContextScope = new TelemetryQueryContextScope(
                request.instance(), request.endpoint());
        OtlpMetricsInventoryDto result = workspaceService.getMetricsInventory(
                request.entityId(), request.entityType(), request.start(), request.end(), request.serviceName(),
                request.serviceNamespace(), request.environment(), collectorId, queryContextScope.instance(),
                queryContextScope.endpoint(), request.limit());
        if (result != null && result.getContext() != null) {
            result.getContext().setCollectorId(collectorId);
            result.getContext().setInstance(queryContextScope.instance());
            result.getContext().setEndpoint(queryContextScope.endpoint());
        }
        return result;
    }

    private String normalizeCollectorId(String collectorId) {
        String normalized = StringUtils.trimWhitespace(collectorId);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }
        if (!COLLECTOR_ID.matcher(normalized).matches()) {
            throw new IllegalArgumentException("Collector ID contains unsupported characters");
        }
        return normalized;
    }

    private String applyCollectorFilter(String filter, String collectorId) {
        String normalizedFilter = StringUtils.trimWhitespace(filter);
        if (!StringUtils.hasText(collectorId)) {
            return normalizedFilter;
        }
        if (StringUtils.hasText(normalizedFilter)
                && normalizedFilter.contains(OtlpMetricSemanticLabels.HERTZBEAT_COLLECTOR_ID)) {
            throw new IllegalArgumentException("Collector ID must use the dedicated query parameter");
        }
        return normalizedFilter;
    }

    private OtlpMetricsConsoleDto unsupportedQuery(Request request, String collectorId,
                                                   TelemetryQueryContextScope queryContextScope) {
        OtlpMetricsConsoleDto.Context context = new OtlpMetricsConsoleDto.Context(
                request.entityId(), request.entityType(), null, request.serviceName(), request.serviceNamespace(),
                request.environment(), collectorId, queryContextScope.instance(), queryContextScope.endpoint(),
                request.operationName(), request.start(), request.end());
        return new OtlpMetricsConsoleDto(
                context, request.query(), null, "promql", null,
                new OtlpMetricsConsoleDto.Stats(0, 0, null), "unsupported_query", null);
    }
}
