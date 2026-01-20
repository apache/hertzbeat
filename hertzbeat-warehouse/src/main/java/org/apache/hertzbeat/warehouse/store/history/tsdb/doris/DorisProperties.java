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

import org.apache.hertzbeat.common.constants.ConfigConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Apache Doris configuration properties
 */
@ConfigurationProperties(prefix = ConfigConstants.FunctionModuleConstants.WAREHOUSE
        + SignConstants.DOT
        + WarehouseConstants.STORE
        + SignConstants.DOT
        + WarehouseConstants.HistoryName.DORIS)
public record DorisProperties(
        @DefaultValue("false") boolean enabled,
        @DefaultValue("jdbc:mysql://127.0.0.1:9030/hertzbeat") String url,
        String username,
        String password,
        TableConfig tableConfig,
        PoolConfig poolConfig,
        WriteConfig writeConfig) {
    /**
     * Table structure configuration
     */
    public record TableConfig(
            // Whether to enable dynamic partitioning (default enabled)
            @DefaultValue("false") boolean enablePartition,
            // Partition time unit: DAY, HOUR, MONTH
            @DefaultValue("DAY") String partitionTimeUnit,
            // Dynamic partition retention days
            @DefaultValue("7") int partitionRetentionDays,
            // Dynamic partition creation range (future partitions to create)
            @DefaultValue("3") int partitionFutureDays,
            // Number of buckets
            @DefaultValue("8") int buckets,
            // Number of replicas (recommended 3 for production)
            @DefaultValue("1") int replicationNum,
            // Maximum length of string columns
            @DefaultValue("4096") int strColumnMaxLength) {
        public TableConfig {
            if (partitionRetentionDays <= 0) {
                partitionRetentionDays = 7;
            }
            if (partitionFutureDays <= 0) {
                partitionFutureDays = 3;
            }
            if (buckets <= 0) {
                buckets = 8;
            }
            if (replicationNum <= 0) {
                replicationNum = 1;
            }
            if (strColumnMaxLength <= 0 || strColumnMaxLength > 65533) {
                strColumnMaxLength = 4096;
            }
        }
    }

    /**
     * Connection pool configuration (based on HikariCP)
     */
    public record PoolConfig(
            // Minimum idle connections
            @DefaultValue("5") int minimumIdle,
            // Maximum pool size
            @DefaultValue("20") int maximumPoolSize,
            // Connection timeout in milliseconds
            @DefaultValue("30000") int connectionTimeout,
            // Maximum connection lifetime in milliseconds (0 means no limit)
            @DefaultValue("0") long maxLifetime,
            // Idle connection timeout in milliseconds (0 means never recycle)
            @DefaultValue("600000") long idleTimeout) {
        public PoolConfig {
            if (minimumIdle <= 0) {
                minimumIdle = 5;
            }
            if (maximumPoolSize <= 0) {
                maximumPoolSize = 20;
            }
            if (connectionTimeout <= 0) {
                connectionTimeout = 30000;
            }
        }
    }

    /**
     * Write configuration
     */
    public record WriteConfig(
            // Write mode: jdbc (batch insert) or stream (HTTP stream load)
            @DefaultValue("jdbc") String writeMode,
            // Batch write size (for jdbc mode)
            @DefaultValue("1000") int batchSize,
            // Batch write flush interval in seconds (for jdbc mode)
            @DefaultValue("5") int flushInterval,
            // Stream load configuration (for stream mode)
            StreamLoadConfig streamLoadConfig) {
        public WriteConfig {
            if (!"jdbc".equals(writeMode) && !"stream".equals(writeMode)) {
                writeMode = "jdbc";
            }
            if (batchSize <= 0) {
                batchSize = 1000;
            }
            if (flushInterval <= 0) {
                flushInterval = 5;
            }
            if (streamLoadConfig == null) {
                streamLoadConfig = StreamLoadConfig.createDefault();
            }
        }
    }

    /**
     * Stream Load configuration for HTTP-based streaming writes
     */
    public record StreamLoadConfig(
            // Doris FE HTTP port for Stream Load API
            @DefaultValue(":8030") String httpPort,
            // Stream load timeout in seconds
            @DefaultValue("60") int timeout,
            // Max batch size in bytes for stream load
            @DefaultValue("10485760") int maxBytesPerBatch,
            // Enable data compression for stream load
            @DefaultValue("true") boolean enableCompression,
            // Load to single tablet (better for small batches)
            @DefaultValue("true") boolean loadToSingleTablet) {
        public StreamLoadConfig {
            if (timeout <= 0) {
                timeout = 60;
            }
            if (maxBytesPerBatch <= 0) {
                maxBytesPerBatch = 10485760; // 10MB
            }
        }

        /**
         * Factory method to create default StreamLoadConfig
         */
        public static StreamLoadConfig createDefault() {
            return new StreamLoadConfig(":8030", 60, 10485760, true, false);
        }
    }

    // Provide default values for nested configs if null
    public DorisProperties {
        if (tableConfig == null) {
            tableConfig = new TableConfig(false, "DAY", 7, 3, 8, 1, 4096);
        }
        if (poolConfig == null) {
            poolConfig = new PoolConfig(5, 20, 30000, 0, 600000);
        }
        if (writeConfig == null) {
            writeConfig = new WriteConfig("jdbc", 1000, 5, StreamLoadConfig.createDefault());
        }
    }
}
