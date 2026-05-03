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
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;

/**
 * Convert entity catalog contacts to and from JSON.
 */
@Converter
@Component
public class JsonEntityCatalogContactListAttributeConverter implements AttributeConverter<List<EntityCatalogContact>, String> {

    @Override
    public String convertToDatabaseColumn(List<EntityCatalogContact> attribute) {
        return JsonUtil.toJson(attribute);
    }

    @Override
    public List<EntityCatalogContact> convertToEntityAttribute(String dbData) {
        if (StringUtils.isBlank(dbData)) {
            return List.of();
        }
        TypeReference<List<EntityCatalogContact>> typeReference = new TypeReference<>() {
        };
        List<EntityCatalogContact> contacts = JsonUtil.fromJson(dbData, typeReference);
        return contacts == null ? List.of() : contacts;
    }
}
