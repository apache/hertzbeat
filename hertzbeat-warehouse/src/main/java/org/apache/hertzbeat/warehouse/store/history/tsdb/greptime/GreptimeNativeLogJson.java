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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import java.util.Map;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import tools.jackson.core.json.JsonReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

/** Decodes native Greptime JSONB text without losing accepted nonfinite OTLP numbers. */
final class GreptimeNativeLogJson {
    private static final JsonMapper MAPPER = JsonMapper.builder()
            .enable(JsonReadFeature.ALLOW_NON_NUMERIC_NUMBERS)
            .enable(DeserializationFeature.USE_LONG_FOR_INTS, DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .build();

    private GreptimeNativeLogJson() { }

    @SuppressWarnings("unchecked")
    static Map<String, Object> decode(Object value) {
        if (value == null) { return null; }
        if (value instanceof Map<?, ?> map) { return (Map<String, Object>) map; }
        if (!(value instanceof String text)) { throw new TelemetryStorageUnavailableException(); }
        try {
            return MAPPER.readValue(normalizeNativeTokens(text), Map.class);
        } catch (RuntimeException invalid) {
            throw new TelemetryStorageUnavailableException();
        }
    }

    // Greptime 1.1.4 JSONB emits inf/-inf; Jackson accepts Infinity/-Infinity instead.
    // Its NUL string escape uses a single zero rather than the JSON Unicode escape. Normalize only that escape,
    // preserving escaped backslashes and every other quoted character.
    private static String normalizeNativeTokens(String text) {
        var result = new StringBuilder(text.length());
        boolean quoted = false;
        boolean escaped = false;
        for (int index = 0; index < text.length(); index++) {
            char character = text.charAt(index);
            if (quoted) {
                if (escaped && character == '0') { result.append("u0000"); }
                else { result.append(character); }
                if (escaped) { escaped = false; }
                else if (character == '\\') { escaped = true; }
                else if (character == '"') { quoted = false; }
                continue;
            }
            if (character == '"') { quoted = true; }
            String token = character == '-' ? "-inf" : "inf";
            int end = index + token.length();
            if ((character == '-' || character == 'i') && text.startsWith(token, index)
                    && (index == 0 || Character.isWhitespace(text.charAt(index - 1)) || ":[,".indexOf(text.charAt(index - 1)) >= 0)
                    && (end == text.length() || Character.isWhitespace(text.charAt(end)) || ",]}".indexOf(text.charAt(end)) >= 0)) {
                result.append(character == '-' ? "-Infinity" : "Infinity");
                index = end - 1;
            } else {
                result.append(character);
            }
        }
        return result.toString();
    }
}
