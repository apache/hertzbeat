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
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.queue.CommonDataQueue;
import org.dromara.hertzbeat.common.serialize.AlertDeserializer;
import org.dromara.hertzbeat.common.serialize.AlertSerializer;
import org.dromara.hertzbeat.common.serialize.KafkaMetricsDataDeserializer;
import org.dromara.hertzbeat.common.serialize.KafkaMetricsDataSerializer;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.time.Duration;
import java.util.Arrays;
import java.util.ConcurrentModificationException;
import java.util.HashMap;
import java.util.Map;


/**
 * kafka采集数据队列实现
 * @author tablerow
 *
 */
@Configuration
@ConditionalOnProperty(prefix = "common.queue", name = "type", havingValue = "kafka",
        matchIfMissing = false)
@Slf4j
public class KafkaCommonDataQueue implements CommonDataQueue, DisposableBean {

    KafkaProducer metricsDataProducer;
    KafkaProducer kafkaAlertProducer;
    KafkaConsumer<Long, Alert> alertConsumer;
    KafkaConsumer<Long, CollectRep.MetricsData> metricsDataToAlertConsumer;
    KafkaConsumer<Long, CollectRep.MetricsData> metricsDataToPersistentStorageConsumer;
    KafkaConsumer<Long, CollectRep.MetricsData> metricsDataToMemoryStorageConsumer;
    @Autowired
    private KafkaProperties kafka;

    @PostConstruct
    public void initDataQueue(){
        try {
            Map<String, Object> producerConfig = new HashMap<String, Object>(3);
            producerConfig.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getServers());
            producerConfig.put(ProducerConfig.ACKS_CONFIG, "all");
            producerConfig.put(ProducerConfig.RETRIES_CONFIG, 3);
            metricsDataProducer = new KafkaProducer<>(producerConfig, new LongSerializer(), new KafkaMetricsDataSerializer());
            kafkaAlertProducer = new KafkaProducer(producerConfig, new LongSerializer(), new AlertSerializer());

            Map<String, Object> consumerConfig = new HashMap<String, Object>(4);
            consumerConfig.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,kafka.getServers());
            consumerConfig.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, "1");
            consumerConfig.put("group.id", "default-consumer");
            consumerConfig.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);

            alertConsumer = new KafkaConsumer(consumerConfig, new LongDeserializer(), new AlertDeserializer());
          
            metricsDataToAlertConsumer = new KafkaConsumer(consumerConfig, new LongDeserializer(), new KafkaMetricsDataDeserializer());
            metricsDataToMemoryStorageConsumer = new KafkaConsumer(consumerConfig, new LongDeserializer(), new KafkaMetricsDataDeserializer());
            metricsDataToPersistentStorageConsumer = new KafkaConsumer(consumerConfig, new LongDeserializer(), new KafkaMetricsDataDeserializer());

            alertConsumer.subscribe(Arrays.asList(kafka.getAlertTopic()));
            metricsDataToAlertConsumer.subscribe(Arrays.asList(kafka.getAlertmetricTopic()));
            metricsDataToPersistentStorageConsumer.subscribe(Arrays.asList(kafka.getPersistentStorageTopic()));
            metricsDataToMemoryStorageConsumer.subscribe(Arrays.asList(kafka.getRealTimeMemoryStorageTopic()));
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    @Override
    public void addAlertData(Alert alert) {
        if (kafkaAlertProducer != null) {
            kafkaAlertProducer.send(new ProducerRecord<>(kafka.getAlertTopic(), alert));
        } else {
            log.error("kafkaAlertProducer is not enable");
        }
    }

    @Override
    public Alert pollAlertData() throws InterruptedException {
        Alert alert = null;
        try {
            ConsumerRecords<Long, Alert> records = alertConsumer.poll(Duration.ofSeconds(1));
            for ( ConsumerRecord record : records) {
                alert = (Alert) record.value();
            }
            alertConsumer.commitAsync();
        }catch (ConcurrentModificationException e){
            //kafka多线程下线程不安全异常
        }
        return alert;
    }

    @Override
    public CollectRep.MetricsData pollAlertMetricsData() throws InterruptedException {
        CollectRep.MetricsData metricsData = null;
        try {
            ConsumerRecords<Long, CollectRep.MetricsData> records = metricsDataToAlertConsumer.poll(Duration.ofSeconds(1));
            for ( ConsumerRecord record : records) {
                metricsData = (CollectRep.MetricsData) record.value();
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
            for ( ConsumerRecord record : records) {
                persistentStorageMetricsData = (CollectRep.MetricsData) record.value();
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
            for ( ConsumerRecord record : records) {
                memoryMetricsData = (CollectRep.MetricsData) record.value();
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
            metricsDataProducer.send(new ProducerRecord<>(kafka.getAlertmetricTopic(), metricsData));
            metricsDataProducer.send(new ProducerRecord<>(kafka.getPersistentStorageTopic(), metricsData));
            metricsDataProducer.send(new ProducerRecord<>(kafka.getRealTimeMemoryStorageTopic(), metricsData));
        } else {
            log.error("metricsDataProducer is not enabled");
        }

    }

    @Override
    public void destroy() throws Exception {
        if (metricsDataProducer != null) {
            metricsDataProducer.close();
        }
        if (kafkaAlertProducer != null) {
            kafkaAlertProducer.close();
        }
        if (alertConsumer != null) {
            alertConsumer.close();
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
    @Component
    @ConfigurationProperties("common.queue.kafka")
    public static class KafkaProperties {
        /**
         * kafka的连接服务器url
         */
        private String servers;
        /**
         * 接收数据的topic名称
         */
        private String alertTopic;
        private String alertMetricTopic;
        private String persistentStorageTopic;
        private String realTimeMemoryStorageTopic;
        /**
         * 消费者组ID
         */
        private String groupId;
        public String getServers() {
            return servers;
        }

        public void setServers(String servers) {
            this.servers = servers;
        }

        public String getAlertTopic() {
            return alertTopic;
        }

        public void setAlertTopic(String alertTopic) {
            this.alertTopic = alertTopic;
        }

        public String getAlertmetricTopic() {
            return alertMetricTopic;
        }

        public void setAlertmetricTopic(String alertMetricTopic) {
            this.alertMetricTopic = alertMetricTopic;
        }

        public String getPersistentStorageTopic() {
            return persistentStorageTopic;
        }

        public void setPersistentStorageTopic(String persistentStorageTopic) {
            this.persistentStorageTopic = persistentStorageTopic;
        }

        public String getRealTimeMemoryStorageTopic() {
            return realTimeMemoryStorageTopic;
        }

        public void setRealTimeMemoryStorageTopic(String realTimeMemoryStorageTopic) {
            this.realTimeMemoryStorageTopic = realTimeMemoryStorageTopic;
        }

        public String getGroupId() {
            return groupId;
        }

        public void setGroupId(String groupId) {
            this.groupId = groupId;
        }
    }
}
