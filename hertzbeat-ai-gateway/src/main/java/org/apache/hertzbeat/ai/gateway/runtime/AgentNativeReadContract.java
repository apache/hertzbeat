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

package org.apache.hertzbeat.ai.gateway.runtime;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Strict transport and numeric checks shared by native observational contracts. */
final class AgentNativeReadContract {
    static final JsonMapper JSON =
            JsonMapper.builder()
                    .enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
                    .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .enable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
                    .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
                    .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                    .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
                    .build();

    private AgentNativeReadContract() {}

    static Map<String, Object> object(Object value) {
        if (!(value instanceof Map<?, ?> map)) {
            throw invalid();
        }
        var result = new java.util.LinkedHashMap<String, Object>();
        map.forEach((key, child) -> result.put(String.valueOf(key), child));
        return result;
    }

    static List<?> list(Object value) {
        if (!(value instanceof List<?> list)) {
            throw invalid();
        }
        return list;
    }

    static long number(Object value) {
        if (!(value instanceof Number) || value instanceof Double || value instanceof Float) {
            throw invalid();
        }
        long result = new BigDecimal(value.toString()).longValueExact();
        if (result < 0) {
            throw invalid();
        }
        return result;
    }

    static int integer(Object value) {
        return Math.toIntExact(number(value));
    }

    static void require(boolean condition) {
        if (!condition) {
            throw invalid();
        }
    }

    static String text(Object value) {
        require(value instanceof String && !((String) value).isBlank());
        return (String) value;
    }

    static void keys(Map<String, Object> data, String... keys) {
        require(data.keySet().containsAll(List.of(keys)));
    }

    static boolean window(Map<String, Object> requested, Map<String, Object> actual, long max) {
        long start = number(requested.get("start"));
        long end = number(requested.get("end"));
        return start >= 0
                && end > start
                && end - start <= max
                && start == number(actual.get("start"))
                && end == number(actual.get("end"));
    }

    static Map<String, Object> jsonText(Map<String, Object> output) {
        require(
                "json_text".equals(output.get("format"))
                        && output.get("partial") instanceof Boolean
                        && Boolean.FALSE.equals(output.get("projectionTruncated")));
        try {
            var envelope = object(JSON.readValue(text(output.get("data")), Map.class));
            require(number(envelope.get("code")) == 0);
            same(hasPartial(envelope), output.get("partial"));
            var data = object(envelope.get("data"));
            require(
                    !data.containsKey("state")
                            || List.of("ready", "missing").contains(data.get("state")));
            return data;
        } catch (java.io.IOException invalid) {
            throw invalid();
        }
    }

    private static boolean hasPartial(Object value) {
        if (value instanceof List<?> items) {
            return items.stream().anyMatch(AgentNativeReadContract::hasPartial);
        }
        if (!(value instanceof Map<?, ?> data)) {
            return false;
        }
        if (Boolean.TRUE.equals(data.get("partial"))
                || Boolean.TRUE.equals(data.get("truncated"))
                || Boolean.TRUE.equals(data.get("hasMore"))) {
            return true;
        }
        if (data.get("content") instanceof List<?> rows
                && data.get("totalElements") instanceof Number total
                && (number(total) > rows.size()
                        || data.get("pageIndex") instanceof Number page && number(page) > 0)) {
            return true;
        }
        return data.values().stream().anyMatch(AgentNativeReadContract::hasPartial);
    }

    static Object management(Map<String, Object> output) {
        require(
                Boolean.FALSE.equals(output.get("partial"))
                        && Boolean.TRUE.equals(output.get("redactionApplied")));
        return output.get("data");
    }

    static void traceProjection(Map<String, Object> output) {
        require(
                Boolean.FALSE.equals(output.get("outputTruncated"))
                        && output.get("partial") instanceof Boolean);
        var payload = new java.util.LinkedHashMap<>(output);
        payload.remove("partial");
        payload.remove("outputTruncated");
        boolean partial = tracePartial(payload);
        if (payload.containsKey("query") && payload.get("pageIndex") instanceof Number page) {
            partial |= number(page) > 0;
        }
        same(partial, output.get("partial"));
    }

    private static boolean tracePartial(Object value) {
        if (value instanceof List<?> items) {
            return items.stream().anyMatch(AgentNativeReadContract::tracePartial);
        }
        if (!(value instanceof Map<?, ?> data)) {
            return false;
        }
        for (var entry : data.entrySet()) {
            String key = entry.getKey().toString();
            if ((key.equals("partial") || key.equals("truncated") || key.endsWith("Truncated"))
                    && Boolean.TRUE.equals(entry.getValue())) {
                return true;
            }
        }
        if ("bounded".equals(data.get("mode")) || "unavailable".equals(data.get("state"))) {
            return true;
        }
        if (data.get("content") instanceof List<?> rows
                && data.get("totalElements") instanceof Number total
                && number(total) > rows.size()) {
            return true;
        }
        return data.values().stream().anyMatch(AgentNativeReadContract::tracePartial);
    }

    static <T> T decode(Object data, Class<T> type) {
        primitives(data, type);
        return JSON.convertValue(data, type);
    }

    // Jackson otherwise defaults an absent record primitive to zero, which can fabricate an empty
    // observation.
    private static void primitives(Object value, Type type) {
        if (type instanceof ParameterizedType parameterized && value instanceof List<?> items) {
            items.forEach(item -> primitives(item, parameterized.getActualTypeArguments()[0]));
        } else if (type instanceof Class<?> record
                && record.isRecord()
                && value instanceof Map<?, ?> map) {
            for (var component : record.getRecordComponents()) {
                Object child = map.get(component.getName());
                if (component.getType().isPrimitive()) {
                    require(child != null);
                }
                if (child != null) {
                    primitives(child, component.getGenericType());
                }
            }
        }
    }

    static AgentReadObservationClassifier.Observation observation(String kind, long count) {
        return new AgentReadObservationClassifier.Observation(kind, Math.toIntExact(count));
    }

    static void same(Object expected, Object actual) {
        require(Objects.equals(expected, actual));
    }

    static IllegalArgumentException invalid() {
        return new IllegalArgumentException("Invalid native observation");
    }
}
