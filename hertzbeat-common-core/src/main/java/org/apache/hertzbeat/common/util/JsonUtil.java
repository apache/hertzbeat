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

package org.apache.hertzbeat.common.util;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import java.io.InputStream;
import java.io.OutputStream;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;

import javax.annotation.concurrent.ThreadSafe;

/**
 * json util
 */
@ThreadSafe
@Slf4j
public final class JsonUtil {


    private static final ObjectMapper OBJECT_MAPPER = JsonMapper.builder()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
        .configure(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES, false)
        .configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false)
        .changeDefaultVisibility(vc -> vc.withVisibility(PropertyAccessor.FIELD, JsonAutoDetect.Visibility.ANY))
        .build();

    private JsonUtil() {
    }

    public static String toJson(Object source) {
        if (source == null) {
            return null;
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(source);
        } catch (JacksonException e) {
            log.error("Error converting object to JSON: {}", e.getMessage(), e);
            return null;
        }
    }

    public static <T> T fromJson(String jsonStr, Class<T> clazz) {
        if (jsonStr == null || jsonStr.trim().isEmpty()) {
            return null;
        }
        try {
            return OBJECT_MAPPER.readValue(jsonStr, clazz);
        } catch (JacksonException e) {
            log.error("Error parsing JSON to class {}: {}", clazz.getName(), e.getMessage(), e);
            return null;
        }
    }

    public static <T> T fromJson(String jsonStr, TypeReference<T> type) {
        if (jsonStr == null || jsonStr.trim().isEmpty()) {
            return null;
        }
        try {
            return OBJECT_MAPPER.readValue(jsonStr, type);
        } catch (JacksonException e) {
            log.error("Error parsing JSON to TypeReference: {}", e.getMessage(), e);
            return null;
        }
    }

    public static JsonNode fromJson(String jsonStr) {
        if (jsonStr == null || jsonStr.trim().isEmpty()) {
            return null;
        }
        try {
            return OBJECT_MAPPER.readTree(jsonStr);
        } catch (JacksonException e) {
            log.error("Error reading JSON tree: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * check if the string is a json string
     * @param jsonStr json string
     * @return true if the string is a json string
     */
    public static boolean isJsonStr(String jsonStr) {
        if (jsonStr == null || jsonStr.trim().isEmpty()) {
            return false;
        }
        jsonStr = jsonStr.trim();
        if (!isJsonLike(jsonStr)) {
            return false;
        }
        try {
            OBJECT_MAPPER.readTree(jsonStr);
            return true;
        } catch (JacksonException ignored) {
            return false;
        }
    }

    public static Boolean isArray(String jsonStr) {
        if (!isJsonLike(jsonStr)) {
            return false;
        }
        try {
            JsonNode jsonNode = OBJECT_MAPPER.readTree(jsonStr);
            return jsonNode.isArray();
        } catch (JacksonException ignore) {
            return false;
        }
    }

    public static boolean isJsonLike(String jsonStr) {
        if (jsonStr == null || jsonStr.trim().isEmpty()) {
            return false;
        }
        jsonStr = jsonStr.trim();
        char start = jsonStr.charAt(0);
        char end = jsonStr.charAt(jsonStr.length() - 1);
        return (start == '{' && end == '}') || (start == '[' && end == ']');
    }

    /**
     * Parse JSON from InputStream to object
     * @param is input stream
     * @param type type reference
     * @return parsed object or null if error
     */
    public static <T> T fromJson(InputStream is, TypeReference<T> type) {
        if (is == null) {
            return null;
        }
        try {
            return OBJECT_MAPPER.readValue(is, type);
        } catch (JacksonException e) {
            log.error("Error parsing JSON from InputStream to TypeReference: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Write object to OutputStream as JSON
     * @param source object to serialize
     * @param os output stream
     */
    public static void toJson(Object source, OutputStream os) {
        if (source == null || os == null) {
            return;
        }
        try {
            OBJECT_MAPPER.writeValue(os, source);
        } catch (JacksonException e) {
            log.error("Error writing object to OutputStream as JSON: {}", e.getMessage(), e);
        }
    }

    /**
     * Convert a value from one type to another using JSON serialization/deserialization
     * @param fromValue source value
     * @param toValueType target type
     * @return converted value or null if error
     */
    public static <T> T convertValue(Object fromValue, Class<T> toValueType) {
        if (fromValue == null) {
            return null;
        }
        try {
            return OBJECT_MAPPER.convertValue(fromValue, toValueType);
        } catch (JacksonException e) {
            log.error("Error converting value to {}: {}", toValueType.getName(), e.getMessage(), e);
            return null;
        }
    }
}
