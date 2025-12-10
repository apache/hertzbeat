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

package org.apache.hertzbeat.manager.component.validator.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.component.validator.ParamValidator;
import org.springframework.stereotype.Component;

/**
 * JSON parameter validator
 */
@Component
public class JsonParamValidator implements ParamValidator {
    @Override
    public boolean support(String type) {
        return "metrics-field".equals(type) || "key-value".equals(type);
    }

    @Override
    public void validate(ParamDefine paramDefine, Param param) {
        if (JsonUtil.fromJson(param.getParamValue(), new TypeReference<>() {
        }) == null) {
            throw new IllegalArgumentException("Params field " + paramDefine.getField() + " value "
                    + param.getParamValue() + " is invalid key-value value");
        }
    }
}
