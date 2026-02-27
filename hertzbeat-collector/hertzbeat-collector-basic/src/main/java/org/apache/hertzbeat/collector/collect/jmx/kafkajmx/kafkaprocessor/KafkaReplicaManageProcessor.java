/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.collector.collect.jmx.kafkajmx.kafkaprocessor;

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

import org.apache.hertzbeat.collector.collect.jmx.MbeanProcessor;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep.MetricsData;
import org.apache.hertzbeat.common.entity.message.CollectRep.ValueRow.Builder;


/**
 * KafkaReplicaManageProcessor
 */
public class KafkaReplicaManageProcessor implements MbeanProcessor {

    private static final String FAILED_ISR_UPDATES_PER_SEC = "FailedIsrUpdatesPerSec";
    private static final String ISR_EXPANDS_PER_SEC = "IsrExpandsPerSec";
    private static final String ISR_SHRINKS_PER_SEC = "IsrShrinksPerSec";

    Boolean completeFlag = false;

    @Override
    public void preProcess(MetricsData.Builder builder, Metrics metrics) {

    }

    @Override
    public void process(MBeanServerConnection serverConnection, ObjectInstance objectInstance, Set<ObjectInstance> objectInstanceSet,
            ObjectName objectName, Map<String, String> attributeValueMap, Builder valueRowBuilder) {
        for (ObjectInstance instance : objectInstanceSet) {
            ObjectName currentObjectName = instance.getObjectName();
            try {
                AttributeList attributes = serverConnection.getAttributes(currentObjectName, new String[] {"Value"});
                if (FAILED_ISR_UPDATES_PER_SEC.equals(currentObjectName.getKeyProperty("name"))
                        || ISR_EXPANDS_PER_SEC.equals(currentObjectName.getKeyProperty("name"))
                        || ISR_SHRINKS_PER_SEC.equals(currentObjectName.getKeyProperty("name"))) {
                    attributes = serverConnection.getAttributes(currentObjectName, new String[] {"Count"});
                }
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
