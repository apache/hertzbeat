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

package org.dromara.hertzbeat.warehouse.controller;

import org.dromara.hertzbeat.common.entity.dto.Field;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.entity.dto.MetricsData;
import org.dromara.hertzbeat.common.entity.dto.MetricsHistoryData;
import org.dromara.hertzbeat.common.entity.dto.Value;
import org.dromara.hertzbeat.common.entity.dto.ValueRow;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.warehouse.store.AbstractHistoryDataStorage;
import org.dromara.hertzbeat.warehouse.store.AbstractRealTimeDataStorage;
import org.dromara.hertzbeat.warehouse.store.HistoryJpaDatabaseDataStorage;
import org.dromara.hertzbeat.warehouse.store.RealTimeMemoryDataStorage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.dromara.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * 指标数据查询接口
 *
 * @author tom
 */
@RestController
@RequestMapping(produces = {APPLICATION_JSON_VALUE})
@Tag(name = "Metrics Data API | 监控指标数据API")
public class MetricsDataController {

    private static final Integer METRIC_FULL_LENGTH = 3;

    private final List<AbstractRealTimeDataStorage> realTimeDataStorages;

    private final List<AbstractHistoryDataStorage> historyDataStorages;

    public MetricsDataController(List<AbstractRealTimeDataStorage> realTimeDataStorages,
                                 List<AbstractHistoryDataStorage> historyDataStorages) {
        this.realTimeDataStorages = realTimeDataStorages;
        this.historyDataStorages = historyDataStorages;
    }

    @GetMapping("/api/warehouse/storage/status")
    @Operation(summary = "Query Warehouse Storage Server Status", description = "查询仓储下存储服务的可用性状态")
    public ResponseEntity<Message<Void>> getWarehouseStorageServerStatus() {
        boolean available = false;
        if (historyDataStorages != null) {
            available = historyDataStorages.stream().anyMatch(AbstractHistoryDataStorage::isServerAvailable);
        }
        if (available) {
            return ResponseEntity.ok(Message.success());
        } else {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Service not available!"));
        }
    }

    @GetMapping("/api/monitor/{monitorId}/metrics/{metrics}")
    @Operation(summary = "Query Real Time Metrics Data", description = "查询监控指标的实时指标数据")
    public ResponseEntity<Message<MetricsData>> getMetricsData(
            @Parameter(description = "Monitor Id", example = "343254354")
            @PathVariable Long monitorId,
            @Parameter(description = "Metrics Name", example = "cpu")
            @PathVariable String metrics) {
        AbstractRealTimeDataStorage realTimeDataStorage = realTimeDataStorages.stream()
                .filter(AbstractRealTimeDataStorage::isServerAvailable)
                .max((o1, o2) -> {
                    if (o1 instanceof RealTimeMemoryDataStorage) {
                        return -1;
                    } else if (o2 instanceof RealTimeMemoryDataStorage) {
                        return 1;
                    } else {
                        return 0;
                    }
                }).orElse(null);
        if (realTimeDataStorage == null) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "real time store not available"));
        }
        CollectRep.MetricsData storageData = realTimeDataStorage.getCurrentMetricsData(monitorId, metrics);
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
    @Operation(summary = "查询监控的指定指标的历史数据", description = "查询监控下的指定指标的历史数据")
    public ResponseEntity<Message<MetricsHistoryData>> getMetricHistoryData(
            @Parameter(description = "监控任务ID", example = "343254354")
            @PathVariable Long monitorId,
            @Parameter(description = "监控指标全路径", example = "linux.cpu.usage")
            @PathVariable() String metricFull,
            @Parameter(description = "标签过滤,默认空", example = "disk2")
            @RequestParam(required = false) String label,
            @Parameter(description = "查询历史时间段,默认6h-6小时:s-秒、m-分, h-小时, d-天, w-周", example = "6h")
            @RequestParam(required = false) String history,
            @Parameter(description = "是否计算聚合数据,需查询时间段大于1周以上,默认不开启,聚合降样时间窗口默认为4小时", example = "false")
            @RequestParam(required = false) Boolean interval
    ) {
        AbstractHistoryDataStorage historyDataStorage = historyDataStorages.stream()
                .filter(AbstractHistoryDataStorage::isServerAvailable).max((o1, o2) -> {
                    if (o1 instanceof HistoryJpaDatabaseDataStorage) {
                        return -1;
                    } else if (o2 instanceof HistoryJpaDatabaseDataStorage) {
                        return 1;
                    } else {
                        return 0;
                    }
                }).orElse(null);
        if (historyDataStorage == null) {
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
            instanceValuesMap = historyDataStorage.getHistoryMetricData(monitorId, app, metrics, metric, label, history);
        } else {
            instanceValuesMap = historyDataStorage.getHistoryIntervalMetricData(monitorId, app, metrics, metric, label, history);
        }
        MetricsHistoryData historyData = MetricsHistoryData.builder()
                .id(monitorId).metrics(metrics).values(instanceValuesMap)
                .field(Field.builder().name(metric).type(CommonConstants.TYPE_NUMBER).build())
                .build();
        return ResponseEntity.ok(Message.success(historyData));
    }
}
