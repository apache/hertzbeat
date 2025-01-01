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

import java.util.List;

import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.jmx.kafkajmx.KafkaJmxValidator;

/**
 * Please register the components you need to customize here
 */

public class CustomizedJmxFactory {

    private static final List<String> ALLOWED_APPS = List.of("kafka");

    // Validate app and its corresponding name and objectName
    public static boolean validate(String app, String objectName) {
        if (StringUtils.isBlank(app) || !isValidApp(app)) {
            return false;
        }

        switch (app.toLowerCase()) {
            case "kafka":
                return KafkaJmxValidator.isValid(objectName);
            default:
                return false;
        }
    }

    // Check if the app exists in the predefined list
    private static boolean isValidApp(String app) {
        return ALLOWED_APPS.contains(app.toLowerCase());
    }


    public static MbeanProcessor getProcessor(String app, String objectName) {
        switch (app) {
            case "kafka":
                return KafkaJmxValidator.getProcessor(objectName);
            default:
                return null;
        }
    }

}

