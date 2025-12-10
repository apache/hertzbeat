/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.tsdb.duckdb;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.math.NumberUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.TimePeriodUtil;
import org.apache.hertzbeat.warehouse.store.history.tsdb.AbstractHistoryDataStorage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAmount;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * data storage by duckdb
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.duckdb", name = "enabled", havingValue = "true")
@Slf4j
public class DuckdbDatabaseDataStorage extends AbstractHistoryDataStorage {

    private static final String DRIVER_NAME = "org.duckdb.DuckDBDriver";
    private static final String URL_PREFIX = "jdbc:duckdb:";

    // Ideal number of data points for charting (avoids frontend lag)
    private static final int TARGET_CHART_POINTS = 800;

    private final String expireTimeStr;
    private final String dbPath;
    private HikariDataSource dataSource;

    public DuckdbDatabaseDataStorage(DuckdbProperties duckdbProperties) {
        this.dbPath = duckdbProperties.storePath();
        this.expireTimeStr = duckdbProperties.expireTime();
        this.serverAvailable = initDuckDb();
        if (this.serverAvailable) {
            startExpiredDataCleaner();
        }
    }

    private boolean initDuckDb() {
        try {
            Class.forName(DRIVER_NAME);

            // Initialize HikariCP
            HikariConfig config = new HikariConfig();
            config.setJdbcUrl(URL_PREFIX + dbPath);
            config.setDriverClassName(DRIVER_NAME);
            config.setPoolName("DuckDB-Pool");
            // Important: Maintain at least one connection to keep the DB file lock held
            // and avoid frequent open/close of the embedded DB file which causes lock errors.
            config.setMinimumIdle(1);
            config.setMaximumPoolSize(10);
            config.setConnectionTimeout(30000);
            config.setConnectionTestQuery("SELECT 1");

            this.dataSource = new HikariDataSource(config);

            try (Connection connection = this.dataSource.getConnection();
                 Statement statement = connection.createStatement()) {

                String createTableSql = """
                        CREATE TABLE IF NOT EXISTS hzb_history (
                        instance VARCHAR,
                        app VARCHAR,
                        metrics VARCHAR,
                        metric VARCHAR,
                        metric_type SMALLINT,
                        int32_value INTEGER,
                        double_value DOUBLE,
                        str_value VARCHAR,
                        record_time BIGINT,
                        labels VARCHAR)""";
                statement.execute(createTableSql);
                // Re-add indexes for performance on queries and cleanup
                statement.execute("CREATE INDEX IF NOT EXISTS idx_hzb_history_composite ON hzb_history (instance, app, metrics, metric, record_time)");
                statement.execute("CREATE INDEX IF NOT EXISTS idx_hzb_history_record_time ON hzb_history (record_time)");
                return true;
            }
        } catch (Exception e) {
            log.error("Failed to init duckdb: {}", e.getMessage(), e);
            if (this.dataSource != null) {
                this.dataSource.close();
            }
            return false;
        }
    }

