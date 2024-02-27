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

package org.dromara.hertzbeat.common.entity.manager;

import com.fasterxml.jackson.core.type.TypeReference;
import org.dromara.hertzbeat.common.util.JsonUtil;

import javax.persistence.AttributeConverter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * json str to tag list 
 * @author tom
 *
 */
public class JsonTagListAttributeConverter implements AttributeConverter<List<TagItem>, String> {

    @Override
    public String convertToDatabaseColumn(List<TagItem> attribute) {
        return JsonUtil.toJson(attribute);
    }

    @Override
    public List<TagItem> convertToEntityAttribute(String dbData) {
        try {
            TypeReference<List<TagItem>> typeReference = new TypeReference<>() {};
            return JsonUtil.fromJson(dbData, typeReference);
        } catch (Exception e) {
            // history data handler
            TypeReference<Map<String, String>> typeReference = new TypeReference<>() {};
            Map<String, String> map = JsonUtil.fromJson(dbData, typeReference);
            if (map != null) {
                return map.entrySet().stream().map(entry -> new TagItem(entry.getKey(), entry.getValue())).collect(Collectors.toList());
            } else {
                return null;
            }
        }
    }
}
