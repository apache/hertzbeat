package org.apache.hertzbeat.collector.collect.jmx;

import java.util.Map;
import java.util.Set;

import javax.management.MBeanServerConnection;
import javax.management.ObjectInstance;
import javax.management.ObjectName;

import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 * @author doveLin <lindefu@kuaishou.com>
 * Created on 2025-01-01
 */
public interface MBeanProcessor {

    /**
     * Theoretically, any customized requirement can be handled in preProcess, bypassing the general JMX collection method.
     */
    void preProcess(CollectRep.MetricsData.Builder builder, Metrics metrics);

    /**
     * Additional customized tasks, depending on the general JMX collection method.
     */
    void process(MBeanServerConnection serverConnection, ObjectInstance objectInstance,
            Set<ObjectInstance> objectInstanceSet, ObjectName objectName, Map<String, String> attributeValueMap, CollectRep.ValueRow.Builder valueRowBuilder);

    /**
     * Indicator of whether the collection is complete.
     */
    Boolean isCollectionComplete();
}

