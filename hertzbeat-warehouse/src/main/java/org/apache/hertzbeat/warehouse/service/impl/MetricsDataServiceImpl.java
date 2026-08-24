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
import java.util.regex.Pattern;
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

    /**
     * The history range is interpolated straight into the time predicate of the generated
     * query - {@code WHERE ts >= now - %s} for tdengine, the equivalent for influxdb, iotdb
     * and victoria metrics - with no quoting around it, which makes it the widest opening
     * of the four inputs: anything after the range escapes the predicate and continues the
     * statement.
     *
     * <p>A count followed by a single unit letter is the whole language the ui speaks
     * ({@code 1h}, {@code 6h}, {@code 1D}, {@code 1W}, {@code 4W}, {@code 12W}) and cannot
     * carry a quote, a separator or a comment. Both cases are accepted because the storages
     * differ on it: questdb lowercases the unit while `TimePeriodUtil` reads an uppercase
     * unit as a calendar period. Which units a given storage actually supports is left to
     * that storage, so this rejects without changing what already worked.
     */
    private static final Pattern HISTORY_RANGE = Pattern.compile("\\d{1,6}[smhdwy]", Pattern.CASE_INSENSITIVE);

    /**
     * App, metrics group and metric names reach the storages as table and column
     * identifiers, quoted with backticks in tdengine and double quotes in questdb, and as
     * promql label values in victoria metrics. None of the characters allowed here can
     * close any of those, and every monitoring template shipped with hertzbeat names its
     * apps, metric groups and fields from this set.
     */
    private static final Pattern IDENTIFIER = Pattern.compile("[A-Za-z0-9_-]{1,200}");

    /**
     * The instance is commonly an address, so it additionally allows the punctuation an
     * address carries. The storages that build a table name from it already fold {@code .},
     * {@code :}, {@code [} and {@code ]} into underscores.
     */
    private static final Pattern INSTANCE = Pattern.compile("[A-Za-z0-9_\\-.:\\[\\]]{1,200}");

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
    public MetricsHistoryData getMetricHistoryData(String instance, String app, String metrics, String metric, String history, Boolean interval) {
        if (history == null) {
            history = "6h";
        }
        validateHistoryRange(history);
        validateIdentifier(app, "app");
        validateIdentifier(metrics, "metrics");
        validateIdentifier(metric, "metric");
        validateInstance(instance);
        Map<String, List<Value>> instanceValuesMap;
        if (interval == null || !interval) {
            instanceValuesMap = historyDataReader.get().getHistoryMetricData(instance, app, metrics, metric, history);
        } else {
            instanceValuesMap = historyDataReader.get().getHistoryIntervalMetricData(instance, app, metrics, metric, history);
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

    private static void validateHistoryRange(String history) {
        if (!HISTORY_RANGE.matcher(history).matches()) {
            throw new IllegalArgumentException("history range: " + history
                    + " is illegal, expected a count followed by a unit such as 6h or 1W.");
        }
    }

    private static void validateIdentifier(String value, String name) {
        if (value == null || !IDENTIFIER.matcher(value).matches()) {
            throw new IllegalArgumentException(name + ": " + value + " is illegal.");
        }
    }

    private static void validateInstance(String instance) {
        if (instance == null || !INSTANCE.matcher(instance).matches()) {
            throw new IllegalArgumentException("instance: " + instance + " is illegal.");
        }
    }
}
