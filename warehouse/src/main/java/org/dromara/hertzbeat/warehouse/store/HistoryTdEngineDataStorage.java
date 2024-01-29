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

import org.dromara.hertzbeat.common.entity.dto.Value;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.warehouse.config.WarehouseProperties;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.*;
import java.util.regex.Pattern;

/**
 * tdengine data storage
 * @author tom
 *
 */
@Primary
@Component
@ConditionalOnProperty(prefix = "warehouse.store.td-engine",
        name = "enabled", havingValue = "true")
@Slf4j
public class HistoryTdEngineDataStorage extends AbstractHistoryDataStorage {

    private static final Pattern SQL_SPECIAL_STRING_PATTERN = Pattern.compile("(\\\\)|(')");
    private static final String INSTANCE_NULL = "''";
    private static final String INSERT_TABLE_DATA_SQL = "INSERT INTO `%s` USING `%s` TAGS (%s) VALUES %s";
    private static final String CREATE_SUPER_TABLE_SQL = "CREATE STABLE IF NOT EXISTS `%s` %s TAGS (monitor BIGINT)";
    private static final String NO_SUPER_TABLE_ERROR = "Table does not exist";
    private static final String QUERY_HISTORY_WITH_INSTANCE_SQL
            = "SELECT ts, instance, `%s` FROM `%s` WHERE instance = '%s' AND ts >= now - %s order by ts desc";
    private static final String QUERY_HISTORY_SQL
            = "SELECT ts, instance, `%s` FROM `%s` WHERE ts >= now - %s order by ts desc";
    private static final String QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL
            = "SELECT first(ts), first(`%s`), avg(`%s`), min(`%s`), max(`%s`) FROM `%s` WHERE instance = '%s' AND ts >= now - %s interval(4h)";
    private static final String QUERY_INSTANCE_SQL
            = "SELECT DISTINCT instance FROM `%s` WHERE ts >= now - 1w";

    private static final String TABLE_NOT_EXIST
            = "Table does not exist";

    private HikariDataSource hikariDataSource;
    private final int tableStrColumnDefineMaxLength;

    public HistoryTdEngineDataStorage(WarehouseProperties properties) {
        if (properties == null || properties.getStore() == null || properties.getStore().getTdEngine() == null) {
            log.error("init error, please config Warehouse TdEngine props in application.yml");
            throw new IllegalArgumentException("please config Warehouse TdEngine props");
        }
        tableStrColumnDefineMaxLength = properties.getStore().getTdEngine().getTableStrColumnDefineMaxLength();
        serverAvailable = initTdEngineDatasource(properties.getStore().getTdEngine());
    }

