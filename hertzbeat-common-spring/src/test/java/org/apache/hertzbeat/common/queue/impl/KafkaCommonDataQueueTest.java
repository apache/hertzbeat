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
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.anyCollection;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.withSettings;
import java.lang.reflect.Field;
import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.config.CommonProperties;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.common.TopicPartition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link KafkaCommonDataQueue}
 */
@ExtendWith(MockitoExtension.class)
class KafkaCommonDataQueueTest {

    @Mock(lenient = true)
    private KafkaConsumer<Long, CollectRep.MetricsData> metricsDataToAlertConsumer;

    @Mock(lenient = true)
    private KafkaProducer<Long, CollectRep.MetricsData> metricsDataProducer;

    @Mock(lenient = true)
    private KafkaProducer<Long, LogEntry> logEntryProducer;

    @Mock(lenient = true)
    private KafkaConsumer<Long, LogEntry> logEntryConsumer;

    @Mock(lenient = true)
    private KafkaConsumer<Long, LogEntry> logEntryToStorageConsumer;

    private KafkaCommonDataQueue kafkaCommonDataQueue;

    private CommonProperties commonProperties;

    @BeforeEach
    void setUp() throws Exception {
        commonProperties = mock(CommonProperties.class);
        CommonProperties.DataQueueProperties dataQueueProperties = mock(CommonProperties.DataQueueProperties.class, withSettings().lenient());
        CommonProperties.KafkaProperties kafkaProperties = mock(CommonProperties.KafkaProperties.class, withSettings().lenient());

        when(commonProperties.getQueue()).thenReturn(dataQueueProperties);
        when(dataQueueProperties.getKafka()).thenReturn(kafkaProperties);
        
        // Set all required topics
        when(kafkaProperties.getMetricsDataTopic()).thenReturn("metricsDataTopic");
        when(kafkaProperties.getLogEntryDataTopic()).thenReturn("logEntryDataTopic");
        when(kafkaProperties.getLogEntryDataToStorageTopic()).thenReturn("logEntryDataToStorageTopic");
        when(kafkaProperties.getAlertsDataTopic()).thenReturn("alertsDataTopic");
        when(kafkaProperties.getMetricsDataToStorageTopic()).thenReturn("metricsDataToStorageTopic");
        when(kafkaProperties.getServiceDiscoveryDataTopic()).thenReturn("serviceDiscoveryDataTopic");
        when(kafkaProperties.getServers()).thenReturn("localhost:9092");

        // Simulate the subscribe method for consumers
        doNothing().when(metricsDataToAlertConsumer).subscribe(anyCollection());
        doNothing().when(logEntryConsumer).subscribe(anyCollection());
        doNothing().when(logEntryToStorageConsumer).subscribe(anyCollection());

        kafkaCommonDataQueue = new KafkaCommonDataQueue(commonProperties);
        
        // Use reflection to set private fields
        setPrivateField(kafkaCommonDataQueue, "metricsDataProducer", metricsDataProducer);
        setPrivateField(kafkaCommonDataQueue, "metricsDataToAlertConsumer", metricsDataToAlertConsumer);
        setPrivateField(kafkaCommonDataQueue, "logEntryProducer", logEntryProducer);
        setPrivateField(kafkaCommonDataQueue, "logEntryConsumer", logEntryConsumer);
        setPrivateField(kafkaCommonDataQueue, "logEntryToStorageConsumer", logEntryToStorageConsumer);
    }

    @Test
    void testSendMetricsData() {
        CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .setMetrics("test metrics")
                .build();

        kafkaCommonDataQueue.sendMetricsData(metricsData);

        verify(metricsDataProducer).send(any());
    }

    @Test
    void testPollMetricsDataToAlerter() throws InterruptedException {
        // Create a test data
        CollectRep.MetricsData expectedData = CollectRep.MetricsData.newBuilder()
                .setMetrics("test metrics")
                .build();
        
        // Create a ConsumerRecord containing test data
        ConsumerRecord<Long, CollectRep.MetricsData> record = 
                new ConsumerRecord<>("metricsDataTopic", 0, 0L, 1L, expectedData);
        
        // Create a ConsumerRecords containing a single record.
        Map<TopicPartition, List<ConsumerRecord<Long, CollectRep.MetricsData>>> recordsMap = 
                Collections.singletonMap(
                        new TopicPartition("metricsDataTopic", 0), 
                        Collections.singletonList(record));
        ConsumerRecords<Long, CollectRep.MetricsData> records = new ConsumerRecords<>(recordsMap);
        
        when(metricsDataToAlertConsumer.poll(any(Duration.class))).thenReturn(records);

        CollectRep.MetricsData result = kafkaCommonDataQueue.pollMetricsDataToAlerter();
        assertEquals(expectedData, result);
        
        verify(metricsDataToAlertConsumer).commitAsync();
    }

