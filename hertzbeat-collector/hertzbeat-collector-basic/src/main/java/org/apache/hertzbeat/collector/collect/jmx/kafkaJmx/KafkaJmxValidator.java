package org.apache.hertzbeat.collector.collect.jmx.kafkaJmx;

import org.apache.commons.lang3.StringUtils;

import lombok.Getter;


/**
 * @author doveLin <lindefu@kuaishou.com>
 * Created on 2024-12-28
 */

@Getter
public enum KafkaJmxValidator {

    BytesInPerSec("kafka.server:type=BrokerTopicMetrics,name=BytesInPerSec,topic=*");

    private final String objectName;

    KafkaJmxValidator(String objectName) {
        this.objectName = objectName;
    }


    // Validate if the given name and objectName match any of the Kafka JMX entries
    public static boolean isValid(String objectName) {
        if (StringUtils.isBlank(objectName)) {
            return false;
        }
        for (KafkaJmxValidator jmxApp : values()) {
            if (jmxApp.getObjectName().equals(objectName)) {
                return true;
            }
        }
        return false;
    }
}

