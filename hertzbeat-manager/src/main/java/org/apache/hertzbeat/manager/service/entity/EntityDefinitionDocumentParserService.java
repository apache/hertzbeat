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
        DefinitionPayload payload = extractDefinitionPayload(definitionRequest.getContent(), definitionRequest.getFormat());
        String format = normalizeDefinitionFormat(payload.format(), payload.content());
        return parseDefinitionDocuments(payload.content(), format);
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

    private DefinitionPayload extractDefinitionPayload(String content, String format) {
        String trimmed = content == null ? null : content.trim();
        if (!StringUtils.hasText(trimmed)) {
            throw new IllegalArgumentException("Entity definition content can not be blank.");
        }
        if (!FORMAT_CURL.equalsIgnoreCase(defaultText(format, ""))) {
            return new DefinitionPayload(trimmed, format);
        }
        String payload = extractCurlDataPayload(trimmed);
        if (payload != null) {
            return unwrapCurlRequestEnvelope(payload, format);
        }
        return unwrapCurlRequestEnvelope(trimmed, format);
    }

    private String extractCurlDataPayload(String curlCommand) {
        for (String flag : List.of("--data-urlencode", "--data-binary", "--data-raw", "--data", "-d")) {
            int searchFrom = 0;
            int flagIndex;
            while ((flagIndex = curlCommand.indexOf(flag, searchFrom)) >= 0) {
                int valueStart = flagIndex + flag.length();
                if (valueStart < curlCommand.length() && curlCommand.charAt(valueStart) == '=') {
                    valueStart++;
                } else if (valueStart < curlCommand.length() && !Character.isWhitespace(curlCommand.charAt(valueStart))) {
                    searchFrom = valueStart;
                    continue;
                }
                while (valueStart < curlCommand.length() && Character.isWhitespace(curlCommand.charAt(valueStart))) {
                    valueStart++;
                }
                if (valueStart >= curlCommand.length()) {
                    return null;
                }
                return readCurlDataValue(curlCommand, valueStart);
            }
        }
        return null;
    }

    private String readCurlDataValue(String curlCommand, int valueStart) {
        char first = curlCommand.charAt(valueStart);
        if (first == '\'') {
            return readSingleQuotedCurlValue(curlCommand, valueStart + 1)
                    .replace("'\\\\''", "'")
                    .replace("\\\\", "\\");
        }
        if (first == '"') {
            return readDoubleQuotedCurlValue(curlCommand, valueStart + 1)
                    .replace("\\\"", "\"")
                    .replace("\\\\", "\\");
        }
        int valueEnd = valueStart;
        while (valueEnd < curlCommand.length() && !Character.isWhitespace(curlCommand.charAt(valueEnd))) {
            valueEnd++;
        }
        return curlCommand.substring(valueStart, valueEnd);
    }

    private String readSingleQuotedCurlValue(String curlCommand, int payloadStart) {
        int index = payloadStart;
        while (index < curlCommand.length()) {
            if (curlCommand.charAt(index) == '\'') {
                if (index + 3 < curlCommand.length()
                        && curlCommand.charAt(index + 1) == '\\'
                        && curlCommand.charAt(index + 2) == '\''
                        && curlCommand.charAt(index + 3) == '\'') {
                    index += 4;
                    continue;
                }
                return curlCommand.substring(payloadStart, index);
            }
            index++;
        }
        return curlCommand.substring(payloadStart);
    }

    private String readDoubleQuotedCurlValue(String curlCommand, int payloadStart) {
        int index = payloadStart;
        boolean escaped = false;
        while (index < curlCommand.length()) {
            char current = curlCommand.charAt(index);
            if (current == '"' && !escaped) {
                return curlCommand.substring(payloadStart, index);
            }
            escaped = current == '\\' && !escaped;
            if (current != '\\') {
                escaped = false;
            }
            index++;
        }
        return curlCommand.substring(payloadStart);
    }

    private DefinitionPayload unwrapCurlRequestEnvelope(String payload, String format) {
        if (!JsonUtil.isJsonStr(payload)) {
            return new DefinitionPayload(payload, format);
        }
        Object parsed = JsonUtil.fromJson(payload, Object.class);
        if (!(parsed instanceof Map<?, ?> rawMap)) {
            return new DefinitionPayload(payload, format);
        }
        Object content = rawMap.get("content");
        if (!(content instanceof String contentText) || !StringUtils.hasText(contentText)) {
            return new DefinitionPayload(payload, format);
        }
        Object envelopeFormat = rawMap.get("format");
        return new DefinitionPayload(
                contentText.trim(),
                defaultText(envelopeFormat == null ? null : String.valueOf(envelopeFormat), format)
        );
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

    private record DefinitionPayload(String content, String format) {
    }
}