    private void startExpiredDataCleaner() {
        ScheduledExecutorService scheduledExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread thread = new Thread(r, "duckdb-cleaner");
            thread.setDaemon(true);
            return thread;
        });
        // Run every 1 hour
        scheduledExecutor.scheduleAtFixedRate(() -> {
            log.info("[duckdb] start data cleaner and checkpoint...");
            long expireTime;
            try {
                if (NumberUtils.isParsable(expireTimeStr)) {
                    expireTime = NumberUtils.toLong(expireTimeStr);
                    expireTime = (ZonedDateTime.now().toEpochSecond() - expireTime) * 1000L;
                } else {
                    TemporalAmount temporalAmount = TimePeriodUtil.parseTokenTime(expireTimeStr);
                    ZonedDateTime dateTime = ZonedDateTime.now().minus(temporalAmount);
                    expireTime = dateTime.toEpochSecond() * 1000L;
                }
            } catch (Exception e) {
                log.error("expiredDataCleaner time error: {}. use default expire time to clean: 30d", e.getMessage());
                ZonedDateTime dateTime = ZonedDateTime.now().minus(Duration.ofDays(30));
                expireTime = dateTime.toEpochSecond() * 1000L;
            }

            try (Connection connection = this.dataSource.getConnection()) {
                // 1. Delete expired data
                try (PreparedStatement statement = connection.prepareStatement("DELETE FROM hzb_history WHERE record_time < ?")) {
                    statement.setLong(1, expireTime);
                    int rows = statement.executeUpdate();
                    if (rows > 0) {
                        log.info("[duckdb] delete {} expired records.", rows);
                    }
                }

                // 2. Force Checkpoint to compress data and flush WAL
                // This is crucial for keeping file size small and moving data from WAL to column store
                try (Statement statement = connection.createStatement()) {
                    statement.execute("CHECKPOINT");
                }

            } catch (Exception e) {
                log.error("[duckdb] clean expired data error: {}", e.getMessage(), e);
            }
        }, 5, 60, TimeUnit.MINUTES);
    }

    @Override
    public void saveData(CollectRep.MetricsData metricsData) {
        if (!isServerAvailable() || metricsData.getCode() != CollectRep.Code.SUCCESS || metricsData.getValues().isEmpty()) {
            return;
        }

        String monitorType = metricsData.getApp();
        String metrics = metricsData.getMetrics();
        String insertSql = "INSERT INTO hzb_history VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection connection = this.dataSource.getConnection();
             PreparedStatement preparedStatement = connection.prepareStatement(insertSql)) {

            RowWrapper rowWrapper = metricsData.readRow();
            Map<String, String> labels = new HashMap<>();

            while (rowWrapper.hasNextRow()) {
                rowWrapper = rowWrapper.nextRow();
                long time = metricsData.getTime();

                // First pass: collect labels
                rowWrapper.cellStream().forEach(cell -> {
                    if (cell.getMetadataAsBoolean(MetricDataConstants.LABEL)) {
                        labels.put(cell.getField().getName(), cell.getValue());
                    }
                });
                String labelsJson = JsonUtil.toJson(labels);

                // Second pass: insert data
                rowWrapper.cellStream().forEach(cell -> {
                    try {
                        String metric = cell.getField().getName();
                        String columnValue = cell.getValue();
                        int fieldType = cell.getMetadataAsInteger(MetricDataConstants.TYPE);

                        preparedStatement.setString(1, metricsData.getInstance());
                        preparedStatement.setString(2, monitorType);
                        preparedStatement.setString(3, metrics);
                        preparedStatement.setString(4, metric);

                        if (CommonConstants.NULL_VALUE.equals(columnValue)) {
                            preparedStatement.setShort(5, (short) CommonConstants.TYPE_NUMBER);
                            preparedStatement.setObject(6, null);
                            preparedStatement.setObject(7, null);
                            preparedStatement.setObject(8, null);
                        } else {
                            switch (fieldType) {
                                case CommonConstants.TYPE_STRING -> {
                                    preparedStatement.setShort(5, (short) CommonConstants.TYPE_STRING);
                                    preparedStatement.setObject(6, null);
                                    preparedStatement.setObject(7, null);
                                    preparedStatement.setString(8, columnValue);
                                }
                                case CommonConstants.TYPE_TIME -> {
                                    preparedStatement.setShort(5, (short) CommonConstants.TYPE_TIME);
                                    preparedStatement.setInt(6, Integer.parseInt(columnValue));
                                    preparedStatement.setObject(7, null);
                                    preparedStatement.setObject(8, null);
                                }
                                default -> {
                                    preparedStatement.setShort(5, (short) CommonConstants.TYPE_NUMBER);
                                    preparedStatement.setObject(6, null);
                                    double v = Double.parseDouble(columnValue);
                                    preparedStatement.setDouble(7, v);
                                    preparedStatement.setObject(8, null);
                                }
                            }
                        }
                        preparedStatement.setLong(9, time);
                        preparedStatement.setString(10, labelsJson);
                        preparedStatement.addBatch();
                    } catch (SQLException e) {
                        log.error("error setting prepared statement", e);
                    }
                });
                labels.clear();
            }
            preparedStatement.executeBatch();
        } catch (Exception e) {
            log.error("[duckdb] save data error: {}", e.getMessage(), e);
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(String instance, String app, String metrics, String metric, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            return instanceValuesMap;
        }

        StringBuilder sqlBuilder = new StringBuilder("""
            SELECT record_time,
            metric_type,
            int32_value,
            double_value,
            str_value,
            labels FROM hzb_history
            WHERE instance = ?
            AND app = ?
            AND metrics = ?
            AND metric = ?
            """);

        long timeBefore = 0;
        if (history != null) {
            try {
                TemporalAmount temporalAmount = TimePeriodUtil.parseTokenTime(history);
                ZonedDateTime dateTime = ZonedDateTime.now().minus(temporalAmount);
                timeBefore = dateTime.toEpochSecond() * 1000L;
                sqlBuilder.append(" AND record_time >= ?");
            } catch (Exception e) {
                log.error("parse history time error: {}", e.getMessage());
            }
        }
        sqlBuilder.append(" ORDER BY record_time DESC LIMIT 20000"); // Add safety limit for raw data

        try (Connection connection = this.dataSource.getConnection();
             PreparedStatement preparedStatement = connection.prepareStatement(sqlBuilder.toString())) {

            preparedStatement.setString(1, instance);
            preparedStatement.setString(2, app);
            preparedStatement.setString(3, metrics);
            preparedStatement.setString(4, metric);
            if (timeBefore > 0) {
                preparedStatement.setLong(5, timeBefore);
            }

            try (ResultSet resultSet = preparedStatement.executeQuery()) {
                while (resultSet.next()) {
                    long time = resultSet.getLong("record_time");
                    int type = resultSet.getShort("metric_type");
                    String labels = resultSet.getString("labels");
                    String value = formatValue(type, resultSet);

                    List<Value> valueList = instanceValuesMap.computeIfAbsent(labels == null ? "" : labels, k -> new LinkedList<>());
                    valueList.add(new Value(value, time));
                }
            }
        } catch (SQLException e) {
            log.error("[duckdb] query data error: {}", e.getMessage(), e);
        }
        return instanceValuesMap;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(String instance, String app, String metrics, String metric, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            return instanceValuesMap;
        }

        long timeBefore = 0;
        long endTime = System.currentTimeMillis();
        long interval = 0;

        if (history != null) {
            try {
                TemporalAmount temporalAmount = TimePeriodUtil.parseTokenTime(history);
                ZonedDateTime dateTime = ZonedDateTime.now().minus(temporalAmount);
                timeBefore = dateTime.toEpochSecond() * 1000L;
                // Calculate bucket interval based on desired target points (e.g. 800 points on chart)
                interval = (endTime - timeBefore) / TARGET_CHART_POINTS;
                // Minimum interval 1 minute
                if (interval < 60000) {
                    interval = 60000;
                }
            } catch (Exception e) {
                log.error("parse history time error: {}", e.getMessage());
                // Fallback defaults
                timeBefore = System.currentTimeMillis() - 24 * 60 * 60 * 1000L;
                interval = 60 * 1000L;
            }
        }

        // DuckDB Aggregation Query: Group by time bucket
        // We use casting to integer division for bucketing: (time / interval) * interval
        String sql = """
                SELECT
                CAST(record_time / ? AS BIGINT) * ? AS ts_bucket,
                AVG(double_value) AS avg_val,
                MIN(double_value) AS min_val,
                MAX(double_value) AS max_val,
                FIRST(str_value) AS str_val,
                metric_type, labels
                FROM hzb_history
                WHERE instance = ? AND app = ? AND metrics = ? AND metric = ? AND record_time >= ?
                GROUP BY ts_bucket, metric_type, labels
                ORDER BY ts_bucket""";

        try (Connection connection = this.dataSource.getConnection();
             PreparedStatement preparedStatement = connection.prepareStatement(sql)) {

            preparedStatement.setLong(1, interval);
            preparedStatement.setLong(2, interval);
            preparedStatement.setString(3, instance);
            preparedStatement.setString(4, app);
            preparedStatement.setString(5, metrics);
            preparedStatement.setString(6, metric);
            preparedStatement.setLong(7, timeBefore);

            try (ResultSet resultSet = preparedStatement.executeQuery()) {
                while (resultSet.next()) {
                    long time = resultSet.getLong("ts_bucket");
                    int type = resultSet.getShort("metric_type");
                    String labels = resultSet.getString("labels");

                    Value valueObj;
                    if (type == CommonConstants.TYPE_NUMBER) {
                        double avg = resultSet.getDouble("avg_val");
                        double min = resultSet.getDouble("min_val");
                        double max = resultSet.getDouble("max_val");
                        if (resultSet.wasNull()) {
                            valueObj = new Value(null, time);
                        } else {
                            String avgStr = BigDecimal.valueOf(avg).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                            String minStr = BigDecimal.valueOf(min).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                            String maxStr = BigDecimal.valueOf(max).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                            valueObj = new Value(avgStr, time);
                            valueObj.setMean(avgStr);
                            valueObj.setMin(minStr);
                            valueObj.setMax(maxStr);
                        }
                    } else {
                        // For non-numeric, we just took the FIRST value in the bucket
                        String strVal = resultSet.getString("str_val");
                        valueObj = new Value(strVal, time);
                    }

                    List<Value> valueList = instanceValuesMap.computeIfAbsent(labels == null ? "" : labels, k -> new LinkedList<>());
                    valueList.add(valueObj);
                }
            }
        } catch (SQLException e) {
            log.error("[duckdb] query interval data error: {}", e.getMessage(), e);
        }
        return instanceValuesMap;
    }

    private String formatValue(int type, ResultSet resultSet) throws SQLException {
        if (type == CommonConstants.TYPE_NUMBER) {
            double v = resultSet.getDouble("double_value");
            if (!resultSet.wasNull()) {
                return BigDecimal.valueOf(v).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
            }
        } else if (type == CommonConstants.TYPE_TIME) {
            int v = resultSet.getInt("int32_value");
            if (!resultSet.wasNull()) {
                return String.valueOf(v);
            }
        } else {
            return resultSet.getString("str_value");
        }
        return "";
    }

    @Override
    public void destroy() throws Exception {
        if (this.dataSource != null) {
            this.dataSource.close();
        }
    }
}
