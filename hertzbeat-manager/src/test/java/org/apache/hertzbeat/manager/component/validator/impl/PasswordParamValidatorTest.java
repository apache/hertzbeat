/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.manager.component.validator.impl;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.manager.pojo.dto.MonitorParam;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordParamValidatorTest {

    private PasswordParamValidator validator;

    @BeforeEach
    void setUp() {
        validator = new PasswordParamValidator();
    }

    @Test
    void support() {
        assertTrue(validator.support("password"));
    }

    @Test
    void validate_EncryptsPlaintext() {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setType("password");
        MonitorParam param = new MonitorParam();
        String plaintext = "password123";
        param.setParamValue(plaintext);

        validator.validate(paramDefine, param);

        assertNotEquals(plaintext, param.getParamValue());
        assertTrue(AesUtil.isCiphertext(param.getParamValue()));
        assertEquals(CommonConstants.PARAM_TYPE_PASSWORD, param.getType());
    }

    @Test
    void validate_IgnoresCiphertext() {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setType("password");
        MonitorParam param = new MonitorParam();
        String ciphertext = AesUtil.aesEncode("password123");
        param.setParamValue(ciphertext);

        validator.validate(paramDefine, param);

        assertEquals(ciphertext, param.getParamValue());
        assertEquals(CommonConstants.PARAM_TYPE_PASSWORD, param.getType());
    }
}
