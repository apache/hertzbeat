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
import org.apache.hertzbeat.common.entity.warehouse.History;
import org.apache.hertzbeat.manager.service.AppService;
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

    @GetMapping("/predict/{instance}/{app}/{metrics}/{metric}")
    @Operation(summary = "Predict metric data", description = "Forecast future metric data based on history")
    public Message<Map<String, List<PredictionResult>>> getMetricPrediction(
        @Parameter(description = "Monitor Instance", example = "127.0.0.1") @PathVariable String instance,
        @Parameter(description = "App Type", example = "linux") @PathVariable String app,
        @Parameter(description = "Metrics Name", example = "cpu") @PathVariable String metrics,
        @Parameter(description = "Metric Name", example = "usage") @PathVariable String metric,
        @Parameter(description = "History time range", example = "6h") @RequestParam(required = false, defaultValue = "6h") String history,
        @Parameter(description = "Forecast count", example = "10") @RequestParam(required = false, defaultValue = "10") Integer forecastCount
    ) {
        // 1. Validate Metric Type via App Definition
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

        // 2. Get History Data from Warehouse using INSTANCE directly
        MetricsHistoryData historyData = metricsDataService.getMetricHistoryData(
            instance, app, metrics, metric, history, false);

        if (historyData == null || historyData.getValues() == null || historyData.getValues().isEmpty()) {
            log.warn("[Predict] No history data found for instance: {}, metric: {}", instance, metric);
            return Message.success(Collections.emptyMap());
        }

        Map<String, List<PredictionResult>> resultMap = new HashMap<>();

        // 3. Iterate each instance and perform forecast
        historyData.getValues().forEach((rowInstance, values) -> {
            if (values == null || values.size() < 10) {
                log.warn("[Predict] Insufficient data points for row: {}. Count: {}", rowInstance, (values == null ? 0 : values.size()));
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
                } catch (NumberFormatException ignored) {
                    log.debug("Failed to parse value: {}", v.getOrigin());
                }
            }

            if (validHistory.size() > 10) {
                long step = estimateStep(validHistory);
                log.info("[Predict] Start forecasting for {}. History size: {}, Step: {}ms", rowInstance, validHistory.size(), step);

                List<PredictionResult> forecast = analysisService.forecast(validHistory, step, forecastCount);

                if (forecast.isEmpty()) {
                    log.warn("[Predict] Algorithm returned empty result for {}", rowInstance);
                } else {
                    resultMap.put(rowInstance, forecast);
                }
            } else {
                log.warn("[Predict] Valid numeric history too small after parsing: {}", validHistory.size());
            }
        });

        return Message.success(resultMap);
    }

    /**
     * Estimate time step from history data (simple median)
     */
    private long estimateStep(List<History> data) {
        if (data.size() < 2) {
            return 60000L; // default 1 min
        }
        List<Long> diffs = new ArrayList<>();
        for (int i = 1; i < data.size(); i++) {
            long diff = data.get(i).getTime() - data.get(i - 1).getTime();
            if (diff > 0) {
                diffs.add(diff);
            }
        }
        if (diffs.isEmpty()) {
            return 60000L;
        }
        Collections.sort(diffs);
        // Take median
        return diffs.get(diffs.size() / 2);
    }
}
