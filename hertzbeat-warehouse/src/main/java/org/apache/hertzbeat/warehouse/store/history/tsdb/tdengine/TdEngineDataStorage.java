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

package org.apache.hertzbeat.warehouse.store.history.tsdb.tdengine;

import com.google.common.collect.Maps;
import com.taosdata.jdbc.TSDBDriver;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.warehouse.store.history.tsdb.AbstractHistoryDataStorage;
import org.jetbrains.annotations.NotNull;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * tdengine data storage
 */
@Primary
@Component
@ConditionalOnProperty(prefix = "warehouse.store.td-engine",
        name = "enabled", havingValue = "true")
@Slf4j
public class TdEngineDataStorage extends AbstractHistoryDataStorage {

    private static final String CONSTANTS_URL_PREFIX = "jdbc:TAOS-RS://";
    private static final Pattern SQL_SPECIAL_STRING_PATTERN = Pattern.compile("(\\\\)|(')");
    private static final String INSTANCE_NULL = "''";
    private static final String CONSTANTS_CREATE_DATABASE = "CREATE DATABASE IF NOT EXISTS %s";
    private static final String INSERT_TABLE_DATA_SQL = "INSERT INTO `%s` USING `%s` TAGS (%s) VALUES %s";
    private static final String CREATE_SUPER_TABLE_SQL = "CREATE STABLE IF NOT EXISTS `%s` %s TAGS (instance NCHAR(128))";
    private static final String NO_SUPER_TABLE_ERROR = "Table does not exist";
    /**
     * schema version suffix - increment when TAG definition changes.
     * v1: instance BIGINT (original monitorId like 123456789)
     * v2: instance NCHAR(128) (supports string instance values like 127.0.0.1:8080)
     */
    private static final String SUPER_TABLE_VERSION = "_v2";

    private static final String QUERY_HISTORY_WITH_INSTANCE_SQL =
            "SELECT ts, metric_labels, `%s` FROM `%s` WHERE metric_labels = '%s' AND ts >= now - %s order by ts desc";
    private static final String QUERY_HISTORY_SQL =
            "SELECT ts, metric_labels, `%s` FROM `%s` WHERE ts >= now - %s order by ts desc";
    private static final String QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL =
            "SELECT first(ts), first(`%s`), avg(`%s`), min(`%s`), max(`%s`) FROM `%s` WHERE metric_labels = '%s' AND ts >= now - %s interval(4h)";
    private static final String QUERY_INSTANCE_SQL =
            "SELECT DISTINCT metric_labels FROM `%s` WHERE ts >= now - 1w";

    private static final String TABLE_NOT_EXIST = "Table does not exist";

    private static final Runnable INSTANCE_EXCEPTION_PRINT = () -> {
        if (log.isErrorEnabled()) {
            log.error(
                    """
                            \t---------------TdEngine Init Failed---------------
                            \t--------------Please Config Tdengine--------------
                            \t----------Can Not Use Metric History Now----------
                            """
            );
        }
    };

    private HikariDataSource hikariDataSource;
    private final int tableStrColumnDefineMaxLength;

    public TdEngineDataStorage(TdEngineProperties tdEngineProperties) {
        if (tdEngineProperties == null) {
            log.error("init error, please config Warehouse TdEngine props in application.yml");
            throw new IllegalArgumentException("please config Warehouse TdEngine props");
        }
        tableStrColumnDefineMaxLength = tdEngineProperties.tableStrColumnDefineMaxLength();
        serverAvailable = initTdEngineDatasource(tdEngineProperties);
    }

    /**
     * {@code TdEngine} init TdEngineDatabase
     *
     * @param tdEngineProperties {@link TdEngineProperties}
     */
    private void initTdEngineDatabase(final TdEngineProperties tdEngineProperties) throws SQLException {
        final Properties parseResultProperties = com.taosdata.jdbc.utils.StringUtils.parseUrl(tdEngineProperties.url(), null);
        final String host = ObjectUtils.requireNonEmpty(parseResultProperties.getProperty(TSDBDriver.PROPERTY_KEY_HOST));
        final String port = ObjectUtils.requireNonEmpty(parseResultProperties.getProperty(TSDBDriver.PROPERTY_KEY_PORT));
        final String dbName = ObjectUtils.requireNonEmpty(parseResultProperties.getProperty(TSDBDriver.PROPERTY_KEY_DBNAME));

        try (
                final Connection tempConnection = DriverManager.getConnection(
                        CONSTANTS_URL_PREFIX + host + ":" + port,
                        tdEngineProperties.username(),
                        tdEngineProperties.password()
                )
        ) {
            tempConnection.prepareStatement(String.format(CONSTANTS_CREATE_DATABASE, dbName))
                    .execute();
        }
    }

