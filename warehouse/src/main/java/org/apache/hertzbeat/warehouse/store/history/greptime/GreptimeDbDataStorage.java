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

package org.apache.hertzbeat.warehouse.store.history.greptime;

import com.mysql.cj.jdbc.Driver;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import io.greptime.GreptimeDB;
import io.greptime.models.AuthInfo;
import io.greptime.models.DataType;
import io.greptime.models.Err;
import io.greptime.models.Result;
import io.greptime.models.Table;
import io.greptime.models.TableSchema;
import io.greptime.models.WriteOk;
import io.greptime.options.GreptimeOptions;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.DriverPropertyInfo;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.warehouse.store.history.AbstractHistoryDataStorage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * GreptimeDB data storage, only supports GreptimeDB version >= v0.5
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
@Slf4j
public class GreptimeDbDataStorage extends AbstractHistoryDataStorage {
    
    private static final String CONSTANT_DB_TTL = "30d";
    
    private static final String QUERY_HISTORY_SQL = "SELECT CAST (ts AS Int64) ts, instance, `%s` FROM `%s` WHERE ts >= now() -  interval '%s' and monitor_id = %s order by ts desc;";
    
    @SuppressWarnings("checkstyle:LineLength")
    private static final String QUERY_HISTORY_WITH_INSTANCE_SQL = "SELECT CAST (ts AS Int64) ts, instance, `%s` FROM `%s` WHERE ts >= now() - interval '%s' and monitor_id = %s and instance = '%s' order by ts desc;";
    
    private static final String QUERY_INSTANCE_SQL = "SELECT DISTINCT instance FROM `%s` WHERE ts >= now() - interval '1 WEEK'";
    
    @SuppressWarnings("checkstyle:LineLength")
    private static final String QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL = "SELECT CAST (ts AS Int64) ts, first_value(`%s`) range '4h' first, avg(`%s`) range '4h' avg, min(`%s`) range '4h' min, max(`%s`) range '4h' max FROM `%s` WHERE instance = '%s' AND ts >= now() - interval '%s' ALIGN '4h'";
    
    private static final String TABLE_NOT_EXIST = "not found";
    
    private static final String CONSTANTS_CREATE_DATABASE = "CREATE DATABASE IF NOT EXISTS `%s` WITH(ttl='%s')";
    
    private static final Runnable INSTANCE_EXCEPTION_PRINT = () -> {
        if (log.isErrorEnabled()) {
            log.error("""
                    \t---------------GreptimeDB Init Failed---------------
                    \t--------------Please Config GreptimeDB--------------
                    t-----------Can Not Use Metric History Now-----------
                    """);
        }
    };
    
    private HikariDataSource hikariDataSource;
    
    private GreptimeDB greptimeDb;
    
    public GreptimeDbDataStorage(GreptimeProperties greptimeProperties) {
        if (greptimeProperties == null) {
            log.error("init error, please config Warehouse GreptimeDB props in application.yml");
            throw new IllegalArgumentException("please config Warehouse GreptimeDB props");
        }
        
        serverAvailable = initGreptimeDbClient(greptimeProperties) && initGreptimeDbDataSource(greptimeProperties);
    }
    
    private void initGreptimeDb(final GreptimeProperties greptimeProperties) throws SQLException {
        final DriverPropertyInfo[] properties = new Driver().getPropertyInfo(greptimeProperties.url(), null);
        final String host = ObjectUtils.requireNonEmpty(properties[0].value);
        final String port = ObjectUtils.requireNonEmpty(properties[1].value);
        final String dbName = ObjectUtils.requireNonEmpty(properties[2].value);
        
        String ttl = greptimeProperties.expireTime();
        if (ttl == null || StringUtils.isBlank(ttl.trim())) {
            ttl = CONSTANT_DB_TTL;
        }
        
        try (final Connection tempConnection = DriverManager.getConnection("jdbc:mysql://" + host + ":" + port,
                greptimeProperties.username(), greptimeProperties.password());
             final PreparedStatement pstmt = tempConnection
                     .prepareStatement(String.format(CONSTANTS_CREATE_DATABASE, dbName, ttl))) {
            log.info("[warehouse greptime] try to create database `{}` if not exists", dbName);
            pstmt.execute();
        }
    }
    
    private boolean initGreptimeDbClient(GreptimeProperties greptimeProperties) {
        String endpoints = greptimeProperties.grpcEndpoints();
        try {
            final DriverPropertyInfo[] properties = new Driver().getPropertyInfo(greptimeProperties.url(), null);
            final String dbName = ObjectUtils.requireNonEmpty(properties[2].value);
            
            GreptimeOptions opts = GreptimeOptions.newBuilder(endpoints.split(","), dbName) //
                    .writeMaxRetries(3) //
                    .authInfo(new AuthInfo(greptimeProperties.username(), greptimeProperties.password()))
                    .routeTableRefreshPeriodSeconds(30) //
                    .build();
            
            this.greptimeDb = GreptimeDB.create(opts);
        } catch (Exception e) {
            log.error("[warehouse greptime] Fail to start GreptimeDB client");
            return false;
        }
        
        return true;
    }
    
