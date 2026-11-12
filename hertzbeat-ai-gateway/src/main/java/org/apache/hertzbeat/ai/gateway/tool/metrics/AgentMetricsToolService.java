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

package org.apache.hertzbeat.ai.gateway.tool.metrics;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.manager.controller.MetricsController;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolArguments;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.common.entity.dto.MetricsData;
import org.apache.hertzbeat.common.entity.dto.MetricsHistoryData;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.metric.MonitorMetricQueryContract;
import org.apache.hertzbeat.warehouse.service.MetricsDataService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.ObjectProvider;
import org.apache.hertzbeat.observability.ingestion.controller.OtlpIngestionController;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.common.util.JsonUtil;

/**
 * Metrics namespace tools.
 */
@Service
public class AgentMetricsToolService {

    private static final String DEFAULT_RAW_HISTORY = "6h";
    private static final String DEFAULT_INTERVAL_HISTORY = "24h";
    private static final long MAX_RAW_HISTORY_SECONDS = 6L * 60 * 60;
    private static final long MAX_INTERVAL_HISTORY_SECONDS = 7L * 24 * 60 * 60;
    private static final int DEFAULT_HISTORY_MAX_POINTS = 300;
    private static final int MAX_HISTORY_MAX_POINTS = 300;
    private static final long MAX_EXACT_RAW_MILLIS = 6L * 60 * 60 * 1_000;
    private static final String STEP_PATTERN = "^[1-9][0-9]*(ms|s|m|h|d)$";

    private OtlpIngestionController otlpController;
    private MetricsController metricsController;

    private final AppService appService;
    private final MonitorService monitorService;
    private final MetricsDataService metricsDataService;

    public AgentMetricsToolService(AppService appService, MonitorService monitorService,
                                   MetricsDataService metricsDataService) {
        this.appService = appService;
        this.monitorService = monitorService;
        this.metricsDataService = metricsDataService;
    }

    public AgentMetricsToolService(AppService appService, MonitorService monitorService,
                                   MetricsDataService metricsDataService,
                                   ObjectProvider<OtlpIngestionController> otlpController) {
        this(appService, monitorService, metricsDataService);
        this.otlpController = otlpController.getIfAvailable();
    }

    @Autowired
    public AgentMetricsToolService(AppService appService, MonitorService monitorService,
                                   MetricsDataService metricsDataService,
                                   ObjectProvider<OtlpIngestionController> otlpController,
                                   ObjectProvider<MetricsController> metricsController) {
        this(appService, monitorService, metricsDataService, otlpController);
        this.metricsController = metricsController.getIfAvailable();
    }

    @Tool(name = "platform.metrics.get_metrics_info", description = "Read bounded internal HertzBeat queue metrics; admin only.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> platformMetricsInfo() {
        AgentToolContextSupport.invocation();
        if (metricsController == null) {
            throw new IllegalStateException("platform_metrics_unavailable");
        }
        return otlpResult(metricsController.getMetricsInfo().getBody());
    }

    @Tool(name = "telemetry.overview", description = "Read native OTLP overview samples from the last 24 hours; not exhaustive signal counts or setup proof.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> otlpOverview() {
        requireOtlpController();
        return AgentTelemetryReadOutput.bound("telemetry.overview",
                otlpResult(otlpController.overview().getBody()), Map.of());
    }

    @Tool(name = "telemetry.bindings", description = "Read trusted-workspace OTLP binding samples from the last 24 hours; not an exhaustive entity inventory.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> otlpBindings() {
        requireOtlpController();
        return AgentTelemetryReadOutput.bound("telemetry.bindings",
                otlpResult(otlpController.bindings().getBody()), Map.of());
    }

    @Tool(name = "telemetry.guide", description = "Get product OTLP integration examples with host placeholders; does not ingest data or create credentials.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> otlpGuide() {
        requireOtlpController();
        return otlpResult(otlpController.guide(null).getBody());
    }

