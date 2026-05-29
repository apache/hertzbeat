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
import org.apache.hertzbeat.manager.pojo.dto.EntityDefinition;
import org.springframework.stereotype.Service;

/**
 * Normalizes integration and extension object nodes in entity definition documents.
 */
@Service
public class EntityDefinitionExtensionNormalizationService {

    public void attachDefinitionAddOns(EntityDefinition definition, Map<String, Object> root, Map<String, Object> specMap) {
        if (definition == null) {
            return;
        }
        Map<String, Object> rootMap = root == null ? Collections.emptyMap() : root;
        Map<String, Object> addOnSpecMap = specMap == null ? Collections.emptyMap() : specMap;
        definition.setIntegrations(extractDefinitionObjectNodeMap(firstNonNull(
                rootMap.get("integrations"), addOnSpecMap.get("integrations"))));
        definition.setExtensions(extractDefinitionObjectNodeMap(firstNonNull(
                rootMap.get("extensions"), addOnSpecMap.get("extensions"))));
    }

    public Map<String, Object> extractDefinitionObjectNodeMap(Object value) {
        Map<String, Object> objectMap = toObjectMap(value);
        return objectMap.isEmpty() ? Collections.emptyMap() : objectMap;
    }

    private Object firstNonNull(Object primary, Object fallback) {
        return primary != null ? primary : fallback;
    }

    private Map<String, Object> toObjectMap(Object value) {
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
}
