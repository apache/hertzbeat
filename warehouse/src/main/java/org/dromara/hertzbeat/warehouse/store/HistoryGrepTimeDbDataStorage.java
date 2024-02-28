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

package org.dromara.hertzbeat.warehouse.store;

import io.greptime.models.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.arrow.flight.FlightRuntimeException;
import org.dromara.hertzbeat.common.entity.dto.Value;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.common.util.TimePeriodUtil;
import org.dromara.hertzbeat.warehouse.config.WarehouseProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import io.greptime.GreptimeDB;
import io.greptime.options.GreptimeOptions;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAmount;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

/**
 * greptimeDB data storage
 *
 * @author zqr10159 tomsun28
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
    private static final String QUERY_HISTORY_SQL
            = "SELECT CAST (ts AS Int64) ts, instance, \"%s\" FROM %s WHERE ts >= %s and monitor_id = %s order by ts desc;";
    private static final String QUERY_HISTORY_WITH_INSTANCE_SQL
            = "SELECT CAST (ts AS Int64) ts, instance, \"%s\" FROM %s WHERE ts >= %s and monitor_id = %s and instance = %s order by ts desc;";
    private static final String QUERY_INSTANCE_SQL
            = "SELECT DISTINCT instance FROM %s WHERE ts >= now() - interval '1' WEEK";
    private static final String QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL
            = "SELECT first, avg ,max, min FROM (SELECT \"%s\" as first FROM %s WHERE monitor_id = %s and ts >= %s" +
            " and ts < %s ORDER BY ts LIMIT 1) LEFT JOIN (SELECT avg(\"%s\") as avg, min(\"%s\") as min, max(\"%s\") as max FROM %s WHERE ts >= %s and ts < %s) ON 1=1";
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
            log.error("Fail to start Greptime client");
            return false;
        }
        return createDatabase();
    }

    /**
     * Checks if the database exists; if not, creates the Database.
     * 检查数据库是否存在；如果不存在，则创建该数据库
     */
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
        } catch (Exception e) {
            log.info("TABLE_NOT_EXIST: {}", e.getMessage());
            String msg = e.getMessage();
            if (msg != null && !msg.contains(DATABASE_NOT_EXIST)) {
                log.warn(msg);
            }

        }
        // Check if the database exists;
        // 检查现有数据库是否包括“hertzbeat”
        boolean isDatabaseExist = false;
        if (result != null && result.isOk()) {
            QueryOk queryOk = result.getOk();
            SelectRows rows = queryOk.getRows();
            List<Row> rowsList = rows.collect();
            for (Row row : rowsList) {
                for (io.greptime.models.Value value : row.values()) {
                    if (STORAGE_DATABASE.equals(value.value().toString())) {
                        log.info("Exist Database {}", STORAGE_DATABASE);
                        isDatabaseExist = true;
                        break;
                    }
                }
            }
        }
        // If it does not exist, create database
        // 如果“hertzbeat”数据库不存在，则创建该数据库
        if (!isDatabaseExist) {
            QueryRequest createDatabase = QueryRequest.newBuilder()
                    .exprType(SelectExprType.Sql)
                    .ql("CREATE DATABASE %s;", STORAGE_DATABASE)
                    .build();
            try {
                CompletableFuture<Result<QueryOk, Err>> createFuture = greptimeDb.query(createDatabase);
                isDatabaseExist = createFuture.get().isOk();
                log.info("Database {} does not exist,and has been created", STORAGE_DATABASE);
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
        String table = metricsData.getApp() + "_" + metricsData.getMetrics();
        TableSchema.Builder tableSchemaBuilder = TableSchema.newBuilder(TableName.with(STORAGE_DATABASE, table));

        List<SemanticType> semanticTypes = new LinkedList<>(Arrays.asList(SemanticType.Tag, SemanticType.Tag, SemanticType.Timestamp));
        List<ColumnDataType> dataTypes = new LinkedList<>(Arrays.asList(ColumnDataType.String, ColumnDataType.String, ColumnDataType.TimestampMillisecond));
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
                Map<String, String> labels = new HashMap<>(8);
                for (int i = 0; i < fieldsList.size(); i++) {
                    if (!CommonConstants.NULL_VALUE.equals(valueRow.getColumns(i))) {
                        CollectRep.Field field = fieldsList.get(i);
                        if (field.getType() == CommonConstants.TYPE_NUMBER) {
                            values[3 + i] = Double.parseDouble(valueRow.getColumns(i));
                        } else if (field.getType() == CommonConstants.TYPE_STRING) {
                            values[3 + i] = valueRow.getColumns(i);
                        }
                        if (field.getLabel()) {
                            labels.put(field.getName(), String.valueOf(values[3 + i]));
                        }
                    } else {
                        values[3 + i] = null;
                    }
                }
                values[1] = JsonUtil.toJson(labels);
                rows.insert(values);
            }
            rows.finish();
            CompletableFuture<Result<WriteOk, Err>> writeFuture = greptimeDb.write(rows);
            try {
                Result<WriteOk, Err> result = writeFuture.get(10, TimeUnit.SECONDS);
                if (result.isOk()) {
                    log.debug("[warehouse greptime]-Write successful");
                } else {
                    log.warn("[warehouse greptime]--Write failed: {}", result.getErr().getFailedQl());
                }
            } catch (Throwable throwable) {
                log.error("[warehouse greptime]--Error occurred: {}", throwable.getMessage());
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric,
                                                         String label, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            log.error("\n\t---------------Greptime Init Failed---------------\n" +
                    "\t--------------Please Config Greptime--------------\n" +
                    "\t----------Can Not Use Metric History Now----------\n");
            return instanceValuesMap;
        }
        long expireTime = getExpireTimeFromToken(history);
        String table = app + "_" + metrics;
        String selectSql = label == null ?
                String.format(QUERY_HISTORY_SQL, metric, table, expireTime, monitorId)
                : String.format(QUERY_HISTORY_WITH_INSTANCE_SQL, metric, table, expireTime, monitorId, label);
        log.debug("selectSql: {}", selectSql);
        QueryRequest request = QueryRequest.newBuilder()
                .exprType(SelectExprType.Sql)
                .databaseName(STORAGE_DATABASE)
                .ql(selectSql)
                .build();
        try {
            CompletableFuture<Result<QueryOk, Err>> future = greptimeDb.query(request);
            Result<QueryOk, Err> result = future.get();
            if (result != null && result.isOk()) {
                QueryOk queryOk = result.getOk();
                SelectRows rows = queryOk.getRows();
                List<Map<String, Object>> maps = rows.collectToMaps();
                List<Value> valueList;
                for (Map<String, Object> map : maps) {
                    String instanceValue = map.get("instance") == null ? "" : map.get("instance").toString();
                    Object valueObj = map.get(metric);
                    if (valueObj == null) {
                        continue;
                    }
                    String strValue = new BigDecimal(valueObj.toString()).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                    valueList = instanceValuesMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
                    valueList.add(new Value(strValue, (long) map.get("ts")));
                }
            }
        } catch (FlightRuntimeException e) {
            String msg = e.getMessage();
            if (msg != null && msg.contains(TABLE_NOT_EXIST)) {
                List<Value> valueList = instanceValuesMap.computeIfAbsent(metric, k -> new LinkedList<>());
                valueList.add(new Value(null, System.currentTimeMillis()));
                log.info("[warehouse greptime]-TABLE_NOT_EXIST: {}", table);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return instanceValuesMap;
    }

    private long getExpireTimeFromToken(String history) {
        long expireTime;
        try {
            TemporalAmount temporalAmount = TimePeriodUtil.parseTokenTime(history);
            ZonedDateTime dateTime = ZonedDateTime.now().minus(temporalAmount);
            expireTime = dateTime.toEpochSecond() * 1000;
        } catch (Exception e) {
            log.error("parse history time error: {}. use default: 6h", e.getMessage());
            ZonedDateTime dateTime = ZonedDateTime.now().minus(Duration.ofHours(6));
            expireTime = dateTime.toEpochSecond() * 1000;
        }
        return expireTime;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics,
                                                                 String metric, String label, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            log.error("\n\t---------------Greptime Init Failed---------------\n" +
                    "\t--------------Please Config Greptime--------------\n" +
                    "\t----------Can Not Use Metric History Now----------\n");
            return instanceValuesMap;
        }
        String table = app + "_" + metrics;
        List<String> instances = new LinkedList<>();
        if (label != null) {
            instances.add(label);
        }
        if (instances.isEmpty()) {
            String selectSql = String.format(QUERY_INSTANCE_SQL, table);
            log.debug("selectSql: {}", selectSql);
            QueryRequest request = QueryRequest.newBuilder()
                    .exprType(SelectExprType.Sql)
                    .databaseName(STORAGE_DATABASE)
                    .ql(selectSql)
                    .build();
            try {
                CompletableFuture<Result<QueryOk, Err>> future = greptimeDb.query(request);
                Result<QueryOk, Err> result = future.get();
                if (result != null && result.isOk()) {
                    QueryOk queryOk = result.getOk();
                    SelectRows rows = queryOk.getRows();
                    while (rows.hasNext()) {
                        Row row = rows.next();
                        if (row != null) {
                            List<io.greptime.models.Value> values = row.values();
                            for (io.greptime.models.Value value : values) {
                                log.debug("value:{}", value.value());
                                Object instanceValue = value.value();
                                if (instanceValue == null || "".equals(instanceValue)) {
                                    instances.add("''");
                                } else {
                                    instances.add(instanceValue.toString());
                                }
                            }
                        }

                    }
                }
            } catch (FlightRuntimeException e) {
                String msg = e.getMessage();
                if (msg != null && msg.contains(TABLE_NOT_EXIST)) {
                    log.info("[warehouse greptime]-TABLE_NOT_EXIST: {}", table);
                }
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
        // TODO greptime未找到合适的sql函数处理，暂时使用代码实现，将来greptime更新文档改用sql实现
        long endTime;
        long startTime = getExpireTimeFromToken(history);

        Calendar cal = Calendar.getInstance();

        long interval = System.currentTimeMillis() - startTime;
        long fourHourCount = TimeUnit.MILLISECONDS.toHours(interval) / 4;
        for (int i = 0; i < fourHourCount; i++) {
            cal.clear();
            cal.setTimeInMillis(startTime);
            cal.add(Calendar.HOUR_OF_DAY, 4);
            endTime = cal.getTimeInMillis();

            for (String instanceValue : instances) {
                String selectSql = String.format(QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL, metric, table, monitorId, startTime, endTime, metric, metric, metric, table, startTime, endTime);

                log.debug("selectSql: {}", selectSql);
                QueryRequest request = QueryRequest.newBuilder()
                        .exprType(SelectExprType.Sql)
                        .databaseName(STORAGE_DATABASE)
                        .ql(selectSql)
                        .build();
                List<Value> values = instanceValuesMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
                try {
                    CompletableFuture<Result<QueryOk, Err>> future = greptimeDb.query(request);
                    Result<QueryOk, Err> result = future.get();
                    log.debug("result:{}", result);
                    if (result != null && result.isOk()) {
                        QueryOk queryOk = result.getOk();
                        SelectRows rows = queryOk.getRows();
                        String[] col = new String[4];
                        while (rows.hasNext()) {
                            Row row = rows.next();
                            if (!row.values().isEmpty()) {
                                for (int j = 0; j < row.values().size(); j++) {
                                    log.debug("value:{}", row.values().get(j));
                                    String colStr = new BigDecimal(row.values().get(j).value().toString()).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                                    col[j] = colStr;
                                }
                                Value valueBuild = Value.builder()
                                        .origin(col[0]).mean(col[1])
                                        .min(col[2]).max(col[3])
                                        .time(System.currentTimeMillis())
                                        .build();
                                values.add(valueBuild);
                            }
                        }
                        log.debug("[warehouse greptime] values:{}", values);
                    }
                } catch (FlightRuntimeException e) {
                    String msg = e.getMessage();
                    if (msg != null && msg.contains(TABLE_NOT_EXIST)) {
                        List<Value> valueList = instanceValuesMap.computeIfAbsent(metric, k -> new LinkedList<>());
                        valueList.add(new Value(null, System.currentTimeMillis()));
                        log.info("[warehouse greptime]-TABLE_NOT_EXIST: {}", table);
                    }
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                }
            }
            startTime = endTime;
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
