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
import org.apache.hertzbeat.collector.collect.jmx.MbeanProcessor;
import org.apache.hertzbeat.collector.collect.jmx.kafkajmx.kafkaprocessor.KafkaBytesInAndOutPerSecProcessor;
import org.apache.hertzbeat.collector.collect.jmx.kafkajmx.kafkaprocessor.KafkaCommonProcessor;
import org.apache.hertzbeat.collector.collect.jmx.kafkajmx.kafkaprocessor.KafkaReplicaManageProcessor;


import lombok.Getter;

/**
 * KafkaJmxValidator
 */
@Getter
public enum KafkaJmxValidator {

    BYTES_IN_PER_SEC("kafka\\.server:type=BrokerTopicMetrics,name=BytesInPerSec,topic=.*"),

    BYTES_OUT_PER_SEC("kafka\\.server:type=BrokerTopicMetrics,name=BytesOutPerSec,topic=.*"),

    REPLICA_MANAGE("kafka\\.server:type=ReplicaManager,name=.*"),

    KAFKA_CONTROLLER("kafka\\.controller:type=KafkaController,name=.*"),

    GROUP_METADATA_MANAGE("kafka\\..*:type=GroupMetadataManager,name=.*");

    private final String objectNamePattern;

    KafkaJmxValidator(String objectNamePattern) {
        this.objectNamePattern = objectNamePattern;
    }

    private static final Map<String, KafkaJmxValidator> OBJECT_NAME_MAP;

    static {
        Map<String, KafkaJmxValidator> map = new HashMap<>();
        for (KafkaJmxValidator validator : KafkaJmxValidator.values()) {
            map.put(validator.objectNamePattern, validator);
        }
        OBJECT_NAME_MAP = Collections.unmodifiableMap(map);
    }

    public static boolean isValid(String objectName) {
        if (StringUtils.isBlank(objectName)) {
            return false;
        }
        return OBJECT_NAME_MAP.keySet().stream()
                .anyMatch(pattern -> objectName.matches(pattern));
    }

    public static KafkaJmxValidator fromObjectName(String objectName) {
        if (StringUtils.isBlank(objectName)) {
            return null;
        }
        return OBJECT_NAME_MAP.entrySet().stream()
                .filter(entry -> objectName.matches(entry.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);
    }

    /**
     * Returns the MBeanProcessor instance needed for the given objectName
     *
     * @param objectName The objectName to process
     * @return The corresponding MBeanProcessor instance, or null if not available
     */
    public static MbeanProcessor getProcessor(String objectName) {
        KafkaJmxValidator validator = fromObjectName(objectName);
        if (validator == null) {
            return null;
        }
        switch (validator) {
            case BYTES_IN_PER_SEC:
            case BYTES_OUT_PER_SEC:
                return new KafkaBytesInAndOutPerSecProcessor();
            case REPLICA_MANAGE:
                return new KafkaReplicaManageProcessor();
            case KAFKA_CONTROLLER:
            case GROUP_METADATA_MANAGE:
                return new KafkaCommonProcessor();
            default:
                return null;
        }
    }
}

