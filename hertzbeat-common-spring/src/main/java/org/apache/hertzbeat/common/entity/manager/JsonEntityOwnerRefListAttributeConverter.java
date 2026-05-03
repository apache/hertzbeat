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

package org.apache.hertzbeat.common.entity.manager;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;

/**
 * Convert entity owner refs to and from JSON.
 */
@Converter
@Component
public class JsonEntityOwnerRefListAttributeConverter implements AttributeConverter<List<EntityOwnerRef>, String> {

    @Override
    public String convertToDatabaseColumn(List<EntityOwnerRef> attribute) {
        return JsonUtil.toJson(attribute);
    }

    @Override
    public List<EntityOwnerRef> convertToEntityAttribute(String dbData) {
        if (StringUtils.isBlank(dbData)) {
            return List.of();
        }
        if (!JsonUtil.isJsonStr(dbData)) {
            return List.of(new EntityOwnerRef(dbData.trim(), "team"));
        }
        TypeReference<List<Object>> typeReference = new TypeReference<>() {
        };
        List<Object> rawItems = JsonUtil.fromJson(dbData, typeReference);
        if (rawItems == null) {
            return List.of();
        }
        List<EntityOwnerRef> owners = new ArrayList<>(rawItems.size());
        for (Object rawItem : rawItems) {
            EntityOwnerRef ownerRef = toOwnerRef(rawItem);
            if (ownerRef != null) {
                owners.add(ownerRef);
            }
        }
        return owners;
    }

    private EntityOwnerRef toOwnerRef(Object rawItem) {
        if (rawItem instanceof String ownerName && StringUtils.isNotBlank(ownerName)) {
            return new EntityOwnerRef(ownerName.trim(), "team");
        }
        if (!(rawItem instanceof Map<?, ?> rawMap)) {
            return null;
        }
        String name = extractText(rawMap.get("name"));
        if (StringUtils.isBlank(name)) {
            name = extractText(rawMap.get("label"));
        }
        if (StringUtils.isBlank(name)) {
            return null;
        }
        String type = extractText(rawMap.get("type"));
        return new EntityOwnerRef(name.trim(), StringUtils.isBlank(type) ? "team" : type.trim());
    }

    private String extractText(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
