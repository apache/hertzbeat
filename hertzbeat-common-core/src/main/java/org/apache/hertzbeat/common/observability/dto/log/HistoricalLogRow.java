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

package org.apache.hertzbeat.common.observability.dto.log;

import java.math.BigInteger;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import org.apache.hertzbeat.common.entity.log.LogEntry;

/** Lossless wire representation of one historical log search row. */
public record HistoricalLogRow(String logRecordUid,
                               String timeUnixNano,
                               String observedTimeUnixNano,
                               Integer severityNumber,
                               String severityText,
                               Object body,
                               Map<String, Object> attributes,
                               Integer droppedAttributesCount,
                               String traceId,
                               String spanId,
                               Integer traceFlags,
                               Map<String, Object> resource,
                               String resourceSchemaUrl,
                               InstrumentationScope instrumentationScope,
                               String scopeSchemaUrl) {

    private static final String UID_ATTRIBUTE = "log.record.uid";
    private static final Pattern UID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}");
    private static final Pattern TRACE_ID = Pattern.compile("[0-9a-f]{32}");
    private static final Pattern SPAN_ID = Pattern.compile("[0-9a-f]{16}");
    private static final Pattern POSITIVE_DECIMAL = Pattern.compile("[1-9][0-9]{0,18}");

    public HistoricalLogRow {
        validateNullable(logRecordUid, UID, "logRecordUid");
        validateDecimal(timeUnixNano, "timeUnixNano");
        validateDecimal(observedTimeUnixNano, "observedTimeUnixNano");
        validateNullable(traceId, TRACE_ID, "traceId");
        validateNullable(spanId, SPAN_ID, "spanId");
        attributes = immutable(attributes);
        resource = immutable(resource);
    }

    /** Maps the internal long-based model without numeric JSON precision loss. */
    public static HistoricalLogRow from(LogEntry entry) {
        Object rawUid = entry.getAttributes() == null ? null : entry.getAttributes().get(UID_ATTRIBUTE);
        String uid = rawUid instanceof String value && UID.matcher(value).matches() ? value : null;
        String observed = entry.getObservedTimeUnixNano() != null
                && !entry.getObservedTimeUnixNano().equals(entry.getTimeUnixNano())
                ? decimal(entry.getObservedTimeUnixNano()) : null;
        return new HistoricalLogRow(uid, decimal(entry.getTimeUnixNano()), observed,
                entry.getSeverityNumber(), entry.getSeverityText(), entry.getBody(), entry.getAttributes(),
                entry.getDroppedAttributesCount(), validOrNull(entry.getTraceId(), TRACE_ID),
                validOrNull(entry.getSpanId(), SPAN_ID), entry.getTraceFlags(),
                entry.getResource(), entry.getResourceSchemaUrl(), InstrumentationScope.from(entry.getInstrumentationScope()),
                entry.getScopeSchemaUrl());
    }

    private static String decimal(Long value) {
        return value == null ? null : Long.toString(value);
    }

    private static void validateNullable(String value, Pattern pattern, String field) {
        if (value != null && !pattern.matcher(value).matches()) {
            throw new IllegalArgumentException(field + " is invalid");
        }
    }

    private static String validOrNull(String value, Pattern pattern) {
        return value != null && pattern.matcher(value).matches() ? value : null;
    }

    private static void validateDecimal(String value, String field) {
        if (value != null && (!POSITIVE_DECIMAL.matcher(value).matches()
                || new BigInteger(value).compareTo(BigInteger.valueOf(Long.MAX_VALUE)) > 0)) {
            throw new IllegalArgumentException(field + " must be a positive lossless long decimal");
        }
    }

    private static Map<String, Object> immutable(Map<String, Object> values) {
        return values == null ? null : Collections.unmodifiableMap(new LinkedHashMap<>(values));
    }

    /** Immutable instrumentation scope wire value. */
    public record InstrumentationScope(String name,
                                       String version,
                                       Map<String, Object> attributes,
                                       Integer droppedAttributesCount) {
        public InstrumentationScope {
            attributes = immutable(attributes);
        }

        private static InstrumentationScope from(LogEntry.InstrumentationScope scope) {
            return scope == null ? null : new InstrumentationScope(scope.getName(), scope.getVersion(),
                    scope.getAttributes(), scope.getDroppedAttributesCount());
        }
    }
}
