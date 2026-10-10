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

package org.apache.hertzbeat.alert.service.impl;

import java.util.Map;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;

record SmsAlertFields(String instance, String priority, String content) {

    // Aliyun rejects the whole request when any template variable is null or blank,
    // so every value must fall back to non-blank text
    static SmsAlertFields from(GroupAlert alert) {
        Map<String, String> labels = alert.getCommonLabels() == null ? Map.of() : alert.getCommonLabels();
        String instance = firstNonBlank(labels.get("instance"), alert.getGroupKey(), "unknown");
        String priority = firstNonBlank(labels.get("priority"), "unknown");
        Map<String, String> annotations = alert.getCommonAnnotations() == null ? Map.of()
                : alert.getCommonAnnotations();
        String content = firstNonBlank(annotations.get("summary"), annotations.get("description"),
                annotations.values().stream().findFirst().orElse(null), "alert triggered");
        return new SmsAlertFields(instance, priority, content);
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "unknown";
    }
}
