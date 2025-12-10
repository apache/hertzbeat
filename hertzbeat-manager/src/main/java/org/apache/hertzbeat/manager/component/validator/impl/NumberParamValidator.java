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

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.apache.hertzbeat.common.util.IntervalExpressionUtil;
import org.apache.hertzbeat.manager.component.validator.ParamValidator;
import org.springframework.stereotype.Component;

/**
 * Number parameter validator
 */
@Component
public class NumberParamValidator implements ParamValidator {
    @Override
    public boolean support(String type) {
        return "number".equals(type);
    }

    @Override
    public void validate(ParamDefine paramDefine, Param param) {
        Double doubleValue = org.apache.hertzbeat.common.util.CommonUtil.parseStrDouble(param.getParamValue());
        if (doubleValue == null) {
            throw new IllegalArgumentException("Params field " + paramDefine.getField() + " type "
                    + paramDefine.getType() + " is invalid.");
        }
        if (paramDefine.getRange() != null) {
            if (!IntervalExpressionUtil.validNumberIntervalExpress(doubleValue,
                    paramDefine.getRange())) {
                throw new IllegalArgumentException("Params field " + paramDefine.getField() + " type "
                        + paramDefine.getType() + " over range " + paramDefine.getRange());
            }
        }
        param.setType(CommonConstants.PARAM_TYPE_NUMBER);
    }
}
