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
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.locks.ReentrantLock;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.config.CommonProperties;
import org.apache.hertzbeat.common.constants.DataQueueConstants;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.serialize.KafkaLogEntryDeserializer;
import org.apache.hertzbeat.common.serialize.KafkaLogEntrySerializer;
import org.apache.hertzbeat.common.serialize.KafkaMetricsDataDeserializer;
import org.apache.hertzbeat.common.serialize.KafkaMetricsDataSerializer;
import org.apache.hertzbeat.common.support.exception.CommonDataQueueUnknownException;
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
@ConditionalOnProperty(
        prefix = DataQueueConstants.PREFIX,
        name = DataQueueConstants.NAME,
        havingValue = DataQueueConstants.KAFKA
)
@Slf4j
public class KafkaCommonDataQueue implements CommonDataQueue, DisposableBean {
    
    private final ReentrantLock metricDataToAlertLock = new ReentrantLock();
    private final ReentrantLock metricDataToStorageLock = new ReentrantLock();
    private final ReentrantLock serviceDiscoveryDataLock = new ReentrantLock();
    private final ReentrantLock logEntryLock = new ReentrantLock();
    private final ReentrantLock logEntryToStorageLock = new ReentrantLock();
    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToAlertQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> metricsDataToStorageQueue;
    private final LinkedBlockingQueue<CollectRep.MetricsData> serviceDiscoveryDataQueue;
    private final LinkedBlockingQueue<LogEntry> logEntryQueue;
    private final LinkedBlockingQueue<LogEntry> logEntryToStorageQueue;
    private final CommonProperties.KafkaProperties kafka;
    private KafkaProducer<Long, CollectRep.MetricsData> metricsDataProducer;
    private KafkaProducer<Long, LogEntry> logEntryProducer;
    private KafkaConsumer<Long, CollectRep.MetricsData> metricsDataToAlertConsumer;
    private KafkaConsumer<Long, CollectRep.MetricsData> metricsDataToStorageConsumer;
    private KafkaConsumer<Long, CollectRep.MetricsData> serviceDiscoveryDataConsumer;
    private KafkaConsumer<Long, LogEntry> logEntryConsumer;
    private KafkaConsumer<Long, LogEntry> logEntryToStorageConsumer;

    public KafkaCommonDataQueue(CommonProperties properties) {
        if (properties == null || properties.getQueue() == null || properties.getQueue().getKafka() == null) {
            log.error("init error, please config common.queue.kafka props in application.yml");
            throw new IllegalArgumentException("please config common.queue.kafka props");
        }
        this.kafka = properties.getQueue().getKafka();
        metricsDataToAlertQueue = new LinkedBlockingQueue<>();
        metricsDataToStorageQueue = new LinkedBlockingQueue<>();
        serviceDiscoveryDataQueue = new LinkedBlockingQueue<>();
        logEntryQueue = new LinkedBlockingQueue<>();
        logEntryToStorageQueue = new LinkedBlockingQueue<>();
        initDataQueue();
    }

