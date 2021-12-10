package com.usthe.alert.entrance;

import com.usthe.alert.AlerterProperties;
import com.usthe.alert.AlerterWorkerPool;
import com.usthe.alert.AlerterDataQueue;
import com.usthe.common.entity.message.CollectRep;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.LongDeserializer;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

/**
 * 从Kafka消费指标组采集数据处理
 *
 *
 */
@Configuration
@AutoConfigureAfter(value = {AlerterProperties.class})
@ConditionalOnProperty(prefix = "alerter.entrance.kafka",
        name = "enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class KafkaDataConsume implements DisposableBean {

    private KafkaConsumer<Long, CollectRep.MetricsData> consumer;
    private AlerterWorkerPool workerPool;
    private AlerterDataQueue dataQueue;
    public KafkaDataConsume(AlerterProperties properties, AlerterWorkerPool workerPool,
                            AlerterDataQueue dataQueue) {
        this.workerPool = workerPool;
        this.dataQueue = dataQueue;
        initConsumer(properties);
        startConsumeData();
    }

    private void startConsumeData() {
        Runnable runnable = () -> {
            Thread.currentThread().setName("warehouse-kafka-data-consumer");
            while (!Thread.currentThread().isInterrupted()) {
                ConsumerRecords<Long, CollectRep.MetricsData> records = consumer.poll(Duration.ofMillis(100));
                records.forEach(record -> {
                    dataQueue.addMetricsData(record.value());
                });
            }
        };
        workerPool.executeJob(runnable);
    }

    private void initConsumer(AlerterProperties properties) {
        if (properties == null || properties.getEntrance() == null || properties.getEntrance().getKafka() == null) {
            log.error("init error, please config Warehouse kafka props in application.yml");
            throw new IllegalArgumentException("please config Warehouse kafka props");
        }
        AlerterProperties.EntranceProperties.KafkaProperties kafkaProp = properties.getEntrance().getKafka();
        Properties consumerProp = new Properties();
        consumerProp.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, kafkaProp.getServers());
        consumerProp.put(ConsumerConfig.GROUP_ID_CONFIG, kafkaProp.getGroupId());
        consumerProp.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, LongDeserializer.class);
        consumerProp.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, KafkaMetricsDataDeserializer.class);
        consumerProp.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, true);
        consumerProp.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, 1000);
        consumer = new KafkaConsumer<>(consumerProp);
        consumer.subscribe(Collections.singleton(kafkaProp.getTopic()));
    }

    @Override
    public void destroy() throws Exception {
        if (consumer != null) {
            consumer.close();
        }
    }
}
