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

package org.apache.hertzbeat.alert.util;

import java.util.Comparator;
import java.util.Map;

/**
 * alert util
 */
public class AlertUtil {

    /**
     * Calculate an in-memory alert cache coordinate.
     *
     * <p>This value is rebuilt from persisted alert labels when the process
     * starts. It is not the durable {@code SingleAlert.fingerprint} used by
     * persistence, grouping, silence, or inhibition.</p>
     *
     * @param fingerPrints labels used by the calculator cache
     * @return deterministic cache coordinate
     */
    public static String calculateFingerprint(Map<String, String> fingerPrints) {
        StringBuilder canonicalLabels = new StringBuilder();
        fingerPrints.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.nullsFirst(Comparator.naturalOrder())))
                .forEach(entry -> {
                    appendLengthPrefixed(canonicalLabels, entry.getKey());
                    appendLengthPrefixed(canonicalLabels, entry.getValue());
                });
        return CryptoUtils.sha256Hex(canonicalLabels.toString());
    }

    private static void appendLengthPrefixed(StringBuilder target, String value) {
        if (value == null) {
            target.append("-1:");
            return;
        }
        target.append(value.length()).append(':').append(value);
    }
}
