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

package com.usthe.common.entity.manager;

import com.google.gson.reflect.TypeToken;
import com.usthe.common.util.GsonUtil;

import javax.persistence.AttributeConverter;
import java.lang.reflect.Type;
import java.util.List;

/**
 * json 互转list paramDefine.Option 对象字段为数据String字段
 * @author tom
 * @date 2021/12/4 07:54
 */
public class JsonOptionListAttributeConverter implements AttributeConverter<List<ParamDefine.Option>, String> {

    @Override
    public String convertToDatabaseColumn(List<ParamDefine.Option> attribute) {
        return GsonUtil.toJson(attribute);
    }

    @Override
    public List<ParamDefine.Option> convertToEntityAttribute(String dbData) {
        Type type = new TypeToken<List<ParamDefine.Option>>(){}.getType();
        return GsonUtil.fromJson(dbData, type);
    }
}
