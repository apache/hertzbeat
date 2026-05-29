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

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Normalizes common entity definition document field fallbacks.
 */
@Service
public class EntityDefinitionDocumentFieldNormalizationService {

    public Map<String, Object> toObjectMap(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            return Collections.emptyMap();
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
            if (entry.getKey() != null) {
                result.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }
        return result;
    }

    public Map<String, Object> resolveDefinitionSpecMap(Map<String, Object> root) {
        if (root == null) {
            return Collections.emptyMap();
        }
        return toObjectMap(root.get("spec"));
    }

    public Map<String, Object> resolveDefinitionTelemetryMap(Map<String, Object> specMap) {
        if (specMap == null) {
            return Collections.emptyMap();
        }
        return toObjectMap(specMap.get("telemetry"));
    }

    public String asText(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value);
        return StringUtils.hasText(text) ? text.trim() : null;
    }

    public Object firstNonNull(Object... values) {
        if (values == null) {
            return null;
        }
        for (Object value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    public String defaultText(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }

    public String resolveDefinitionApiVersion(Map<String, Object> root, String defaultApiVersion) {
        return defaultText(
                asText(root.get("apiVersion")),
                asText(root.get("schema-version")),
                asText(root.get("schema_version")),
                defaultApiVersion
        );
    }
}
