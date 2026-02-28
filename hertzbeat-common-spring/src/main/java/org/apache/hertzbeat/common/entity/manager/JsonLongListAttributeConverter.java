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
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Component;

/**
 * json str to id list
 */
@Converter
@Component
public class JsonLongListAttributeConverter implements AttributeConverter<List<Long>, String> {
    @Override
    public String convertToDatabaseColumn(List<Long> attribute) {
        return JsonUtil.toJson(attribute);

    }

    @Override
    public List<Long> convertToEntityAttribute(String dbData) {
        if (StringUtils.isBlank(dbData)) {
            return List.of();
        }
        if (!JsonUtil.isJsonStr(dbData) && StringUtils.isNumeric(dbData)) {
            return List.of(Long.parseLong(dbData));
        }
        TypeReference<List<Long>> typeReference = new TypeReference<>() {
        };
        List<Long> longList = JsonUtil.fromJson(dbData, typeReference);
        if (longList == null && !dbData.isEmpty()) {
            if (StringUtils.isNumeric(dbData)) {
                return List.of(Long.parseLong(dbData));
            } else {
                throw new NumberFormatException("String convert to Long error");
            }
        } else {
            return longList;
        }
    }
}
