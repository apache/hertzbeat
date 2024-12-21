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
import org.apache.hertzbeat.common.entity.arrow.reader.ArrowVectorReader;
import org.apache.hertzbeat.common.entity.arrow.reader.ArrowVectorReaderImpl;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
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

        try (ArrowVectorReader reader = new ArrowVectorReaderImpl(storageData.getData().toByteArray())) {
            dataBuilder.fields(reader.getAllFields().stream()
                    .map(field -> {
                        final Map<String, String> metadata = field.getMetadata();

                        return Field.builder().name(field.getName())
                                .type(Integer.valueOf(metadata.get(MetricDataConstants.TYPE)).byteValue())
                                .label(Boolean.valueOf(metadata.get(MetricDataConstants.LABEL)))
                                .unit(metadata.get(MetricDataConstants.UNIT))
                                .build();
                    }).toList());

            List<ValueRow> valueRows = new ArrayList<>();
            RowWrapper rowWrapper = reader.readRow();
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
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

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
