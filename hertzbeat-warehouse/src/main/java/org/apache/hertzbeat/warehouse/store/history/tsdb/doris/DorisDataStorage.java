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

package org.apache.hertzbeat.warehouse.store.history.tsdb.doris;

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
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAmount;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Apache Doris data storage.
 * Supports two write modes:
 * - jdbc: Traditional JDBC batch insert (default, suitable for small to medium scale)
 * - stream: HTTP Stream Load API (high throughput, suitable for large scale)
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.doris", name = "enabled", havingValue = "true")
@Slf4j
public class DorisDataStorage extends AbstractHistoryDataStorage {

    private static final String DRIVER_NAME = "com.mysql.cj.jdbc.Driver";
    private static final String DATABASE_NAME = "hertzbeat";
    private static final String TABLE_NAME = "hzb_history";
    private static final String WRITE_MODE_JDBC = "jdbc";
    private static final String WRITE_MODE_STREAM = "stream";

    /**
     * Metric type constants
     */
    private static final byte METRIC_TYPE_NUMBER = 1;
    private static final byte METRIC_TYPE_STRING = 2;
    private static final byte METRIC_TYPE_TIME = 3;

    private static final String LABEL_KEY_START_TIME = "start";
    private static final String LABEL_KEY_END_TIME = "end";
    private static final int MAX_QUERY_LIMIT = 20000;
    private static final long MAX_WAIT_MS = 500L;
    private static final int MAX_RETRIES = 3;

    private final DorisProperties properties;
    private HikariDataSource dataSource;

    private final BlockingQueue<DorisMetricRow> metricsBufferQueue;
    private final DorisProperties.WriteConfig writeConfig;
    private String writeMode;
    private final AtomicBoolean draining = new AtomicBoolean(false);
    private volatile boolean flushThreadRunning = true;
    private Thread flushThread;

    // Stream Load writer (only used when writeMode is "stream")
    private DorisStreamLoadWriter streamLoadWriter;

    public DorisDataStorage(DorisProperties dorisProperties) {
        if (dorisProperties == null) {
            log.error("[Doris] Init error, please config Warehouse Doris props in application.yml");
            throw new IllegalArgumentException("please config Warehouse Doris props");
        }
        this.properties = dorisProperties;
        this.writeConfig = dorisProperties.writeConfig();
        this.writeMode = writeConfig.writeMode();
        this.metricsBufferQueue = new LinkedBlockingQueue<>(writeConfig.batchSize() * 10);

        serverAvailable = initDorisConnection();
        if (serverAvailable) {
            // Initialize Stream Load writer if using stream mode
            if (WRITE_MODE_STREAM.equals(writeMode)) {
                initStreamLoadWriter();
            }
            startFlushThread();
        }

        log.info("[Doris] Initialized with write mode: {}", writeMode);
    }

    /**
     * Initialize Doris connection and table in one go.
     */
    private boolean initDorisConnection() {
        try {
            Class.forName(DRIVER_NAME);

            DorisProperties.PoolConfig poolConfig = properties.poolConfig();
            String baseUrl = properties.url();

            // Step 1: First connect without database to create it if needed
            try (Connection initConn = java.sql.DriverManager.getConnection(
                    baseUrl, properties.username(), properties.password());
                 Statement stmt = initConn.createStatement()) {
                // Create database if not exists
                stmt.execute("CREATE DATABASE IF NOT EXISTS " + DATABASE_NAME);
                log.info("[Doris] Database {} ensured", DATABASE_NAME);
            }

            // Step 2: Build URL with database
            String urlWithDb = baseUrl.endsWith("/") ? baseUrl + DATABASE_NAME : baseUrl + "/" + DATABASE_NAME;

            // Step 3: Create connection pool with database
            HikariConfig config = new HikariConfig();
            config.setJdbcUrl(urlWithDb);
            config.setUsername(properties.username());
            config.setPassword(properties.password());
            config.setDriverClassName(DRIVER_NAME);
            config.setMinimumIdle(poolConfig.minimumIdle());
            config.setMaximumPoolSize(poolConfig.maximumPoolSize());
            config.setConnectionTimeout(poolConfig.connectionTimeout());
            config.setMaxLifetime(poolConfig.maxLifetime());
            config.setIdleTimeout(poolConfig.idleTimeout());
            config.setConnectionTestQuery("SELECT 1");
            config.setPoolName("Doris-HikariCP");

            this.dataSource = new HikariDataSource(config);

            // Step 4: Create table
            try (Connection conn = dataSource.getConnection();
                 Statement stmt = conn.createStatement()) {
                stmt.execute(buildCreateTableSql());
                log.info("[Doris] Table {} ensured", TABLE_NAME);
            }

            log.info("[Doris] Initialized: {}", urlWithDb);
            return true;
        } catch (ClassNotFoundException e) {
            log.error("[Doris] MySQL JDBC driver not found.", e);
        } catch (Exception e) {
            log.error("[Doris] Failed to initialize: {}", e.getMessage(), e);
        }
        return false;
    }

