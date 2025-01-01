package org.apache.hertzbeat.collector.collect.jmx;

import java.util.List;

import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.jmx.kafkaJmx.KafkaJmxValidator;

/**
 * @author doveLin <lindefu@kuaishou.com>
 * Created on 2024-12-28
 */

public class CustomizedJmxFactory {

    private static final List<String> ALLOWED_APPS = List.of("kafka");

    // Validate app and its corresponding name and objectName
    public static boolean validate(String app, String objectName) {
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
    private static boolean isValidApp(String app) {
        return ALLOWED_APPS.contains(app.toLowerCase());
    }


    public static MBeanProcessor getProcessor(String app, String objectName) {
        switch (app) {
            case "kafka":
                return KafkaJmxValidator.getProcessor(objectName);
            default:
                return null;
        }
    }

}

