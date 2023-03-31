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
import io.greptime.models.*;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.arrow.flight.FlightRuntimeException;
import org.apache.iotdb.rpc.IoTDBConnectionException;
import org.apache.iotdb.rpc.StatementExecutionException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import io.greptime.GreptimeDB;
import io.greptime.options.GreptimeOptions;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

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
            = "SELECT ts, instance, \"%s\" FROM %s WHERE ts >= now() - INTERVAL %s order by ts desc;";
    private static final String QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL
            = "SELECT first(%s), avg(%s), min(%s), max(%s) FROM %s WHERE instance = %s AND ts >= now - %s INTERVAL '4' HOUR";
    private static final String TABLE_NOT_EXIST = "not exist";
    private static final String DATABASE_NOT_EXIST = "not exist";
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
    // 检查数据库是否存在；如果不存在，则创建该数据库
    private boolean createDatabase() {
        // 查询现有数据库
        QueryRequest showDatabases = QueryRequest.newBuilder()
                .exprType(SelectExprType.Sql)
                .ql("SHOW DATABASES;")
                .build();
        Result<QueryOk, Err> result = null;
        try {
            CompletableFuture<Result<QueryOk, Err>> future = greptimeDb.query(showDatabases);
            result = future.get();
        } catch (FlightRuntimeException e) {
            String msg = e.getMessage();
            if (msg != null && !msg.contains(DATABASE_NOT_EXIST)) {
                log.warn(msg);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        // 检查现有数据库是否包括“hertzbeat”
        boolean isDatabaseExist = false;
        if (result != null && result.isOk()) {
            QueryOk queryOk = result.getOk();
            SelectRows rows = queryOk.getRows();
            List<Row> rowsList = rows.collect();
            for (Row row : rowsList) {
                for (io.greptime.models.Value value : row.values()) {
                    if (value.value().toString().equals(STORAGE_DATABASE)) {
                        log.info("Exist Database {}",STORAGE_DATABASE);
                        isDatabaseExist = true;
                        break;
                    }
                }
            }
        }
        // 如果“hertzbeat”数据库不存在，则创建该数据库
        if (!isDatabaseExist) {
            QueryRequest createDatabase = QueryRequest.newBuilder()
                    .exprType(SelectExprType.Sql)
                    .ql("CREATE DATABASE " + STORAGE_DATABASE + ";")
                    .build();
            try {
                CompletableFuture<Result<QueryOk, Err>> createFuture = greptimeDb.query(createDatabase);
                isDatabaseExist = createFuture.get().isOk();
                log.info("Database {} does not exist,and has been created",STORAGE_DATABASE);
            } catch (InterruptedException | ExecutionException e) {
                log.error("Error creating database");
            }
        }
        return isDatabaseExist;
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
        //表名添加monitorId区分
        String table = metricsData.getApp() + "_" + metricsData.getMetrics()+ "_" +monitorId;
        //TODO bug：选择STORAGE_DATABASE不起作用，还是默认存在public里
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
                    "\t--------------Please Config GrepTime--------------\n" +
                    "\t----------Can Not Use Metric History Now----------\n");
            return instanceValuesMap;
        }
        history = getHistory(history);
        String table = app + "_" + metrics + "_" + monitorId;
        String selectSql = String.format(QUERY_HISTORY_SQL, metric, table, history);
        log.info("selectSql: {}", selectSql);
        QueryRequest request = QueryRequest.newBuilder()
                .exprType(SelectExprType.Sql)
                .ql(selectSql)
                .build();
        Result<QueryOk, Err> result = null;
        try {
            CompletableFuture<Result<QueryOk, Err>> future = greptimeDb.query(request);
            result = future.get();
        } catch (FlightRuntimeException e) {
            String msg = e.getMessage();
            if (msg != null && !msg.contains(TABLE_NOT_EXIST)) {
                List<Value> valueList = instanceValuesMap.computeIfAbsent(metric, k -> new LinkedList<>());
                valueList.add(new Value(null, System.currentTimeMillis()));
                log.info("TABLE_NOT_EXIST: {}",valueList);
                log.warn(msg);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        if (result != null && result.isOk()) {
            QueryOk queryOk = result.getOk();
            SelectRows rows = queryOk.getRows();
            List<Map<String, Object>> maps = rows.collectToMaps();
            List<Value> valueList;
            for (Map<String, Object> map : maps) {
                String strValue = new BigDecimal(map.get(metric).toString()).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                valueList = instanceValuesMap.computeIfAbsent(metric, k -> new LinkedList<>());
                valueList.add(new Value(strValue, (long) map.get("ts")));
            }
        }
        log.info("instanceValuesMap: {}",instanceValuesMap);
        return instanceValuesMap;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics,
                                                                 String metric, String instance, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            log.error("\n\t---------------GrepTime Init Failed---------------\n" +
                    "\t--------------Please Config GrepTime--------------\n" +
                    "\t----------Can Not Use Metric History Now----------\n");
            return instanceValuesMap;
        }
        history = getHistory(history);
        String table = app + "_" + metrics + "_" + monitorId;
        String selectSql = String.format(QUERY_HISTORY_SQL, metric, table, history);
        log.info("selectSql: {}", selectSql);
        QueryRequest request = QueryRequest.newBuilder()
                .exprType(SelectExprType.Sql)
                .ql(selectSql)
                .build();
        Result<QueryOk, Err> result = null;
        try {
            CompletableFuture<Result<QueryOk, Err>> future = greptimeDb.query(request);
            result = future.get();
        } catch (FlightRuntimeException e) {
            String msg = e.getMessage();
            if (msg != null && !msg.contains(TABLE_NOT_EXIST)) {
                log.warn(msg);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        List<Value> valueList;
        if (result != null && result.isOk()) {
            QueryOk queryOk = result.getOk();
            SelectRows rows = queryOk.getRows();
            List<Map<String, Object>> maps = rows.collectToMaps();
            for (Map<String, Object> map : maps) {
                String strValue = new BigDecimal(map.get(metric).toString()).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                valueList = instanceValuesMap.computeIfAbsent(metric, k -> new LinkedList<>());
                valueList.add(new Value(strValue, (long) map.get("ts")));
            }
        }
        return instanceValuesMap;
    }
    private static String getHistory(String history) {
        String[] parts = history.split("(?<=\\D)(?=\\d)|(?<=\\d)(?=\\D)");
        String number = parts[0];
        String time = parts[1];
        switch (time) {
            case "h":
                time = "HOUR";
                break;
            case "d":
                time = "DAY";
                break;
            case "w":
                time = "WEEK";
                break;
            case "s":
                time = "SECOND";
                break;
            case "m":
                time = "MINUTE";
                break;
            default:
                number = "6";
                time = "HOUR";
                break;
        }
        return String.format("'%s' %s", number, time);
    }

    @Override
    public void destroy() {
        if (this.greptimeDb != null) {
            this.greptimeDb.shutdownGracefully();
        }
    }
}
