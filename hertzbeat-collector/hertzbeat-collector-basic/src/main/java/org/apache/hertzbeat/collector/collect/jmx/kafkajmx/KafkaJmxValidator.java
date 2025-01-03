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

package org.apache.hertzbeat.collector.collect.jmx.kafkajmx;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.jmx.JmxValidator;
import org.apache.hertzbeat.collector.collect.jmx.MbeanProcessor;
import org.apache.hertzbeat.collector.collect.jmx.kafkajmx.kafkaprocessor.KafkaBytesInAndOutPerSecProcessor;
import org.apache.hertzbeat.collector.collect.jmx.kafkajmx.kafkaprocessor.KafkaCommonProcessor;
import org.apache.hertzbeat.collector.collect.jmx.kafkajmx.kafkaprocessor.KafkaReplicaManageProcessor;



import java.util.function.Supplier;


/**
 * KafkaJmxValidator
 */

public class KafkaJmxValidator implements JmxValidator {

    // Map of object name patterns to their corresponding processor suppliers
    private static final Map<String, Supplier<MbeanProcessor>> OBJECT_NAME_MAP;

    static {
        Map<String, Supplier<MbeanProcessor>> map = new HashMap<>();
        map.put("kafka\\.server:type=BrokerTopicMetrics,name=BytesInPerSec,topic=\\*",
                KafkaBytesInAndOutPerSecProcessor::new);
        map.put("kafka\\.server:type=BrokerTopicMetrics,name=BytesOutPerSec,topic=\\*",
                KafkaBytesInAndOutPerSecProcessor::new);
        map.put("kafka\\.server:type=ReplicaManager,name=\\*",
                KafkaReplicaManageProcessor::new);
        map.put("kafka\\.controller:type=KafkaController,name=\\*",
                KafkaCommonProcessor::new);
        map.put("kafka\\..*:type=GroupMetadataManager,name=\\*",
                KafkaCommonProcessor::new);
        OBJECT_NAME_MAP = Collections.unmodifiableMap(map);
    }

    @Override
    public boolean isValid(String objectName) {
        if (StringUtils.isBlank(objectName)) {
            return false;
        }
        return OBJECT_NAME_MAP.keySet().stream()
                .anyMatch(pattern -> objectName.matches(pattern));
    }

    @Override
    public MbeanProcessor getProcessor(String objectName) {
        if (StringUtils.isBlank(objectName)) {
            return null;
        }
        return OBJECT_NAME_MAP.entrySet().stream()
                .filter(entry -> objectName.matches(entry.getKey()))
                .map(entry -> entry.getValue().get())
                .findFirst()
                .orElse(null);
    }
}