    @Tool(name = "telemetry.intake_red_summary", description = "Read trusted-workspace intake RED from at most 256 native audit events in the requested time range. "
            + "Rates are native sampled rates, not exhaustive totals.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> otlpIntakeRedSummary(
            @ToolParam(description = "Start epoch milliseconds.") long start,
            @ToolParam(description = "End epoch milliseconds, at most 7 days after start.") long end) {
        requireOtlpController();
        if (start < 0 || end <= start || end - start > java.time.Duration.ofDays(7).toMillis()) {
            throw new IllegalArgumentException("Intake range must be ordered and at most 7 days");
        }
        return AgentTelemetryReadOutput.bound("telemetry.intake_red_summary",
                otlpResult(otlpController.intakeRedSummary(start, end).getBody()), Map.of("start", start, "end", end));
    }

    @Tool(name = "metrics.otlp_console", description = "Query the OTLP metrics console using the product metrics query grammar.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> otlpConsole(
            @ToolParam(description = "Bounded product OTLP query parameters; no workspace override.") AgentOtlpMetricQuery q) {
        requireOtlp(q);
        q.validateOperation("console");
        return otlpResult(otlpController.metricsConsole(
                q.entityId(), q.entityType(), q.start(), q.end(), q.serviceName(), q.serviceNamespace(), q.environment(), q.collectorId(),
                q.instance(), q.endpoint(), q.query(), q.filter(), q.groupBy(), q.aggregation(), q.temporalAggregation(), q.step(),
                q.limit(), q.operationName()).getBody());
    }

    @Tool(name = "metrics.otlp_inventory", description = "Discover OTLP metric names in the submitted workspace scope.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> otlpInventory(
            @ToolParam(description = "Bounded product OTLP query parameters; no workspace override.") AgentOtlpMetricQuery q) {
        requireOtlp(q);
        q.validateOperation("inventory");
        return otlpResult(otlpController.metricsInventory(
                q.entityId(), q.entityType(), q.start(), q.end(), q.serviceName(), q.serviceNamespace(), q.environment(), q.collectorId(),
                q.instance(), q.endpoint(), q.search(), q.limit()).getBody());
    }

    @Tool(name = "metrics.otlp_labels", description = "Discover bounded OTLP metric labels in the submitted scope.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> otlpLabels(
            @ToolParam(description = "Bounded product OTLP query parameters; no workspace override.") AgentOtlpMetricQuery q) {
        requireOtlp(q);
        q.validateOperation("labels");
        return otlpResult(otlpController.metricLabels(
                q.entityId() == null ? null : q.entityId().toString(), q.entityType(), q.start().toString(), q.end().toString(),
                q.serviceName(), q.serviceNamespace(), q.environment(), q.collectorId(), q.instance(), q.endpoint(), q.query(), q.filter(),
                q.label(), q.limit(), q.operationName()).getBody());
    }

    @Tool(name = "metrics.otlp_related", description = "Discover related OTLP metrics; distinct from monitor app hierarchy.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> otlpRelated(
            @ToolParam(description = "Bounded product OTLP query parameters; no workspace override.") AgentOtlpMetricQuery q) {
        requireOtlp(q);
        q.validateOperation("related");
        return otlpResult(otlpController.relatedMetrics(
                q.entityId(), q.entityType(), q.start(), q.end(), q.serviceName(), q.serviceNamespace(), q.environment(), q.filter(), q.operationName(), q.limit()).getBody());
    }

    private void requireOtlp(AgentOtlpMetricQuery query) {
        if (query == null) {
            throw new IllegalArgumentException("query is required");
        }
        query.validate();
        requireOtlpController();
    }

    private void requireOtlpController() {
        if (AuthTokenRequestContext.currentWorkspaceId() == null
                || AuthTokenRequestContext.currentWorkspaceId().isBlank()) {
            throw new IllegalArgumentException("metrics_workspace_unavailable");
        }
        String invocationWorkspace = AgentToolContextSupport.invocation().getRequest().getWorkspaceId();
        if (!invocationWorkspace.equals(org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes
                .normalizeWorkspaceId(AuthTokenRequestContext.currentWorkspaceId()))) {
            throw new IllegalArgumentException("metrics_workspace_context_mismatch");
        }
        if (otlpController == null) {
            throw new IllegalStateException("otlp_metrics_service_unavailable");
        }
    }

