/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.analysis.algorithm.PredictionResult;
import org.apache.hertzbeat.analysis.service.AnalysisService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.dto.MetricsHistoryData;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.warehouse.History;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.warehouse.service.MetricsDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Analysis and Prediction Controller
 */
@Tag(name = "Analysis Prediction API")
@RestController
@RequestMapping(path = "/api/analysis")
@Slf4j
public class AnalysisController {

    @Autowired
    private MetricsDataService metricsDataService;

    @Autowired
    private AnalysisService analysisService;

    @Autowired
    private AppService appService;

    @Autowired
    private MonitorService monitorService;

    @GetMapping("/predict/{instance}/{app}/{metrics}/{metric}")
    @Operation(summary = "Predict metric data", description = "Forecast future metric data based on history")
    public Message<Map<String, List<PredictionResult>>> getMetricPrediction(
        @Parameter(description = "Monitor Instance", example = "127.0.0.1") @PathVariable String instance,
        @Parameter(description = "App Type", example = "linux") @PathVariable String app,
        @Parameter(description = "Metrics Name", example = "cpu") @PathVariable String metrics,
        @Parameter(description = "Metric Name", example = "usage") @PathVariable String metric,
        @Parameter(description = "History time range", example = "6h") @RequestParam(required = false) String history,
        @Parameter(description = "Forecast count", example = "10") @RequestParam(required = false, defaultValue = "10") Integer forecastCount
    ) {
        // 1. Context Analysis
        // We separate "User View Window" (history) from "Model Training Window" (dbQueryTime).
        // User view: what the user sees (e.g., 1h). We should predict ~20% of this length.
        // Training window: what the model needs (e.g., 3 days). We force this to be large.

        String userViewTime = history != null ? history : "6h";
        long userViewMillis = parseSimpleDuration(userViewTime);
        if (userViewMillis <= 0) {
            userViewMillis = 6 * 60 * 60 * 1000L; // default 6h
        }

        // 2. Determine Training Window (Strategy: Max(3 days, 100 * interval))
        String dbQueryTime = "6h"; // initial fallback
        try {
            List<Monitor> monitors = monitorService.getAppMonitors(app);
            if (monitors != null) {
                Optional<Monitor> monitorOpt = monitors.stream()
                    .filter(m -> instance.equals(m.getInstance()))
                    .findFirst();

                if (monitorOpt.isPresent()) {
                    Integer intervals = monitorOpt.get().getIntervals();
                    if (intervals != null && intervals > 0) {
                        long minSeconds = 259200L; // 3 days
                        long intervalBasedSeconds = intervals * 100L;
                        long finalSeconds = Math.max(minSeconds, intervalBasedSeconds);
                        dbQueryTime = finalSeconds + "s";
                        log.debug("[Predict] Training window calculated: {} for interval: {}s", dbQueryTime, intervals);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[Predict] Failed to calculate dynamic history for instance: {}, using default.", instance, e);
        }

        // 3. Validate Metric Type
        Optional<Job> jobOptional = appService.getAppDefineOption(app);
        if (jobOptional.isEmpty()) {
            return Message.fail(CommonConstants.FAIL_CODE, "Application definition not found: " + app);
        }
        Job job = jobOptional.get();

        Optional<Metrics> metricsDefineOpt = job.getMetrics().stream()
            .filter(m -> m.getName().equals(metrics))
            .findFirst();
        if (metricsDefineOpt.isEmpty()) {
            return Message.fail(CommonConstants.FAIL_CODE, "Metrics group not found: " + metrics);
        }

        Optional<Metrics.Field> fieldDefineOpt = metricsDefineOpt.get().getFields().stream()
            .filter(f -> f.getField().equals(metric))
            .findFirst();
        if (fieldDefineOpt.isEmpty()) {
            return Message.fail(CommonConstants.FAIL_CODE, "Metric field not found: " + metric);
        }

        if (fieldDefineOpt.get().getType() != CommonConstants.TYPE_NUMBER) {
            return Message.fail(CommonConstants.FAIL_CODE, "Prediction is only supported for numeric metrics.");
        }

        // 4. Get Training Data (Using the Long Window)
        MetricsHistoryData historyData = metricsDataService.getMetricHistoryData(
            instance, app, metrics, metric, dbQueryTime, false);

        if (historyData == null || historyData.getValues() == null || historyData.getValues().isEmpty()) {
            return Message.success(Collections.emptyMap());
        }

        Map<String, List<PredictionResult>> resultMap = new HashMap<>();

        // Capture effectively final variable for lambda
        final long viewWindowMillis = userViewMillis;

        // 5. Iterate and Forecast
        historyData.getValues().forEach((rowInstance, values) -> {
            if (values == null || values.size() < 10) {
                return;
            }
            List<History> validHistory = new ArrayList<>();

            for (Value v : values) {
                try {
                    if (v.getOrigin() != null && !CommonConstants.NULL_VALUE.equals(v.getOrigin())) {
                        double val = Double.parseDouble(v.getOrigin());
                        validHistory.add(History.builder()
                            .time(v.getTime())
                            .dou(val)
                            .metricType(CommonConstants.TYPE_NUMBER)
                            .build());
                    }
                } catch (NumberFormatException ignored) {}
            }

            if (validHistory.size() > 10) {
                long step = estimateStep(validHistory);

                // Smart Calculation of Forecast Count
                // Rule: Predict 1/5 of the user's current view window
                long forecastDuration = viewWindowMillis / 5;
                int dynamicCount = (int) (forecastDuration / step);

                // Bounds checking
                if (dynamicCount < 5) dynamicCount = 5; // Minimum 5 points
                if (dynamicCount > 2000) dynamicCount = 2000; // Safety cap

                log.info("[Predict] View: {}ms, Forecast: {}ms ({} steps), Step: {}ms",
                    viewWindowMillis, forecastDuration, dynamicCount, step);

                List<PredictionResult> forecast = analysisService.forecast(validHistory, step, dynamicCount);

                if (!forecast.isEmpty()) {
                    resultMap.put(rowInstance, forecast);
                }
            }
        });

        return Message.success(resultMap);
    }

    /**
     * Simple parser for standard time tokens (1h, 6h, 1d, 1w, 4w, 12w)
     */
    private long parseSimpleDuration(String timeToken) {
        if (timeToken == null) return 0;
        try {
            String lower = timeToken.toLowerCase();
            if (lower.endsWith("s")) return Long.parseLong(lower.replace("s", "")) * 1000;
            if (lower.endsWith("m")) return Long.parseLong(lower.replace("m", "")) * 60 * 1000;
            if (lower.endsWith("h")) return Long.parseLong(lower.replace("h", "")) * 3600 * 1000;
            if (lower.endsWith("d")) return Long.parseLong(lower.replace("d", "")) * 24 * 3600 * 1000;
            if (lower.endsWith("w")) return Long.parseLong(lower.replace("w", "")) * 7 * 24 * 3600 * 1000;
        } catch (NumberFormatException e) {
            return 0;
        }
        return 0;
    }

    /**
     * Estimate time step from history data (simple median)
     */
    private long estimateStep(List<History> data) {
        if (data.size() < 2) {
            return 60000L; // default 1 min
        }
        List<Long> diffs = new ArrayList<>();
        // Check first 100 points is enough for estimation
        int limit = Math.min(data.size(), 100);
        for (int i = 1; i < limit; i++) {
            long diff = data.get(i).getTime() - data.get(i - 1).getTime();
            if (diff > 0) {
                diffs.add(diff);
            }
        }
        if (diffs.isEmpty()) {
            return 60000L;
        }
        Collections.sort(diffs);
        return diffs.get(diffs.size() / 2);
    }
}