    /**
     * Initialize Stream Load writer
     */
    private void initStreamLoadWriter() {
        try {
            this.streamLoadWriter = new DorisStreamLoadWriter(
                    DATABASE_NAME, TABLE_NAME, properties.url(),
                    properties.username(), properties.password(),
                    writeConfig.streamLoadConfig()
            );
            if (streamLoadWriter.isAvailable()) {
                log.info("[Doris] Stream Load writer initialized.");
            } else {
                log.warn("[Doris] Stream Load writer failed, fallback to JDBC.");
                this.writeMode = WRITE_MODE_JDBC;
            }
        } catch (Exception e) {
            log.error("[Doris] Stream Load init failed: {}", e.getMessage(), e);
            this.writeMode = WRITE_MODE_JDBC;
        }
    }

    /**
     * Build CREATE TABLE SQL statement
     */
    private String buildCreateTableSql() {
        DorisProperties.TableConfig config = properties.tableConfig();

        StringBuilder sql = new StringBuilder();
        sql.append("CREATE TABLE IF NOT EXISTS ").append(TABLE_NAME).append(" (\n");
        // DUPLICATE KEY columns must be the first columns in table definition
        sql.append("    instance                VARCHAR(128)   COMMENT 'Monitor instance address',\n");
        sql.append("    app                     VARCHAR(64)    COMMENT 'Monitor application type',\n");
        sql.append("    metrics                 VARCHAR(128)   COMMENT 'Metrics set name',\n");
        sql.append("    metric                  VARCHAR(128)   COMMENT 'Metric name',\n");
        sql.append("    record_time             DATETIME       COMMENT 'Record time',\n");
        // Non-key columns
        sql.append("    metric_type             TINYINT        COMMENT 'Metric type: 1-number, 2-string, 3-time',\n");
        sql.append("    int32_value             INT            COMMENT 'Integer value',\n");
        sql.append("    double_value            DOUBLE         COMMENT 'Double value',\n");
        sql.append("    str_value               VARCHAR(65533) COMMENT 'String value',\n");
        sql.append("    labels                  VARCHAR(").append(config.strColumnMaxLength())
                .append(")  COMMENT 'Labels JSON'\n");
        sql.append(") DUPLICATE KEY(instance, app, metrics, metric, record_time)\n");

        if (config.enablePartition()) {
            // Dynamic partition mode
            sql.append("PARTITION BY RANGE(record_time) ()\n");
            sql.append("DISTRIBUTED BY HASH(instance, app) BUCKETS ").append(config.buckets()).append("\n");
            sql.append("PROPERTIES (\n");
            sql.append("    \"replication_num\" = \"").append(config.replicationNum()).append("\",\n");
            sql.append("    \"dynamic_partition.enable\" = \"true\",\n");
            sql.append("    \"dynamic_partition.time_unit\" = \"").append(config.partitionTimeUnit()).append("\",\n");
            sql.append("    \"dynamic_partition.end\" = \"").append(config.partitionFutureDays()).append("\",\n");
            sql.append("    \"dynamic_partition.prefix\" = \"p\",\n");
            sql.append("    \"dynamic_partition.buckets\" = \"").append(config.buckets()).append("\",\n");
            sql.append("    \"dynamic_partition.history_partition_num\" = \"").append(config.partitionRetentionDays())
                    .append("\"\n");
            sql.append(")");
        } else {
            // Single table mode
            sql.append("DISTRIBUTED BY HASH(instance) BUCKETS ").append(config.buckets()).append("\n");
            sql.append("PROPERTIES (\n");
            sql.append("    \"replication_num\" = \"").append(config.replicationNum()).append("\"\n");
            sql.append(")");
        }

        return sql.toString();
    }