    private Map<String, Object> otlpResult(Object value) {
        String json = JsonUtil.toJson(value);
        if (json == null) {
            throw new IllegalStateException("signal_response_unavailable");
        }
        // Preserve structured secret-key detection before text fallback and response truncation.
        Map<String, Object> envelope = new LinkedHashMap<>();
        Object parsed = JsonUtil.fromJson(json, Object.class);
        if (parsed == null) {
            throw new IllegalStateException("signal_safe_projection_unavailable");
        }
        envelope.put("value", parsed);
        String redactedJson = JsonUtil.toJson(AgentTelemetryReadOutput.sanitizeStrings(
                GatewaySecretRedactor.redactMap(envelope).get("value")));
        if (redactedJson == null) {
            throw new IllegalStateException("signal_safe_projection_unavailable");
        }
        String safe = redactedJson;
        boolean truncated = safe.length() > 24000;
        boolean backendPartial = hasPartial(JsonUtil.fromJson(json));
        return Map.of("data", truncated ? safe.substring(0, 24000) : safe,
                "partial", truncated || backendPartial, "projectionTruncated", truncated,
                "format", "json_text", "maxCharacters", 24000);
    }

    private boolean hasPartial(tools.jackson.databind.JsonNode node) {
        if (node == null) { return false; }
        if (node.isObject() && (node.path("partial").asBoolean(false)
                || node.path("truncated").asBoolean(false) || node.path("hasMore").asBoolean(false))) {
            return true;
        }
        if (node.isObject() && node.path("content").isArray()
                && (node.path("totalElements").asLong(0) > node.path("content").size()
                    || node.path("pageIndex").asInt(0) > 0)) {
            return true;
        }
        if (node.isArray() || node.isObject()) {
            for (var child : node) {
                if (hasPartial(child)) { return true; }
            }
        }
        return false;
    }

    @Tool(name = "metrics.realtime",
        description = "Get realtime metrics for a monitor.")
    @AgentToolPolicy
    public Map<String, Object> metricsRealtime(
        @ToolParam(description = "Monitor id.")
        Long monitorId,
        @ToolParam(description = "Metrics name to query.")
        String metrics) {
        Long resolvedMonitorId = monitorId;
        if (resolvedMonitorId == null) {
            throw new IllegalArgumentException("metrics.realtime requires monitorId");
        }
        String resolvedMetrics = required(metrics, "metrics");
        MetricsData data = metricsDataService.getMetricsData(resolvedMonitorId, resolvedMetrics);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("monitorId", resolvedMonitorId);
        result.put("app", data == null ? null : data.getApp());
        result.put("metrics", data == null || data.getMetrics() == null ? resolvedMetrics : data.getMetrics());
        result.put("time", data == null ? null : data.getTime());
        result.put("fields", data == null || data.getFields() == null ? List.of() : data.getFields());
        result.put("valueRows", data == null || data.getValueRows() == null ? List.of() : data.getValueRows());
        result.put("rowCount", data == null || data.getValueRows() == null ? 0 : data.getValueRows().size());
        return result;
    }

