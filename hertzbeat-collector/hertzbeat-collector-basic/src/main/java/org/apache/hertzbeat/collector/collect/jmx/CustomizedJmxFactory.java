package org.apache.hertzbeat.collector.collect.jmx;

import java.util.List;
import java.util.Set;

import javax.management.MBeanServerConnection;
import javax.management.ObjectInstance;
import javax.management.remote.JMXConnector;

import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.jmx.kafkaJmx.KafkaJmxValidator;
import org.apache.hertzbeat.collector.collect.jmx.kafkaJmx.kafkaJmxCollect;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.JmxProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;


import lombok.Builder;
import lombok.Data;

/**
 * @author doveLin <lindefu@kuaishou.com>
 * Created on 2024-12-28
 */


public class CustomizedJmxFactory {

    private static final List<String> ALLOWED_APPS = List.of("kafka");

    private final kafkaJmxCollect kafkaJmxCollect =new kafkaJmxCollect();

    // Validate app and its corresponding name and objectName
    public boolean validate(String app, String objectName) {
        if (StringUtils.isBlank(app) || !isValidApp(app)) {
            return false;
        }

        switch (app.toLowerCase()) {
            case "kafka":
                return KafkaJmxValidator.isValid(objectName);
            default:
                return false;
        }
    }

    // Check if the app exists in the predefined list
    private boolean isValidApp(String app) {
        return ALLOWED_APPS.contains(app.toLowerCase());
    }

    @Builder
    @Data
    public static class customizedJmxRequest {

        private CollectRep.MetricsData.Builder builder;

        private JmxProtocol jmxProtocol;

        private JMXConnector jmxConnector;

        private Metrics metrics;

        private Set<String> attributeNameSet;

        private MBeanServerConnection mBeanServerConnection;

        private Set<ObjectInstance> objectInstanceSet;
    }

    public void handleAppSpecificCollect(customizedJmxRequest req) {
        switch (req.getBuilder().getApp()) {
            case "kafka":
                kafkaJmxCollect.collect(req);
                break;
            default:
                break;
        }
    }
}

