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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.apache.hertzbeat.common.config.CommonProperties;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.serialize.RedisLogEntryCodec;
import org.apache.hertzbeat.common.serialize.RedisMetricsDataCodec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * test for {@link RedisCommonDataQueue}
 */

@ExtendWith(MockitoExtension.class)
class RedisCommonDataQueueTest {

    @Mock
    private StatefulRedisConnection<String, CollectRep.MetricsData> connection;
    @Mock
    private StatefulRedisConnection<String, LogEntry> logEntryConnection;

    @Mock
    private RedisCommands<String, CollectRep.MetricsData> syncCommands;
    @Mock
    private RedisCommands<String, LogEntry> logEntrySyncCommands;
    
    private RedisClient redisClient;
    private CommonProperties commonProperties;
    private CommonProperties.RedisProperties redisProperties;
    private RedisCommonDataQueue redisCommonDataQueue;

    @BeforeEach
    public void setUp() {
        redisClient = mock(RedisClient.class);
        commonProperties = mock(CommonProperties.class);
        redisProperties = mock(CommonProperties.RedisProperties.class);
        CommonProperties.DataQueueProperties dataQueueProperties = mock(CommonProperties.DataQueueProperties.class);

        when(commonProperties.getQueue()).thenReturn(dataQueueProperties);
        when(dataQueueProperties.getRedis()).thenReturn(redisProperties);
        when(redisProperties.getMetricsDataQueueNameToAlerter()).thenReturn("metricsDataQueueToAlerter");
        when(redisProperties.getLogEntryQueueName()).thenReturn("logEntryQueue");
        when(redisProperties.getLogEntryToStorageQueueName()).thenReturn("logEntryToStorageQueue");
        when(redisProperties.getRedisHost()).thenReturn("localhost");
        when(redisProperties.getRedisPort()).thenReturn(6379);

        try (MockedStatic<RedisClient> mockedRedisClient = mockStatic(RedisClient.class)) {
            mockedRedisClient.when(() -> RedisClient.create(any(RedisURI.class))).thenReturn(redisClient);
            when(redisClient.connect(any(RedisMetricsDataCodec.class))).thenReturn(connection);
            when(redisClient.connect(any(RedisLogEntryCodec.class))).thenReturn(logEntryConnection);
            when(logEntryConnection.sync()).thenReturn(logEntrySyncCommands);
            when(connection.sync()).thenReturn(syncCommands);

            redisCommonDataQueue = new RedisCommonDataQueue(commonProperties);
        }
    }

    @Test
    public void testPollMetricsDataToAlerter() throws Exception {
        CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .setMetrics("test metrics")
                .build();

        when(syncCommands.rpop("metricsDataQueueToAlerter")).thenReturn(metricsData);

        CollectRep.MetricsData actualMetricsData = redisCommonDataQueue.pollMetricsDataToAlerter();
        assertEquals(metricsData, actualMetricsData);
    }

    @Test
    public void testSendMetricsData() throws Exception {
        CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .setMetrics("test metrics")
                .build();

        redisCommonDataQueue.sendMetricsData(metricsData);

        verify(syncCommands).lpush("metricsDataQueueToAlerter", metricsData);
    }

    @Test
    public void testSendLogEntry() {
        // Create a test log entry with comprehensive data
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("service.name", "hertzbeat");
        attributes.put("service.version", "1.0.0");
        
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .severityNumber(9) // INFO level
                .severityText("INFO")
                .body("Test log message for Redis queue")
                .attributes(attributes)
                .traceId("1234567890abcdef1234567890abcdef")
                .spanId("1234567890abcdef")
                .build();

        // Test sending log entry
        redisCommonDataQueue.sendLogEntry(logEntry);

        // Verify that the Redis commands were called
        verify(logEntrySyncCommands).lpush("logEntryQueue", logEntry);
    }

    @Test
    public void testSendLogEntryToStorage() {
        // Create a test log entry for storage
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .severityNumber(17) // ERROR level
                .severityText("ERROR")
                .body("Error log message for storage via Redis")
                .build();

        // Test sending log entry to storage
        redisCommonDataQueue.sendLogEntryToStorage(logEntry);

        // Verify that the Redis commands were called
        verify(logEntrySyncCommands).lpush("logEntryToStorageQueue", logEntry);
    }

    @Test
    public void testPollLogEntry() throws Exception {
        // Create test log entry
        LogEntry expectedLogEntry = LogEntry.builder()
                .timeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .severityNumber(13) // WARN level
                .severityText("WARN")
                .body("Test warning log message")
                .build();

        when(logEntrySyncCommands.rpop("logEntryQueue")).thenReturn(expectedLogEntry);

        LogEntry result = redisCommonDataQueue.pollLogEntry();
        
        assertEquals(expectedLogEntry, result);
        verify(logEntrySyncCommands).rpop("logEntryQueue");
    }

    @Test
    public void testPollLogEntryToStorage() throws Exception {
        // Create test log entry for storage
        LogEntry expectedLogEntry = LogEntry.builder()
                .timeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .severityNumber(21) // FATAL level
                .severityText("FATAL")
                .body("Critical error log for storage")
                .build();

        when(logEntrySyncCommands.rpop("logEntryToStorageQueue")).thenReturn(expectedLogEntry);

        LogEntry result = redisCommonDataQueue.pollLogEntryToStorage();
        
        assertEquals(expectedLogEntry, result);
        verify(logEntrySyncCommands).rpop("logEntryToStorageQueue");
    }

    @Test
    public void testDestroy() {
        redisCommonDataQueue.destroy();
        verify(connection).close();
        verify(logEntryConnection).close();
        verify(redisClient).shutdown();
    }
}
