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

import java.time.Duration;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.locks.ReentrantLock;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.config.CommonProperties;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.serialize.AlertDeserializer;
import org.apache.hertzbeat.common.serialize.AlertSerializer;
import org.apache.hertzbeat.common.serialize.KafkaMetricsDataDeserializer;
import org.apache.hertzbeat.common.serialize.KafkaMetricsDataSerializer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.LongDeserializer;
import org.apache.kafka.common.serialization.LongSerializer;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * common data queue implement kafka
 */
@Configuration
@ConditionalOnProperty(prefix = "common.queue", name = "type", havingValue = "kafka")
@Slf4j
public class KafkaCommonDataQueue implements CommonDataQueue, DisposableBean {

    private KafkaProducer<Long, CollectRep.MetricsData> metricsDataProducer;
    private KafkaProducer<Long, Alert> alertDataProducer;
    private KafkaConsumer<Long, Alert> alertDataConsumer;
    private KafkaConsumer<Long, CollectRep.MetricsData> metricsDataToAlertConsumer;
    private KafkaConsumer<Long, CollectRep.MetricsData> metricsDataToPersistentStorageConsumer;
    private KafkaConsumer<Long, CollectRep.MetricsData> metricsDataToRealTimeStorageConsumer;
    private KafkaConsumer<Long, CollectRep.MetricsData> serviceDiscoveryDataConsumer;
    private final ReentrantLock lock1 = new ReentrantLock();
    private final ReentrantLock lock2 = new ReentrantLock();
    private final ReentrantLock lock3 = new ReentrantLock();
    private final ReentrantLock lock4 = new ReentrantLock();
    private final ReentrantLock lock5 = new ReentrantLock();
    private final LinkedBlockingQueue<Alert> alertDataQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToAlertQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToPersistentStorageQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToRealTimeStorageQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> serviceDiscoveryDataQueue;
    private final CommonProperties.KafkaProperties kafka;
    
    public KafkaCommonDataQueue(CommonProperties properties) {
        if (properties == null || properties.getQueue() == null || properties.getQueue().getKafka() == null) {
            log.error("init error, please config common.queue.kafka props in application.yml");
            throw new IllegalArgumentException("please config common.queue.kafka props");
        }
        this.kafka = properties.getQueue().getKafka();
        alertDataQueue = new LinkedBlockingQueue<>();
        metricsDataToAlertQueue = new LinkedBlockingQueue<>();
        metricsDataToPersistentStorageQueue = new LinkedBlockingQueue<>();
        metricsDataToRealTimeStorageQueue = new LinkedBlockingQueue<>();
        serviceDiscoveryDataQueue = new LinkedBlockingQueue<>();
        initDataQueue();
    }
    
