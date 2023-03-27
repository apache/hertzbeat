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

package com.usthe.warehouse.store;

import com.usthe.common.entity.dto.Value;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import com.usthe.warehouse.config.WarehouseProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import io.greptime.GreptimeDB;
import io.greptime.models.ColumnDataType;
import io.greptime.models.Err;
import io.greptime.models.Result;
import io.greptime.models.SemanticType;
import io.greptime.models.TableName;
import io.greptime.models.TableSchema;
import io.greptime.models.WriteOk;
import io.greptime.models.WriteRows;
import io.greptime.options.GreptimeOptions;

import java.util.*;
import java.util.concurrent.CompletableFuture;

/**
 * IoTDB data storage
 *
 * @author ceilzcx
 * @since 2022/10/12
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime",
        name = "enabled", havingValue = "true")
@Slf4j
public class HistoryGrepTimeDbDataStorage extends AbstractHistoryDataStorage {

    /**
     * storage database
     */
    private static final String STORAGE_DATABASE = "hertzbeat";
    private static final String INSTANCE ="instance";

    private static final String SET_TTL = "set ttl to %s %s";

    private static final String CANCEL_TTL = "unset ttl to %s";

    private static final String SHOW_DEVICES = "SHOW DEVICES %s";

    private static final String SHOW_STORAGE_GROUP = "show storage group";

    private static final String QUERY_HISTORY_SQL
            = "SELECT %s FROM %s WHERE Time >= now() - %s order by Time desc";
    private static final String QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL
            = "SELECT FIRST_VALUE(%s), AVG(%s), MIN_VALUE(%s), MAX_VALUE(%s) FROM %s GROUP BY ([now() - %s, now()), 4h) WITHOUT NULL ANY";

    private GreptimeDB greptimeDb;

    public HistoryGrepTimeDbDataStorage(WarehouseProperties properties) {
        this.serverAvailable = this.initDbSession(properties.getStore().getGreptime());
    }

    private boolean initDbSession(WarehouseProperties.StoreProperties.GreptimeProperties properties) {
        String endpoint = properties.getEndpoint();
        GreptimeOptions opts = GreptimeOptions.newBuilder(endpoint)
                .writeMaxRetries(1)
                .readMaxRetries(2)
                .routeTableRefreshPeriodSeconds(-1)
                .build();
        greptimeDb = new GreptimeDB();
        if (!greptimeDb.init(opts)) {
            log.error("Fail to start GreptimeDB client");
            return false;
        }
        return createDatabase();
    }
    private boolean createDatabase() {
        // todo auto create database hertzbeat
        return true;
    }

    @Override
    void saveData(CollectRep.MetricsData metricsData) {
        if (!isServerAvailable() || metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return;
        }
        if (metricsData.getValuesList().isEmpty()) {
            log.info("[warehouse greptime] flush metrics data {} is null, ignore.", metricsData.getId());
            return;
        }

        String monitorId = String.valueOf(metricsData.getId());
        String table = metricsData.getApp() + "_" + metricsData.getMetrics();
        TableSchema.Builder tableSchemaBuilder = TableSchema.newBuilder(TableName.with(STORAGE_DATABASE, table));

        List<SemanticType> semanticTypes = new LinkedList<>(Arrays.asList(SemanticType.Tag, SemanticType.Tag, SemanticType.Timestamp));
        List<ColumnDataType> dataTypes = new LinkedList<>(Arrays.asList(ColumnDataType.String, ColumnDataType.String, ColumnDataType.Int64));
        List<String> columnNames = new LinkedList<>(Arrays.asList("monitor_id", "instance", "ts"));

        List<CollectRep.Field> fieldsList = metricsData.getFieldsList();
        for (CollectRep.Field field : fieldsList) {
            semanticTypes.add(SemanticType.Field);
            columnNames.add(field.getName());
            // handle field type
            if (field.getType() == CommonConstants.TYPE_NUMBER) {
                dataTypes.add(ColumnDataType.Float64);
            } else if (field.getType() == CommonConstants.TYPE_STRING) {
                dataTypes.add(ColumnDataType.String);
            }
        }
        tableSchemaBuilder.semanticTypes(semanticTypes.toArray(new SemanticType[0]));
        tableSchemaBuilder.dataTypes(dataTypes.toArray(new ColumnDataType[0]));
        tableSchemaBuilder.columnNames(columnNames.toArray(new String[0]));
        WriteRows rows = WriteRows.newBuilder(tableSchemaBuilder.build()).build();
        try {
            long now = System.currentTimeMillis();
            Object[] values = new Object[3 + fieldsList.size()];
            values[0] = monitorId;
            values[2] = now;
            for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
                String instance = valueRow.getInstance();
                if (!instance.isEmpty()) {
                    instance = String.format("\"%s\"", instance);
                    values[1] = instance;
                } else {
                    values[1] = null;
                }
                for (int i = 0; i < fieldsList.size(); i++) {
                    if (!CommonConstants.NULL_VALUE.equals(valueRow.getColumns(i))) {
                        if (fieldsList.get(i).getType() == CommonConstants.TYPE_NUMBER) {
                            values[3 + i] = Double.parseDouble(valueRow.getColumns(i));
                        } else if (fieldsList.get(i).getType() == CommonConstants.TYPE_STRING) {
                            values[3 + i] = valueRow.getColumns(i);
                        }
                    } else {
                        values[3 + i] = null;
                    }
                }
                rows.insert(values);
            }
            rows.finish();
            CompletableFuture<Result<WriteOk, Err>> writeFuture = greptimeDb.write(rows);
            writeFuture.whenComplete((result, throwable) -> {
                if (throwable != null) {
                    log.error("[warehouse greptime]-write data error:{}", result, throwable);
                }
            });
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric,
                                                         String instance, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            log.error("\n\t---------------GrepTime Init Failed---------------\n" +
                    "\t--------------Please Config IotDb--------------\n" +
                    "\t----------Can Not Use Metric History Now----------\n");
            return instanceValuesMap;
        }
        return instanceValuesMap;
    }


    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics,
                                                                 String metric, String instance, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            log.error("\n\t---------------GrepTime Init Failed---------------\n" +
                    "\t--------------Please Config IotDb--------------\n" +
                    "\t----------Can Not Use Metric History Now----------\n");
            return instanceValuesMap;
        }
        return instanceValuesMap;
    }

    @Override
    public void destroy() {
        if (this.greptimeDb != null) {
            this.greptimeDb.shutdownGracefully();
        }
    }
}
