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
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolArguments;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.common.entity.dto.MetricsData;
import org.apache.hertzbeat.common.entity.dto.MetricsHistoryData;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.warehouse.service.MetricsDataService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

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

    private final AppService appService;
    private final MetricsDataService metricsDataService;

    public AgentMetricsToolService(AppService appService, MetricsDataService metricsDataService) {
        this.appService = appService;
        this.metricsDataService = metricsDataService;
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
        description = "Get bounded historical metrics. Raw windows are limited to 6h; interval windows are limited to 1w.")
    @AgentToolPolicy
    public Map<String, Object> metricsHistory(
        @ToolParam(description = "Monitor instance label.")
        String instance,
        @ToolParam(description = "Application type.")
        String app,
        @ToolParam(description = "Metrics name to query.")
        String metrics,
        @ToolParam(required = false, description = "Optional field parameter.")
        String fieldParameter,
        @ToolParam(required = false, description = "History window such as 6h, 1d, or 1w.")
        String history,
        @ToolParam(required = false, description = "Whether to query interval data, default true.")
        Boolean interval,
        @ToolParam(required = false, description = "Maximum returned points, bounded to 1..300.")
        Integer maxPoints) {
        String resolvedInstance = required(instance, "instance");
        String resolvedApp = required(app, "app");
        String resolvedMetrics = required(metrics, "metrics");
        Boolean resolvedInterval = interval == null ? Boolean.TRUE : interval;
        String boundedHistory = boundedHistory(history, resolvedInterval);
        int resolvedMaxPoints = historyMaxPoints(maxPoints);
        MetricsHistoryData data = metricsDataService.getMetricHistoryData(resolvedInstance, resolvedApp, resolvedMetrics,
            AgentToolArguments.firstNonBlank(fieldParameter), boundedHistory, resolvedInterval);
        return boundedHistoricalMetrics(data, resolvedInstance, resolvedApp, resolvedMetrics, boundedHistory,
            resolvedInterval, resolvedMaxPoints);
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
        String resolvedApp = AgentToolArguments.firstNonBlank(app);
        String resolvedLanguage = AgentToolArguments.firstNonBlank(language, "en-US");
        Object result = GatewayText.isBlank(resolvedApp)
            ? appService.getAllAppHierarchy(resolvedLanguage)
            : appService.getAppHierarchy(resolvedApp, resolvedLanguage);
        return result;
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
