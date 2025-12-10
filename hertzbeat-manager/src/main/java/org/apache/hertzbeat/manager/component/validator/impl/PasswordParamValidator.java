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
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.manager.component.validator.ParamValidator;
import org.springframework.stereotype.Component;

/**
 * Password parameter validator
 */
@Component
public class PasswordParamValidator implements ParamValidator {
    @Override
    public boolean support(String type) {
        return "password".equals(type);
    }

    @Override
    public void validate(ParamDefine paramDefine, Param param) {
        String passwordValue = param.getParamValue();
        if (!AesUtil.isCiphertext(passwordValue)) {
            passwordValue = AesUtil.aesEncode(passwordValue);
            param.setParamValue(passwordValue);
        }
        param.setType(CommonConstants.PARAM_TYPE_PASSWORD);
    }
}
