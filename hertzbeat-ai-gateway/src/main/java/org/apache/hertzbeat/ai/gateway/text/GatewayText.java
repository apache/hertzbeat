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

package org.apache.hertzbeat.ai.gateway.text;

import java.util.regex.Pattern;
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.Validate;

/**
 * Text normalization, truncation, and hashing helpers for Agent Gateway.
 */
public final class GatewayText {

    private static final String REDACTED = "[REDACTED]";
    private static final Pattern SECRET_BLOCK_PATTERN = Pattern.compile(
            "-----BEGIN [A-Z ]*PRIVATE KEY-----[\\s\\S]*?-----END [A-Z ]*PRIVATE KEY-----");
    private static final Pattern JSON_SECRET_PATTERN = Pattern.compile(
            "(?i)(\"(?:password|passwd|pwd|pass|token|api[_-]?key|apikey|secret|access[_-]?token|accesstoken|bearer|authorization)\"\\s*:\\s*\")[^\"]*(\")");
    private static final Pattern AUTHORIZATION_PATTERN = Pattern.compile(
            "(?i)(authorization\\s*[:=]\\s*)(?:bearer|basic)?\\s*[^\\s,;\"'}]+");
    private static final Pattern BEARER_TOKEN_PATTERN = Pattern.compile(
            "(?i)(bearer\\s+)[A-Za-z0-9._~+/=-]+");
    private static final Pattern ASSIGNMENT_SECRET_PATTERN = Pattern.compile(
            "(?i)((?:password|passwd|pwd|pass|token|api[_-]?key|apikey|secret|access[_-]?token|accesstoken|bearer)\\s*[:=]\\s*)(\"?)[^\\s,;&\"'}]+(\"?)");
    private static final Pattern QUERY_SECRET_PATTERN = Pattern.compile(
            "(?i)([?&](?:password|passwd|pwd|pass|token|api[_-]?key|apikey|secret|access[_-]?token|accesstoken|bearer|authorization)=)[^\\s&]+");

    private GatewayText() {
    }

    /**
     * Trim text and convert empty strings to null.
     */
    public static String normalize(String text) {
        return StringUtils.stripToNull(text);
    }

    /**
     * Return true when text is null or blank.
     */
    public static boolean isBlank(String text) {
        return StringUtils.isBlank(text);
    }

    /**
     * Truncate text to a bounded length.
     */
    public static String truncate(String text, int maxLength) {
        if (text == null || StringUtils.length(text) <= maxLength) {
            return text;
        }
        if (maxLength <= 3) {
            return StringUtils.truncate(text, maxLength);
        }
        return StringUtils.abbreviate(text, maxLength);
    }

    /**
     * Require text to fit a storage or protocol field without changing its identity.
     */
    public static String requireBounded(String text, int maxLength, String fieldName) {
        if (text == null) {
            return null;
        }
        Validate.isTrue(maxLength >= 0, "Max length must not be negative");
        Validate.isTrue(StringUtils.length(text) <= maxLength,
                "%s must not exceed %d characters", fieldName, maxLength);
        return text;
    }

    /**
     * Redact common secret-bearing keys while preserving surrounding context.
     */
    public static String redactSecrets(String text) {
        if (text == null) {
            return null;
        }
        String redacted = SECRET_BLOCK_PATTERN.matcher(text).replaceAll("[REDACTED_SECRET_BLOCK]");
        redacted = JSON_SECRET_PATTERN.matcher(redacted).replaceAll("$1" + REDACTED + "$2");
        redacted = AUTHORIZATION_PATTERN.matcher(redacted).replaceAll("$1" + REDACTED);
        redacted = BEARER_TOKEN_PATTERN.matcher(redacted).replaceAll("$1" + REDACTED);
        redacted = ASSIGNMENT_SECRET_PATTERN.matcher(redacted).replaceAll("$1$2" + REDACTED + "$3");
        redacted = QUERY_SECRET_PATTERN.matcher(redacted).replaceAll("$1" + REDACTED);
        return redacted;
    }

    /**
     * Normalize, redact secrets, and truncate text for API, message, and SSE summaries.
     */
    public static String safeSummary(String text, int maxLength) {
        return truncate(normalize(redactSecrets(text)), maxLength);
    }

    /**
     * Hash text with SHA-256.
     */
    public static String sha256(String text) {
        return text == null ? null : DigestUtils.sha256Hex(text);
    }

}
