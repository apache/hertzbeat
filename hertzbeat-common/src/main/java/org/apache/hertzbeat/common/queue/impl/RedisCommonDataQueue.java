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

package org.apache.hertzbeat.common.queue.impl;

import java.util.ArrayList;
import java.util.List;
import io.lettuce.core.KeyValue;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.config.CommonProperties;
import org.apache.hertzbeat.common.constants.DataQueueConstants;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.serialize.RedisLogEntryCodec;
import org.apache.hertzbeat.common.serialize.RedisMetricsDataCodec;
import org.apache.hertzbeat.common.support.exception.CommonDataQueueUnknownException;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

import java.util.Objects;

/**
 * common data queue implement redis.
 */
@Slf4j
@Configuration
@ConditionalOnProperty(
        prefix = DataQueueConstants.PREFIX,
        name = DataQueueConstants.NAME,
        havingValue = DataQueueConstants.REDIS
)
public class RedisCommonDataQueue implements CommonDataQueue, DisposableBean {

    private final RedisClient redisClient;
    private final StatefulRedisConnection<String, CollectRep.MetricsData> connection;
    private final RedisCommands<String, CollectRep.MetricsData> syncCommands;
    private final StatefulRedisConnection<String, LogEntry> logEntryConnection;
    private final RedisCommands<String, LogEntry> logEntrySyncCommands;
    private final String metricsDataQueueNameToStorage;
    private final String metricsDataQueueNameForServiceDiscovery;
    private final String metricsDataQueueNameToAlerter;
    private final String logEntryQueueName;
    private final String logEntryToStorageQueueName;
    private final CommonProperties.RedisProperties redisProperties;
    private final Long waitTimeout;

