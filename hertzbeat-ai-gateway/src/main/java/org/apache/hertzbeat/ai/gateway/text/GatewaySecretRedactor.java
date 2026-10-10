/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.ai.gateway.text;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Recursively removes credentials from transcript and ledger payloads. */
public final class GatewaySecretRedactor {

    public static final String REDACTED = "[REDACTED]";

    private static final Set<String> SECRET_KEYS = Set.of(
            "password", "passwd", "pwd", "pass",
            "token", "apitoken", "apikey", "accesstoken",
            "secret", "secretkey", "clientsecret", "privatekey",
            "authorization", "bearer");

    private GatewaySecretRedactor() {
    }

    public static Map<String, Object> redactMap(Map<String, Object> values) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        Map<String, Object> redacted = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : values.entrySet()) {
            String key = entry.getKey();
            redacted.put(key, isSecretKey(key) ? REDACTED : redactValue(entry.getValue()));
        }
        return redacted;
    }

    private static Object redactValue(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> normalized = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getKey() != null) {
                    String key = String.valueOf(entry.getKey());
                    normalized.put(key, isSecretKey(key) ? REDACTED : redactValue(entry.getValue()));
                }
            }
            return normalized;
        }
        if (value instanceof List<?> list) {
            List<Object> redacted = new ArrayList<>(list.size());
            for (Object item : list) {
                redacted.add(redactValue(item));
            }
            return redacted;
        }
        if (value instanceof String text) {
            return GatewayText.redactSecrets(text);
        }
        if (value == null || value instanceof Number || value instanceof Boolean) {
            return value;
        }
        return GatewayText.redactSecrets(String.valueOf(value));
    }

    private static boolean isSecretKey(String key) {
        if (key == null) {
            return false;
        }
        String normalized = key.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        return SECRET_KEYS.contains(normalized)
                || normalized.endsWith("password")
                || normalized.endsWith("apikey")
                || normalized.endsWith("secretkey")
                || normalized.endsWith("accesstoken")
                || normalized.endsWith("clientsecret");
    }
}
