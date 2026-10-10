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

package org.apache.hertzbeat.observability.logs.sse;

import java.util.Map;
import java.util.function.Predicate;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.log.PreparedLogGroupSelection;

/** Immutable native-prepared exact scalar projection, never a per-event warehouse query. */
public final class LogSelectedGroupMatcher implements Predicate<LogEntry> {
    private static final String[] SEVERITY_CATEGORIES = {"TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"};
    private final PreparedLogGroupSelection prepared;

    public LogSelectedGroupMatcher(PreparedLogGroupSelection prepared) { this.prepared = java.util.Objects.requireNonNull(prepared); }

    @Override
    public boolean test(LogEntry log) {
        if (log == null) { return false; }
        for (var target : prepared.targets()) {
            var field = target.key().field();
            Map<String, Object> values = "attribute".equals(field.source()) ? log.getAttributes() : log.getResource();
            String key = field.key();
            if ("builtin".equals(field.source())) {
                if ("severityCategory".equals(key)) {
                    Integer number = log.getSeverityNumber();
                    Object value = number == null || number < 1 || number > 24 ? null
                            : SEVERITY_CATEGORIES[(number - 1) / 4];
                    if (!matches(target, value != null, value)) { return false; }
                    continue;
                }
                key = "serviceName".equals(key) ? "service.name" : "deployment.environment.name";
                Object value = values == null ? null : values.get(key);
                if (!matches(target, scalar(value), value)) { return false; }
            } else if (!matches(target, values != null && values.containsKey(key), values == null ? null : values.get(key))) { return false; }
        }
        return true;
    }

    private static boolean scalar(Object value) {
        return value instanceof String || value instanceof byte[] || value instanceof Boolean || value instanceof Long || value instanceof Double;
    }

    private static boolean matches(PreparedLogGroupSelection.Target target, boolean present, Object value) {
        return switch (target.key().kind()) {
            case "missing" -> !present;
            case "null" -> present && value == null;
            case "non_scalar" -> present && value != null && !scalar(value);
            case "value" -> present && value != null && valueMatches(target, value);
            default -> false;
        };
    }

    private static boolean valueMatches(PreparedLogGroupSelection.Target target, Object value) {
        if (value instanceof byte[] bytes) { return target.key().value().equals(LogUtf8Lossy.decode(bytes)); }
        if (value instanceof String text) { return target.key().value().equals(text); }
        if (value instanceof Boolean bool) { return target.key().value().equals(bool.toString()); }
        if (value instanceof Long number) { return target.int64() != null && target.int64().equals(number); }
        if (value instanceof Double number) { return target.float64Bits() != null && target.float64Bits() == Double.doubleToRawLongBits(number); }
        return false;
    }
}
