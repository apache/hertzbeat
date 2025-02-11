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
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.config.CommonProperties;
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
        when(kafkaProperties.getAlertsDataTopic()).thenReturn("alertsDataTopic");
        when(kafkaProperties.getMetricsDataToStorageTopic()).thenReturn("metricsDataToStorageTopic");
        when(kafkaProperties.getServiceDiscoveryDataTopic()).thenReturn("serviceDiscoveryDataTopic");
        when(kafkaProperties.getServers()).thenReturn("localhost:9092");

        // Simulate the subscribe method for consumers
        doNothing().when(metricsDataToAlertConsumer).subscribe(anyCollection());

        kafkaCommonDataQueue = new KafkaCommonDataQueue(commonProperties);
        
        // Use reflection to set private fields
        setPrivateField(kafkaCommonDataQueue, "metricsDataProducer", metricsDataProducer);
        setPrivateField(kafkaCommonDataQueue, "metricsDataToAlertConsumer", metricsDataToAlertConsumer);
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
    void testDestroy() throws Exception {
        kafkaCommonDataQueue.destroy();
        verify(metricsDataToAlertConsumer).close();
        verify(metricsDataProducer).close();
    }

    private void setPrivateField(Object object, String fieldName, Object value) throws Exception {
        Field field = object.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(object, value);
    }
}