    @Tool(name = "metrics.history",
        description = "Get bounded historical metrics. Relative raw windows are limited to 6h and relative interval "
            + "windows to 1w; exact target-bound windows return at most 300 sampled points.")
    @AgentToolPolicy
    public Map<String, Object> metricsHistory(
        @ToolParam(required = false, description = "Monitor instance label for a relative query.")
        String instance,
        @ToolParam(required = false, description = "Application type for a relative query.")
        String app,
        @ToolParam(required = false, description = "Metrics group for a relative query.")
        String metrics,
        @ToolParam(required = false, description = "Metric field name required for a relative query.")
        String fieldParameter,
        @ToolParam(required = false, description = "History window such as 6h, 1d, or 1w.")
        String history,
        @ToolParam(required = false, description = "Whether to query interval data, default true.")
        Boolean interval,
        @ToolParam(required = false, description = "Maximum returned points, bounded to 1..300.")
        Integer maxPoints,
        @ToolParam(required = false, description = "Monitor id for an exact target-bound query.")
        Long monitorId,
        @ToolParam(required = false, description = "Exact metric key in group.field form.")
        String metricKey,
        @ToolParam(required = false, description = "Exact inclusive query start in epoch milliseconds.")
        Long start,
        @ToolParam(required = false, description = "Exact exclusive query end in epoch milliseconds.")
        Long end,
        @ToolParam(required = false, description = "Optional exact query step such as 60s.")
        String step) {
        if (monitorId != null || metricKey != null || start != null || end != null || step != null) {
            if (instance != null || app != null || metrics != null || fieldParameter != null || history != null) {
                throw new IllegalArgumentException("Do not mix metrics.history modes: exact requires "
                        + "monitorId, metricKey, start, end; relative requires instance, app, metrics, fieldParameter "
                        + "with optional history, and no exact fields.");
            }
            return exactMetricsHistory(monitorId, metricKey, start, end, step, interval, maxPoints);
        }
        String resolvedInstance = required(instance, "instance");
        String resolvedApp = required(app, "app");
        String resolvedMetrics = required(metrics, "metrics");
        String resolvedField = required(fieldParameter, "fieldParameter");
        Boolean resolvedInterval = interval == null ? Boolean.TRUE : interval;
        String boundedHistory = boundedHistory(history, resolvedInterval);
        int resolvedMaxPoints = historyMaxPoints(maxPoints);
        MetricsHistoryData data = metricsDataService.getMetricHistoryData(resolvedInstance, resolvedApp, resolvedMetrics,
            resolvedField, boundedHistory, resolvedInterval);
        return boundedHistoricalMetrics(data, resolvedInstance, resolvedApp, resolvedMetrics, boundedHistory,
            resolvedInterval, resolvedMaxPoints);
    }

    /** Compatibility seam for internal callers of the original relative-window tool method. */
    public Map<String, Object> metricsHistory(String instance, String app, String metrics, String fieldParameter,
                                              String history, Boolean interval, Integer maxPoints) {
        return metricsHistory(instance, app, metrics, fieldParameter, history, interval, maxPoints,
                null, null, null, null, null);
    }

