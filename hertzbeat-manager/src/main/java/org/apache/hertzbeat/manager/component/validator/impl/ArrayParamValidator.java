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

import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.manager.component.validator.ParamValidator;
import org.apache.hertzbeat.manager.pojo.dto.MonitorParam;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.springframework.stereotype.Component;

/**
 * Array parameter validator
 */
@Component
public class ArrayParamValidator implements ParamValidator {
    @Override
    public boolean support(String type) {
        return "array".equals(type);
    }

    @Override
    public void validate(ParamDefineInfo paramDefine, MonitorParam param) {
        String value = param.getParamValue();
        if (value == null) {
            throw ParamValidator.invalidParameter();
        }
        value = value.trim();
        if (value.startsWith("[") && value.endsWith("]")) {
            value = value.substring(1, value.length() - 1);
        }
        String[] elements = value.split(",", -1);
        List<String> normalized = new ArrayList<>(elements.length);
        for (String element : elements) {
            String trimmed = element.trim();
            if (trimmed.isEmpty()) {
                throw ParamValidator.invalidParameter();
            }
            normalized.add(trimmed);
        }
        param.setParamValue(String.join(",", normalized));
    }
}
