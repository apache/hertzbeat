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

import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Resolves entity definition kind/type aliases into the canonical HertzBeat taxonomy.
 */
@Service
public class EntityDefinitionTypeResolverService {

    private static final String ENTITY_DEFINITION_API_VERSION = "hertzbeat/v1";
    private static final String LEGACY_ENTITY_DEFINITION_KIND = "Entity";
    private static final String TYPE_SYSTEM = "system";
    private static final String TYPE_DATABASE = "database";
    private static final String TYPE_QUEUE = "queue";
    private static final String TYPE_API = "api";
    private static final String TYPE_ENDPOINT = "endpoint";
    private static final String KIND_DATASTORE = "datastore";
    private static final String KIND_API = "api";
    private static final Set<String> SUPPORTED_TYPES = Set.of(
            "service", "host", TYPE_SYSTEM, TYPE_DATABASE, TYPE_QUEUE, "middleware", "device", TYPE_API, TYPE_ENDPOINT, "k8s_workload"
    );

    public String defaultApiVersion() {
        return ENTITY_DEFINITION_API_VERSION;
    }

    public String resolveDefinitionEntityType(Map<String, Object> root, Map<String, Object> specMap) {
        String normalizedKind = normalizeSupportedEntityType(asText(root.get("kind")));
        if (StringUtils.hasText(normalizedKind)) {
            return normalizedKind;
        }
        String normalizedEntityType = normalizeSupportedEntityType(defaultText(
                asText(specMap.get("entityType")),
                asText(specMap.get("entity_type")),
                asText(root.get("entityType")),
                asText(root.get("entity_type"))
        ));
        if (StringUtils.hasText(normalizedEntityType)) {
            return normalizedEntityType;
        }
        return defaultText(
                normalizeSupportedEntityType(asText(specMap.get("type"))),
                normalizeSupportedEntityType(asText(root.get("type"))),
                asText(root.get("dd-service")) != null || asText(root.get("dd_service")) != null ? "service" : null,
                "service"
        );
    }

    public String resolveDefinitionSubtype(Map<String, Object> root, Map<String, Object> specMap, String entityType) {
        String explicitSubtype = defaultText(
                asText(specMap.get("subtype")),
                asText(specMap.get("serviceType")),
                asText(specMap.get("resourceType")),
                asText(root.get("subtype")),
                asText(root.get("serviceType")),
                asText(root.get("resourceType"))
        );
        if (StringUtils.hasText(explicitSubtype)) {
            return explicitSubtype.trim();
        }
        String rawType = defaultText(asText(specMap.get("type")), asText(root.get("type")));
        if (!StringUtils.hasText(rawType)) {
            return null;
        }
        String normalizedSupportedType = normalizeSupportedEntityType(rawType);
        if (StringUtils.hasText(normalizedSupportedType)
                && Objects.equals(normalizedSupportedType, entityType)) {
            return null;
        }
        return rawType.trim();
    }

    private String normalizeEntityTypeFromKind(String kind) {
        if (!StringUtils.hasText(kind)) {
            return null;
        }
        if (LEGACY_ENTITY_DEFINITION_KIND.equalsIgnoreCase(kind.trim())) {
            return null;
        }
        return switch (kind.trim().toLowerCase()) {
            case KIND_DATASTORE -> TYPE_DATABASE;
            case KIND_API -> TYPE_API;
            default -> kind.trim().toLowerCase();
        };
    }

    private String normalizeSupportedEntityType(String value) {
        String normalized = normalizeEntityTypeFromKind(value);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }
        return SUPPORTED_TYPES.contains(normalized) ? normalized : null;
    }

    private String asText(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value);
        return StringUtils.hasText(text) ? text.trim() : null;
    }

    private String defaultText(String... values) {
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
}
