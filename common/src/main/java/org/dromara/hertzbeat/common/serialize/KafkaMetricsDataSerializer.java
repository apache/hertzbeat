package org.dromara.hertzbeat.common.serialize;


import org.apache.kafka.common.header.Headers;
import org.apache.kafka.common.serialization.Serializer;
import org.dromara.hertzbeat.common.entity.message.CollectRep;

import java.util.Map;


/**
 * kafka metrics data serializer
 * @author tablerow
 */
public class KafkaMetricsDataSerializer implements Serializer<CollectRep.MetricsData> {

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        Serializer.super.configure(configs, isKey);
    }

    @Override
    public byte[] serialize(String s, CollectRep.MetricsData metricsData) {
        return metricsData.toByteArray();
    }

    @Override
    public byte[] serialize(String topic, Headers headers, CollectRep.MetricsData data) {
        return Serializer.super.serialize(topic, headers, data);
    }

    @Override
    public void close() {
        Serializer.super.close();
    }
}
