package org.apache.hertzbeat.collector.collect.jmx.kafkaJmx.kafkaProcessor;

import java.util.Map;
import java.util.Set;

import javax.management.MBeanServerConnection;
import javax.management.ObjectInstance;
import javax.management.ObjectName;

import org.apache.hertzbeat.collector.collect.jmx.MBeanProcessor;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.message.CollectRep.MetricsData.Builder;

/**
 * @author doveLin <lindefu@kuaishou.com>
 * Created on 2025-01-01
 */
public class kafkaBytesInAndOutPerSecProcessor implements MBeanProcessor {

    Boolean completeFlag = false;

    @Override
    public void preProcess(Builder builder, Metrics metrics) {

    }

    @Override
    public void process(MBeanServerConnection serverConnection,
            ObjectInstance objectInstance, Set<ObjectInstance> objectInstanceSet, ObjectName objectName,
            Map<String, String> attributeValueMap, CollectRep.ValueRow.Builder valueRowBuilder) {
        String topic = objectName.getKeyProperty("topic");
        attributeValueMap.put("topic", topic);
    }

    @Override
    public Boolean isCollectionComplete() {
        return completeFlag;
    }

}

