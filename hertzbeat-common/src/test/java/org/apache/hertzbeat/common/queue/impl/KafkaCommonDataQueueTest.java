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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.lang.reflect.Field;
import java.time.Duration;
import java.util.Collections;
import org.apache.hertzbeat.common.config.CommonProperties;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.TopicPartition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * Test case for {@link KafkaCommonDataQueue}
 */
class KafkaCommonDataQueueTest {

    private KafkaProducer<Long, CollectRep.MetricsData> metricsDataProducer;
    private KafkaProducer<Long, Alert> alertDataProducer;
    private KafkaConsumer<Long, Alert> alertDataConsumer;
    private KafkaConsumer<Long, CollectRep.MetricsData> metricsDataToAlertConsumer;
    private KafkaConsumer<Long, CollectRep.MetricsData> metricsDataToPersistentStorageConsumer;
    private KafkaConsumer<Long, CollectRep.MetricsData> metricsDataToRealTimeStorageConsumer;
    private CommonProperties.KafkaProperties kafkaProperties;
    private KafkaCommonDataQueue kafkaCommonDataQueue;

    @BeforeEach
    void setUp() throws Exception {
        kafkaProperties = mock(CommonProperties.KafkaProperties.class);
        when(kafkaProperties.getServers()).thenReturn("localhost:9092");
        when(kafkaProperties.getAlertsDataTopic()).thenReturn("alerts");
        when(kafkaProperties.getMetricsDataTopic()).thenReturn("metrics");

        CommonProperties properties = mock(CommonProperties.class);
        CommonProperties.DataQueueProperties queueProperties = mock(CommonProperties.DataQueueProperties.class);
        when(properties.getQueue()).thenReturn(queueProperties);
        when(queueProperties.getKafka()).thenReturn(kafkaProperties);

        metricsDataProducer = mock(KafkaProducer.class);
        alertDataProducer = mock(KafkaProducer.class);
        alertDataConsumer = mock(KafkaConsumer.class);
        metricsDataToAlertConsumer = mock(KafkaConsumer.class);
        metricsDataToPersistentStorageConsumer = mock(KafkaConsumer.class);
        metricsDataToRealTimeStorageConsumer = mock(KafkaConsumer.class);

        kafkaCommonDataQueue = new KafkaCommonDataQueue(properties);

        setPrivateField(kafkaCommonDataQueue, "metricsDataProducer", metricsDataProducer);
        setPrivateField(kafkaCommonDataQueue, "alertDataProducer", alertDataProducer);
        setPrivateField(kafkaCommonDataQueue, "alertDataConsumer", alertDataConsumer);
        setPrivateField(kafkaCommonDataQueue, "metricsDataToAlertConsumer", metricsDataToAlertConsumer);
        setPrivateField(kafkaCommonDataQueue, "metricsDataToPersistentStorageConsumer", metricsDataToPersistentStorageConsumer);
        setPrivateField(kafkaCommonDataQueue, "metricsDataToRealTimeStorageConsumer", metricsDataToRealTimeStorageConsumer);
    }

    // Test use, set private field.
    private void setPrivateField(Object target, String fieldName, Object value) throws Exception {

        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    @Test
    void testSendAlertsData() {

        Alert alert = new Alert();
        kafkaCommonDataQueue.sendAlertsData(alert);

        ArgumentCaptor<ProducerRecord<Long, Alert>> captor = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(alertDataProducer).send(captor.capture());

        ProducerRecord<Long, Alert> record = captor.getValue();
        assertEquals("alerts", record.topic());
        assertEquals(alert, record.value());
    }

    @Test
    void testPollAlertsData() throws InterruptedException {

        Alert alert = new Alert();
        ConsumerRecords<Long, Alert> records = new ConsumerRecords<>(Collections.emptyMap());
        when(alertDataConsumer.poll(Duration.ofSeconds(1))).thenReturn(records);

        assertNull(kafkaCommonDataQueue.pollAlertsData());

        records = new ConsumerRecords<>(Collections.singletonMap(
                new TopicPartition("alerts", 0),
                Collections.singletonList(
                        new ConsumerRecord<>("alerts", 0, 0L, 1L, alert)
                )
        ));
        when(alertDataConsumer.poll(Duration.ofSeconds(1))).thenReturn(records);

        assertEquals(alert, kafkaCommonDataQueue.pollAlertsData());
    }

    @Test
    void testSendMetricsData() {

        CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder().build();
        kafkaCommonDataQueue.sendMetricsData(metricsData);

        ArgumentCaptor<ProducerRecord<Long, CollectRep.MetricsData>> captor = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(metricsDataProducer).send(captor.capture());

        ProducerRecord<Long, CollectRep.MetricsData> record = captor.getValue();
        assertEquals("metrics", record.topic());
        assertEquals(metricsData, record.value());
    }

    @Test
    void testPollMetricsDataToAlerter() throws InterruptedException {

        CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder().build();
        ConsumerRecords<Long, CollectRep.MetricsData> records = new ConsumerRecords<>(Collections.emptyMap());
        when(metricsDataToAlertConsumer.poll(Duration.ofSeconds(1))).thenReturn(records);

        assertNull(kafkaCommonDataQueue.pollMetricsDataToAlerter());

        records = new ConsumerRecords<>(Collections.singletonMap(
                new TopicPartition("metrics", 0),
                Collections.singletonList(
                        new ConsumerRecord<>("metrics", 0, 0L, 1L, metricsData)
                )
        ));
        when(metricsDataToAlertConsumer.poll(Duration.ofSeconds(1))).thenReturn(records);

        assertEquals(metricsData, kafkaCommonDataQueue.pollMetricsDataToAlerter());
    }

    @Test
    void testDestroy() throws Exception {

        kafkaCommonDataQueue.destroy();

        verify(metricsDataProducer).close();
        verify(alertDataProducer).close();
        verify(alertDataConsumer).close();
        verify(metricsDataToAlertConsumer).close();
        verify(metricsDataToPersistentStorageConsumer).close();
        verify(metricsDataToRealTimeStorageConsumer).close();
    }
}
