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
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;

/**
 * Parses raw entity definition requests into ordered document records.
 */
@Service
public class EntityDefinitionDocumentParserService {

    private static final String FORMAT_YAML = "yaml";
    private static final String FORMAT_JSON = "json";
    private static final String FORMAT_CURL = "curl";

    // 3,145,728 preserves SnakeYAML 2.2's prior default code-point limit and applies it to JSON and cURL too.
    static final int MAX_CONTENT_LENGTH = 3 * 1024 * 1024;
    // One hundred records preserves the manager's existing bounded-batch convention for a single atomic request.
    static final int MAX_DEFINITION_RECORDS = 100;
    // Fifty keeps SnakeYAML's compatibility defaults and applies the same defensive depth to JSON input.
    static final int MAX_NESTING_DEPTH = 50;
    // Fifty preserves SnakeYAML's default alias allowance while making the limit explicit for this untrusted boundary.
    static final int MAX_ALIASES_FOR_COLLECTIONS = 50;

    public List<Map<String, Object>> parseDefinitionRecords(EntityDefinitionRequest definitionRequest) {
        try {
            DefinitionPayload payload = extractDefinitionPayload(
                    definitionRequest.getContent(), definitionRequest.getFormat());
            String format = normalizeDefinitionFormat(payload.format(), payload.content());
            return parseDefinitionDocuments(payload.content(), format);
        } catch (DefinitionInputException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw invalidInput("Entity definition content is invalid.");
        }
    }

    private List<Map<String, Object>> parseDefinitionDocuments(String payload, String format) {
        if (FORMAT_JSON.equals(format)) {
            validateJsonNesting(payload);
            Object parsed = JsonUtil.fromJsonQuietly(payload, Object.class);
            if (parsed == null) {
                throw invalidInput("Entity definition content is invalid.");
            }
            return toDefinitionRecords(parsed);
        }
        LoaderOptions loaderOptions = new LoaderOptions();
        loaderOptions.setCodePointLimit(MAX_CONTENT_LENGTH);
        loaderOptions.setNestingDepthLimit(MAX_NESTING_DEPTH);
        loaderOptions.setMaxAliasesForCollections(MAX_ALIASES_FOR_COLLECTIONS);
        List<Map<String, Object>> documents = new ArrayList<>();
        for (Object document : new Yaml(new SafeConstructor(loaderOptions)).loadAll(payload)) {
            if (document == null) {
                continue;
            }
            appendDefinitionRecords(document, documents);
        }
        return documents;
    }

    private List<Map<String, Object>> toDefinitionRecords(Object value) {
        List<Map<String, Object>> documents = new ArrayList<>();
        appendDefinitionRecords(value, documents);
        return documents;
    }

    private void appendDefinitionRecords(Object value, List<Map<String, Object>> documents) {
        if (value instanceof List<?> items) {
            for (Object item : items) {
                if (item == null) {
                    continue;
                }
                appendDefinitionRecords(item, documents);
            }
            return;
        }
        if (value instanceof Map<?, ?> rawMap && isKubernetesList(rawMap)) {
            appendDefinitionRecords(rawMap.get("items"), documents);
            return;
        }
        if (documents.size() >= MAX_DEFINITION_RECORDS) {
            throw invalidInput("Entity definition bundle exceeds the supported document limit.");
        }
        documents.add(toDefinitionRecord(value));
    }

    private DefinitionPayload extractDefinitionPayload(String content, String format) {
        if (content != null && content.codePointCount(0, content.length()) > MAX_CONTENT_LENGTH) {
            throw invalidInput("Entity definition content exceeds the supported size.");
        }
        String trimmed = content == null ? null : content.trim();
        if (!StringUtils.hasText(trimmed)) {
            throw invalidInput("Entity definition content can not be blank.");
        }
        if (!FORMAT_CURL.equalsIgnoreCase(defaultText(format, "").trim())) {
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
        if (!JsonUtil.isJsonLike(payload)) {
            return new DefinitionPayload(payload, format);
        }
        validateJsonNesting(payload);
        Object parsed = JsonUtil.fromJsonQuietly(payload, Object.class);
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
        String normalizedFormat = defaultText(format, "").trim().toLowerCase(Locale.ROOT);
        if (FORMAT_JSON.equals(normalizedFormat)) {
            return FORMAT_JSON;
        }
        if (FORMAT_YAML.equals(normalizedFormat)) {
            return FORMAT_YAML;
        }
        if (!normalizedFormat.isEmpty() && !FORMAT_CURL.equals(normalizedFormat)) {
            throw invalidInput("Entity definition format must be yaml, json, or curl.");
        }
        return JsonUtil.isJsonLike(payload) ? FORMAT_JSON : FORMAT_YAML;
    }

    private Map<String, Object> toDefinitionRecord(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            throw invalidInput("Entity definition must be a yaml or json object.");
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

    private void validateJsonNesting(String payload) {
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;
        for (int index = 0; index < payload.length(); index++) {
            char current = payload.charAt(index);
            if (inString) {
                if (current == '"' && !escaped) {
                    inString = false;
                }
                escaped = current == '\\' && !escaped;
                if (current != '\\') {
                    escaped = false;
                }
                continue;
            }
            if (current == '"') {
                inString = true;
                continue;
            }
            if (current == '{' || current == '[') {
                depth++;
                if (depth > MAX_NESTING_DEPTH) {
                    throw invalidInput("Entity definition exceeds parser safety limits.");
                }
            } else if (current == '}' || current == ']') {
                depth--;
            }
        }
    }

    private DefinitionInputException invalidInput(String message) {
        return new DefinitionInputException(message);
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

    private static final class DefinitionInputException extends IllegalArgumentException {

        private DefinitionInputException(String message) {
            super(message);
        }
    }
}