    private boolean initTdEngineDatasource(final TdEngineProperties tdEngineProperties) {
        try {
            initTdEngineDatabase(tdEngineProperties);
        } catch (Exception e) {
            if (log.isErrorEnabled()) {
                log.error(e.getMessage(), e);
            }

            INSTANCE_EXCEPTION_PRINT.run();
            return false;
        }

        final HikariConfig config = new HikariConfig();
        // jdbc properties
        config.setJdbcUrl(tdEngineProperties.url());
        config.setUsername(tdEngineProperties.username());
        config.setPassword(tdEngineProperties.password());
        config.setDriverClassName(tdEngineProperties.driverClassName());
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
        if (metricsData.getValues().isEmpty()) {

            if (log.isInfoEnabled()) {
                log.info("[warehouse tdengine] flush metrics data {} is null, ignore.", metricsData.getInstance());
            }

            return;
        }

        String instance = metricsData.getInstance();
        String app = metricsData.getApp();
        String metrics = metricsData.getMetrics();
        String superTable = getSuperTable(app, metrics);
        String table = getTable(app, metrics, instance);
        StringBuilder sqlBuffer = new StringBuilder();
        int i = 0;

        try {
            RowWrapper rowWrapper = metricsData.readRow();

            while (rowWrapper.hasNextRow()) {
                rowWrapper = rowWrapper.nextRow();
                StringBuilder sqlRowBuffer = new StringBuilder("(");
                sqlRowBuffer.append(metricsData.getTime() + i++).append(", ");
                Map<String, String> labels = Maps.newHashMapWithExpectedSize(8);
                sqlRowBuffer.append("'").append("%s").append("', ");


                AtomicInteger index = new AtomicInteger(-1);
                int fieldMaxSize = rowWrapper.getFieldList().size();
                rowWrapper.cellStream().forEach(cell -> {
                    index.getAndIncrement();
                    String value = cell.getValue();
                    final int fieldType;

                    if ((fieldType = cell.getMetadataAsByte(MetricDataConstants.TYPE)) == CommonConstants.TYPE_NUMBER || fieldType == CommonConstants.TYPE_TIME) {
                        // number data
                        if (CommonConstants.NULL_VALUE.equals(value)) {
                            sqlRowBuffer.append("NULL");
                        } else {
                            try {
                                double number = Double.parseDouble(value);
                                sqlRowBuffer.append(number);
                            } catch (Exception e) {

                                if (log.isWarnEnabled()) {
                                    log.warn(e.getMessage());
                                }

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

                    if (cell.getMetadataAsBoolean(MetricDataConstants.LABEL) && !CommonConstants.NULL_VALUE.equals(value)) {
                        labels.put(cell.getField().getName(), formatStringValue(value));
                    }
                    if (index.get() != fieldMaxSize - 1) {
                        sqlRowBuffer.append(", ");
                    }
                });

                sqlRowBuffer.append(")");
                sqlBuffer.append(" ").append(String.format(sqlRowBuffer.toString(), formatStringValue(JsonUtil.toJson(labels))));
            }

            String insertDataSql = String.format(INSERT_TABLE_DATA_SQL, table, superTable, "'" + formatStringValue(instance) + "'", sqlBuffer);

            if (log.isDebugEnabled()) {
                log.debug(insertDataSql);
            }

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
                    fieldSqlBuilder.append("metric_labels NCHAR(").append(tableStrColumnDefineMaxLength).append("), ");
                    for (int index = 0; index < metricsData.getFields().size(); index++) {
                        CollectRep.Field field = metricsData.getFields().get(index);
                        String fieldName = field.getName();
                        final int fieldType = field.getType();

                        if (fieldType == CommonConstants.TYPE_NUMBER || fieldType == CommonConstants.TYPE_TIME) {
                            fieldSqlBuilder.append("`").append(fieldName).append("` ").append("DOUBLE");
                        } else {
                            fieldSqlBuilder.append("`").append(fieldName).append("` ").append("NCHAR(")
                                    .append(tableStrColumnDefineMaxLength).append(")");
                        }
                        if (index != metricsData.getFields().size() - 1) {
                            fieldSqlBuilder.append(", ");
                        }
                    }
                    fieldSqlBuilder.append(")");
                    String createTableSql = String.format(CREATE_SUPER_TABLE_SQL, superTable, fieldSqlBuilder);
                    try {
                        assert statement != null;

                        if (log.isInfoEnabled()) {
                            log.info("[tdengine-data]: create {} use sql: {}.", superTable, createTableSql);
                        }

                        statement.execute(createTableSql);
                        statement.execute(insertDataSql);
                    } catch (Exception createTableException) {
                        if (log.isErrorEnabled()) {
                            log.error(e.getMessage(), createTableException);
                        }
                    }
                } else {
                    if (log.isErrorEnabled()) {
                        log.error(e.getMessage());
                    }
                }
            } finally {
                try {
                    assert connection != null;
                    connection.close();
                } catch (Exception e) {
                    if (log.isErrorEnabled()) {
                        log.error(e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("[warehouse tdEngine]--Error: {}", e.getMessage(), e);
        }

    }

    @NotNull
    private static String getTable(String app, String metrics, String instance) {
        if (instance.contains(".") || instance.contains(":") || instance.contains("[")) {
            instance = instance.replace(".", "_")
                    .replace(":", "_")
                    .replace("[", "_")
                    .replace("]", "_");
        }
        return app + "_" + metrics + "_" + instance + SUPER_TABLE_VERSION;
    }

    @NotNull
    private static String getSuperTable(String app, String metrics) {
        return app + "_" + metrics + "_super" + SUPER_TABLE_VERSION;
    }

    private String formatStringValue(String value) {
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
    public Map<String, List<Value>> getHistoryMetricData(String instance, String app, String metrics, String metric, String history) {
        String table = getTable(app, metrics, instance);
        String selectSql = String.format(QUERY_HISTORY_SQL, metric, table, history);

        if (log.isDebugEnabled()) {
            log.debug(selectSql);
        }

        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!serverAvailable) {

            INSTANCE_EXCEPTION_PRINT.run();

            return instanceValuesMap;
        }
        try (Connection connection = hikariDataSource.getConnection();
             Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(selectSql)) {
            while (resultSet.next()) {
                Timestamp ts = resultSet.getTimestamp(1);
                if (ts == null) {
                    if (log.isErrorEnabled()) {
                        log.error("warehouse tdengine query result timestamp is null, ignore. {}.", selectSql);
                    }
                    continue;
                }
                String instanceValue = resultSet.getString(2);
                if (instanceValue == null || StringUtils.isBlank(instanceValue)) {
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
                if (log.isWarnEnabled()) {
                    log.warn(sqlException.getMessage());
                }
            }
        } catch (Exception e) {
            if (log.isErrorEnabled()) {
                log.error(e.getMessage(), e);
            }
        }
        return instanceValuesMap;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(String instance, String app, String metrics,
                                                                 String metric, String history) {
        if (!serverAvailable) {

            INSTANCE_EXCEPTION_PRINT.run();

            return Collections.emptyMap();
        }
        String table = getTable(app, metrics, instance);
        List<String> instances = new LinkedList<>();
        // query all metric_labels from the table
        String queryInstanceSql = String.format(QUERY_INSTANCE_SQL, table);
        Connection connection = null;
        try {
            connection = hikariDataSource.getConnection();
            Statement statement = connection.createStatement();
            ResultSet resultSet = statement.executeQuery(queryInstanceSql);
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
                log.error(e.getMessage());
            }
        } finally {
            try {
                assert connection != null;
                connection.close();
            } catch (Exception e) {
                if (log.isErrorEnabled()) {
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

            if (log.isDebugEnabled()) {
                log.debug(selectSql);
            }

            List<Value> values = instanceValuesMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
            Connection conn = null;
            try {
                conn = hikariDataSource.getConnection();
                Statement statement = conn.createStatement();
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
                if (log.isErrorEnabled()) {
                    log.error(e.getMessage(), e);
                }
            } finally {
                try {
                    assert conn != null;
                    conn.close();
                } catch (Exception e) {
                    if (log.isErrorEnabled()) {
                        log.error(e.getMessage());
                    }
                }
            }
        }
        return instanceValuesMap;
    }
}
