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

package org.apache.hertzbeat.ai.gateway.tool.status;

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertRuleWriteProof;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.common.util.JsonUtil;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Snapshot precondition and independent native post-read; never an atomic CAS claim. */
public final class AgentStatusPageWriteProof {
    private AgentStatusPageWriteProof() {}

    public static String kind(String tool) {
        return tool.contains("organization")
                ? "organization"
                : tool.contains("component") ? "component" : "incident";
    }

    public static Map<String, Object> fields(String tool, Object value) {
        Map<String, Object> row = JsonUtil.fromJson(JsonUtil.toJson(value), Map.class);
        var selected = new LinkedHashMap<String, Object>();
        List<String> names;
        if (kind(tool).equals("organization")) {
            names = List.of("id", "name", "description", "home", "logo", "feedback", "color", "state");
        } else if (kind(tool).equals("component")) {
            names = List.of("id", "orgId", "name", "description", "labels", "method", "configState");
        } else {
            names = List.of("id", "orgId", "name", "state");
        }
        for (String field : names) selected.put(field, row.get(field));
        if (kind(tool).equals("incident")) {
            var components = row.get("components") instanceof List<?> values ? values : List.of();
            selected.put(
                    "componentIds",
                    components.stream()
                            .map(v -> ((Map<?, ?>) v).get("id"))
                            .map(v -> new java.math.BigDecimal(v.toString()).longValueExact())
                            .sorted()
                            .toList());
            var contents = row.get("contents") instanceof List<?> values ? values : List.of();
            selected.put(
                    "history",
                    contents.stream()
                            .map(
                                    v -> {
                                        Map<?, ?> entry = (Map<?, ?>) v;
                                        var item = new LinkedHashMap<String, Object>();
                                        for (String field :
                                                List.of("message", "state", "timestamp"))
                                            item.put(field, entry.get(field));
                                        return item;
                                    })
                            .sorted(
                                    java.util.Comparator.comparing(
                                            AgentToolPayloadHasher::canonicalArgumentsJson))
                            .toList());
        }
        return selected;
    }

    public static String sourceHash(String tool, Object value) {
        return AgentToolPayloadHasher.normalizedArgumentsHash(
                Map.of("kind", kind(tool), "fields", fields(tool, value)));
    }

    public static String contentHash(String tool, Object value) {
        var selected = fields(tool, value);
        selected.remove("id");
        return AgentToolPayloadHasher.normalizedArgumentsHash(selected);
    }

    public static void requireSource(String tool, String expected, Object current) {
        if (expected == null
                || !expected.matches("[a-f0-9]{64}")
                || !expected.equals(sourceHash(tool, current)))
            throw new IllegalStateException(
                    "STATUS_PAGE_SOURCE_CHANGED_OR_UNVERIFIED_BEFORE_WRITE");
    }

    public static String argumentHash(String tool, Map<String, Object> args) {
        Map<String, Object> normalized = JsonUtil.fromJson(JsonUtil.toJson(args), Map.class);
        if (normalized.get("configuration") instanceof Map<?, ?> value) {
            var config = new LinkedHashMap<String, Object>();
            value.forEach((k, v) -> config.put(String.valueOf(k), v));
            for (String field :
                    kind(tool).equals("component")
                            ? List.of("method", "configState")
                            : List.of("state")) {
                Object raw = config.getOrDefault(field, 0);
                int number = new java.math.BigDecimal(String.valueOf(raw)).intValueExact();
                if (number < 0 || number > 3) throw new IllegalArgumentException();
                config.put(field, number);
            }
            normalized.put("configuration", config);
        }
        return AgentAlertRuleWriteProof.argumentHash(normalized);
    }

    public static Map<String, Object> receipt(
            String tool, Long id, Map<String, Object> args, String postHash, boolean absent) {
        return Map.of(
                "version",
                "status-page-write.v1",
                "toolName",
                tool,
                "id",
                id,
                "boundArgumentsHash",
                argumentHash(tool, args),
                "postReadHash",
                postHash,
                "absent",
                absent,
                "verified",
                true,
                "atomicVersionPrecondition",
                false);
    }
}
