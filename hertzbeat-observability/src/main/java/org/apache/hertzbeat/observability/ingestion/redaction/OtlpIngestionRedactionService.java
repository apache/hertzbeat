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

package org.apache.hertzbeat.observability.ingestion.redaction;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

/**
 * Shared sensitive-data redaction boundary for OTLP ingest payloads and self-observability evidence.
 */
@Service
public class OtlpIngestionRedactionService {

    public static final String REDACTED = "[REDACTED]";

    private static final Pattern INLINE_SECRET_PATTERN = Pattern.compile(
            "(?i)\\b(password|passwd|pwd|token|access[._-]?token|refresh[._-]?token|api[._-]?key|"
                    + "client[._-]?secret|private[._-]?key|secret|authorization|cookie)\\b([\"']?\\s*[:=]\\s*)"
                    + "(Bearer\\s+[^\\s,;&]+|Basic\\s+[^\\s,;&]+|\"[^\"]*\"|'[^']*'|[^\\s,;&]+)"
    );
    private static final Pattern BEARER_TOKEN_PATTERN = Pattern.compile("(?i)\\bBearer\\s+[^\\s,;&]+");
    private static final Pattern BASIC_TOKEN_PATTERN = Pattern.compile("(?i)\\bBasic\\s+[^\\s,;&]+");

    public Map<String, Object> redactObjectMap(Map<String, Object> source) {
        if (source == null || source.isEmpty()) {
            return Map.of();
        }
        Map<String, Object> redacted = new LinkedHashMap<>();
        source.forEach((key, value) -> {
            if (StringUtils.isBlank(key)) {
                return;
            }
            redacted.put(key, redactObject(key, value));
        });
        return redacted;
    }

    public Map<String, String> redactStringMap(Map<String, String> source) {
        if (source == null || source.isEmpty()) {
            return Map.of();
        }
        Map<String, String> redacted = new LinkedHashMap<>();
        source.forEach((key, value) -> {
            if (StringUtils.isBlank(key)) {
                return;
            }
            if (isSensitiveKey(key)) {
                redacted.put(key, REDACTED);
            } else {
                redacted.put(key, redactText(value));
            }
        });
        return redacted;
    }

    public Object redactObject(String key, Object value) {
        if (isSensitiveKey(key)) {
            return REDACTED;
        }
        if (value instanceof CharSequence text) {
            return redactText(text.toString());
        }
        if (value instanceof Map<?, ?> map) {
            return redactGenericMap(map);
        }
        if (value instanceof Iterable<?> iterable) {
            List<Object> redacted = new ArrayList<>();
            iterable.forEach(item -> redacted.add(redactObject(null, item)));
            return redacted;
        }
        return value;
    }

    public String redactText(String text) {
        if (StringUtils.isBlank(text)) {
            return text;
        }
        String redacted = redactInlineSecrets(text);
        redacted = BEARER_TOKEN_PATTERN.matcher(redacted).replaceAll("Bearer " + REDACTED);
        return BASIC_TOKEN_PATTERN.matcher(redacted).replaceAll("Basic " + REDACTED);
    }

    public boolean isSensitiveKey(String key) {
        if (StringUtils.isBlank(key)) {
            return false;
        }
        String normalized = key.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_");
        return normalized.contains("password")
                || normalized.contains("passwd")
                || normalized.contains("secret")
                || normalized.contains("token")
                || normalized.contains("authorization")
                || normalized.contains("cookie")
                || normalized.contains("api_key")
                || normalized.contains("apikey")
                || normalized.contains("private_key")
                || normalized.contains("client_secret")
                || normalized.contains("access_token")
                || normalized.contains("refresh_token");
    }

    private Map<String, Object> redactGenericMap(Map<?, ?> source) {
        if (source == null || source.isEmpty()) {
            return Map.of();
        }
        Map<String, Object> redacted = new LinkedHashMap<>();
        source.forEach((key, value) -> {
            if (key == null || StringUtils.isBlank(String.valueOf(key))) {
                return;
            }
            String normalizedKey = String.valueOf(key);
            redacted.put(normalizedKey, redactObject(normalizedKey, value));
        });
        return redacted;
    }

    private String redactInlineSecrets(String text) {
        Matcher matcher = INLINE_SECRET_PATTERN.matcher(text);
        StringBuffer redacted = new StringBuffer();
        while (matcher.find()) {
            String replacement = matcher.group(1) + matcher.group(2) + redactInlineSecretValue(matcher.group(3));
            matcher.appendReplacement(redacted, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(redacted);
        return redacted.toString();
    }

    private String redactInlineSecretValue(String value) {
        if (value != null && value.length() >= 2) {
            char first = value.charAt(0);
            char last = value.charAt(value.length() - 1);
            if ((first == '"' || first == '\'') && first == last) {
                return String.valueOf(first) + REDACTED + first;
            }
        }
        return REDACTED;
    }
}
