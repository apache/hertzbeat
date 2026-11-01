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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionIdentity;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Bounded non-secret YAML input, never a shell command or source of caller authority. */
public record AgentMonitorDefinitionDraft(String app, String definitionHash) {
    public static AgentMonitorDefinitionDraft inspect(String definition) {
        try {
            if (definition == null
                    || definition.isBlank()
                    || definition.length() > 65536
                    || definition.getBytes(java.nio.charset.StandardCharsets.UTF_8).length
                            > 65536) {
                throw new IllegalArgumentException();
            }
            var options = new LoaderOptions();
            options.setAllowDuplicateKeys(false);
            options.setMaxAliasesForCollections(0);
            options.setNestingDepthLimit(20);
            options.setCodePointLimit(65536);
            Object loaded = new Yaml(new SafeConstructor(options)).load(definition);
            if (!(loaded instanceof Map<?, ?> map) || !(map.get("app") instanceof String app)) {
                throw new IllegalArgumentException();
            }
            MonitorDefinitionIdentity.requireSafe(app);
            inspectValue(map, 0);
            return new AgentMonitorDefinitionDraft(app, GatewayText.sha256(definition));
        } catch (RuntimeException unsafe) {
            throw new IllegalArgumentException(
                    "AI templates require bounded HTTP GET/HEAD semantics without scripts, SQL or"
                        + " expressions; secrets belong in the native secure form");
        }
    }

    public static String previewHash(
            String operation, String app, String revision, String definition) {
        var draft = inspect(definition);
        if (!draft.app().equals(app)
                || !List.of("create", "update").contains(operation)
                || "update".equals(operation)
                        && (revision == null || !revision.matches("[a-f0-9]{64}"))
                || "create".equals(operation) && revision != null) {
            throw new IllegalArgumentException(
                    "Exact template operation, identity and revision are required");
        }
        return AgentToolPayloadHasher.normalizedArgumentsHash(
                Map.of(
                        "operation",
                        operation,
                        "app",
                        app,
                        "revision",
                        revision == null ? "" : revision,
                        "definitionHash",
                        draft.definitionHash()));
    }

    private static void inspectValue(Object value, int depth) {
        if (depth > 20) {
            throw new IllegalArgumentException();
        }
        if (value instanceof Map<?, ?> map) {
            for (var entry : map.entrySet()) {
                if (!(entry.getKey() instanceof String key)) {
                    throw new IllegalArgumentException();
                }
                String normalizedKey = key.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
                if (java.util.Set.of(
                                        "script",
                                        "scriptcommand",
                                        "scriptpath",
                                        "scripttool",
                                        "workdirectory",
                                        "ssh",
                                        "jdbc",
                                        "sql",
                                        "sqls",
                                        "command",
                                        "commands",
                                        "groovy",
                                        "javascript",
                                        "python",
                                        "calculates",
                                        "expression")
                                .contains(normalizedKey)
                        && populated(entry.getValue())) {
                    throw new IllegalArgumentException();
                }
                if ("protocol".equalsIgnoreCase(key)
                        && !"http".equalsIgnoreCase(String.valueOf(entry.getValue()))) {
                    throw new IllegalArgumentException();
                }
                if ("method".equalsIgnoreCase(key)
                        && !java.util.Set.of("GET", "HEAD")
                                .contains(
                                        String.valueOf(entry.getValue())
                                                .toUpperCase(Locale.ROOT))) {
                    throw new IllegalArgumentException();
                }
                boolean safeAuthorizationGroup =
                        "authorization".equalsIgnoreCase(key)
                                && entry.getValue() instanceof Map<?, ?> authorization
                                && safeAuthorization(authorization);
                if (sensitive(key)
                        && populated(entry.getValue())
                        && !safeAuthorizationGroup
                        && !placeholder(entry.getValue())) {
                    throw new IllegalArgumentException();
                }
                inspectValue(entry.getValue(), depth + 1);
            }
            Object field = map.containsKey("field") ? map.get("field") : map.get("name");
            if (field instanceof String text && sensitive(text)) {
                for (String key : List.of("value", "defaultValue", "default", "paramValue")) {
                    if (populated(map.get(key)) && !placeholder(map.get(key))) {
                        throw new IllegalArgumentException();
                    }
                }
            }
        } else if (value instanceof List<?> list) {
            if (list.size() > 2000) {
                throw new IllegalArgumentException();
            }
            for (Object entry : list) {
                inspectValue(entry, depth + 1);
            }
        } else if (value instanceof String text) {
            if (text.matches(
                    "(?is).*(authorization\\s*:\\s*(basic|bearer)\\s+[^\\s]+|https?://[^/\\s]*@).*")) {
                throw new IllegalArgumentException();
            }
        } else if (value != null && !(value instanceof Number) && !(value instanceof Boolean)) {
            throw new IllegalArgumentException();
        }
    }

    private static boolean safeAuthorization(Map<?, ?> value) {
        if (!java.util.Set.of(
                        "type",
                        "basicAuthUsername",
                        "basicAuthPassword",
                        "digestAuthUsername",
                        "digestAuthPassword",
                        "bearerToken")
                .containsAll(value.keySet())) {
            return false;
        }
        for (var entry : value.entrySet()) {
            if (!populated(entry.getValue()) || placeholder(entry.getValue())) {
                continue;
            }
            if ("type".equals(entry.getKey())
                    && java.util.Set.of("Basic Auth", "Digest Auth", "Bearer Token")
                            .contains(entry.getValue())) {
                continue;
            }
            return false;
        }
        return true;
    }

    private static boolean populated(Object value) {
        return value != null && !(value instanceof String text && text.isBlank());
    }

    private static boolean placeholder(Object value) {
        return value instanceof String text
                && (text.matches("\\^_\\^[A-Za-z0-9_.-]+\\^_\\^")
                        || text.matches("\\$\\{[A-Za-z0-9_.-]+}"));
    }

    private static boolean sensitive(String key) {
        return key.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "")
                .matches(
                        ".*(password|passwd|secret|token|apikey|authorization|privatekey|accesskey).*");
    }
}