    /**
     * Start the background flush thread
     */
    private void startFlushThread() {
        flushThread = new Thread(() -> {
            while (flushThreadRunning || !metricsBufferQueue.isEmpty()) {
                try {
                    List<DorisMetricRow> batch = new ArrayList<>(writeConfig.batchSize());

                    // Wait for data or timeout
                    DorisMetricRow first = metricsBufferQueue.poll(writeConfig.flushInterval(), TimeUnit.SECONDS);
                    if (first != null) {
                        batch.add(first);
                        // Drain remaining items up to batch size
                        metricsBufferQueue.drainTo(batch, writeConfig.batchSize() - 1);
                    }

                    if (!batch.isEmpty()) {
                        doSaveData(batch);
                        log.debug("[Doris] Flushed {} metrics items", batch.size());
                    }

                    draining.set(false);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.debug("[Doris] Flush thread interrupted");
                } catch (Exception e) {
                    log.error("[Doris] Flush thread error: {}", e.getMessage(), e);
                }
            }
            log.info("[Doris] Flush thread stopped");
        }, "doris-metrics-flush");
        flushThread.setDaemon(true);
        flushThread.start();
        log.info("[Doris] Started metrics flush thread with interval {} seconds", writeConfig.flushInterval());
    }

    private String normalizeApp(String app) {
        if (app != null && app.startsWith(CommonConstants.PROMETHEUS_APP_PREFIX)) {
            return CommonConstants.PROMETHEUS;
        }
        return app;
    }

    @Override
    public void saveData(CollectRep.MetricsData metricsData) {
        if (!isServerAvailable() || metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return;
        }
        if (metricsData.getValues().isEmpty()) {
            log.info("[Doris] Flush metrics data {} {} is null, ignore.", metricsData.getId(),
                    metricsData.getMetrics());
            return;
        }

        String instance = metricsData.getInstance();
        String app = normalizeApp(metricsData.getApp());
        String metrics = metricsData.getMetrics();
        long timestamp = metricsData.getTime();

        List<CollectRep.Field> fields = metricsData.getFields();
        Map<String, String> customLabels = metricsData.getLabels();

        List<DorisMetricRow> rows = new ArrayList<>();

        try {
            RowWrapper rowWrapper = metricsData.readRow();
            while (rowWrapper.hasNextRow()) {
                rowWrapper = rowWrapper.nextRow();

                Map<String, String> rowLabels = new HashMap<>();

                // Add custom labels
                if (customLabels != null && !customLabels.isEmpty()) {
                    customLabels.forEach((k, v) -> rowLabels.put(k, String.valueOf(v)));
                }

                rowWrapper.cellStream().forEach(cell -> {
                    String value = cell.getValue();
                    boolean isLabel = cell.getMetadataAsBoolean(MetricDataConstants.LABEL);
                    byte type = cell.getMetadataAsByte(MetricDataConstants.TYPE);
                    String fieldName = cell.getField().getName();

                    if (CommonConstants.NULL_VALUE.equals(value)) {
                        return;
                    }

                    if (isLabel) {
                        rowLabels.put(fieldName, value);
                    } else {
                        // Create a metric row for each field
                        DorisMetricRow row = new DorisMetricRow();
                        row.instance = instance;
                        row.app = app;
                        row.metrics = metrics;
                        row.metric = fieldName;
                        row.recordTime = new Timestamp(timestamp);
                        row.labels = JsonUtil.toJson(rowLabels);

                        if (type == CommonConstants.TYPE_NUMBER) {
                            row.metricType = METRIC_TYPE_NUMBER;
                            try {
                                row.doubleValue = Double.parseDouble(value);
                            } catch (NumberFormatException e) {
                                log.debug("[Doris] Failed to parse number value: {}", value);
                                return;
                            }
                        } else if (type == CommonConstants.TYPE_STRING) {
                            row.metricType = METRIC_TYPE_STRING;
                            row.strValue = value;
                        } else if (type == CommonConstants.TYPE_TIME) {
                            row.metricType = METRIC_TYPE_TIME;
                            try {
                                row.int32Value = Integer.parseInt(value);
                            } catch (NumberFormatException e) {
                                log.debug("[Doris] Failed to parse time value: {}", value);
                                return;
                            }
                        } else {
                            row.metricType = METRIC_TYPE_STRING;
                            row.strValue = value;
                        }

                        rows.add(row);
                    }
                });
            }

        } catch (Exception e) {
            log.error("[Doris] Error processing metrics data: {}", e.getMessage(), e);
            return;
        }

        if (rows.isEmpty()) {
            log.debug("[Doris] No valid metrics data to save for {} {}", app, metrics);
            return;
        }

        sendToBuffer(rows);
    }

