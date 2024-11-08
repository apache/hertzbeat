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

package org.apache.hertzbeat.warehouse.controller;

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.dto.MetricsData;
import org.apache.hertzbeat.common.entity.dto.MetricsHistoryData;
import org.apache.hertzbeat.warehouse.service.MetricsDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Indicator data query interface
 */
@RestController
@RequestMapping(produces = {APPLICATION_JSON_VALUE})
@Tag(name = "Metrics Data API | The API for monitoring metric data")
public class MetricsDataController {

    private static final Integer METRIC_FULL_LENGTH = 3;

    private final MetricsDataService metricsDataService;

    public MetricsDataController(MetricsDataService metricsDataService) {
        this.metricsDataService = metricsDataService;
    }

    @GetMapping("/api/warehouse/storage/status")
    @Operation(summary = "Query Warehouse Storage Server Status", description = "Query the availability status of the storage service under the warehouse")
    public ResponseEntity<Message<Void>> getWarehouseStorageServerStatus() {
        Boolean status = metricsDataService.getWarehouseStorageServerStatus();
        if (Boolean.TRUE.equals(status)) {
            return ResponseEntity.ok(Message.success());
        }

        // historyDataReader does not exist or is not available
        return ResponseEntity.ok(Message.fail(FAIL_CODE, "Service not available!"));
    }

    @GetMapping("/api/monitor/{monitorId}/metrics/{metrics}")
    @Operation(summary = "Query Real Time Metrics Data", description = "Query real-time metrics data of monitoring indicators")
    public ResponseEntity<Message<MetricsData>> getMetricsData(
            @Parameter(description = "Monitor Id", example = "343254354")
            @PathVariable Long monitorId,
            @Parameter(description = "Metrics Name", example = "cpu")
            @PathVariable String metrics) {
        MetricsData metricsData = metricsDataService.getMetricsData(monitorId, metrics);
        if (metricsData == null){
            return ResponseEntity.ok(Message.success("query metrics data is empty"));
        }
        return ResponseEntity.ok(Message.success(metricsData));
    }

    @GetMapping("/api/monitor/{monitorId}/metric/{metricFull}")
    @Operation(summary = "Queries historical data for a specified metric for monitoring", description = "Queries historical data for a specified metric under monitoring")
    public ResponseEntity<Message<MetricsHistoryData>> getMetricHistoryData(
            @Parameter(description = "monitor the task ID", example = "343254354")
            @PathVariable Long monitorId,
            @Parameter(description = "monitor metric full path", example = "linux.cpu.usage")
            @PathVariable() String metricFull,
            @Parameter(description = "label filter, empty by default", example = "disk2")
            @RequestParam(required = false) String label,
            @Parameter(description = "query historical time period, default 6h-6 hours: s-seconds, M-minutes, h-hours, d-days, w-weeks", example = "6h")
            @RequestParam(required = false) String history,
            @Parameter(description = "aggregate data calc. off by default; 4-hour window, query limit >1 week", example = "false")
            @RequestParam(required = false) Boolean interval
    ) {
        if (!metricsDataService.getWarehouseStorageServerStatus()) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "time series database not available"));
        }
        String[] names = metricFull.split("\\.");
        if (names.length != METRIC_FULL_LENGTH) {
            throw new IllegalArgumentException("metrics full name: " + metricFull + " is illegal.");
        }
        String app = names[0];
        String metrics = names[1];
        String metric = names[2];
        MetricsHistoryData historyData = metricsDataService.getMetricHistoryData(monitorId, app, metrics, metric, label, history, interval);
        return ResponseEntity.ok(Message.success(historyData));
    }
}
