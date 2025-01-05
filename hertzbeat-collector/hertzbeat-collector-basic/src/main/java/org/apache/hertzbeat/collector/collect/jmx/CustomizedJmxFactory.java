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

package org.apache.hertzbeat.collector.collect.jmx;


import java.util.Collections;
import java.util.HashMap;

import java.util.Map;

import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.jmx.kafkajmx.KafkaJmxValidator;

/**
 * Please register the components you need to customize here
 */
public class CustomizedJmxFactory {

    // Map associating app names with their corresponding JmxValidator
    private static final Map<String, JmxValidator> VALIDATOR_MAP;

    static {
        Map<String, JmxValidator> map = new HashMap<>();
        // Register validator for "kafka"
        map.put("kafka", new KafkaJmxValidator());

        // Future validators for other apps can be added here
        // Example for "zookeeper":
        // map.put("zookeeper", new ZookeeperJmxValidator());

        VALIDATOR_MAP = Collections.unmodifiableMap(map);
    }

    /**
     * Validates the object name using the validator associated with the specified app.
     *
     * @param app         The application name.
     * @param objectName  The JMX object name to validate.
     * @return true if the validator deems the object name valid, false otherwise.
     */
    public static boolean validate(String app, String objectName) {
        if (StringUtils.isBlank(app) || StringUtils.isBlank(objectName)) {
            return false;
        }

        JmxValidator validator = VALIDATOR_MAP.get(app.toLowerCase());
        if (validator == null) {
            return false;
        }

        return validator.isValid(objectName);
    }

    /**
     * Retrieves the appropriate processor for the given object name using the validator associated with the specified app.
     *
     * @param app         The application name.
     * @param objectName  The JMX object name for which to retrieve the processor.
     * @return The corresponding MbeanProcessor instance, or null if none are applicable.
     */
    public static MbeanProcessor getProcessor(String app, String objectName) {
        if (StringUtils.isBlank(app) || StringUtils.isBlank(objectName)) {
            return null;
        }

        JmxValidator validator = VALIDATOR_MAP.get(app.toLowerCase());
        if (validator == null) {
            return null;
        }

        return validator.getProcessor(objectName);
    }
}