    /**
     * Send metrics to buffer queue
     */
    private void sendToBuffer(List<DorisMetricRow> rows) {
        for (DorisMetricRow row : rows) {
            boolean offered = false;
            int retryCount = 0;
            while (!offered && retryCount < MAX_RETRIES) {
                try {
                    offered = metricsBufferQueue.offer(row, MAX_WAIT_MS, TimeUnit.MILLISECONDS);
                    if (!offered) {
                        if (retryCount == 0) {
                            log.debug("[Doris] Buffer queue is full, triggering immediate flush");
                            triggerImmediateFlush();
                        }
                        retryCount++;
                        if (retryCount < MAX_RETRIES) {
                            Thread.sleep(100L * retryCount);
                        }
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.error("[Doris] Interrupted while offering metrics to buffer queue", e);
                    break;
                }
            }
            if (!offered) {
                log.warn("[Doris] Failed to add metrics to buffer after {} retries, saving directly", MAX_RETRIES);
                doSaveData(rows);
                return;
            }
        }

        // Trigger early flush if buffer is almost full
        if (metricsBufferQueue.size() >= writeConfig.batchSize() * 8 && draining.compareAndSet(false, true)) {
            triggerImmediateFlush();
        }
    }

    /**
     * Trigger immediate flush
     */
    private void triggerImmediateFlush() {
        List<DorisMetricRow> batch = new ArrayList<>(writeConfig.batchSize());
        metricsBufferQueue.drainTo(batch, writeConfig.batchSize());
        draining.set(false);
        if (!batch.isEmpty()) {
            Thread flushNow = new Thread(() -> doSaveData(batch), "doris-immediate-flush");
            flushNow.setDaemon(true);
            flushNow.start();
        }
    }

    /**
     * Actually save data to Doris
     * Uses either JDBC batch insert or Stream Load based on writeMode configuration
     */
    private void doSaveData(List<DorisMetricRow> rows) {
        if (rows == null || rows.isEmpty()) {
            return;
        }

        if (WRITE_MODE_STREAM.equals(writeMode) && streamLoadWriter != null) {
            // Use Stream Load for high-throughput writes
            boolean success = streamLoadWriter.write(rows);
            if (!success) {
                if (writeConfig.fallbackToJdbcOnFailure()) {
                    log.warn("[Doris] Stream Load failed, fallbackToJdbcOnFailure=true, use JDBC for this batch");
                    doSaveDataJdbc(rows);
                } else {
                    log.error("[Doris] Stream Load failed and JDBC fallback is disabled. rows={}", rows.size());
                }
            }
        } else {
            // Use JDBC batch insert (default)
            doSaveDataJdbc(rows);
        }
    }

    /**
     * Save data using JDBC batch insert
     */
    private void doSaveDataJdbc(List<DorisMetricRow> rows) {
        if (rows == null || rows.isEmpty()) {
            return;
        }

        String insertSql = """
                INSERT INTO %s.%s (instance, app, metrics, metric, metric_type, int32_value, double_value, str_value, record_time, labels)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                .formatted(DATABASE_NAME, TABLE_NAME);

        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);

            try (PreparedStatement pstmt = conn.prepareStatement(insertSql)) {
                for (DorisMetricRow row : rows) {
                    pstmt.setString(1, row.instance);
                    pstmt.setString(2, row.app);
                    pstmt.setString(3, row.metrics);
                    pstmt.setString(4, row.metric);
                    pstmt.setByte(5, row.metricType);

                    if (row.int32Value != null) {
                        pstmt.setInt(6, row.int32Value);
                    } else {
                        pstmt.setNull(6, java.sql.Types.INTEGER);
                    }

                    if (row.doubleValue != null) {
                        pstmt.setDouble(7, row.doubleValue);
                    } else {
                        pstmt.setNull(7, java.sql.Types.DOUBLE);
                    }

                    pstmt.setString(8, row.strValue);
                    pstmt.setTimestamp(9, row.recordTime);
                    pstmt.setString(10, row.labels);

                    pstmt.addBatch();
                }

                pstmt.executeBatch();
                conn.commit();
                log.debug("[Doris] Successfully saved {} metrics rows", rows.size());

            } catch (SQLException e) {
                conn.rollback();
                throw e;
            }
        } catch (SQLException e) {
            log.error("[Doris] Failed to save metrics data: {}", e.getMessage(), e);
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(String instance, String app, String metrics, String metric,
            String history) {
        if (!isServerAvailable()) {
            return Collections.emptyMap();
        }

        Map<String, Long> timeRange = getTimeRange(history);
        Long start = timeRange.get(LABEL_KEY_START_TIME);
        Long end = timeRange.get(LABEL_KEY_END_TIME);

        return queryMetricData(instance, app, metrics, metric, start, end);
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(String instance, String app, String metrics,
            String metric, String history) {
        if (!isServerAvailable()) {
            log.error("""

                    \t---------------Doris Init Failed---------------
                    \t--------------Please Config Doris--------------
                    \t----------Can Not Use Metric History Now----------
                    """);
            return Collections.emptyMap();
        }

        Map<String, Long> timeRange = getTimeRange(history);
        Long start = timeRange.get(LABEL_KEY_START_TIME);
        Long end = timeRange.get(LABEL_KEY_END_TIME);

        // First get the basic data
        Map<String, List<Value>> instanceValuesMap = queryMetricData(instance, app, metrics, metric, start, end);

        if (instanceValuesMap.isEmpty()) {
            return Collections.emptyMap();
        }

        // Calculate aggregations for each label group
        try {
            queryAndSetAggregations(instanceValuesMap, instance, app, metrics, metric, start, end);
        } catch (Exception e) {
            log.error("[Doris] Error calculating aggregations: {}", e.getMessage(), e);
        }

        return instanceValuesMap;
    }

    /**
     * Query metric data from Doris
     */
    private Map<String, List<Value>> queryMetricData(String instance, String app, String metrics, String metric,
            long startTime, long endTime) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>();

        String sql = """
                SELECT record_time, metric_type, int32_value, double_value, str_value, labels
                FROM %s.%s
                WHERE instance = ? AND app = ? AND metrics = ? AND metric = ?
                AND record_time >= ? AND record_time <= ?
                ORDER BY record_time DESC
                LIMIT %d
                """.formatted(DATABASE_NAME, TABLE_NAME, MAX_QUERY_LIMIT);

        try (Connection conn = dataSource.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, instance);
            pstmt.setString(2, app);
            pstmt.setString(3, metrics);
            pstmt.setString(4, metric);
            pstmt.setTimestamp(5, new Timestamp(startTime * 1000));
            pstmt.setTimestamp(6, new Timestamp(endTime * 1000));

            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Timestamp recordTime = rs.getTimestamp("record_time");
                    byte metricType = rs.getByte("metric_type");
                    String labels = rs.getString("labels");

                    String valueStr;
                    if (metricType == METRIC_TYPE_NUMBER) {
                        double doubleValue = rs.getDouble("double_value");
                        if (!rs.wasNull()) {
                            valueStr = BigDecimal.valueOf(doubleValue)
                                    .setScale(4, RoundingMode.HALF_UP)
                                    .stripTrailingZeros()
                                    .toPlainString();
                        } else {
                            continue;
                        }
                    } else if (metricType == METRIC_TYPE_TIME) {
                        int intValue = rs.getInt("int32_value");
                        if (!rs.wasNull()) {
                            valueStr = String.valueOf(intValue);
                        } else {
                            continue;
                        }
                    } else {
                        valueStr = rs.getString("str_value");
                        if (valueStr == null) {
                            continue;
                        }
                    }

                    String labelKey = labels != null ? labels : "{}";
                    List<Value> valueList = instanceValuesMap.computeIfAbsent(labelKey, k -> new LinkedList<>());
                    valueList.add(new Value(valueStr, recordTime.getTime()));
                }
            }

            log.debug("[Doris] Query returned {} label groups", instanceValuesMap.size());

        } catch (SQLException e) {
            log.error("[Doris] Failed to query metrics data: {}", e.getMessage(), e);
        }

        return instanceValuesMap;
    }

    /**
     * Query and set aggregation values (max, min, avg)
     */
    private void queryAndSetAggregations(Map<String, List<Value>> instanceValuesMap,
            String instance, String app, String metrics, String metric,
            long startTime, long endTime) {
        // Calculate step based on time range
        long duration = endTime - startTime;
        int stepSeconds;

        if (duration < Duration.ofDays(1).getSeconds()) {
            stepSeconds = 60;
        } else if (duration < Duration.ofDays(7).getSeconds()) {
            stepSeconds = 3600; // 1 hour
        } else {
            stepSeconds = 14400; // 4 hours
        }

        String aggregationSql = """
                SELECT
                    labels,
                    FLOOR(UNIX_TIMESTAMP(record_time) / %d) * %d AS time_bucket,
                    MAX(double_value) as max_val,
                    MIN(double_value) as min_val,
                    AVG(double_value) as avg_val
                FROM %s.%s
                WHERE instance = ? AND app = ? AND metrics = ? AND metric = ?
                AND record_time >= ? AND record_time <= ?
                AND metric_type = %d
                GROUP BY labels, time_bucket
                ORDER BY time_bucket
                """.formatted(stepSeconds, stepSeconds, DATABASE_NAME, TABLE_NAME, METRIC_TYPE_NUMBER);

        try (Connection conn = dataSource.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(aggregationSql)) {

            pstmt.setString(1, instance);
            pstmt.setString(2, app);
            pstmt.setString(3, metrics);
            pstmt.setString(4, metric);
            pstmt.setTimestamp(5, new Timestamp(startTime * 1000));
            pstmt.setTimestamp(6, new Timestamp(endTime * 1000));

            Map<String, Map<Long, double[]>> labelBucketAggregations = new HashMap<>();

            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    String labels = rs.getString("labels");
                    long timeBucket = rs.getLong("time_bucket");
                    double maxVal = rs.getDouble("max_val");
                    double minVal = rs.getDouble("min_val");
                    double avgVal = rs.getDouble("avg_val");

                    String labelKey = labels != null ? labels : "{}";
                    Map<Long, double[]> bucketMap = labelBucketAggregations.computeIfAbsent(labelKey,
                            k -> new HashMap<>());
                    bucketMap.put(timeBucket * 1000, new double[] { maxVal, minVal, avgVal });
                }
            }

            // Apply aggregations to values
            for (Map.Entry<String, List<Value>> entry : instanceValuesMap.entrySet()) {
                String labelKey = entry.getKey();
                List<Value> values = entry.getValue();
                Map<Long, double[]> bucketMap = labelBucketAggregations.get(labelKey);

                if (bucketMap != null) {
                    for (Value value : values) {
                        // Find the matching bucket
                        long valueBucket = (value.getTime() / (stepSeconds * 1000L)) * (stepSeconds * 1000L);
                        double[] aggregations = bucketMap.get(valueBucket);
                        if (aggregations != null) {
                            value.setMax(formatDouble(aggregations[0]));
                            value.setMin(formatDouble(aggregations[1]));
                            value.setMean(formatDouble(aggregations[2]));
                        }
                    }
                }
            }

        } catch (SQLException e) {
            log.error("[Doris] Failed to query aggregations: {}", e.getMessage(), e);
        }
    }

    /**
     * Format double value to string
     */
    private String formatDouble(double value) {
        return BigDecimal.valueOf(value)
                .setScale(4, RoundingMode.HALF_UP)
                .stripTrailingZeros()
                .toPlainString();
    }

    /**
     * Get time range based on history parameter
     */
    private Map<String, Long> getTimeRange(String history) {
        Instant now = Instant.now();
        long start;
        try {
            if (NumberUtils.isParsable(history)) {
                start = NumberUtils.toLong(history);
                start = ZonedDateTime.now().toEpochSecond() - start;
            } else {
                TemporalAmount temporalAmount = TimePeriodUtil.parseTokenTime(history);
                assert temporalAmount != null;
                Instant dateTime = now.minus(temporalAmount);
                start = dateTime.getEpochSecond();
            }
        } catch (Exception e) {
            log.error("[Doris] History time error: {}. Using default: 6h", e.getMessage());
            start = now.minus(6, ChronoUnit.HOURS).getEpochSecond();
        }
        long end = now.getEpochSecond();
        return Map.of(LABEL_KEY_START_TIME, start, LABEL_KEY_END_TIME, end);
    }

    @Override
    public void destroy() {
        log.info("[Doris] Shutting down...");

        flushThreadRunning = false;

        // Interrupt flush thread and wait for it to finish
        if (flushThread != null && flushThread.isAlive()) {
            flushThread.interrupt();
            try {
                flushThread.join(10000); // Wait up to 10 seconds
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        // Flush remaining data
        List<DorisMetricRow> remaining = new ArrayList<>();
        metricsBufferQueue.drainTo(remaining);
        if (!remaining.isEmpty()) {
            log.info("[Doris] Flushing {} remaining metrics before shutdown", remaining.size());
            doSaveData(remaining);
        }

        // Close data source
        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
            log.info("[Doris] Connection pool closed.");
        }

        // Close Stream Load writer
        if (streamLoadWriter != null) {
            streamLoadWriter.close();
            log.info("[Doris] Stream Load writer closed.");
        }
    }

}
