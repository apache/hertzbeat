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

package org.apache.hertzbeat.ai.gateway.tool.label;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.data.domain.Page;

/** Bounded, redacted management read models. Never pass these projections back into a write service. */
public final class AgentManagementOutputSupport {
    private static final int MAX_TEXT = 2048;
    private static final int MAX_CHILDREN = 100;
    private int remainingCharacters = 24000;
    private int remainingNodes = 1000;
    private boolean partial;

    private AgentManagementOutputSupport() { }

    public static Map<String, Object> view(Object value) {
        if (value instanceof Page<?> page) {
            value = Map.of("content", page.getContent(), "pageIndex", page.getNumber(), "pageSize", page.getSize(),
                    "totalElements", page.getTotalElements(), "totalPages", page.getTotalPages());
        }
        Object tree = value == null ? null : JsonUtil.fromJson(JsonUtil.toJson(value), Object.class);
        if (value != null && tree == null) {
            throw new IllegalStateException("Cannot build management output");
        }
        AgentManagementOutputSupport projection = new AgentManagementOutputSupport();
        Object bounded = projection.copy(tree, 0);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("data", bounded);
        result.put("partial", projection.partial);
        result.put("redactionApplied", true);
        result.put("outputLimits", Map.of("maxTextCharacters", MAX_TEXT, "maxCollectionEntries", MAX_CHILDREN,
                "maxTotalStringCharacters", 24000, "maxNodes", 1000));
        return GatewaySecretRedactor.redactMap(result);
    }

    private Object copy(Object value, int depth) {
        if (remainingNodes-- <= 0 || remainingCharacters <= 0 || depth > 10) {
            partial = true;
            return "[OMITTED: output limit]";
        }
        if (value instanceof String text) {
            String safe = GatewayText.redactSecrets(text);
            int length = Math.min(safe.length(), Math.min(MAX_TEXT, remainingCharacters));
            remainingCharacters -= length;
            if (length < safe.length()) {
                partial = true;
            }
            return safe.substring(0, length);
        }
        if (value instanceof List<?> list) {
            List<Object> result = new ArrayList<>();
            for (Object item : list) {
                if (result.size() >= MAX_CHILDREN || remainingNodes <= 0 || remainingCharacters <= 0) {
                    partial = true;
                    break;
                }
                result.add(copy(item, depth + 1));
            }
            return result;
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> result = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (result.size() >= MAX_CHILDREN || remainingNodes <= 0 || remainingCharacters <= 0) {
                    partial = true;
                    break;
                }
                String key = String.valueOf(entry.getKey());
                String safeKey = String.valueOf(copy(key, depth + 1));
                Object child = entry.getValue();
                if (GatewaySecretRedactor.REDACTED.equals(
                        GatewaySecretRedactor.redactMap(Map.of(key, "probe")).get(key))) {
                    child = GatewaySecretRedactor.REDACTED;
                }
                // Label entities encode the sensitive key in a sibling name field.
                if ("tagValue".equals(key) && map.get("name") instanceof String name && child != null
                        && GatewaySecretRedactor.REDACTED.equals(
                                GatewaySecretRedactor.redactMap(Map.of(name, child)).get(name))) {
                    child = GatewaySecretRedactor.REDACTED;
                }
                result.put(safeKey, copy(child, depth + 1));
            }
            return result;
        }
        return value;
    }
}
