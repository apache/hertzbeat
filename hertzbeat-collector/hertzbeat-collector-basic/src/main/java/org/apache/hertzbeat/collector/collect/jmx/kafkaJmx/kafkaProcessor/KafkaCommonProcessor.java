package org.apache.hertzbeat.collector.collect.jmx.kafkaJmx.kafkaProcessor;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

import javax.management.Attribute;
import javax.management.AttributeList;
import javax.management.InstanceNotFoundException;
import javax.management.MBeanServerConnection;
import javax.management.ObjectInstance;
import javax.management.ObjectName;
import javax.management.ReflectionException;

import org.apache.hertzbeat.collector.collect.jmx.MBeanProcessor;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep.MetricsData.Builder;
import org.apache.hertzbeat.common.entity.message.CollectRep.ValueRow;

/**
 * @author doveLin <lindefu@kuaishou.com>
 * Created on 2025-01-01
 */
public class KafkaCommonProcessor implements MBeanProcessor {

    Boolean completeFlag = false;
    @Override
    public void preProcess(Builder builder, Metrics metrics) {

    }

    @Override
    public void process(MBeanServerConnection serverConnection, ObjectInstance objectInstance,
            Set<ObjectInstance> objectInstanceSet, ObjectName objectName, Map<String, String> attributeValueMap,
            ValueRow.Builder valueRowBuilder) {
        for (ObjectInstance instance : objectInstanceSet) {
            ObjectName currentObjectName = instance.getObjectName();
            try {
                AttributeList attributes = serverConnection.getAttributes(currentObjectName, new String[] {"Value"});
                Object value = null;
                if (attributes != null && !attributes.isEmpty()) {
                    Attribute attribute = (Attribute) attributes.get(0);
                    if (attribute != null) {
                        value = attribute.getValue();
                    }
                }
                String key = currentObjectName.getKeyProperty("name");
                attributeValueMap.put("Value->" + key, String.valueOf(value));
            } catch (InstanceNotFoundException | ReflectionException | IOException e) {
                throw new RuntimeException(e);
            }
        }
        completeFlag = true;
    }

    @Override
    public Boolean isCollectionComplete() {
        return completeFlag;
    }
}
