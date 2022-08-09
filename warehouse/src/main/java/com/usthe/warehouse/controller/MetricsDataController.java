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

package com.usthe.warehouse.controller;

import com.usthe.common.entity.dto.Field;
import com.usthe.common.entity.dto.Message;
import com.usthe.common.entity.dto.MetricsData;
import com.usthe.common.entity.dto.MetricsHistoryData;
import com.usthe.common.entity.dto.Value;
import com.usthe.common.entity.dto.ValueRow;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import com.usthe.warehouse.store.MemoryDataStorage;
import com.usthe.warehouse.store.TdEngineDataStorage;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.usthe.common.util.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * 指标数据查询接口
 *
 * @author tom
 * @date 2021/12/5 15:52
 */
@RestController
@RequestMapping(produces = {APPLICATION_JSON_VALUE})
@Api(tags = "Metrics Data API | 监控指标数据API")
public class MetricsDataController {

    private static final Integer METRIC_FULL_LENGTH = 3;
    private static final String TDENGINE = "tdengine";

    @Autowired
    private MemoryDataStorage memoryDataStorage;

    @Autowired(required = false)
    private TdEngineDataStorage tdEngineDataStorage;

    @GetMapping("/api/warehouse/storage/status")
    @ApiOperation(value = "Query Warehouse Storage Server Status", notes = "查询仓储下存储服务的可用性状态")
    public ResponseEntity<Message<Void>> getWarehouseStorageServerStatus(
            @ApiParam(value = "Storage Type", example = "Tdengine")
            @RequestParam String storage) {
        boolean available = true;
        if (TDENGINE.equalsIgnoreCase(storage)) {
            if (tdEngineDataStorage == null) {
                available = false;
            } else {
                available = tdEngineDataStorage.isServerAvailable();
            }
        }
        if (available) {
            return ResponseEntity.ok(Message.<Void>builder().build());
        } else {
            return ResponseEntity.ok(new Message<>(FAIL_CODE, "Service not available!"));
        }
    }

    @GetMapping("/api/monitor/{monitorId}/metrics/{metrics}")
    @ApiOperation(value = "Query Real Time Metrics Data", notes = "查询监控指标组的指标数据")
    public ResponseEntity<Message<MetricsData>> getMetricsData(
            @ApiParam(value = "Monitor Id", example = "343254354")
            @PathVariable Long monitorId,
            @ApiParam(value = "Metrics Name", example = "cpu")
            @PathVariable String metrics) {
        CollectRep.MetricsData storageData = memoryDataStorage.getCurrentMetricsData(monitorId, metrics);
        if (storageData == null) {
            return ResponseEntity.ok().body(new Message<>("query metrics data is empty"));
        }
        {
            MetricsData.MetricsDataBuilder dataBuilder = MetricsData.builder();
            dataBuilder.id(storageData.getId()).app(storageData.getApp()).metric(storageData.getMetrics())
                    .time(storageData.getTime());
            List<Field> fields = storageData.getFieldsList().stream().map(redisField ->
                            Field.builder().name(redisField.getName())
                                    .type(Integer.valueOf(redisField.getType()).byteValue())
                                    .build())
                    .collect(Collectors.toList());
            dataBuilder.fields(fields);
            List<ValueRow> valueRows = storageData.getValuesList().stream().map(redisValueRow ->
                    ValueRow.builder().instance(redisValueRow.getInstance())
                            .values(redisValueRow.getColumnsList().stream().map(Value::new).collect(Collectors.toList()))
                            .build()).collect(Collectors.toList());
            dataBuilder.valueRows(valueRows);
            return ResponseEntity.ok().body(new Message<>(dataBuilder.build()));
        }
    }

    @GetMapping("/api/monitor/{monitorId}/metric/{metricFull}")
    @ApiOperation(value = "查询监控指标组的指定指标的历史数据", notes = "查询监控指标组下的指定指标的历史数据")
    public ResponseEntity<Message<MetricsHistoryData>> getMetricHistoryData(
            @ApiParam(value = "监控ID", example = "343254354")
            @PathVariable Long monitorId,
            @ApiParam(value = "监控指标全路径", example = "linux.cpu.usage")
            @PathVariable() String metricFull,
            @ApiParam(value = "所属实例,默认空", example = "disk2")
            @RequestParam(required = false) String instance,
            @ApiParam(value = "查询历史时间段,默认6h-6小时:s-秒、m-分, h-小时, d-天, w-周", example = "6h")
            @RequestParam(required = false) String history,
            @ApiParam(value = "是否计算聚合数据,需查询时间段大于1周以上,默认不开启,聚合降样时间窗口默认为4小时", example = "false")
            @RequestParam(required = false) Boolean interval
    ) {
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
        Map<String, List<Value>> instanceValuesMap = null;
        if (interval == null || !interval) {
            if (tdEngineDataStorage != null) {
                instanceValuesMap = tdEngineDataStorage
                        .getHistoryMetricData(monitorId, app, metrics, metric, instance, history);
            }
        } else {
            if (tdEngineDataStorage != null) {
                instanceValuesMap = tdEngineDataStorage
                        .getHistoryIntervalMetricData(monitorId, app, metrics, metric, instance, history);
            }
        }
        MetricsHistoryData historyData = MetricsHistoryData.builder()
                .id(monitorId).metric(metrics).values(instanceValuesMap)
                .field(Field.builder().name(metric).type(CommonConstants.TYPE_NUMBER).build())
                .build();
        return ResponseEntity.ok().body(new Message<>(historyData));
    }
}