    private Map<String, Object> exactMetricsHistory(Long monitorId, String metricKey, Long start, Long end,
                                                    String step, Boolean interval, Integer maxPoints) {
        if (monitorId == null || monitorId <= 0) {
            throw new IllegalArgumentException("metrics.history exact query requires monitorId");
        }
        String resolvedMetricKey = required(metricKey, "metricKey");
        if (start == null || end == null) {
            throw new IllegalArgumentException("metrics.history exact query requires start and end in epoch milliseconds; "
                    + "relative queries use instance, app, metrics and optional history without exact fields");
        }
        long duration = MonitorMetricQueryContract.exactDurationMillis(start, end);
        if (duration < 0) {
            throw new IllegalArgumentException("metrics.history exact query requires start < end");
        }
        if (duration > MonitorMetricQueryContract.MAX_EXACT_DURATION_MILLIS) {
            throw new IllegalArgumentException("metrics.history exact query must be <= 12w");
        }
        String resolvedStep = AgentToolArguments.firstNonBlank(step);
        if (resolvedStep != null && !resolvedStep.matches(STEP_PATTERN)) {
            throw new IllegalArgumentException("step must use a positive duration such as 60s or 5m");
        }
        int separator = resolvedMetricKey.indexOf('.');
        if (separator <= 0 || separator == resolvedMetricKey.length() - 1) {
            throw new IllegalArgumentException("metricKey must use group.field form");
        }
        var monitorDto = monitorService.getMonitorDto(monitorId);
        Monitor monitor = monitorDto == null ? null : monitorDto.getMonitor();
        if (monitor == null) {
            throw new IllegalArgumentException("Monitor is unavailable");
        }
        String resolvedApp = MonitorMetricQueryContract.historyApp(monitor);
        String resolvedMetrics = resolvedMetricKey.substring(0, separator);
        String resolvedField = resolvedMetricKey.substring(separator + 1);
        Boolean resolvedInterval = duration > MAX_EXACT_RAW_MILLIS
                ? Boolean.TRUE : interval == null ? Boolean.TRUE : interval;
        int resolvedMaxPoints = historyMaxPoints(maxPoints);
        String queryStep = Boolean.TRUE.equals(resolvedInterval)
                ? intervalStep(duration, resolvedMaxPoints) : null;
        String exactHistory = Math.max(1, (duration + 999) / 1_000) + "s";
        MetricsHistoryData data = metricsDataService.getMetricHistoryData(monitor.getInstance(), resolvedApp,
                resolvedMetrics, resolvedField, exactHistory, resolvedInterval, start, end,
                queryStep);
        MetricsHistoryData exactData = filterExactWindow(data, start, end);
        Map<String, Object> result = boundedHistoricalMetrics(exactData, monitor.getInstance(), resolvedApp,
                resolvedMetrics, exactHistory, resolvedInterval, resolvedMaxPoints);
        result.put("monitorId", monitorId);
        result.put("metricKey", resolvedMetricKey);
        result.put("start", start);
        result.put("end", end);
        return result;
    }

    private String intervalStep(long durationMillis, int maxPoints) {
        long stepMillis = durationMillis / maxPoints;
        if (durationMillis % maxPoints != 0) {
            stepMillis++;
        }
        if (stepMillis < 1_000) {
            return Math.max(1, stepMillis) + "ms";
        }
        long stepSeconds = stepMillis / 1_000;
        if (stepMillis % 1_000 != 0) {
            stepSeconds++;
        }
        return stepSeconds + "s";
    }

    private MetricsHistoryData filterExactWindow(MetricsHistoryData data, long start, long end) {
        if (data == null) {
            return null;
        }
        Map<String, List<Value>> filtered = new LinkedHashMap<>();
        if (data.getValues() != null) {
            data.getValues().forEach((labels, values) -> filtered.put(labels,
                    values == null ? List.of() : values.stream()
                            .filter(value -> value != null && value.getTime() != null
                                    && value.getTime() >= start && value.getTime() < end)
                            .toList()));
        }
        return MetricsHistoryData.builder()
                .instance(data.getInstance())
                .app(data.getApp())
                .metrics(data.getMetrics())
                .field(data.getField())
                .values(filtered)
                .build();
    }