    private boolean initGreptimeDbDataSource(final GreptimeProperties greptimeProperties) {
        try {
            initGreptimeDb(greptimeProperties);
        } catch (Exception e) {
            if (log.isErrorEnabled()) {
                log.error(e.getMessage(), e);
            }
            
            INSTANCE_EXCEPTION_PRINT.run();
            return false;
        }
        
        final HikariConfig config = new HikariConfig();
        // jdbc properties
        config.setJdbcUrl(greptimeProperties.url());
        config.setUsername(greptimeProperties.username());
        config.setPassword(greptimeProperties.password());
        config.setDriverClassName(greptimeProperties.driverClassName());
        // minimum number of idle connection
        config.setMinimumIdle(10);
        // maximum number of connection in the pool
        config.setMaximumPoolSize(10);
        // maximum wait milliseconds for get connection from pool
        config.setConnectionTimeout(30000);
        // maximum lifetime for each connection
        config.setMaxLifetime(0);
        // max idle time for recycle idle connection
        config.setIdleTimeout(0);
        // validation query
        config.setConnectionTestQuery("select 1");
        try {
            this.hikariDataSource = new HikariDataSource(config);
        } catch (Exception e) {
            INSTANCE_EXCEPTION_PRINT.run();
            return false;
        }
        return true;
    }
    
    @Override
    public void saveData(CollectRep.MetricsData metricsData) {
        if (!isServerAvailable() || metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return;
        }
        if (metricsData.getValuesList().isEmpty()) {
            log.info("[warehouse greptime] flush metrics data {} is null, ignore.", metricsData.getId());
            return;
        }
        String monitorId = String.valueOf(metricsData.getId());
        String tableName = getTableName(metricsData.getApp(), metricsData.getMetrics());
        TableSchema.Builder tableSchemaBuilder = TableSchema.newBuilder(tableName);
        
        tableSchemaBuilder.addTag("monitor_id", DataType.String) //
                .addTag("instance", DataType.String) //
                .addTimestamp("ts", DataType.TimestampMillisecond);
        
        List<CollectRep.Field> fieldsList = metricsData.getFieldsList();
        for (CollectRep.Field field : fieldsList) {
            // handle field type
            if (field.getType() == CommonConstants.TYPE_NUMBER) {
                tableSchemaBuilder.addField(field.getName(), DataType.Float64);
            } else if (field.getType() == CommonConstants.TYPE_STRING) {
                tableSchemaBuilder.addField(field.getName(), DataType.String);
            }
        }
        Table table = Table.from(tableSchemaBuilder.build());
        
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
                table.addRow(values);
            }
            
