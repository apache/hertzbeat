package org.dromara.hertzbeat.common.serialize;

import com.google.protobuf.InvalidProtocolBufferException;
import org.apache.kafka.common.header.Headers;
import org.apache.kafka.common.serialization.Deserializer;
import org.dromara.hertzbeat.common.entity.message.CollectRep;

import java.util.Map;

/**
 * kafka metrics data deserializer
 * @author tablerow
 */
public class KafkaMetricsDataDeserializer implements Deserializer<CollectRep.MetricsData> {

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        Deserializer.super.configure(configs, isKey);
    }

    @Override
    public CollectRep.MetricsData deserialize(String s, byte[] bytes){
        try {
            return CollectRep.MetricsData.parseFrom(bytes);
        } catch (InvalidProtocolBufferException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public CollectRep.MetricsData deserialize(String topic, Headers headers, byte[] data) {
        return Deserializer.super.deserialize(topic, headers, data);
    }

    @Override
    public void close() {
        Deserializer.super.close();
    }
}