    @Tool(name = "metrics.related",
        description = "Get related app and metrics hierarchy.")
    @AgentToolPolicy(
        exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Object metricsRelated(
        @ToolParam(required = false, description = "Application type. Omit to list all app hierarchies.")
        String app,
        @ToolParam(required = false, description = "Language tag, default en-US.")
        String language) {
        String resolvedApp = AgentHierarchyReadOutput.application(app);
        String resolvedLanguage = AgentHierarchyReadOutput.language(language);
        Object result = resolvedApp.isEmpty()
            ? appService.getAllAppHierarchy(resolvedLanguage)
            : appService.getAppHierarchy(resolvedApp, resolvedLanguage);
        return AgentHierarchyReadOutput.view(resolvedApp, resolvedLanguage, result);
    }

    @Tool(name = "metrics.warehouse_status",
        description = "Get metrics warehouse status.")
    @AgentToolPolicy(
        exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> metricsWarehouseStatus() {
        return Map.of("online", metricsDataService.getWarehouseStorageServerStatus());
    }

    private Map<String, Object> boundedHistoricalMetrics(MetricsHistoryData data, String instance, String app,
                                                          String metrics, String history, Boolean interval,
                                                          int maxPoints) {
        BoundedHistoryProjection projection = data == null
            ? BoundedHistoryProjection.empty()
            : projectHistoryValues(data.getValues(), maxPoints);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("instance", data == null || data.getInstance() == null ? instance : data.getInstance());
        result.put("app", data == null || data.getApp() == null ? app : data.getApp());
        result.put("metrics", data == null || data.getMetrics() == null ? metrics : data.getMetrics());
        result.put("field", data == null ? null : data.getField());
        result.put("history", history);
        result.put("interval", Boolean.TRUE.equals(interval));
        result.put("maxPoints", maxPoints);
        result.put("returnedPoints", projection.returnedPoints());
        result.put("totalPoints", projection.totalPoints());
        result.put("values", projection.values());
        return result;
    }

    private BoundedHistoryProjection projectHistoryValues(Map<String, List<Value>> source, int maxPoints) {
        if (source == null || source.isEmpty()) {
            return BoundedHistoryProjection.empty();
        }
        long totalPoints = 0;
        List<HistorySeries> nonEmptySeries = new ArrayList<>();
        for (Map.Entry<String, List<Value>> entry : source.entrySet()) {
            List<Value> values = entry.getValue();
            if (values != null && !values.isEmpty()) {
                nonEmptySeries.add(new HistorySeries(entry.getKey(), values));
                totalPoints += values.size();
            }
        }
        if (totalPoints == 0) {
            return new BoundedHistoryProjection(emptyHistoryValues(source), 0, 0);
        }
        int[] budgets = allocateHistoryBudgets(nonEmptySeries, maxPoints, totalPoints);
        Map<String, List<Map<String, Object>>> boundedValues = new LinkedHashMap<>();
        int seriesIndex = 0;
        int returnedPoints = 0;
        for (Map.Entry<String, List<Value>> entry : source.entrySet()) {
            List<Value> values = entry.getValue();
            if (values == null || values.isEmpty()) {
                boundedValues.put(entry.getKey(), List.of());
                continue;
            }
            List<Map<String, Object>> sampledValues = sampleHistoryValues(values, budgets[seriesIndex++]);
            boundedValues.put(entry.getKey(), sampledValues);
            returnedPoints += sampledValues.size();
        }
        return new BoundedHistoryProjection(boundedValues, totalPoints, returnedPoints);
    }

    private Map<String, List<Map<String, Object>>> emptyHistoryValues(Map<String, List<Value>> source) {
        Map<String, List<Map<String, Object>>> values = new LinkedHashMap<>();
        for (String key : source.keySet()) {
            values.put(key, List.of());
        }
        return values;
    }

    private int[] allocateHistoryBudgets(List<HistorySeries> series, int maxPoints, long totalPoints) {
        int[] budgets = new int[series.size()];
        int remaining = maxPoints;
        if (maxPoints >= series.size()) {
            for (int i = 0; i < series.size(); i++) {
                int reservedForRemainingSeries = series.size() - i - 1;
                int proportional = (int) Math.max(1, series.get(i).values().size() * (long) maxPoints / totalPoints);
                int budget = Math.min(proportional, remaining - reservedForRemainingSeries);
                budget = Math.min(budget, series.get(i).values().size());
                budgets[i] = Math.max(0, budget);
                remaining -= budgets[i];
            }
        }
        while (remaining > 0) {
            boolean allocated = false;
            for (int i = 0; i < series.size() && remaining > 0; i++) {
                if (budgets[i] < series.get(i).values().size()) {
                    budgets[i]++;
                    remaining--;
                    allocated = true;
                }
            }
            if (!allocated) {
                break;
            }
        }
        return budgets;
    }

    private List<Map<String, Object>> sampleHistoryValues(List<Value> values, int maxPoints) {
        if (values == null || values.isEmpty() || maxPoints <= 0) {
            return List.of();
        }
        if (values.size() <= maxPoints) {
            return values.stream().map(this::historyValueRow).toList();
        }
        if (maxPoints == 1) {
            return List.of(historyValueRow(values.get(values.size() - 1)));
        }
        List<Map<String, Object>> sampled = new ArrayList<>(maxPoints);
        double step = (double) (values.size() - 1) / (maxPoints - 1);
        for (int i = 0; i < maxPoints; i++) {
            int index = (int) Math.round(i * step);
            sampled.add(historyValueRow(values.get(index)));
        }
        return sampled;
    }

    private Map<String, Object> historyValueRow(Value value) {
        Map<String, Object> row = new LinkedHashMap<>();
        if (value == null) {
            return row;
        }
        if (value.getTime() != null) {
            row.put("time", value.getTime());
        }
        putIfPresent(row, "origin", value.getOrigin());
        putIfPresent(row, "mean", value.getMean());
        putIfPresent(row, "median", value.getMedian());
        putIfPresent(row, "min", value.getMin());
        putIfPresent(row, "max", value.getMax());
        return row;
    }

    private void putIfPresent(Map<String, Object> row, String key, String value) {
        if (value != null) {
            row.put(key, value);
        }
    }

    private String required(String value, String name) {
        String normalized = AgentToolArguments.firstNonBlank(value);
        if (normalized == null) {
            throw new IllegalArgumentException("Tool argument '" + name + "' is required");
        }
        return normalized;
    }

    private String boundedHistory(String history, Boolean interval) {
        String resolvedHistory = AgentToolArguments.firstNonBlank(history,
            Boolean.TRUE.equals(interval) ? DEFAULT_INTERVAL_HISTORY : DEFAULT_RAW_HISTORY);
        long seconds = parseHistorySeconds(resolvedHistory);
        long maxSeconds = Boolean.TRUE.equals(interval) ? MAX_INTERVAL_HISTORY_SECONDS : MAX_RAW_HISTORY_SECONDS;
        if (seconds > maxSeconds) {
            String maxWindow = Boolean.TRUE.equals(interval) ? "1w" : "6h";
            throw new IllegalArgumentException("history must be <= " + maxWindow);
        }
        return seconds + "s";
    }

    private int historyMaxPoints(Integer maxPoints) {
        return maxPoints == null
            ? DEFAULT_HISTORY_MAX_POINTS
            : AgentToolContextSupport.bound(maxPoints, 1, MAX_HISTORY_MAX_POINTS);
    }

    private long parseHistorySeconds(String history) {
        if (GatewayText.isBlank(history) || history.length() < 2) {
            throw new IllegalArgumentException("history must use a positive duration such as 6h, 1d, or 1w");
        }
        String amountText = history.substring(0, history.length() - 1);
        char unit = history.charAt(history.length() - 1);
        if (!amountText.chars().allMatch(Character::isDigit)) {
            throw new IllegalArgumentException("history must use a positive duration such as 6h, 1d, or 1w");
        }
        long amount = Long.parseLong(amountText);
        if (amount < 1) {
            throw new IllegalArgumentException("history must be positive");
        }
        try {
            return switch (unit) {
                case 's', 'S' -> amount;
                case 'M', 'm' -> Math.multiplyExact(amount, 60);
                case 'h', 'H' -> Math.multiplyExact(amount, 60 * 60);
                case 'd', 'D' -> Math.multiplyExact(amount, 24 * 60 * 60);
                case 'w', 'W' -> Math.multiplyExact(amount, 7 * 24 * 60 * 60);
                default -> throw new IllegalArgumentException("history unit must be one of s, m, h, d, or w");
            };
        } catch (ArithmeticException exception) {
            throw new IllegalArgumentException("history is too large", exception);
        }
    }

    private record HistorySeries(String key, List<Value> values) {
    }

    private record BoundedHistoryProjection(Map<String, List<Map<String, Object>>> values, long totalPoints,
                                            int returnedPoints) {
        private static BoundedHistoryProjection empty() {
            return new BoundedHistoryProjection(Map.of(), 0, 0);
        }
    }
}