    private boolean initTdEngineDatasource(WarehouseProperties.StoreProperties.TdEngineProperties tdEngineProperties) {
        HikariConfig config = new HikariConfig();
        // jdbc properties
        config.setJdbcUrl(tdEngineProperties.getUrl());
        config.setUsername(tdEngineProperties.getUsername());
        config.setPassword(tdEngineProperties.getPassword());
        config.setDriverClassName(tdEngineProperties.getDriverClassName());
        //minimum number of idle connection
        config.setMinimumIdle(10);
        //maximum number of connection in the pool
        config.setMaximumPoolSize(10);
        //maximum wait milliseconds for get connection from pool
        config.setConnectionTimeout(30000);
        // maximum lifetime for each connection
        config.setMaxLifetime(0);
        // max idle time for recycle idle connection
        config.setIdleTimeout(0);
        //validation query
        config.setConnectionTestQuery("select server_status()");
        try {
            this.hikariDataSource = new HikariDataSource(config);
        } catch (Exception e) {
            log.warn("\n\t------------------WARN WARN WARN------------------\n" +
                    "\t---------------Init TdEngine Failed---------------\n" +
                    "\t--------------Please Config Tdengine--------------\n" +
                    "\t---------Or Can Not Use Metric History Now---------\n");
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
            log.info("[warehouse tdengine] flush metrics data {} is null, ignore.", metricsData.getId());
            return;
        }
        String monitorId = String.valueOf(metricsData.getId());
        String superTable = metricsData.getApp() + "_" + metricsData.getMetrics() + "_super";
        String table = metricsData.getApp() + "_" + metricsData.getMetrics() + "_" + monitorId;
        List<CollectRep.Field> fields = metricsData.getFieldsList();
        StringBuilder sqlBuffer = new StringBuilder();
        int i = 0;
        for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
            StringBuilder sqlRowBuffer = new StringBuilder("(");
            sqlRowBuffer.append(metricsData.getTime() + i++).append(", ");
            Map<String, String> labels = new HashMap<>(8);
            sqlRowBuffer.append("'").append("%s").append("', ");
            for (int index = 0; index < fields.size(); index++) {
                CollectRep.Field field = fields.get(index);
                String value = valueRow.getColumns(index);
                if (field.getType() == CommonConstants.TYPE_NUMBER) {
                    // number data
                    if (CommonConstants.NULL_VALUE.equals(value)) {
                        sqlRowBuffer.append("NULL");
                    } else {
                        try {
                            double number = Double.parseDouble(value);
                            sqlRowBuffer.append(number);
                        } catch (Exception e) {
                            log.warn(e.getMessage());
                            sqlRowBuffer.append("NULL");
                        }
                    }
                } else {
                    // string
                    if (CommonConstants.NULL_VALUE.equals(value)) {
                        sqlRowBuffer.append("NULL");
                    } else {
                        sqlRowBuffer.append("'").append(formatStringValue(value)).append("'");
                    }
                }
                if (field.getLabel() && !CommonConstants.NULL_VALUE.equals(value)) {
                    labels.put(field.getName(), formatStringValue(value));
                }
                if (index != fields.size() - 1) {
                    sqlRowBuffer.append(", ");
                }
            }
            sqlRowBuffer.append(")");
            sqlBuffer.append(" ").append(String.format(sqlRowBuffer.toString(), formatStringValue(JsonUtil.toJson(labels))));
        }
        String insertDataSql = String.format(INSERT_TABLE_DATA_SQL, table, superTable, monitorId, sqlBuffer);
        log.debug(insertDataSql);
        Connection connection = null;
        Statement statement = null;
        try {
            connection = hikariDataSource.getConnection();
            statement = connection.createStatement();
            statement.execute(insertDataSql);
            connection.close();
        } catch (Exception e) {
            if (e.getMessage().contains(NO_SUPER_TABLE_ERROR)) {
                // stable not exists, create it
                StringBuilder fieldSqlBuilder = new StringBuilder("(");
                fieldSqlBuilder.append("ts TIMESTAMP, ");
                fieldSqlBuilder.append("instance NCHAR(").append(tableStrColumnDefineMaxLength).append("), ");
                for (int index = 0; index < fields.size(); index++) {
                    CollectRep.Field field = fields.get(index);
                    String fieldName = field.getName();
                    if (field.getType() == CommonConstants.TYPE_NUMBER) {
                        fieldSqlBuilder.append("`").append(fieldName).append("` ").append("DOUBLE");
                    } else {
                        fieldSqlBuilder.append("`").append(fieldName).append("` ").append("NCHAR(")
                                .append(tableStrColumnDefineMaxLength).append(")");
                    }
                    if (index != fields.size() - 1) {
                        fieldSqlBuilder.append(", ");
                    }
                }
                fieldSqlBuilder.append(")");
                String createTableSql = String.format(CREATE_SUPER_TABLE_SQL, superTable, fieldSqlBuilder);
                try {
                    assert statement != null;
                    log.info("[tdengine-data]: create {} use sql: {}.", superTable, createTableSql);
                    statement.execute(createTableSql);
                    statement.execute(insertDataSql);
                } catch (Exception createTableException) {
                    log.error(e.getMessage(), createTableException);
                }
            } else {
                log.error(e.getMessage());
            }
        } finally {
            try {
                assert connection != null;
                connection.close();
            } catch (Exception e) {
                log.error(e.getMessage());
            }
        }
    }

    private String formatStringValue(String value){
        String formatValue = SQL_SPECIAL_STRING_PATTERN.matcher(value).replaceAll("\\\\$0");
        // bugfix Argument list too long
        if (formatValue != null && formatValue.length() > tableStrColumnDefineMaxLength) {
            formatValue = formatValue.substring(0, tableStrColumnDefineMaxLength);
        }
        return formatValue;
    }

    @Override
    public void destroy() {
        if (hikariDataSource != null) {
            hikariDataSource.close();
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric, String label, String history) {
        String table = app + "_" + metrics + "_" + monitorId;
        String selectSql =  label == null ? String.format(QUERY_HISTORY_SQL, metric, table, history) :
                String.format(QUERY_HISTORY_WITH_INSTANCE_SQL, metric, table, label, history);
        log.debug(selectSql);
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!serverAvailable) {
            log.error("\n\t---------------TdEngine Init Failed---------------\n" +
                    "\t--------------Please Config Tdengine--------------\n" +
                    "\t----------Can Not Use Metric History Now----------\n");
            return instanceValuesMap;
        }
        try (Connection connection = hikariDataSource.getConnection();
             Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(selectSql)) {
            while (resultSet.next()) {
                Timestamp ts = resultSet.getTimestamp(1);
                if (ts == null) {
                    log.error("warehouse tdengine query result timestamp is null, ignore. {}.", selectSql);
                    continue;
                }
                String instanceValue = resultSet.getString(2);
                if (instanceValue == null || "".equals(instanceValue)) {
                    instanceValue = "";
                }
                double value = resultSet.getDouble(3);
                String strValue = new BigDecimal(value).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                List<Value> valueList = instanceValuesMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
                valueList.add(new Value(strValue, ts.getTime() / 100 * 100));
            }
            return instanceValuesMap;
        } catch (SQLException sqlException) {
            String msg = sqlException.getMessage();
            if (msg != null && !msg.contains(TABLE_NOT_EXIST)) {
                log.warn(sqlException.getMessage());
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return instanceValuesMap;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics,
                                                                 String metric, String label, String history) {
        if (!serverAvailable) {
            log.error("\n\t---------------TdEngine Init Failed---------------\n" +
                    "\t--------------Please Config Tdengine--------------\n" +
                    "\t----------Can Not Use Metric History Now----------\n");
            return Collections.emptyMap();
        }
        String table = app + "_" + metrics + "_" + monitorId;
        List<String> instances = new LinkedList<>();
        if (label != null) {
            instances.add(label);
        }
        if (instances.isEmpty()) {
            // 若未指定instance，需查询当前指标数据前1周有多少个instance
            String queryInstanceSql = String.format(QUERY_INSTANCE_SQL, table);
            Connection connection = null;
            try {
                connection = hikariDataSource.getConnection();
                Statement statement = connection.createStatement();
                ResultSet resultSet = statement.executeQuery(queryInstanceSql);
                while (resultSet.next()) {
                    String instanceValue = resultSet.getString(1);
                    if (instanceValue == null || "".equals(instanceValue)) {
                        instances.add("''");
                    } else {
                        instances.add(instanceValue);
                    }
                }
            } catch (Exception e) {
                log.error(e.getMessage());
            } finally {
                try {
                    assert connection != null;
                    connection.close();
                } catch (Exception e) {
                    log.error(e.getMessage());
                }
            }
        }
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(instances.size());
        for (String instanceValue : instances) {
            if (INSTANCE_NULL.equals(instanceValue)) {
                instanceValue = "";
            }
            String selectSql = String.format(QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL,
                            metric, metric, metric, metric, table, instanceValue, history);
            log.debug(selectSql);
            List<Value> values = instanceValuesMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
            Connection connection = null;
            try {
                connection = hikariDataSource.getConnection();
                Statement statement = connection.createStatement();
                ResultSet resultSet = statement.executeQuery(selectSql);
                while (resultSet.next()) {
                    Timestamp ts = resultSet.getTimestamp(1);
                    double origin = resultSet.getDouble(2);
                    String originStr = BigDecimal.valueOf(origin).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                    double avg = resultSet.getDouble(3);
                    String avgStr = BigDecimal.valueOf(avg).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                    double min = resultSet.getDouble(4);
                    String minStr = BigDecimal.valueOf(min).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                    double max = resultSet.getDouble(5);
                    String maxStr = BigDecimal.valueOf(max).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                    Value value = Value.builder()
                            .origin(originStr).mean(avgStr)
                            .min(minStr).max(maxStr)
                            .time(ts.getTime() / 100 * 100)
                            .build();
                    values.add(value);
                }
                resultSet.close();
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            } finally {
                try {
                    assert connection != null;
                    connection.close();
                } catch (Exception e) {
                    log.error(e.getMessage());
                }
            }
        }
        return instanceValuesMap;
    }
}
