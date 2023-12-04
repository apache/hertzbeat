package org.dromara.hertzbeat.common.serialize;

import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.apache.kafka.common.header.Headers;
import org.apache.kafka.common.serialization.Deserializer;
import org.dromara.hertzbeat.common.util.JsonUtil;

import java.util.Map;

/**
 * kafka alert deserializer
 * @author tablerow
 */
public class AlertDeserializer implements Deserializer<Alert> {
    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        Deserializer.super.configure(configs, isKey);
    }

    @Override
    public Alert deserialize(String s, byte[] bytes) {
        return JsonUtil.fromJson(new String(bytes), Alert.class);
    }

    @Override
    public Alert deserialize(String topic, Headers headers, byte[] data) {
        return Deserializer.super.deserialize(topic, headers, data);
    }

    @Override
    public void close() {
        Deserializer.super.close();
    }
}
