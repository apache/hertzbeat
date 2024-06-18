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
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Field;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.dto.MetricsData;
import org.apache.hertzbeat.common.entity.dto.MetricsHistoryData;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.dto.ValueRow;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.warehouse.store.history.HistoryDataReader;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
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

    private final RealTimeDataReader realTimeDataReader;
    private final Optional<HistoryDataReader> historyDataReader;

    public MetricsDataController(RealTimeDataReader realTimeDataReader,
                                 Optional<HistoryDataReader> historyDataReader) {
        this.realTimeDataReader = realTimeDataReader;
        this.historyDataReader = historyDataReader;
    }

    @GetMapping("/api/warehouse/storage/status")
    @Operation(summary = "Query Warehouse Storage Server Status", description = "Query the availability status of the storage service under the warehouse")
    public ResponseEntity<Message<Void>> getWarehouseStorageServerStatus() {

        if (historyDataReader.isPresent() && historyDataReader.get().isServerAvailable()) {
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
        boolean available = realTimeDataReader.isServerAvailable();
        if (!available) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "real time store not available"));
        }
        CollectRep.MetricsData storageData = realTimeDataReader.getCurrentMetricsData(monitorId, metrics);
        if (storageData == null) {
            return ResponseEntity.ok(Message.success("query metrics data is empty"));
        }
        {
            MetricsData.MetricsDataBuilder dataBuilder = MetricsData.builder();
            dataBuilder.id(storageData.getId()).app(storageData.getApp()).metrics(storageData.getMetrics())
                    .time(storageData.getTime());
            List<Field> fields = storageData.getFieldsList().stream().map(tmpField ->
                            Field.builder().name(tmpField.getName())
                                    .type(Integer.valueOf(tmpField.getType()).byteValue())
                                    .label(tmpField.getLabel())
                                    .unit(tmpField.getUnit())
                                    .build())
                    .collect(Collectors.toList());
            dataBuilder.fields(fields);
            List<ValueRow> valueRows = new LinkedList<>();
            for (CollectRep.ValueRow valueRow : storageData.getValuesList()) {
                Map<String, String> labels = new HashMap<>(8);
                List<Value> values = new LinkedList<>();
                for (int i = 0; i < fields.size(); i++) {
                    Field field = fields.get(i);
                    String origin = valueRow.getColumns(i);
                    if (CommonConstants.NULL_VALUE.equals(origin)) {
                        values.add(new Value());
                    } else {
                        values.add(new Value(origin));
                        if (field.getLabel()) {
                            labels.put(field.getName(), origin);
                        }
                    }
                }
                valueRows.add(ValueRow.builder().labels(labels).values(values).build());
            }
            dataBuilder.valueRows(valueRows);
            return ResponseEntity.ok(Message.success(dataBuilder.build()));
        }
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

        if (historyDataReader.isEmpty() || !historyDataReader.get().isServerAvailable()) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "time series database not available"));
        }
        String[] names = metricFull.split("\\.");
        if (names.length != METRIC_FULL_LENGTH) {
            throw new IllegalArgumentException("metrics full name: " + metricFull + " is illegal.");
        }
        String app = names[0];
        String metrics = names[1];
        String metric = names[2];
        if (history == null) {
            history = "6h";
        }
        Map<String, List<Value>> instanceValuesMap;
        if (interval == null || !interval) {
            instanceValuesMap = historyDataReader.get().getHistoryMetricData(monitorId, app, metrics, metric, label, history);
        } else {
            instanceValuesMap = historyDataReader.get().getHistoryIntervalMetricData(monitorId, app, metrics, metric, label, history);
        }
        MetricsHistoryData historyData = MetricsHistoryData.builder()
                .id(monitorId).metrics(metrics).values(instanceValuesMap)
                .field(Field.builder().name(metric).type(CommonConstants.TYPE_NUMBER).build())
                .build();
        return ResponseEntity.ok(Message.success(historyData));
    }
}