    @Test
    void testSendLogEntry() {
        // Create a test log entry with comprehensive data
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("service.name", "hertzbeat");
        attributes.put("service.version", "1.0.0");
        
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .severityNumber(9) // INFO level
                .severityText("INFO")
                .body("Test log message for Kafka queue")
                .attributes(attributes)
                .traceId("1234567890abcdef1234567890abcdef")
                .spanId("1234567890abcdef")
                .build();

        // Test sending log entry
        kafkaCommonDataQueue.sendLogEntry(logEntry);

        // Verify that the producer was called
        verify(logEntryProducer).send(any());
    }

    @Test
    void testSendLogEntryToStorage() {
        // Create a test log entry for storage
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .severityNumber(17) // ERROR level
                .severityText("ERROR")
                .body("Error log message for storage via Kafka")
                .build();

        // Test sending log entry to storage
        kafkaCommonDataQueue.sendLogEntryToStorage(logEntry);

        // Verify that the producer was called
        verify(logEntryProducer).send(any());
    }

    @Test
    void testPollLogEntry() throws InterruptedException {
        // Create test log entry
        LogEntry expectedLogEntry = LogEntry.builder()
                .timeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .severityNumber(13) // WARN level
                .severityText("WARN")
                .body("Test warning log message")
                .build();
        
        // Create a ConsumerRecord containing test log entry
        ConsumerRecord<Long, LogEntry> record = 
                new ConsumerRecord<>("logEntryDataTopic", 0, 0L, 1L, expectedLogEntry);
        
        // Create ConsumerRecords containing the log entry record
        Map<TopicPartition, List<ConsumerRecord<Long, LogEntry>>> recordsMap = 
                Collections.singletonMap(
                        new TopicPartition("logEntryDataTopic", 0), 
                        Collections.singletonList(record));
        ConsumerRecords<Long, LogEntry> records = new ConsumerRecords<>(recordsMap);
        
        when(logEntryConsumer.poll(any(Duration.class))).thenReturn(records);

        LogEntry result = kafkaCommonDataQueue.pollLogEntry();
        
        assertEquals(expectedLogEntry, result);
        verify(logEntryConsumer).commitAsync();
    }

    @Test
    void testPollLogEntryToStorage() throws InterruptedException {
        // Create test log entry for storage
        LogEntry expectedLogEntry = LogEntry.builder()
                .timeUnixNano(Instant.now().toEpochMilli() * 1_000_000L)
                .severityNumber(21) // FATAL level
                .severityText("FATAL")
                .body("Critical error log for storage")
                .build();
        
        // Create a ConsumerRecord containing test log entry
        ConsumerRecord<Long, LogEntry> record = 
                new ConsumerRecord<>("logEntryDataToStorageTopic", 0, 0L, 1L, expectedLogEntry);
        
        // Create ConsumerRecords containing the log entry record
        Map<TopicPartition, List<ConsumerRecord<Long, LogEntry>>> recordsMap = 
                Collections.singletonMap(
                        new TopicPartition("logEntryDataToStorageTopic", 0), 
                        Collections.singletonList(record));
        ConsumerRecords<Long, LogEntry> records = new ConsumerRecords<>(recordsMap);
        
        when(logEntryToStorageConsumer.poll(any(Duration.class))).thenReturn(records);

        LogEntry result = kafkaCommonDataQueue.pollLogEntryToStorage();
        
        assertEquals(expectedLogEntry, result);
        verify(logEntryToStorageConsumer).commitAsync();
    }

    @Test
    void testDestroy() throws Exception {
        kafkaCommonDataQueue.destroy();
        
        // Verify that all producers and consumers are closed
        verify(metricsDataToAlertConsumer).close();
        verify(metricsDataProducer).close();
        verify(logEntryProducer).close();
        verify(logEntryConsumer).close();
        verify(logEntryToStorageConsumer).close();
    }

    private void setPrivateField(Object object, String fieldName, Object value) throws Exception {
        Field field = object.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(object, value);
    }
}