    private void initDataQueue(){
        try {
            Map<String, Object> producerConfig = new HashMap<>(3);
            producerConfig.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getServers());
            producerConfig.put(ProducerConfig.ACKS_CONFIG, "all");
            producerConfig.put(ProducerConfig.RETRIES_CONFIG, 3);
            metricsDataProducer = new KafkaProducer<>(producerConfig, new LongSerializer(), new KafkaMetricsDataSerializer());
            alertDataProducer = new KafkaProducer<>(producerConfig, new LongSerializer(), new AlertSerializer());

            Map<String, Object> consumerConfig = new HashMap<>(4);
            consumerConfig.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getServers());
            consumerConfig.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, "50");
            consumerConfig.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
            // 15 minute
            consumerConfig.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, "900000");
            consumerConfig.put("group.id", "default-consumer");

            Map<String, Object> alertConsumerConfig = new HashMap<>(consumerConfig);
            alertConsumerConfig.put("group.id", "alert-consumer");
            alertDataConsumer = new KafkaConsumer<>(alertConsumerConfig, new LongDeserializer(), new AlertDeserializer());
            alertDataConsumer.subscribe(Collections.singletonList(kafka.getAlertsDataTopic()));
            
            Map<String, Object> metricsToAlertConsumerConfig = new HashMap<>(consumerConfig);
            metricsToAlertConsumerConfig.put("group.id", "metrics-alert-consumer");
            metricsDataToAlertConsumer = new KafkaConsumer<>(metricsToAlertConsumerConfig, new LongDeserializer(), new KafkaMetricsDataDeserializer());
            metricsDataToAlertConsumer.subscribe(Collections.singletonList(kafka.getMetricsDataTopic()));
            
            Map<String, Object> metricsToPersistentConsumerConfig = new HashMap<>(consumerConfig);
            metricsToPersistentConsumerConfig.put("group.id", "metrics-persistent-consumer");
            metricsDataToPersistentStorageConsumer = new KafkaConsumer<>(metricsToPersistentConsumerConfig, new LongDeserializer(),
                    new KafkaMetricsDataDeserializer());
            metricsDataToPersistentStorageConsumer.subscribe(Collections.singletonList(kafka.getMetricsDataTopic()));
            
            Map<String, Object> metricsToRealTimeConsumerConfig = new HashMap<>(consumerConfig);
            metricsToRealTimeConsumerConfig.put("group.id", "metrics-memory-consumer");
            metricsDataToRealTimeStorageConsumer = new KafkaConsumer<>(metricsToRealTimeConsumerConfig, new LongDeserializer(),
                    new KafkaMetricsDataDeserializer());
            metricsDataToRealTimeStorageConsumer.subscribe(Collections.singletonList(kafka.getMetricsDataTopic()));

            Map<String, Object> serviceDiscoveryDataConsumerConfig = new HashMap<>(consumerConfig);
            serviceDiscoveryDataConsumerConfig.put("group.id", "service-discovery-data-consumer");
            serviceDiscoveryDataConsumer = new KafkaConsumer<>(serviceDiscoveryDataConsumerConfig, new LongDeserializer(),
                    new KafkaMetricsDataDeserializer());
            serviceDiscoveryDataConsumer.subscribe(Collections.singletonList(kafka.getServiceDiscoveryDataTopic()));
        } catch (Exception e) {
            log.error("please config common.queue.kafka props correctly", e);
            throw e;
        }
    }

    @Override
    public void sendAlertsData(Alert alert) {
        if (alertDataProducer != null) {
            alertDataProducer.send(new ProducerRecord<>(kafka.getAlertsDataTopic(), alert));
        } else {
            log.error("kafkaAlertProducer is not enable");
        }
    }

    @Override
    public Alert pollAlertsData() throws InterruptedException {
        Alert alert = alertDataQueue.poll();
        if (alert != null) {
            return alert;
        }
        lock1.lockInterruptibly();
        try {
            ConsumerRecords<Long, Alert> records = alertDataConsumer.poll(Duration.ofSeconds(1));
            int index = 0;
            for (ConsumerRecord<Long, Alert> record : records) {
                if (index == 0) {
                    alert = record.value();
                } else {
                    alertDataQueue.offer(record.value());
                }
                index++;
            }
            alertDataConsumer.commitAsync();
        } catch (Exception e){
            log.error(e.getMessage());
        } finally {
            lock1.unlock();
        }
        return alert;
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToAlerter() throws InterruptedException {
        return pollMetricsData(metricsDataToAlertQueue, lock2, metricsDataToAlertConsumer);
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToPersistentStorage() throws InterruptedException {
        return pollMetricsData(metricsDataToPersistentStorageQueue, lock3, metricsDataToPersistentStorageConsumer);
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToRealTimeStorage() throws InterruptedException {
        return pollMetricsData(metricsDataToRealTimeStorageQueue, lock4, metricsDataToRealTimeStorageConsumer);
    }

    @Override
    public CollectRep.MetricsData pollServiceDiscoveryData() throws InterruptedException {
        return pollMetricsData(serviceDiscoveryDataQueue, lock5, serviceDiscoveryDataConsumer);
    }

    @Override
    public void sendMetricsData(CollectRep.MetricsData metricsData) {
        if (metricsDataProducer != null) {
            metricsDataProducer.send(new ProducerRecord<>(kafka.getMetricsDataTopic(), metricsData));
        } else {
            log.error("metricsDataProducer is not enabled");
        }
    }

    @Override
    public void sendServiceDiscoveryData(CollectRep.MetricsData metricsData) {
        if (metricsDataProducer != null) {
            metricsDataProducer.send(new ProducerRecord<>(kafka.getServiceDiscoveryDataTopic(), metricsData));
        } else {
            log.error("metricsDataProducer is not enabled");
        }
    }

    @Override
    public void destroy() throws Exception {
        if (metricsDataProducer != null) {
            metricsDataProducer.close();
        }
        if (alertDataProducer != null) {
            alertDataProducer.close();
        }
        if (alertDataConsumer != null) {
            alertDataConsumer.close();
        }
        if (metricsDataToAlertConsumer != null) {
            metricsDataToAlertConsumer.close();
        }
        if (metricsDataToPersistentStorageConsumer != null) {
            metricsDataToPersistentStorageConsumer.close();
        }
        if (metricsDataToRealTimeStorageConsumer != null) {
            metricsDataToRealTimeStorageConsumer.close();
        }
        if (serviceDiscoveryDataConsumer != null) {
            serviceDiscoveryDataConsumer.close();
        }
    }

    private CollectRep.MetricsData pollMetricsData(LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToAlertQueue,
                                                   ReentrantLock lock,
                                                   KafkaConsumer<Long, CollectRep.MetricsData> metricsDataToAlertConsumer) throws InterruptedException {
        CollectRep.MetricsData metricsData = metricsDataToAlertQueue.poll();
        if (metricsData != null) {
            return metricsData;
        }
        lock.lockInterruptibly();
        try {
            ConsumerRecords<Long, CollectRep.MetricsData> records = metricsDataToAlertConsumer.poll(Duration.ofSeconds(1));
            int index = 0;
            for (ConsumerRecord<Long, CollectRep.MetricsData> record : records) {
                if (index == 0) {
                    metricsData = record.value();
                } else {
                    metricsDataToAlertQueue.offer(record.value());
                }
                index++;
            }
            metricsDataToAlertConsumer.commitAsync();
        } catch (Exception e) {
            log.error(e.getMessage());
        } finally {
            lock.unlock();
        }
        return metricsData;
    }
}
