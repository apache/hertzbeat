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

import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Component;

/**
 * json str to tag item
 */
@Converter
@Component
public class JsonTagAttributeConverter implements AttributeConverter<TagItem, String> {

    @Override
    public String convertToDatabaseColumn(TagItem attribute) {
        return JsonUtil.toJson(attribute);
    }

    @Override
    public TagItem convertToEntityAttribute(String dbData) {
        TypeReference<TagItem> typeReference = new TypeReference<>() {};
        return JsonUtil.fromJson(dbData, typeReference);
    }
}