            CompletableFuture<Result<WriteOk, Err>> writeFuture = greptimeDb.write(table);
            try {
                Result<WriteOk, Err> result = writeFuture.get(10, TimeUnit.SECONDS);
                if (result.isOk()) {
                    log.debug("[warehouse greptime]-Write successful");
                } else {
                    log.warn("[warehouse greptime]--Write failed: {}", result.getErr());
                }
            } catch (Throwable throwable) {
                log.error("[warehouse greptime]--Error occurred: {}", throwable.getMessage());
            }
        } catch (Exception e) {
            log.error("[warehouse greptime]--Error: {}", e.getMessage(), e);
        }
    }
    
    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric,
                                                         String label, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            INSTANCE_EXCEPTION_PRINT.run();
            return instanceValuesMap;
        }
        
        String table = getTableName(app, metrics);
        
        String interval = history2interval(history);
        String selectSql = label == null ? String.format(QUERY_HISTORY_SQL, metric, table, interval, monitorId)
                : String.format(QUERY_HISTORY_WITH_INSTANCE_SQL, metric, table, interval, monitorId, label);
        
        if (log.isDebugEnabled()) {
            log.debug("[warehouse greptime] getHistoryMetricData SQL: {}", selectSql);
        }
        
        try (Connection connection = hikariDataSource.getConnection();
             Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(selectSql)) {
            while (resultSet.next()) {
                long ts = resultSet.getLong(1);
                if (ts == 0) {
                    if (log.isErrorEnabled()) {
                        log.error("[warehouse greptime] getHistoryMetricData query result timestamp is 0, ignore. {}.",
                                selectSql);
                    }
                    continue;
                }
                String instanceValue = resultSet.getString(2);
                if (instanceValue == null || StringUtils.isBlank(instanceValue)) {
                    instanceValue = "";
                }
                double value = resultSet.getDouble(3);
                String strValue = double2decimalString(value);
                
                List<Value> valueList = instanceValuesMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
                valueList.add(new Value(strValue, ts));
            }
            return instanceValuesMap;
        } catch (SQLException sqlException) {
            String msg = sqlException.getMessage();
            if (msg != null && !msg.contains(TABLE_NOT_EXIST)) {
                if (log.isWarnEnabled()) {
                    log.warn("[warehouse greptime] failed to getHistoryMetricData: {}", sqlException.getMessage());
                }
            }
        } catch (Exception e) {
            if (log.isErrorEnabled()) {
                log.error("[warehouse greptime] failed to getHistoryMetricData:{}", e.getMessage(), e);
            }
        }
        return instanceValuesMap;
    }
    
    private String getTableName(String app, String metrics) {
        return app + "_" + metrics;
    }
    
    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics,
                                                                 String metric, String label, String history) {
        if (!isServerAvailable()) {
            INSTANCE_EXCEPTION_PRINT.run();
            return Collections.emptyMap();
        }
        String table = getTableName(app, metrics);
        List<String> instances = new LinkedList<>();
        if (label != null && !StringUtils.isBlank(label)) {
            instances.add(label);
        }
        if (instances.isEmpty()) {
            String selectSql = String.format(QUERY_INSTANCE_SQL, table);
            if (log.isDebugEnabled()) {
                log.debug("[warehouse greptime] getHistoryIntervalMetricData sql: {}", selectSql);
            }
            
            try (Connection connection = hikariDataSource.getConnection();
                 Statement statement = connection.createStatement();
                 ResultSet resultSet = statement.executeQuery(selectSql)) {
                while (resultSet.next()) {
                    String instanceValue = resultSet.getString(1);
                    if (instanceValue == null || StringUtils.isBlank(instanceValue)) {
                        instances.add("''");
                    } else {
                        instances.add(instanceValue);
                    }
                }
            } catch (Exception e) {
                if (log.isErrorEnabled()) {
                    log.error("[warehouse greptime] failed to query instances{}", e.getMessage(), e);
                }
            }
        }
        
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(instances.size());
        for (String instanceValue : instances) {
            String selectSql = String.format(QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL, metric, metric, metric, metric,
                    table, instanceValue, history2interval(history));
            
            if (log.isDebugEnabled()) {
                log.debug("[warehouse greptime] getHistoryIntervalMetricData sql: {}", selectSql);
            }
            
            List<Value> values = instanceValuesMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
            try (Connection connection = hikariDataSource.getConnection();
                 Statement statement = connection.createStatement();
                 ResultSet resultSet = statement.executeQuery(selectSql)) {
                while (resultSet.next()) {
                    long ts = resultSet.getLong(1);
                    if (ts == 0) {
                        if (log.isErrorEnabled()) {
                            log.error(
                                    "[warehouse greptime] getHistoryIntervalMetricData query result timestamp is 0, ignore. {}.",
                                    selectSql);
                        }
                        continue;
                    }
                    double origin = resultSet.getDouble(2);
                    String originStr = double2decimalString(origin);
                    double avg = resultSet.getDouble(3);
                    String avgStr = double2decimalString(avg);
                    double min = resultSet.getDouble(4);
                    String minStr = double2decimalString(min);
                    double max = resultSet.getDouble(5);
                    String maxStr = double2decimalString(max);
                    Value value = Value.builder().origin(originStr).mean(avgStr).min(minStr).max(maxStr).time(ts)
                            .build();
                    values.add(value);
                }
                resultSet.close();
            } catch (Exception e) {
                if (log.isErrorEnabled()) {
                    log.error("[warehouse greptime] failed to getHistoryIntervalMetricData: {}", e.getMessage(), e);
                }
            }
        }
        return instanceValuesMap;
    }
    
    // TODO(dennis): we can remove it when
    // https://github.com/GreptimeTeam/greptimedb/issues/4168 is fixed.
    // default 6h-6 hours: s-seconds, M-minutes, h-hours, d-days, w-weeks
    private String history2interval(String history) {
        if (history == null) {
            return null;
        }
        history = history.trim().toLowerCase();
        
        // Be careful, the order matters.
        return history.replaceAll("d", " day") //
                .replaceAll("s", " second") //
                .replaceAll("w", " week") //
                .replaceAll("h", " hour")//
                .replaceAll("m", " minute");
    }
    
    private String double2decimalString(double d) {
        return BigDecimal.valueOf(d).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }
    
    @Override
    public void destroy() {
        if (this.greptimeDb != null) {
            this.greptimeDb.shutdownGracefully();
            this.greptimeDb = null;
        }
        if (this.hikariDataSource != null) {
            this.hikariDataSource.close();
            hikariDataSource = null;
        }
    }
}
