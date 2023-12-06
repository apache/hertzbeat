package org.dromara.hertzbeat.common.serialize;


import org.apache.kafka.common.header.Headers;
import org.apache.kafka.common.serialization.Serializer;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.util.JsonUtil;

import java.util.Map;

/**
 * kafka alert entity serializer
 * @author tablerow
 */
public class AlertSerializer implements Serializer<Alert> {

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        Serializer.super.configure(configs, isKey);
    }

    @Override
    public byte[] serialize(String s, Alert alert) {
        if (alert == null){
            return null;
        }
        return JsonUtil.toJson(alert).getBytes();
    }

    @Override
    public byte[] serialize(String topic, Headers headers, Alert data) {
        return Serializer.super.serialize(topic, headers, data);
    }

    @Override
    public void close() {
        Serializer.super.close();
    }
}
