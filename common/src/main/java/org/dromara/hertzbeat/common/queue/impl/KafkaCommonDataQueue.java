package org.dromara.hertzbeat.common.queue.impl;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.LongDeserializer;
import org.apache.kafka.common.serialization.LongSerializer;
import org.dromara.hertzbeat.common.config.CommonProperties;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.queue.CommonDataQueue;
import org.dromara.hertzbeat.common.serialize.AlertDeserializer;
import org.dromara.hertzbeat.common.serialize.AlertSerializer;
import org.dromara.hertzbeat.common.serialize.KafkaMetricsDataDeserializer;
import org.dromara.hertzbeat.common.serialize.KafkaMetricsDataSerializer;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.*;


/**
 * kafka采集数据队列实现
 * @author tablerow
 *
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
    private KafkaConsumer<Long, CollectRep.MetricsData> metricsDataToMemoryStorageConsumer;
    
    private final CommonProperties.KafkaProperties kafka;
    
    public KafkaCommonDataQueue(CommonProperties properties) {
        if (properties == null || properties.getQueue() == null || properties.getQueue().getKafka() == null) {
            log.error("init error, please config common.queue.kafka props in application.yml");
            throw new IllegalArgumentException("please config common.queue.kafka props");
        }
        this.kafka = properties.getQueue().getKafka();
        initDataQueue();
    }
    
    private void initDataQueue(){
        try {
            Map<String, Object> producerConfig = new HashMap<String, Object>(3);
            producerConfig.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getServers());
            producerConfig.put(ProducerConfig.ACKS_CONFIG, "all");
            producerConfig.put(ProducerConfig.RETRIES_CONFIG, 3);
            metricsDataProducer = new KafkaProducer<>(producerConfig, new LongSerializer(), new KafkaMetricsDataSerializer());
            alertDataProducer = new KafkaProducer<>(producerConfig, new LongSerializer(), new AlertSerializer());

            Map<String, Object> consumerConfig = new HashMap<String, Object>(4);
            consumerConfig.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,kafka.getServers());
            consumerConfig.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, "1");
            consumerConfig.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
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
            metricsDataToPersistentStorageConsumer = new KafkaConsumer<>(metricsToPersistentConsumerConfig, new LongDeserializer(), new KafkaMetricsDataDeserializer());
            metricsDataToPersistentStorageConsumer.subscribe(Collections.singletonList(kafka.getMetricsDataTopic()));
            
            Map<String, Object> metricsToMemoryConsumerConfig = new HashMap<>(consumerConfig);
            metricsToMemoryConsumerConfig.put("group.id", "metrics-memory-consumer");
            metricsDataToMemoryStorageConsumer = new KafkaConsumer<>(metricsToMemoryConsumerConfig, new LongDeserializer(), new KafkaMetricsDataDeserializer());
            metricsDataToMemoryStorageConsumer.subscribe(Collections.singletonList(kafka.getMetricsDataTopic()));
        } catch (Exception e) {
            log.error("please config common.queue.kafka props correctly", e);
            throw e;
        }
    }

    @Override
    public void addAlertData(Alert alert) {
        if (alertDataProducer != null) {
            alertDataProducer.send(new ProducerRecord<>(kafka.getAlertsDataTopic(), alert));
        } else {
            log.error("kafkaAlertProducer is not enable");
        }
    }

    @Override
    public Alert pollAlertData() throws InterruptedException {
        Alert alert = null;
        try {
            ConsumerRecords<Long, Alert> records = alertDataConsumer.poll(Duration.ofSeconds(1));
            for (ConsumerRecord<Long, Alert> record : records) {
                alert = record.value();
            }
            alertDataConsumer.commitAsync();
        }catch (ConcurrentModificationException e){
            //todo kafka多线程下线程不安全异常
        }
        return alert;
    }

    @Override
    public CollectRep.MetricsData pollAlertMetricsData() throws InterruptedException {
        CollectRep.MetricsData metricsData = null;
        try {
            ConsumerRecords<Long, CollectRep.MetricsData> records = metricsDataToAlertConsumer.poll(Duration.ofSeconds(1));
            for ( ConsumerRecord<Long, CollectRep.MetricsData> record : records) {
                metricsData = record.value();
            }
            metricsDataToAlertConsumer.commitAsync();
        }catch (ConcurrentModificationException e){
            //kafka多线程下线程不安全异常
        }
        return metricsData;
    }

    @Override
    public CollectRep.MetricsData pollPersistentStorageMetricsData() throws InterruptedException {
        CollectRep.MetricsData persistentStorageMetricsData = null;
        try {
            ConsumerRecords<Long, CollectRep.MetricsData> records = metricsDataToPersistentStorageConsumer.poll(Duration.ofSeconds(1));
            for ( ConsumerRecord<Long, CollectRep.MetricsData> record : records) {
                persistentStorageMetricsData = record.value();
            }
            metricsDataToPersistentStorageConsumer.commitAsync();
        }catch (ConcurrentModificationException e){
            //kafka多线程下线程不安全异常
        }
        return persistentStorageMetricsData;
    }

    @Override
    public CollectRep.MetricsData pollRealTimeStorageMetricsData() throws InterruptedException {
        CollectRep.MetricsData memoryMetricsData = null;
        try {
            ConsumerRecords<Long, CollectRep.MetricsData> records = metricsDataToMemoryStorageConsumer.poll(Duration.ofSeconds(1));
            for ( ConsumerRecord<Long, CollectRep.MetricsData> record : records) {
                memoryMetricsData = record.value();
            }
            metricsDataToMemoryStorageConsumer.commitAsync();
        }catch (ConcurrentModificationException e){
            //kafka多线程下线程不安全异常
        }
        return memoryMetricsData;
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
        if (metricsDataToMemoryStorageConsumer != null) {
            metricsDataToMemoryStorageConsumer.close();
        }
    }
}
