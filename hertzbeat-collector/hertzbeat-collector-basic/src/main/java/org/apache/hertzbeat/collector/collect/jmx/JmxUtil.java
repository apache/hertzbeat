package org.apache.hertzbeat.collector.collect.jmx;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import javax.management.Attribute;
import javax.management.AttributeList;
import javax.management.ObjectName;
import javax.management.openmbean.CompositeData;
import javax.management.openmbean.CompositeType;

import lombok.extern.slf4j.Slf4j;

/**
 * @author yourname <yourname@kuaishou.com>
 * Created on 2024-12-28
 */
@Slf4j
public class JmxUtil {

    private static final String SUB_ATTRIBUTE = "->";

    public static Map<String, String> extractAttributeValue(AttributeList attributeList) {
        if (attributeList == null || attributeList.isEmpty()) {
            throw new RuntimeException("attributeList is empty");
        }
        Map<String, String> attributeValueMap = new HashMap<>(attributeList.size());
        for (Attribute attribute : attributeList.asList()) {
            Object value = attribute.getValue();
            if (value == null) {
                log.info("attribute {} value is null.", attribute.getName());
                continue;
            }
            if (value instanceof Number || value instanceof  String || value instanceof ObjectName
                    || value instanceof Boolean || value instanceof Date || value instanceof TimeUnit) {
                attributeValueMap.put(attribute.getName(), value.toString());
            } else if (value instanceof CompositeData compositeData) {
                CompositeType compositeType = compositeData.getCompositeType();
                for (String typeKey : compositeType.keySet()) {
                    Object fieldValue = compositeData.get(typeKey);
                    attributeValueMap.put(attribute.getName() + SUB_ATTRIBUTE + typeKey, fieldValue.toString());
                }
            } else if (value instanceof String[] values) {
                StringBuilder builder = new StringBuilder();
                for (int index = 0; index < values.length; index++) {
                    builder.append(values[index]);
                    if (index < values.length - 1) {
                        builder.append(",");
                    }
                }
                attributeValueMap.put(attribute.getName(), builder.toString());
            } else {
                log.warn("attribute value type {} not support.", value.getClass().getName());
            }
        }
        return attributeValueMap;
    }

}