    private void initDataQueue() {
        try {
            Map<String, Object> producerConfig = new HashMap<>(3);
            producerConfig.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getServers());
            producerConfig.put(ProducerConfig.ACKS_CONFIG, "all");
            producerConfig.put(ProducerConfig.RETRIES_CONFIG, 3);
            metricsDataProducer = new KafkaProducer<>(producerConfig, new LongSerializer(), new KafkaMetricsDataSerializer());
            logEntryProducer = new KafkaProducer<>(producerConfig, new LongSerializer(), new KafkaLogEntrySerializer());

            Map<String, Object> consumerConfig = new HashMap<>(4);
            consumerConfig.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getServers());
            consumerConfig.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, "50");
            consumerConfig.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
            // 15 minute
            consumerConfig.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, "900000");
            consumerConfig.put("group.id", "default-consumer");

            Map<String, Object> metricsToAlertConsumerConfig = new HashMap<>(consumerConfig);
            metricsToAlertConsumerConfig.put("group.id", "metrics-alert-consumer");
            metricsDataToAlertConsumer = new KafkaConsumer<>(metricsToAlertConsumerConfig, new LongDeserializer(), new KafkaMetricsDataDeserializer());
            metricsDataToAlertConsumer.subscribe(Collections.singletonList(kafka.getMetricsDataTopic()));

            Map<String, Object> metricsToStorageConsumerConfig = new HashMap<>(consumerConfig);
            metricsToStorageConsumerConfig.put("group.id", "metrics-persistent-consumer");
            metricsDataToStorageConsumer = new KafkaConsumer<>(metricsToStorageConsumerConfig, new LongDeserializer(), new KafkaMetricsDataDeserializer());
            metricsDataToStorageConsumer.subscribe(Collections.singletonList(kafka.getMetricsDataToStorageTopic()));

            Map<String, Object> serviceDiscoveryDataConsumerConfig = new HashMap<>(consumerConfig);
            serviceDiscoveryDataConsumerConfig.put("group.id", "service-discovery-data-consumer");
            serviceDiscoveryDataConsumer = new KafkaConsumer<>(serviceDiscoveryDataConsumerConfig, new LongDeserializer(),
                    new KafkaMetricsDataDeserializer());
            serviceDiscoveryDataConsumer.subscribe(Collections.singletonList(kafka.getServiceDiscoveryDataTopic()));

            Map<String, Object> logEntryConsumerConfig = new HashMap<>(consumerConfig);
            logEntryConsumerConfig.put("group.id", "log-entry-consumer");
            logEntryConsumer = new KafkaConsumer<>(logEntryConsumerConfig, new LongDeserializer(), new KafkaLogEntryDeserializer());
            logEntryConsumer.subscribe(Collections.singletonList(kafka.getLogEntryDataTopic()));

            Map<String, Object> logEntryToStorageConsumerConfig = new HashMap<>(consumerConfig);
            logEntryToStorageConsumerConfig.put("group.id", "log-entry-storage-consumer");
            logEntryToStorageConsumer = new KafkaConsumer<>(logEntryToStorageConsumerConfig, new LongDeserializer(), new KafkaLogEntryDeserializer());
            logEntryToStorageConsumer.subscribe(Collections.singletonList(kafka.getLogEntryDataToStorageTopic()));
        } catch (Exception e) {
            log.error("please config common.queue.kafka props correctly", e);
            throw e;
        }
    }

    @Override
    public CollectRep.MetricsData pollServiceDiscoveryData() throws InterruptedException {
        return genericPollDataFunction(serviceDiscoveryDataQueue, serviceDiscoveryDataConsumer, serviceDiscoveryDataLock);
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToAlerter() throws InterruptedException {
        return genericPollDataFunction(metricsDataToAlertQueue, metricsDataToAlertConsumer, metricDataToAlertLock);
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToStorage() throws InterruptedException {
        return genericPollDataFunction(metricsDataToStorageQueue, metricsDataToStorageConsumer, metricDataToStorageLock);
    }

    public <T> T genericPollDataFunction(LinkedBlockingQueue<T> dataQueue, KafkaConsumer<Long, T> dataConsumer, ReentrantLock lock) throws InterruptedException {

        T pollData = dataQueue.poll();
        if (pollData != null) {
            return pollData;
        }
        lock.lockInterruptibly();
        try {
            ConsumerRecords<Long, T> records = dataConsumer.poll(Duration.ofSeconds(1));
            int index = 0;
            for (ConsumerRecord<Long, T> record : records) {
                if (index == 0) {
                    pollData = record.value();
                } else {
                    dataQueue.offer(record.value());
                }
                index++;
            }
            dataConsumer.commitAsync();
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new CommonDataQueueUnknownException(e.getMessage(), e);
        } finally {
            lock.unlock();
        }
        return pollData;
    }

    @Override
    public void sendMetricsData(CollectRep.MetricsData metricsData) {
        if (metricsDataProducer != null) {
            ProducerRecord<Long, CollectRep.MetricsData> record =
                    new ProducerRecord<>(kafka.getMetricsDataTopic(), metricsData);
            metricsDataProducer.send(record);
        } else {
            log.error("metricsDataProducer is not enabled");
        }
    }

    @Override
    public void sendMetricsDataToStorage(CollectRep.MetricsData metricsData) {
        if (metricsDataProducer != null) {
            ProducerRecord<Long, CollectRep.MetricsData> record =
                    new ProducerRecord<>(kafka.getMetricsDataToStorageTopic(), metricsData);
            metricsDataProducer.send(record);
        } else {
            log.error("metricsDataProducer is not enabled");
        }
    }

    @Override
    public void sendServiceDiscoveryData(CollectRep.MetricsData metricsData) {
        if (metricsDataProducer != null) {
            ProducerRecord<Long, CollectRep.MetricsData> record =
                    new ProducerRecord<>(kafka.getServiceDiscoveryDataTopic(), metricsData);
            metricsDataProducer.send(record);
        } else {
            log.error("metricsDataProducer is not enabled");
        }
    }

    @Override
    public void sendLogEntry(LogEntry logEntry) {
        if (logEntryProducer != null) {
            try {
                ProducerRecord<Long, LogEntry> record = new ProducerRecord<>(kafka.getLogEntryDataTopic(), logEntry);
                logEntryProducer.send(record);
            } catch (Exception e) {
                log.error("Failed to send LogEntry to Kafka: {}", e.getMessage());
                // Fallback to memory queue if Kafka fails
                logEntryQueue.offer(logEntry);
            }
        } else {
            log.warn("logEntryProducer is not enabled, using memory queue");
            logEntryQueue.offer(logEntry);
        }
    }

    @Override
    public LogEntry pollLogEntry() throws InterruptedException {
        return genericPollDataFunction(logEntryQueue, logEntryConsumer, logEntryLock);
    }

    @Override
    public void sendLogEntryToStorage(LogEntry logEntry) {
        if (logEntryProducer != null) {
            try {
                ProducerRecord<Long, LogEntry> record = new ProducerRecord<>(kafka.getLogEntryDataToStorageTopic(), logEntry);
                logEntryProducer.send(record);
            } catch (Exception e) {
                log.error("Failed to send LogEntry to storage via Kafka: {}", e.getMessage());
                // Fallback to memory queue if Kafka fails
                logEntryToStorageQueue.offer(logEntry);
            }
        } else {
            log.warn("logEntryProducer is not enabled, using memory queue for storage");
            logEntryToStorageQueue.offer(logEntry);
        }
    }

    @Override
    public LogEntry pollLogEntryToStorage() throws InterruptedException {
        return genericPollDataFunction(logEntryToStorageQueue, logEntryToStorageConsumer, logEntryToStorageLock);
    }

    @Override
    public void sendLogEntryToAlertBatch(List<LogEntry> logEntries) {
        if (logEntries == null || logEntries.isEmpty()) {
            return;
        }
        if (logEntryProducer != null) {
            try {
                for (LogEntry logEntry : logEntries) {
                    ProducerRecord<Long, LogEntry> record = new ProducerRecord<>(kafka.getLogEntryDataTopic(), logEntry);
                    logEntryProducer.send(record);
                }
            } catch (Exception e) {
                log.error("Failed to send LogEntry batch to Kafka: {}", e.getMessage());
                for (LogEntry logEntry : logEntries) {
                    logEntryQueue.offer(logEntry);
                }
            }
        } else {
            log.warn("logEntryProducer is not enabled, using memory queue");
            for (LogEntry logEntry : logEntries) {
                logEntryQueue.offer(logEntry);
            }
        }
    }

    @Override
    public List<LogEntry> pollLogEntryToAlertBatch(int maxBatchSize) throws InterruptedException {
        return genericBatchPollDataFunction(logEntryQueue, logEntryConsumer, logEntryLock, maxBatchSize);
    }

    @Override
    public void sendLogEntryToStorageBatch(List<LogEntry> logEntries) {
        if (logEntries == null || logEntries.isEmpty()) {
            return;
        }
        if (logEntryProducer != null) {
            try {
                for (LogEntry logEntry : logEntries) {
                    ProducerRecord<Long, LogEntry> record = new ProducerRecord<>(kafka.getLogEntryDataToStorageTopic(), logEntry);
                    logEntryProducer.send(record);
                }
            } catch (Exception e) {
                log.error("Failed to send LogEntry batch to storage via Kafka: {}", e.getMessage());
                for (LogEntry logEntry : logEntries) {
                    logEntryToStorageQueue.offer(logEntry);
                }
            }
        } else {
            log.warn("logEntryProducer is not enabled, using memory queue for storage");
            for (LogEntry logEntry : logEntries) {
                logEntryToStorageQueue.offer(logEntry);
            }
        }
    }

    @Override
    public List<LogEntry> pollLogEntryToStorageBatch(int maxBatchSize) throws InterruptedException {
        return genericBatchPollDataFunction(logEntryToStorageQueue, logEntryToStorageConsumer, logEntryToStorageLock, maxBatchSize);
    }

    public <T> List<T> genericBatchPollDataFunction(LinkedBlockingQueue<T> dataQueue, KafkaConsumer<Long, T> dataConsumer,
            ReentrantLock lock, int maxBatchSize) throws InterruptedException {
        List<T> batch = new ArrayList<>(maxBatchSize);
        lock.lockInterruptibly();
        try {
            dataQueue.drainTo(batch, maxBatchSize);
            if (batch.size() >= maxBatchSize) {
                return batch;
            }
            ConsumerRecords<Long, T> records = dataConsumer.poll(Duration.ofSeconds(1));
            for (ConsumerRecord<Long, T> record : records) {
                if (batch.size() < maxBatchSize) {
                    batch.add(record.value());
                } else {
                    dataQueue.offer(record.value());
                }
            }
            dataConsumer.commitAsync();
        } catch (Exception e) {
            log.error(e.getMessage());
        } finally {
            lock.unlock();
        }
        return batch;
    }

    @Override
    public void destroy() throws Exception {
        if (metricsDataProducer != null) {
            metricsDataProducer.close();
        }
        if (metricsDataToAlertConsumer != null) {
            metricsDataToAlertConsumer.close();
        }
        if (metricsDataToStorageConsumer != null) {
            metricsDataToStorageConsumer.close();
        }
        if (serviceDiscoveryDataConsumer != null) {
            serviceDiscoveryDataConsumer.close();
        }
        if (logEntryProducer != null) {
            logEntryProducer.close();
        }
        if (logEntryConsumer != null) {
            logEntryConsumer.close();
        }
        if (logEntryToStorageConsumer != null) {
            logEntryToStorageConsumer.close();
        }
    }
}
