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

import java.util.Map;
import java.util.Set;

import javax.management.MBeanServerConnection;
import javax.management.ObjectInstance;
import javax.management.ObjectName;

import org.apache.hertzbeat.collector.collect.jmx.MbeanProcessor;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.message.CollectRep.MetricsData.Builder;

/**
 * kafkaBytesInAndOutPerSecProcessor
 */
public class KafkaBytesInAndOutPerSecProcessor implements MbeanProcessor {

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

