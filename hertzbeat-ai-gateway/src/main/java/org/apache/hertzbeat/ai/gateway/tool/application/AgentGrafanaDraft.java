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

package org.apache.hertzbeat.ai.gateway.tool.application;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.StreamReadConstraints;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;

import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Exact content and native binding identity for one separately approved Grafana operation. */
public record AgentGrafanaDraft(
        String operation,
        Long monitorId,
        String dashboardJson,
        String expectedUid,
        Long expectedVersion) {
    private static final Set<String> KEYS =
            Set.of(
                    "operation",
                    "monitorId",
                    "dashboardJson",
                    "expectedUid",
                    "expectedVersion",
                    "previewHash");
    private static final JsonMapper JSON =
            JsonMapper.builder()
                    .enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
                    .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .build();

    static {
        JSON.getFactory()
                .setStreamReadConstraints(
                        StreamReadConstraints.builder()
                                .maxNestingDepth(20)
                                .maxStringLength(65536)
                                .build());
    }

    public static AgentGrafanaDraft fromArguments(String tool, Map<String, Object> args) {
        if (args == null
                || !KEYS.containsAll(args.keySet())
                || !(args.get("monitorId") instanceof Number)) throw invalid();
        boolean delete = "grafana.dashboard_delete".equals(tool);
        if (!delete
                        && !List.of("grafana.dashboard_preview", "grafana.dashboard_save")
                                .contains(tool)
                || delete && (args.containsKey("operation") || args.containsKey("dashboardJson")))
            throw invalid();
        String op = delete ? "delete" : string(args.get("operation"));
        if (op != null) op = op.strip().toLowerCase(java.util.Locale.ROOT);
        Long id = number(args.get("monitorId"));
        String uid = string(args.get("expectedUid"));
        Long version =
                args.get("expectedVersion") == null ? null : number(args.get("expectedVersion"));
        String definition = string(args.get("dashboardJson"));
        if (id <= 0
                || op == null
                || !List.of("create", "update", "delete").contains(op)
                || "grafana.dashboard_save".equals(tool) && "delete".equals(op)
                || "grafana.dashboard_preview".equals(tool) && args.containsKey("previewHash"))
            throw invalid();
        if ("create".equals(op)
                ? uid != null || version != null
                : uid == null
                        || !uid.matches("[A-Za-z0-9_-]{1,40}")
                        || version == null
                        || version < 1
                        || version == Long.MAX_VALUE) throw invalid();
        if ("delete".equals(op)) {
            if (definition != null) throw invalid();
        } else document(definition);
        return new AgentGrafanaDraft(op, id, definition, uid, version);
    }

    public String definitionHash() {
        return GatewayText.sha256(dashboardJson == null ? "" : dashboardJson);
    }

    public String previewHash() {
        return AgentToolPayloadHasher.normalizedArgumentsHash(
                Map.of(
                        "operation",
                        operation,
                        "monitorId",
                        monitorId,
                        "definitionHash",
                        definitionHash(),
                        "expectedUid",
                        expectedUid == null ? "" : expectedUid,
                        "expectedVersion",
                        expectedVersion == null ? 0L : expectedVersion));
    }

    public String title() {
        return dashboardJson == null ? "" : (String) document(dashboardJson).get("title");
    }

    public boolean matchesSaved(String source) {
        try {
            return subset(document(dashboardJson), document(source));
        } catch (IllegalArgumentException invalid) {
            return false;
        }
    }

    public boolean requestedFieldsMatch(Map<String, Object> changes) {
        if ("delete".equals(operation))
            return changes.keySet().stream().allMatch(Set.of("uid", "version")::contains);
        var document = document(dashboardJson);
        for (var entry : changes.entrySet()) {
            String key = entry.getKey();
            if (Set.of("uid", "version", "definitionHash").contains(key)) continue;
            if ("dashboard".equals(key)) {
                if (!(entry.getValue() instanceof Map<?, ?>) || !subset(entry.getValue(), document))
                    return false;
            } else if (!document.containsKey(key) || !subset(entry.getValue(), document.get(key)))
                return false;
        }
        return true;
    }

    public static boolean safeExpectation(Map<String, Object> changes) {
        try {
            String json = org.apache.hertzbeat.common.util.JsonUtil.toJson(changes);
            if (json.getBytes(StandardCharsets.UTF_8).length > 65536
                    || !changes.equals(GatewaySecretRedactor.redactMap(changes))
                    || !json.equals(GatewayText.redactSecrets(json))) return false;
            inspect(changes, 0);
            return true;
        } catch (RuntimeException unsafe) {
            return false;
        }
    }

    private static Map<String, Object> document(String json) {
        if (json == null || json.isBlank() || json.getBytes(StandardCharsets.UTF_8).length > 65536)
            throw invalid();
        try {
            Object parsed = JSON.readValue(json, Object.class);
            if (!(parsed instanceof Map<?, ?> map)
                    || map.containsKey("id")
                    || map.containsKey("uid")
                    || map.containsKey("version")
                    || map.containsKey("orgId")
                    || map.containsKey("folderId")
                    || map.containsKey("folderUid")
                    || map.containsKey("permissions")
                    || !(map.get("title") instanceof String title)
                    || title.isBlank()
                    || title.length() > 200
                    || !(map.get("panels") instanceof List<?> panels)
                    || panels.size() > 20) throw invalid();
            Map<String, Object> wrapped = Map.of("document", parsed);
            if (!wrapped.equals(GatewaySecretRedactor.redactMap(wrapped))
                    || !json.equals(GatewayText.redactSecrets(json))) throw invalid();
            inspect(parsed, 0);
            return (Map<String, Object>) parsed;
        } catch (java.io.IOException malformed) {
            throw invalid();
        }
    }

    private static void inspect(Object value, int depth) {
        if (depth > 20) throw invalid();
        if (value instanceof Map<?, ?> map) {
            for (Object key : map.keySet()) {
                String field =
                        String.valueOf(key)
                                .toLowerCase(java.util.Locale.ROOT)
                                .replaceAll("[^a-z0-9]", "");
                if (Set.of(
                                "alert",
                                "alerts",
                                "alerting",
                                "notifications",
                                "notificationsettings",
                                "securejsondata",
                                "securejsonfields",
                                "securesettings")
                        .contains(field)) throw invalid();
            }

            Object name = map.containsKey("field") ? map.get("field") : map.get("name");
            if (name instanceof String text
                    && text.toLowerCase(java.util.Locale.ROOT)
                            .replaceAll("[^a-z0-9]", "")
                            .matches(
                                    ".*(password|passwd|secret|token|apikey|authorization|privatekey|accesskey).*")) {
                for (String key :
                        List.of(
                                "value",
                                "current",
                                "query",
                                "text",
                                "default",
                                "defaultValue",
                                "options"))
                    if (map.get(key) != null && !"".equals(map.get(key))) throw invalid();
            }
            map.values().forEach(item -> inspect(item, depth + 1));
        } else if (value instanceof List<?> list) {
            if (list.size() > 2000) throw invalid();
            list.forEach(item -> inspect(item, depth + 1));
        } else if (value instanceof String text && text.matches("(?is).*https?://[^/\\s]*@.*"))
            throw invalid();
    }

    private static boolean subset(Object expected, Object actual) {
        if (expected instanceof Map<?, ?> a && actual instanceof Map<?, ?> b)
            return a.entrySet().stream()
                    .allMatch(
                            e ->
                                    b.containsKey(e.getKey())
                                            && subset(e.getValue(), b.get(e.getKey())));
        if (expected instanceof List<?> a && actual instanceof List<?> b) {
            if (a.size() != b.size()) return false;
            for (int i = 0; i < a.size(); i++) if (!subset(a.get(i), b.get(i))) return false;
            return true;
        }
        if (expected instanceof Number a && actual instanceof Number b)
            return new java.math.BigDecimal(a.toString())
                            .compareTo(new java.math.BigDecimal(b.toString()))
                    == 0;
        return java.util.Objects.equals(expected, actual);
    }

    private static String string(Object value) {
        if (value == null) return null;
        if (!(value instanceof String text)) throw invalid();
        return text;
    }

    private static Long number(Object value) {
        if (!(value instanceof Number)) throw invalid();
        try {
            return new java.math.BigDecimal(value.toString()).longValueExact();
        } catch (RuntimeException bad) {
            throw invalid();
        }
    }

    private static IllegalArgumentException invalid() {
        return new IllegalArgumentException(
                "Use one exact bounded non-secret Grafana draft and binding revision; native secure"
                        + " editor is required for unsupported contents");
    }
}
