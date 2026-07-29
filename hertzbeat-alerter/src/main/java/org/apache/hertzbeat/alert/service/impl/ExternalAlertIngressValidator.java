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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;

/**
 * Validates and normalizes the synchronous boundary before an external alert
 * is accepted for asynchronous processing.
 */
final class ExternalAlertIngressValidator {

    private static final String ALERT_REJECTED = "external_alert_rejected";

    private ExternalAlertIngressValidator() {
    }

    static <T> T requirePresent(T value) {
        if (value == null) {
            throw rejected();
        }
        return value;
    }

    static <T> List<T> requireBatch(List<T> values) {
        if (values == null || values.isEmpty() || values.stream().anyMatch(value -> value == null)) {
            throw rejected();
        }
        return List.copyOf(values);
    }

    static SingleAlert normalize(SingleAlert alert) {
        requirePresent(alert);
        alert.setLabels(requireBusinessLabels(alert.getLabels()));
        alert.setAnnotations(normalizeAnnotations(alert.getAnnotations()));
        return alert;
    }

    static Map<String, String> requireBusinessLabels(Map<String, String> labels) {
        if (labels == null || labels.isEmpty()) {
            throw rejected();
        }
        return new HashMap<>(labels);
    }

    static Map<String, String> normalizeAnnotations(Map<String, String> annotations) {
        return annotations == null ? new HashMap<>(8) : new HashMap<>(annotations);
    }

    private static IllegalArgumentException rejected() {
        return new IllegalArgumentException(ALERT_REJECTED);
    }
}
