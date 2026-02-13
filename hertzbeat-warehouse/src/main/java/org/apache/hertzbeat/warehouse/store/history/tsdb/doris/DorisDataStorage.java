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
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.TimePeriodUtil;
import org.apache.hertzbeat.warehouse.WarehouseWorkerPool;
import org.apache.hertzbeat.warehouse.store.history.tsdb.AbstractHistoryDataStorage;
import org.jetbrains.annotations.NotNull;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

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
import java.util.Objects;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
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
    private static final String LOG_TABLE_NAME = "hzb_log";
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
    private static final int LOG_BATCH_SIZE = 1000;
    private static final long NANOS_PER_MILLISECOND = 1_000_000L;
    private static final long MAX_WAIT_MS = 500L;
    private static final int MAX_RETRIES = 3;
    private static final String METRIC_BLOOM_FILTER_COLUMNS = "instance,app,metrics,metric";
    private static final String LOG_BLOOM_FILTER_COLUMNS = "trace_id,span_id,severity_number,severity_text";

    private final DorisProperties properties;
    private HikariDataSource dataSource;

    private final BlockingQueue<DorisMetricRow> metricsBufferQueue;
    private final DorisProperties.WriteConfig writeConfig;
    private final WarehouseWorkerPool warehouseWorkerPool;
    private String writeMode;
    private final AtomicBoolean draining = new AtomicBoolean(false);
    private volatile boolean flushThreadRunning = true;
    private volatile boolean flushTaskStarted;
    private final CountDownLatch flushTaskStopped = new CountDownLatch(1);

    // Stream Load writer (only used when writeMode is "stream")
    private DorisStreamLoadWriter streamLoadWriter;
    private DorisStreamLoadWriter logStreamLoadWriter;

    public DorisDataStorage(DorisProperties dorisProperties, WarehouseWorkerPool warehouseWorkerPool) {
        if (dorisProperties == null) {
            log.error("[Doris] Init error, please config Warehouse Doris props in application.yml");
            throw new IllegalArgumentException("please config Warehouse Doris props");
        }
        if (warehouseWorkerPool == null) {
            throw new IllegalArgumentException("please config WarehouseWorkerPool bean");
        }
        this.properties = dorisProperties;
        this.warehouseWorkerPool = warehouseWorkerPool;
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
            HikariConfig config = getHikariConfig(urlWithDb, poolConfig);

            this.dataSource = new HikariDataSource(config);

            // Step 4: Create table
            try (Connection conn = dataSource.getConnection();
                 Statement stmt = conn.createStatement()) {
                stmt.execute(buildCreateTableSql());
                log.info("[Doris] Table {} ensured", TABLE_NAME);
                stmt.execute(buildCreateLogTableSql());
                log.info("[Doris] Table {} ensured", LOG_TABLE_NAME);
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

    @NotNull
    private HikariConfig getHikariConfig(String urlWithDb, DorisProperties.PoolConfig poolConfig) {
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
        return config;
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

            this.logStreamLoadWriter = new DorisStreamLoadWriter(
                    DATABASE_NAME, LOG_TABLE_NAME, properties.url(),
                    properties.username(), properties.password(),
                    writeConfig.streamLoadConfig()
            );
            if (logStreamLoadWriter.isAvailable()) {
                log.info("[Doris] Log Stream Load writer initialized.");
            } else {
                log.warn("[Doris] Log Stream Load writer unavailable, log writes fallback to JDBC.");
                this.logStreamLoadWriter = null;
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
            sql.append("DISTRIBUTED BY HASH(instance, app, metrics) BUCKETS ").append(config.buckets()).append("\n");
            sql.append("PROPERTIES (\n");
            sql.append("    \"replication_num\" = \"").append(config.replicationNum()).append("\",\n");
            sql.append("    \"bloom_filter_columns\" = \"").append(METRIC_BLOOM_FILTER_COLUMNS).append("\",\n");
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
            sql.append("DISTRIBUTED BY HASH(instance, app, metrics) BUCKETS ").append(config.buckets()).append("\n");
            sql.append("PROPERTIES (\n");
            sql.append("    \"replication_num\" = \"").append(config.replicationNum()).append("\",\n");
            sql.append("    \"bloom_filter_columns\" = \"").append(METRIC_BLOOM_FILTER_COLUMNS).append("\"\n");
            sql.append(")");
        }

        return sql.toString();
    }

    /**
     * Build CREATE LOG TABLE SQL statement
     */
    private String buildCreateLogTableSql() {
        DorisProperties.TableConfig config = properties.tableConfig();

        StringBuilder sql = new StringBuilder();
        sql.append("CREATE TABLE IF NOT EXISTS ").append(LOG_TABLE_NAME).append(" (\n");
        sql.append("    time_unix_nano          BIGINT         COMMENT 'event unix time in nanoseconds',\n");
        sql.append("    trace_id                VARCHAR(64)    COMMENT 'trace id',\n");
        sql.append("    span_id                 VARCHAR(32)    COMMENT 'span id',\n");
        sql.append("    event_time              DATETIME       COMMENT 'event time for partition and query',\n");
        sql.append("    observed_time_unix_nano BIGINT         COMMENT 'observed unix time in nanoseconds',\n");
        sql.append("    severity_number         INT            COMMENT 'severity number',\n");
        sql.append("    severity_text           VARCHAR(32)    COMMENT 'severity text',\n");
        sql.append("    body                    VARCHAR(65533) COMMENT 'log body json',\n");
        sql.append("    trace_flags             INT            COMMENT 'trace flags',\n");
        sql.append("    attributes              VARCHAR(65533) COMMENT 'log attributes json',\n");
        sql.append("    resource                VARCHAR(65533) COMMENT 'resource json',\n");
        sql.append("    instrumentation_scope   VARCHAR(").append(config.strColumnMaxLength())
                .append(") COMMENT 'instrumentation scope json',\n");
        sql.append("    dropped_attributes_count INT           COMMENT 'dropped attributes count'\n");
        sql.append(") DUPLICATE KEY(time_unix_nano, trace_id, span_id, event_time)\n");

        if (config.enablePartition()) {
            sql.append("PARTITION BY RANGE(event_time) ()\n");
            sql.append("DISTRIBUTED BY HASH(time_unix_nano) BUCKETS ").append(config.buckets()).append("\n");
            sql.append("PROPERTIES (\n");
            sql.append("    \"replication_num\" = \"").append(config.replicationNum()).append("\",\n");
            sql.append("    \"bloom_filter_columns\" = \"").append(LOG_BLOOM_FILTER_COLUMNS).append("\",\n");
            sql.append("    \"dynamic_partition.enable\" = \"true\",\n");
            sql.append("    \"dynamic_partition.time_unit\" = \"").append(config.partitionTimeUnit()).append("\",\n");
            sql.append("    \"dynamic_partition.end\" = \"").append(config.partitionFutureDays()).append("\",\n");
            sql.append("    \"dynamic_partition.prefix\" = \"p\",\n");
            sql.append("    \"dynamic_partition.buckets\" = \"").append(config.buckets()).append("\",\n");
            sql.append("    \"dynamic_partition.history_partition_num\" = \"")
                    .append(config.partitionRetentionDays()).append("\"\n");
            sql.append(")");
        } else {
            sql.append("DISTRIBUTED BY HASH(time_unix_nano) BUCKETS ").append(config.buckets()).append("\n");
            sql.append("PROPERTIES (\n");
            sql.append("    \"replication_num\" = \"").append(config.replicationNum()).append("\",\n");
            sql.append("    \"bloom_filter_columns\" = \"").append(LOG_BLOOM_FILTER_COLUMNS).append("\"\n");
            sql.append(")");
        }
        return sql.toString();
    }

    /**
     * Start the background flush task.
     */
    private void startFlushThread() {
        try {
            warehouseWorkerPool.executeJob(() -> {
                flushTaskStarted = true;
                try {
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

                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            log.debug("[Doris] Flush task interrupted");
                            break;
                        } catch (Exception e) {
                            log.error("[Doris] Flush task error: {}", e.getMessage(), e);
                        }
                    }
                    log.info("[Doris] Flush task stopped");
                } finally {
                    flushTaskStopped.countDown();
                }
            });
            log.info("[Doris] Started metrics flush task with interval {} seconds", writeConfig.flushInterval());
        } catch (RejectedExecutionException e) {
            log.error("[Doris] Failed to start flush task from WarehouseWorkerPool", e);
        }
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

                var cells = rowWrapper.cellStream().toList();

                // Collect all labels in this row first, then build metrics rows.
                for (var cell : cells) {
                    String value = cell.getValue();
                    if (CommonConstants.NULL_VALUE.equals(value)) {
                        continue;
                    }
                    boolean isLabel = cell.getMetadataAsBoolean(MetricDataConstants.LABEL);
                    if (!isLabel) {
                        continue;
                    }
                    String fieldName = cell.getField().getName();
                    rowLabels.put(fieldName, value);
                }

                for (var cell : cells) {
                    String value = cell.getValue();
                    if (CommonConstants.NULL_VALUE.equals(value)) {
                        continue;
                    }

                    boolean isLabel = cell.getMetadataAsBoolean(MetricDataConstants.LABEL);
                    if (isLabel) {
                        continue;
                    }
                    byte type = cell.getMetadataAsByte(MetricDataConstants.TYPE);
                    String fieldName = cell.getField().getName();

                    // Create a metric row for each non-label field.
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
                            continue;
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
                            continue;
                        }
                    } else {
                        row.metricType = METRIC_TYPE_STRING;
                        row.strValue = value;
                    }

                    rows.add(row);
                }
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
        for (int idx = 0; idx < rows.size(); idx++) {
            DorisMetricRow row = rows.get(idx);
            boolean offered = false;
            int retryCount = 0;
            while (!offered && retryCount < MAX_RETRIES) {
                try {
                    offered = metricsBufferQueue.offer(row, MAX_WAIT_MS, TimeUnit.MILLISECONDS);
                    if (!offered) {
                        if (retryCount == 0 && draining.compareAndSet(false, true)) {
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
                // Save only rows that are not successfully queued yet to avoid duplicate writes.
                List<DorisMetricRow> remainingRows = new ArrayList<>(rows.subList(idx, rows.size()));
                doSaveData(remainingRows);
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
        if (batch.isEmpty()) {
            draining.set(false);
            return;
        }
        try {
            warehouseWorkerPool.executeJob(() -> {
                try {
                    doSaveData(batch);
                } finally {
                    draining.set(false);
                }
            });
        } catch (RejectedExecutionException e) {
            try {
                log.warn("[Doris] Immediate flush task rejected by WarehouseWorkerPool, fallback to sync flush");
                doSaveData(batch);
            } finally {
                draining.set(false);
            }
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
        app = normalizeApp(app);
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
        app = normalizeApp(app);
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
    public void saveLogData(LogEntry logEntry) {
        if (logEntry == null) {
            return;
        }
        saveLogDataBatch(List.of(logEntry));
    }

    @Override
    public void saveLogDataBatch(List<LogEntry> logEntries) {
        if (!isServerAvailable() || logEntries == null || logEntries.isEmpty()) {
            return;
        }

        int total = logEntries.size();
        for (int i = 0; i < total; i += LOG_BATCH_SIZE) {
            int end = Math.min(i + LOG_BATCH_SIZE, total);
            List<LogEntry> batch = logEntries.subList(i, end);
            if (WRITE_MODE_STREAM.equals(writeMode) && logStreamLoadWriter != null) {
                boolean success = logStreamLoadWriter.writeLogs(batch);
                if (!success) {
                    if (writeConfig.fallbackToJdbcOnFailure()) {
                        log.warn("[Doris] Log Stream Load failed, fallbackToJdbcOnFailure=true, use JDBC for this batch");
                        doSaveLogDataJdbc(batch);
                    } else {
                        log.error("[Doris] Log Stream Load failed and JDBC fallback is disabled. rows={}", batch.size());
                    }
                }
            } else {
                doSaveLogDataJdbc(batch);
            }
        }
    }

    private void doSaveLogDataJdbc(List<LogEntry> logEntries) {
        if (logEntries == null || logEntries.isEmpty()) {
            return;
        }

        String insertSql = """
                INSERT INTO %s.%s (
                time_unix_nano, trace_id, span_id, event_time, observed_time_unix_nano,
                severity_number, severity_text, body, trace_flags, attributes, resource,
                instrumentation_scope, dropped_attributes_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """.formatted(DATABASE_NAME, LOG_TABLE_NAME);

        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);
            try (PreparedStatement pstmt = conn.prepareStatement(insertSql)) {
                for (LogEntry logEntry : logEntries) {
                    long timeUnixNano = normalizeTimeUnixNano(logEntry.getTimeUnixNano());
                    long observedTimeUnixNano = logEntry.getObservedTimeUnixNano() != null
                        ? logEntry.getObservedTimeUnixNano()
                        : timeUnixNano;

                    pstmt.setLong(1, timeUnixNano);
                    pstmt.setString(2, logEntry.getTraceId());
                    pstmt.setString(3, logEntry.getSpanId());
                    pstmt.setTimestamp(4, nanosToTimestamp(timeUnixNano));
                    pstmt.setLong(5, observedTimeUnixNano);

                    if (logEntry.getSeverityNumber() != null) {
                        pstmt.setInt(6, logEntry.getSeverityNumber());
                    } else {
                        pstmt.setNull(6, java.sql.Types.INTEGER);
                    }
                    pstmt.setString(7, logEntry.getSeverityText());
                    pstmt.setString(8, JsonUtil.toJson(logEntry.getBody()));
                    if (logEntry.getTraceFlags() != null) {
                        pstmt.setInt(9, logEntry.getTraceFlags());
                    } else {
                        pstmt.setNull(9, java.sql.Types.INTEGER);
                    }
                    pstmt.setString(10, JsonUtil.toJson(logEntry.getAttributes()));
                    pstmt.setString(11, JsonUtil.toJson(logEntry.getResource()));
                    pstmt.setString(12, JsonUtil.toJson(logEntry.getInstrumentationScope()));
                    if (logEntry.getDroppedAttributesCount() != null) {
                        pstmt.setInt(13, logEntry.getDroppedAttributesCount());
                    } else {
                        pstmt.setNull(13, java.sql.Types.INTEGER);
                    }

                    pstmt.addBatch();
                }
                pstmt.executeBatch();
                conn.commit();
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            }
        } catch (SQLException e) {
            log.error("[Doris] Failed to save log data: {}", e.getMessage(), e);
        }
    }

    @Override
    public List<LogEntry> queryLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                                        String spanId, Integer severityNumber,
                                                        String severityText, String searchContent) {
        StringBuilder sql = new StringBuilder("""
                SELECT time_unix_nano, observed_time_unix_nano, severity_number, severity_text, body,
                       trace_id, span_id, trace_flags, attributes, resource, instrumentation_scope, dropped_attributes_count
                FROM %s.%s
                """.formatted(DATABASE_NAME, LOG_TABLE_NAME));
        List<Object> params = new ArrayList<>();
        appendLogWhereClause(sql, params, startTime, endTime, traceId, spanId, severityNumber, severityText, searchContent);
        sql.append(" ORDER BY time_unix_nano DESC");
        return executeLogQuery(sql.toString(), params, "queryLogsByMultipleConditions");
    }

    @Override
    public List<LogEntry> queryLogsByMultipleConditionsWithPagination(Long startTime, Long endTime, String traceId,
                                                                      String spanId, Integer severityNumber,
                                                                      String severityText, String searchContent,
                                                                      Integer offset, Integer limit) {
        StringBuilder sql = new StringBuilder("""
                SELECT time_unix_nano, observed_time_unix_nano, severity_number, severity_text, body,
                       trace_id, span_id, trace_flags, attributes, resource, instrumentation_scope, dropped_attributes_count
                FROM %s.%s
                """.formatted(DATABASE_NAME, LOG_TABLE_NAME));
        List<Object> params = new ArrayList<>();
        appendLogWhereClause(sql, params, startTime, endTime, traceId, spanId, severityNumber, severityText, searchContent);
        sql.append(" ORDER BY time_unix_nano DESC");
        if (limit != null && limit > 0) {
            sql.append(" LIMIT ?");
            params.add(limit);
            if (offset != null && offset > 0) {
                sql.append(" OFFSET ?");
                params.add(offset);
            }
        }
        return executeLogQuery(sql.toString(), params, "queryLogsByMultipleConditionsWithPagination");
    }

    @Override
    public long countLogsByMultipleConditions(Long startTime, Long endTime, String traceId,
                                              String spanId, Integer severityNumber,
                                              String severityText, String searchContent) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) AS count FROM %s.%s"
            .formatted(DATABASE_NAME, LOG_TABLE_NAME));
        List<Object> params = new ArrayList<>();
        appendLogWhereClause(sql, params, startTime, endTime, traceId, spanId, severityNumber, severityText, searchContent);

        try (Connection conn = dataSource.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql.toString())) {
            bindParameters(pstmt, params);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getLong("count");
                }
                return 0;
            }
        } catch (Exception e) {
            log.error("[Doris] countLogsByMultipleConditions error: {}", e.getMessage(), e);
            return 0;
        }
    }

    @Override
    public boolean batchDeleteLogs(List<Long> timeUnixNanos) {
        if (!isServerAvailable() || timeUnixNanos == null || timeUnixNanos.isEmpty()) {
            return false;
        }
        List<Long> validTimeUnixNanos = timeUnixNanos.stream()
            .filter(Objects::nonNull)
            .toList();
        if (validTimeUnixNanos.isEmpty()) {
            return false;
        }

        String placeholders = String.join(",", Collections.nCopies(validTimeUnixNanos.size(), "?"));
        String sql = "DELETE FROM %s.%s WHERE time_unix_nano IN (%s)"
            .formatted(DATABASE_NAME, LOG_TABLE_NAME, placeholders);
        try (Connection conn = dataSource.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            int index = 1;
            for (Long timeUnixNano : validTimeUnixNanos) {
                pstmt.setLong(index++, timeUnixNano);
            }
            pstmt.executeUpdate();
            return true;
        } catch (Exception e) {
            log.error("[Doris] batchDeleteLogs error: {}", e.getMessage(), e);
            return false;
        }
    }

    private void appendLogWhereClause(StringBuilder sql, List<Object> params,
                                      Long startTime, Long endTime,
                                      String traceId, String spanId,
                                      Integer severityNumber, String severityText,
                                      String searchContent) {
        List<String> conditions = new ArrayList<>();
        if (startTime != null) {
            conditions.add("time_unix_nano >= ?");
            params.add(msToNs(startTime));
        }
        if (endTime != null) {
            conditions.add("time_unix_nano <= ?");
            params.add(msToNs(endTime));
        }
        if (StringUtils.hasText(traceId)) {
            conditions.add("trace_id = ?");
            params.add(traceId);
        }
        if (StringUtils.hasText(spanId)) {
            conditions.add("span_id = ?");
            params.add(spanId);
        }
        if (severityNumber != null) {
            conditions.add("severity_number = ?");
            params.add(severityNumber);
        }
        if (StringUtils.hasText(severityText)) {
            conditions.add("severity_text = ?");
            params.add(severityText);
        }
        if (StringUtils.hasText(searchContent)) {
            conditions.add("body LIKE ?");
            params.add("%" + searchContent + "%");
        }
        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }
    }

    private void bindParameters(PreparedStatement pstmt, List<Object> params) throws SQLException {
        for (int i = 0; i < params.size(); i++) {
            pstmt.setObject(i + 1, params.get(i));
        }
    }

    private List<LogEntry> executeLogQuery(String sql, List<Object> params, String queryName) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            bindParameters(pstmt, params);
            try (ResultSet rs = pstmt.executeQuery()) {
                return mapRowsToLogEntries(rs);
            }
        } catch (Exception e) {
            log.error("[Doris] {} error: {}", queryName, e.getMessage(), e);
            return List.of();
        }
    }

    private List<LogEntry> mapRowsToLogEntries(ResultSet rs) throws SQLException {
        List<LogEntry> entries = new LinkedList<>();
        while (rs.next()) {
            String instrumentationScopeStr = rs.getString("instrumentation_scope");
            LogEntry.InstrumentationScope instrumentationScope = null;
            if (StringUtils.hasText(instrumentationScopeStr)) {
                instrumentationScope = JsonUtil.fromJson(instrumentationScopeStr, LogEntry.InstrumentationScope.class);
            }

            LogEntry entry = LogEntry.builder()
                .timeUnixNano(rs.getLong("time_unix_nano"))
                .observedTimeUnixNano(rs.getLong("observed_time_unix_nano"))
                .severityNumber(getNullableInteger(rs, "severity_number"))
                .severityText(rs.getString("severity_text"))
                .body(parseJsonMaybe(rs.getString("body")))
                .traceId(rs.getString("trace_id"))
                .spanId(rs.getString("span_id"))
                .traceFlags(getNullableInteger(rs, "trace_flags"))
                .attributes(castToMap(parseJsonMaybe(rs.getString("attributes"))))
                .resource(castToMap(parseJsonMaybe(rs.getString("resource"))))
                .instrumentationScope(instrumentationScope)
                .droppedAttributesCount(getNullableInteger(rs, "dropped_attributes_count"))
                .build();
            entries.add(entry);
        }
        return entries;
    }

    private Integer getNullableInteger(ResultSet rs, String columnName) throws SQLException {
        int value = rs.getInt(columnName);
        return rs.wasNull() ? null : value;
    }

    private static long msToNs(Long ms) {
        return ms * NANOS_PER_MILLISECOND;
    }

    private long normalizeTimeUnixNano(Long timeUnixNano) {
        return timeUnixNano != null ? timeUnixNano : System.currentTimeMillis() * NANOS_PER_MILLISECOND;
    }

    private Timestamp nanosToTimestamp(long timeUnixNano) {
        return new Timestamp(timeUnixNano / NANOS_PER_MILLISECOND);
    }

    private Object parseJsonMaybe(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        boolean maybeJson = (trimmed.startsWith("{") && trimmed.endsWith("}"))
            || (trimmed.startsWith("[") && trimmed.endsWith("]"))
            || (trimmed.startsWith("\"") && trimmed.endsWith("\""));
        if (!maybeJson) {
            return trimmed;
        }
        Object parsed = JsonUtil.fromJson(trimmed, Object.class);
        return parsed != null ? parsed : trimmed;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castToMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return null;
    }

    @Override
    public void destroy() {
        log.info("[Doris] Shutting down...");

        flushThreadRunning = false;

        // Wait flush task to finish.
        if (flushTaskStarted) {
            try {
                boolean stopped = flushTaskStopped.await(10000, TimeUnit.MILLISECONDS);
                if (!stopped) {
                    log.warn("[Doris] Timed out waiting for flush task to stop");
                }
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
        if (logStreamLoadWriter != null) {
            logStreamLoadWriter.close();
            log.info("[Doris] Log Stream Load writer closed.");
        }
    }

}
