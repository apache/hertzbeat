package org.apache.hertzbeat.collector.collect.jmx.kafkaJmx;



import java.io.IOException;
import java.util.Arrays;
import java.util.Hashtable;
import java.util.Map;
import java.util.Set;


import javax.management.AttributeList;
import javax.management.InstanceNotFoundException;
import javax.management.IntrospectionException;
import javax.management.MBeanAttributeInfo;
import javax.management.MBeanFeatureInfo;
import javax.management.MBeanInfo;
import javax.management.MBeanServerConnection;

import javax.management.ObjectInstance;
import javax.management.ObjectName;
import javax.management.ReflectionException;

import org.apache.hertzbeat.collector.collect.jmx.CustomizedJmxCollect;
import org.apache.hertzbeat.collector.collect.jmx.CustomizedJmxFactory.customizedJmxRequest;
import org.apache.hertzbeat.collector.collect.jmx.JmxUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.message.CollectRep.MetricsData.Builder;


/**
 * @author doveLin <lindefu@kuaishou.com>
 * Created on 2024-12-28
 */

public class kafkaJmxCollect implements CustomizedJmxCollect {

    private final static String BYTES_IN_PER_SEC = "kafka.server:type=BrokerTopicMetrics,name=BytesInPerSec,topic=*";

    @Override
    public void collect(customizedJmxRequest request) {
        switch (request.getJmxProtocol().getObjectName()) {
            case BYTES_IN_PER_SEC :
                BytesInPerSec(request);
                break;
        }
    }

    private void BytesInPerSec (customizedJmxRequest request) {
        Metrics metrics = request.getMetrics();
        Builder builder = request.getBuilder();
        Set<String> attributeNameSet = request.getAttributeNameSet();
        MBeanServerConnection serverConnection = request.getMBeanServerConnection();
        try {
            for (ObjectInstance objectInstance : request.getObjectInstanceSet()) {
                ObjectName currentObjectName = objectInstance.getObjectName();

                Hashtable<String, String> keyPropertyList = currentObjectName.getKeyPropertyList();
                String s = keyPropertyList.get("topic");

                String topic = currentObjectName.getKeyProperty("topic");
                MBeanInfo beanInfo = serverConnection.getMBeanInfo(currentObjectName);
                MBeanAttributeInfo[] attrInfos = beanInfo.getAttributes();
                String[] attributes = new String[attributeNameSet.size()];
                attributes = Arrays.stream(attrInfos)
                        .filter(item -> item.isReadable() && attributeNameSet.contains(item.getName()))
                        .map(MBeanFeatureInfo::getName)
                        .toList().toArray(attributes);
                AttributeList attributeList = serverConnection.getAttributes(currentObjectName, attributes);
                Map<String, String> attributeValueMap = JmxUtil.extractAttributeValue(attributeList);
                attributeValueMap.put("TopicName", topic);
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String aliasField : metrics.getAliasFields()) {
                    String fieldValue = attributeValueMap.get(aliasField);
                    valueRowBuilder.addColumn(fieldValue != null ? fieldValue : CommonConstants.NULL_VALUE);
                }
                builder.addValueRow(valueRowBuilder.build());
            }
        } catch (InstanceNotFoundException | IntrospectionException | ReflectionException | IOException e) {
            throw new RuntimeException(e);
        }
    }
}
