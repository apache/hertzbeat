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

import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Field;
import org.apache.hertzbeat.common.entity.dto.MetricsData;
import org.apache.hertzbeat.common.entity.dto.MetricsHistoryData;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.dto.ValueRow;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.warehouse.service.MetricsDataService;
import org.apache.hertzbeat.warehouse.store.history.HistoryDataReader;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
import org.springframework.stereotype.Service;

/**
 * Metrics Data Service impl
 */
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
        return dataBuilder.build();
    }

    @Override
    public MetricsHistoryData getMetricHistoryData(Long monitorId, String app, String metrics, String metric, String label, String history, Boolean interval) {
        if (history == null) {
            history = "6h";
        }
        Map<String, List<Value>> instanceValuesMap;
        if (interval == null || !interval) {
            instanceValuesMap = historyDataReader.get().getHistoryMetricData(monitorId, app, metrics, metric, label, history);
        } else {
            instanceValuesMap = historyDataReader.get().getHistoryIntervalMetricData(monitorId, app, metrics, metric, label, history);
        }
        return MetricsHistoryData.builder()
                .id(monitorId).metrics(metrics).values(instanceValuesMap)
                .field(Field.builder().name(metric).type(CommonConstants.TYPE_NUMBER).build())
                .build();
    }
}
