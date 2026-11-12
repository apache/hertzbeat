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

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Bounded native JSON import document. Caller paths, credentials and server-owned ids are excluded.
 */
final class AgentJsonImportDocument {
    private static final JsonMapper JSON =
            JsonMapper.builder()
                    .enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
                    .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .build();
    private static final Set<String> MONITOR_FIELDS =
            Set.of(
                    "name",
                    "app",
                    "host",
                    "intervals",
                    "status",
                    "description",
                    "labels",
                    "annotations",
                    "scheduleType",
                    "cronExpression",
                    "collector");
    private static final Set<String> ALERT_FIELDS =
            Set.of(
                    "name",
                    "type",
                    "datasource",
                    "expr",
                    "period",
                    "times",
                    "labels",
                    "annotations",
                    "template",
                    "enable",
                    "queryLanguage");

    static {
        JSON.getFactory()
                .setStreamReadConstraints(
                        StreamReadConstraints.builder()
                                .maxNestingDepth(20)
                                .maxStringLength(65536)
                                .build());
    }

    record Document(byte[] bytes, String hash, List<String> names) {}

    static Document parse(String content, boolean monitor) {
        if (content == null
                || content.isBlank()
                || content.getBytes(StandardCharsets.UTF_8).length > 65536)
            throw new IllegalArgumentException("JSON import must be nonempty and at most 64 KiB");
        try {
            Object value = JSON.readValue(content, Object.class);
            if (!(value instanceof List<?> rows) || rows.isEmpty() || rows.size() > 20)
                throw new IllegalArgumentException("JSON import must contain from 1 to 20 entries");
            if (!Map.of("document", rows)
                    .equals(GatewaySecretRedactor.redactMap(Map.of("document", rows))))
                throw new IllegalArgumentException("Credentials are not supported in AI imports");
            var names = new java.util.ArrayList<String>();
            var seen = new HashSet<String>();
            for (Object row : rows) {
                if (!(row instanceof Map<?, ?> entry)
                        || !(monitor ? Set.of("monitor", "params") : Set.of("alertDefine"))
                                .containsAll(entry.keySet())
                        || !(entry.get(monitor ? "monitor" : "alertDefine")
                                instanceof Map<?, ?> fields)
                        || !(monitor ? MONITOR_FIELDS : ALERT_FIELDS).containsAll(fields.keySet())
                        || !(fields.get("name") instanceof String name)
                        || name.isBlank()
                        || name.length() > 100
                        || !seen.add(name.trim().toLowerCase(java.util.Locale.ROOT)))
                    throw new IllegalArgumentException(
                            "Import entries require unique native identities and supported create"
                                + " fields");
                if (monitor) {
                    if (!(fields.get("app") instanceof String app) || app.isBlank())
                        throw new IllegalArgumentException("Monitor app is required");
                    parameters(entry.get("params"));
                } else if (!(fields.get("type") instanceof String)
                        || !(fields.get("expr") instanceof String)
                        || !(fields.get("enable") instanceof Boolean))
                    throw new IllegalArgumentException(
                            "Alert type, expr and explicit enable are required");
                names.add(name.trim());
            }
            return new Document(
                    content.getBytes(StandardCharsets.UTF_8),
                    GatewayText.sha256(content),
                    List.copyOf(names));
        } catch (java.io.IOException malformed) {
            throw new IllegalArgumentException("Invalid native JSON import document");
        }
    }

    private static void parameters(Object value) {
        if (value == null) return;
        if (!(value instanceof List<?> params) || params.size() > 100)
            throw new IllegalArgumentException("Bounded native monitor params are required");
        var seen = new HashSet<String>();
        for (Object item : params) {
            if (!(item instanceof Map<?, ?> param)
                    || !Set.of("field", "type", "value").containsAll(param.keySet())
                    || !(param.get("field") instanceof String field)
                    || field.isBlank()
                    || field.length() > 128
                    || !seen.add(field)
                    || !(param.get("value") instanceof String text)
                    || text.length() > 2048
                    || !Map.of(field, text)
                            .equals(GatewaySecretRedactor.redactMap(Map.of(field, text))))
                throw new IllegalArgumentException(
                        "Unique non-secret native parameters are required");
        }
    }
}
