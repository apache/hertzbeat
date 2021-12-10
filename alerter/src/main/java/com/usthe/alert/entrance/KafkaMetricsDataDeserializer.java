package com.usthe.alert.entrance;

import com.usthe.common.entity.message.CollectRep;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.serialization.Deserializer;

/**
 * MetricsData的反序列化
 * @author tom
 * @date 2021/11/24 17:29
 */
@Slf4j
public class KafkaMetricsDataDeserializer implements Deserializer<CollectRep.MetricsData> {

    @Override
    public CollectRep.MetricsData deserialize(String topicName, byte[] bytes) {
        try {
            return CollectRep.MetricsData.parseFrom(bytes);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return null;
    }
}
