/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.observability.dto.investigation;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigInteger;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/** Strictly typed and bounded persisted log record for investigation views. */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record InvestigationLogRecord(String logRecordUid,
                                     String timeUnixNano,
                                     String observedTimeUnixNano,
                                     Integer severityNumber,
                                     String severityText,
                                     String body,
                                     String traceId,
                                     String spanId,
                                     InvestigationServiceIdentity identity,
                                     Map<String, String> attributes,
                                     Map<String, String> resourceAttributes,
                                     Map<String, List<String>> truncatedFields) {

    public static final int MAX_UID_LENGTH = 128;
    public static final int MAX_BODY_LENGTH = 65_536;
    public static final int MAX_ATTRIBUTE_ENTRIES = 128;
    public static final int MAX_ATTRIBUTE_KEY_LENGTH = 192;
    public static final int MAX_ATTRIBUTE_VALUE_LENGTH = 4_096;
    private static final Pattern UID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}");
    private static final Pattern TRACE_ID = Pattern.compile("[0-9a-f]{32}");
    private static final Pattern SPAN_ID = Pattern.compile("[0-9a-f]{16}");
    private static final Pattern DECIMAL = Pattern.compile("[1-9][0-9]*");
    private static final BigInteger LONG_MAX = BigInteger.valueOf(Long.MAX_VALUE);
    private static final Set<String> TRUNCATED_FIELD_SCOPES = Set.of("attributes", "resourceAttributes");

    public InvestigationLogRecord {
        if (logRecordUid == null || !UID.matcher(logRecordUid).matches()) {
            throw new IllegalArgumentException("Log record UID is invalid");
        }
        validateDecimal(timeUnixNano, "timeUnixNano");
        if (observedTimeUnixNano != null) {
            validateDecimal(observedTimeUnixNano, "observedTimeUnixNano");
        }
        if (severityNumber != null && (severityNumber < 0 || severityNumber > 24)) {
            throw new IllegalArgumentException("Log severity number is invalid");
        }
        severityText = boundedNullable(severityText, 64, "severityText");
        body = boundedNullable(body, MAX_BODY_LENGTH, "body");
        traceId = validatedIdentifier(traceId, TRACE_ID, "traceId");
        spanId = validatedIdentifier(spanId, SPAN_ID, "spanId");
        attributes = boundedMap(attributes, "attributes");
        resourceAttributes = boundedMap(resourceAttributes, "resourceAttributes");
        truncatedFields = validateTruncatedFields(truncatedFields, attributes, resourceAttributes);
    }

    public InvestigationLogRecord(String logRecordUid,
                                  String timeUnixNano,
                                  String observedTimeUnixNano,
                                  Integer severityNumber,
                                  String severityText,
                                  String body,
                                  String traceId,
                                  String spanId,
                                  InvestigationServiceIdentity identity,
                                  Map<String, String> attributes,
                                  Map<String, String> resourceAttributes) {
        this(logRecordUid, timeUnixNano, observedTimeUnixNano, severityNumber, severityText, body, traceId, spanId,
                identity, attributes, resourceAttributes, Map.of());
    }

    private static Map<String, List<String>> validateTruncatedFields(
            Map<String, List<String>> values,
            Map<String, String> attributes,
            Map<String, String> resourceAttributes) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        if (values.size() > TRUNCATED_FIELD_SCOPES.size()) {
            throw new IllegalArgumentException("truncatedFields contains an invalid scope");
        }
        Map<String, List<String>> result = new java.util.LinkedHashMap<>();
        values.forEach((scope, keys) -> {
            if (scope == null || !TRUNCATED_FIELD_SCOPES.contains(scope) || keys == null || keys.isEmpty()
                    || keys.size() > MAX_ATTRIBUTE_ENTRIES || new java.util.HashSet<>(keys).size() != keys.size()) {
                throw new IllegalArgumentException("truncatedFields contains an invalid key list");
            }
            Map<String, String> source = "attributes".equals(scope) ? attributes : resourceAttributes;
            for (String key : keys) {
                if (key == null) {
                    throw new IllegalArgumentException("truncatedFields contains an invalid key");
                }
                String value = source.get(key);
                if (value == null || value.length() < MAX_ATTRIBUTE_VALUE_LENGTH - 1
                        || value.length() > MAX_ATTRIBUTE_VALUE_LENGTH) {
                    throw new IllegalArgumentException("truncatedFields does not match a bounded attribute");
                }
            }
            result.put(scope, List.copyOf(keys));
        });
        return Map.copyOf(result);
    }

    private static void validateDecimal(String value, String label) {
        if (value == null || !DECIMAL.matcher(value).matches()
                || new BigInteger(value).compareTo(LONG_MAX) > 0) {
            throw new IllegalArgumentException(label + " is not a positive lossless long");
        }
    }

    private static String validatedIdentifier(String value, Pattern pattern, String label) {
        if (value == null || value.isBlank()) {
            return null;
        }
        if (!pattern.matcher(value).matches()) {
            throw new IllegalArgumentException(label + " is invalid");
        }
        return value;
    }

    private static String boundedNullable(String value, int maxLength, String label) {
        if (value == null) {
            return null;
        }
        if (value.length() > maxLength) {
            throw new IllegalArgumentException(label + " exceeds its bound");
        }
        return value;
    }

    private static Map<String, String> boundedMap(Map<String, String> values, String label) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        if (values.size() > MAX_ATTRIBUTE_ENTRIES) {
            throw new IllegalArgumentException(label + " exceeds its entry bound");
        }
        values.forEach((key, value) -> {
            if (key == null || key.isBlank() || key.length() > MAX_ATTRIBUTE_KEY_LENGTH || hasControlCharacter(key)) {
                throw new IllegalArgumentException(label + " contains an invalid key");
            }
            if (value == null || value.length() > MAX_ATTRIBUTE_VALUE_LENGTH) {
                throw new IllegalArgumentException(label + " contains an invalid value");
            }
        });
        return Map.copyOf(values);
    }

    private static boolean hasControlCharacter(String value) {
        return value.codePoints().anyMatch(Character::isISOControl);
    }
}
