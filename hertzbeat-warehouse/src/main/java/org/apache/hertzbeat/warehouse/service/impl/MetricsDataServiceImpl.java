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

package org.apache.hertzbeat.warehouse.service.impl;

import com.google.common.collect.Maps;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.dto.Field;
import org.apache.hertzbeat.common.entity.dto.MetricsData;
import org.apache.hertzbeat.common.entity.dto.MetricsHistoryData;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.dto.ValueRow;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.warehouse.service.MetricsDataService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
import org.springframework.stereotype.Service;

/**
 * Metrics Data Service impl
 */
@Slf4j
@Service
public class MetricsDataServiceImpl implements MetricsDataService {

    private final RealTimeDataReader realTimeDataReader;

    private final Optional<HistoryDataReader> historyDataReader;

    public MetricsDataServiceImpl(RealTimeDataReader realTimeDataReader, Optional<HistoryDataReader> historyDataReader) {
        this.realTimeDataReader = realTimeDataReader;
        this.historyDataReader = historyDataReader;
    }

    @Override
    public Boolean getWarehouseStorageServerStatus() {
        return historyDataReader.isPresent() && historyDataReader.get().isServerAvailable();
    }

    @Override
    public MetricsData getMetricsData(Long monitorId, String metrics) {
        boolean available = realTimeDataReader.isServerAvailable();
        if (!available) {
            throw new CommonException("real time store not available");
        }
        CollectRep.MetricsData storageData = realTimeDataReader.getCurrentMetricsData(monitorId, metrics);
        if (storageData == null) {
            return null;
        }
        MetricsData.MetricsDataBuilder dataBuilder = MetricsData.builder();
        dataBuilder.id(storageData.getId()).app(storageData.getApp()).metrics(storageData.getMetrics())
                .time(storageData.getTime());
        dataBuilder.fields(storageData.getFields().stream()
                .map(field -> Field.builder().name(field.getName())
                        .type((byte) field.getType())
                        .label(field.getLabel())
                        .unit(field.getUnit())
                        .build())
                .toList());

        List<ValueRow> valueRows = new ArrayList<>();
        if (storageData.rowCount() > 0) {
            RowWrapper rowWrapper = storageData.readRow();
            while (rowWrapper.hasNextRow()) {
                rowWrapper = rowWrapper.nextRow();
                Map<String, String> labels = Maps.newHashMapWithExpectedSize(8);
                List<Value> values = new ArrayList<>();
                rowWrapper.cellStream().forEach(cell -> {
                    String origin = cell.getValue();

                    if (CommonConstants.NULL_VALUE.equals(origin)) {
                        values.add(new Value());
                    } else {
                        values.add(new Value(origin));
                        if (cell.getMetadataAsBoolean(MetricDataConstants.LABEL)) {
                            labels.put(cell.getField().getName(), origin);
                        }
                    }
                });
                valueRows.add(ValueRow.builder().labels(labels).values(values).build());
            }
            dataBuilder.valueRows(valueRows);
        }
        return dataBuilder.build();
    }

    @Override
    public MetricsHistoryData getMetricHistoryData(String instance, String app, String metrics, String metric, String label, String history, Boolean interval, Long monitorId) {
        if (history == null) {
            history = "6h";
        }
        
        // Query with instance (new data format)
        Map<String, List<Value>> instanceValuesMap;
        if (interval == null || !interval) {
            instanceValuesMap = historyDataReader.get().getHistoryMetricData(instance, app, metrics, metric, label, history);
        } else {
            instanceValuesMap = historyDataReader.get().getHistoryIntervalMetricData(instance, app, metrics, metric, label, history);
        }
        
        // Query with monitorId as instance (legacy data format) if monitorId is provided
        if (monitorId != null) {
            String monitorIdAsInstance = String.valueOf(monitorId);
            Map<String, List<Value>> legacyValuesMap;
            if (interval == null || !interval) {
                legacyValuesMap = historyDataReader.get().getHistoryMetricData(monitorIdAsInstance, app, metrics, metric, label, history);
            } else {
                legacyValuesMap = historyDataReader.get().getHistoryIntervalMetricData(monitorIdAsInstance, app, metrics, metric, label, history);
            }
            
            // Merge results from both queries
            if (legacyValuesMap != null && !legacyValuesMap.isEmpty()) {
                for (Map.Entry<String, List<Value>> entry : legacyValuesMap.entrySet()) {
                    String key = entry.getKey();
                    List<Value> legacyValues = entry.getValue();
                    if (instanceValuesMap.containsKey(key)) {
                        List<Value> mergedValues = new ArrayList<>(instanceValuesMap.get(key));
                        mergedValues.addAll(legacyValues);
                        mergedValues.sort((v1, v2) -> Long.compare(v1.getTime(), v2.getTime()));
                        instanceValuesMap.put(key, mergedValues);
                    } else {
                        instanceValuesMap.put(key, legacyValues);
                    }
                }
            }
        }
        
        if (instanceValuesMap.containsKey("{}")) {
            instanceValuesMap.put("", instanceValuesMap.get("{}"));
            instanceValuesMap.remove("{}");
        }
        return MetricsHistoryData.builder()
                .instance(instance).metrics(metrics).values(instanceValuesMap)
                .field(Field.builder().name(metric).type(CommonConstants.TYPE_NUMBER).build())
                .build();
    }
}