    public RedisCommonDataQueue(CommonProperties properties) {

        if (properties == null || properties.getQueue() == null || properties.getQueue().getRedis() == null) {
            log.error("init error, please config common.queue.redis props in application.yml");
            throw new IllegalArgumentException("please config common.queue.redis props");
        }

        this.redisProperties = properties.getQueue().getRedis();

        this.redisClient = RedisClient.create(
                RedisURI.builder()
                        .withHost(redisProperties.getRedisHost())
                        .withPort(redisProperties.getRedisPort())
                        .build()
        );
        RedisMetricsDataCodec codec = new RedisMetricsDataCodec();
        this.connection = redisClient.connect(codec);
        this.syncCommands = connection.sync();
        RedisLogEntryCodec logCodec = new RedisLogEntryCodec();
        this.logEntryConnection = redisClient.connect(logCodec);
        this.logEntrySyncCommands = logEntryConnection.sync();
        this.metricsDataQueueNameToStorage = redisProperties.getMetricsDataQueueNameToPersistentStorage();
        this.metricsDataQueueNameForServiceDiscovery = redisProperties.getMetricsDataQueueNameForServiceDiscovery();
        this.metricsDataQueueNameToAlerter = redisProperties.getMetricsDataQueueNameToAlerter();
        this.logEntryQueueName = redisProperties.getLogEntryQueueName();
        this.logEntryToStorageQueueName = redisProperties.getLogEntryToStorageQueueName();
        this.waitTimeout = Objects.requireNonNullElse(redisProperties.getWaitTimeout(), 1L);
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToAlerter() throws InterruptedException {
        return genericBlockingPollFunction(metricsDataQueueNameToAlerter, syncCommands);
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToStorage() throws InterruptedException {
        return genericBlockingPollFunction(metricsDataQueueNameToStorage, syncCommands);

    }

    @Override
    public CollectRep.MetricsData pollServiceDiscoveryData() throws InterruptedException {
        return genericBlockingPollFunction(metricsDataQueueNameForServiceDiscovery, syncCommands);
    }

    @Override
    public void sendMetricsData(CollectRep.MetricsData metricsData) {
        try {
            syncCommands.lpush(metricsDataQueueNameToAlerter, metricsData);
        } catch (Exception e) {
            log.error(e.getMessage());
        }
    }

    @Override
    public void sendMetricsDataToStorage(CollectRep.MetricsData metricsData) {
        try {
            syncCommands.lpush(metricsDataQueueNameToStorage, metricsData);
        } catch (Exception e) {
            log.error(e.getMessage());
        }
    }

    @Override
    public void sendServiceDiscoveryData(CollectRep.MetricsData metricsData) {
        try {
            syncCommands.lpush(metricsDataQueueNameForServiceDiscovery, metricsData);
        } catch (Exception e) {
            log.error(e.getMessage());
        }
    }

    @Override
    public void sendLogEntry(LogEntry logEntry) {
        try {
            logEntrySyncCommands.lpush(logEntryQueueName, logEntry);
        } catch (Exception e) {
            log.error("Failed to send LogEntry to Redis: {}", e.getMessage());
        }
    }

    @Override
    public LogEntry pollLogEntry() throws InterruptedException {
        return genericBlockingPollFunction(logEntryQueueName, logEntrySyncCommands);
    }

    @Override
    public void sendLogEntryToStorage(LogEntry logEntry) {
        try {
            logEntrySyncCommands.lpush(logEntryToStorageQueueName, logEntry);
        } catch (Exception e) {
            log.error("Failed to send LogEntry to storage via Redis: {}", e.getMessage());
        }
    }

    @Override
    public LogEntry pollLogEntryToStorage() throws InterruptedException {
        return genericBlockingPollFunction(logEntryToStorageQueueName, logEntrySyncCommands);
    }

    @Override
    @SuppressWarnings("unchecked")
    public void sendLogEntryToAlertBatch(List<LogEntry> logEntries) {
        if (logEntries == null || logEntries.isEmpty()) {
            return;
        }
        try {
            logEntrySyncCommands.lpush(logEntryQueueName, logEntries.toArray(new LogEntry[0]));
        } catch (Exception e) {
            log.error("Failed to send LogEntry batch to Redis: {}", e.getMessage());
        }
    }

    @Override
    public List<LogEntry> pollLogEntryToAlertBatch(int maxBatchSize) throws InterruptedException {
        return genericBatchPollFunction(logEntryQueueName, logEntrySyncCommands, maxBatchSize);
    }

    @Override
    @SuppressWarnings("unchecked")
    public void sendLogEntryToStorageBatch(List<LogEntry> logEntries) {
        if (logEntries == null || logEntries.isEmpty()) {
            return;
        }
        try {
            logEntrySyncCommands.lpush(logEntryToStorageQueueName, logEntries.toArray(new LogEntry[0]));
        } catch (Exception e) {
            log.error("Failed to send LogEntry batch to storage via Redis: {}", e.getMessage());
        }
    }

    @Override
    public List<LogEntry> pollLogEntryToStorageBatch(int maxBatchSize) throws InterruptedException {
        return genericBatchPollFunction(logEntryToStorageQueueName, logEntrySyncCommands, maxBatchSize);
    }

    @Override
    public void destroy() {
        connection.close();
        logEntryConnection.close();
        redisClient.shutdown();
    }



    private <T> T genericBlockingPollFunction(String key, RedisCommands<String, T> commands) throws InterruptedException {
        try {
            // Use BRPOP for blocking pop with the configured timeout.
            // If data arrives, it returns immediately; if it times out, it returns null.
            KeyValue<String, T> keyData = commands.brpop(waitTimeout, key);
            if (keyData != null) {
                return keyData.getValue();
            } else {
                // Returns null on timeout
                return null;
            }
        } catch (Exception e) {
            log.error("Redis BRPOP failed: {}", e.getMessage());
            throw new CommonDataQueueUnknownException(e.getMessage(), e);
        }
    }

    private List<LogEntry> genericBatchPollFunction(String key, RedisCommands<String, LogEntry> commands, int maxBatchSize) {
        List<LogEntry> batch = new ArrayList<>(maxBatchSize);
        try {
            List<LogEntry> elements = commands.rpop(key, maxBatchSize);
            if (elements != null) {
                batch.addAll(elements);
            }
        } catch (Exception e) {
            log.error("Redis batch poll failed: {}", e.getMessage());
        }
        return batch;
    }

}
