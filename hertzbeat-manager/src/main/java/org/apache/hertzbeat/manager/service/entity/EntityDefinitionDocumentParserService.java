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

package org.apache.hertzbeat.manager.service.entity;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinitionRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.yaml.snakeyaml.Yaml;

/**
 * Parses raw entity definition requests into ordered document records.
 */
@Service
public class EntityDefinitionDocumentParserService {

    private static final String FORMAT_JSON = "json";
    private static final String FORMAT_CURL = "curl";

    public List<Map<String, Object>> parseDefinitionRecords(EntityDefinitionRequest definitionRequest) {
        String payload = extractDefinitionPayload(definitionRequest.getContent(), definitionRequest.getFormat());
        String format = normalizeDefinitionFormat(definitionRequest.getFormat(), payload);
        return parseDefinitionDocuments(payload, format);
    }

    private List<Map<String, Object>> parseDefinitionDocuments(String payload, String format) {
        if (FORMAT_JSON.equals(format)) {
            return toDefinitionRecords(JsonUtil.fromJson(payload, Object.class));
        }
        List<Map<String, Object>> documents = new ArrayList<>();
        for (Object document : new Yaml().loadAll(payload)) {
            if (document == null) {
                continue;
            }
            documents.addAll(toDefinitionRecords(document));
        }
        return documents;
    }

    private List<Map<String, Object>> toDefinitionRecords(Object value) {
        if (value instanceof List<?> items) {
            List<Map<String, Object>> documents = new ArrayList<>();
            for (Object item : items) {
                if (item == null) {
                    continue;
                }
                documents.addAll(toDefinitionRecords(item));
            }
            return documents;
        }
        if (value instanceof Map<?, ?> rawMap && isKubernetesList(rawMap)) {
            return toDefinitionRecords(rawMap.get("items"));
        }
        return List.of(toDefinitionRecord(value));
    }

    private String extractDefinitionPayload(String content, String format) {
        String trimmed = content == null ? null : content.trim();
        if (!StringUtils.hasText(trimmed)) {
            throw new IllegalArgumentException("Entity definition content can not be blank.");
        }
        if (!FORMAT_CURL.equalsIgnoreCase(defaultText(format, ""))) {
            return trimmed;
        }
        int singleQuoteIndex = trimmed.indexOf("-d '");
        if (singleQuoteIndex >= 0) {
            int payloadStart = singleQuoteIndex + 4;
            int payloadEnd = trimmed.lastIndexOf('\'');
            if (payloadEnd > payloadStart) {
                return trimmed.substring(payloadStart, payloadEnd)
                        .replace("'\\\\''", "'")
                        .replace("\\\\", "\\");
            }
        }
        int doubleQuoteIndex = trimmed.indexOf("-d \"");
        if (doubleQuoteIndex >= 0) {
            int payloadStart = doubleQuoteIndex + 4;
            int payloadEnd = trimmed.lastIndexOf('"');
            if (payloadEnd > payloadStart) {
                return trimmed.substring(payloadStart, payloadEnd)
                        .replace("\\\"", "\"")
                        .replace("\\\\", "\\");
            }
        }
        return trimmed;
    }

    private String normalizeDefinitionFormat(String format, String payload) {
        String normalizedFormat = defaultText(format, "").toLowerCase(Locale.ROOT);
        if (FORMAT_JSON.equals(normalizedFormat) || JsonUtil.isJsonStr(payload)) {
            return FORMAT_JSON;
        }
        return "yaml";
    }

    private Map<String, Object> toDefinitionRecord(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            throw new IllegalArgumentException("Entity definition must be a yaml or json object.");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
            if (entry.getKey() != null) {
                result.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }
        return result;
    }

    private boolean isKubernetesList(Map<?, ?> rawMap) {
        return "List".equals(rawMap.get("kind")) && rawMap.containsKey("items");
    }

    private String defaultText(String... values) {
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return "";
    }
}
