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
import org.apache.hertzbeat.manager.pojo.dto.MonitorParam;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NumberParamValidatorTest {

    private NumberParamValidator validator;

    @BeforeEach
    void setUp() {
        validator = new NumberParamValidator();
    }

    @Test
    void support() {
        assertTrue(validator.support("number"));
    }

    @Test
    void validate_ValidNumber() {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setType("number");
        MonitorParam param = new MonitorParam();
        param.setParamValue("123");

        validator.validate(paramDefine, param);
        assertEquals(CommonConstants.PARAM_TYPE_NUMBER, param.getType());
    }

    @Test
    void validate_InvalidNumber() {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setType("number");
        paramDefine.setField("port");
        MonitorParam param = new MonitorParam();
        param.setParamValue("abc");

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_NumberInRange() {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setType("number");
        paramDefine.setRange("[0,100]");
        MonitorParam param = new MonitorParam();
        param.setParamValue("50");

        validator.validate(paramDefine, param);
    }

    @Test
    void validate_NumberOutOfRange() {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setType("number");
        paramDefine.setField("port");
        paramDefine.setRange("[0,100]");
        MonitorParam param = new MonitorParam();
        param.setParamValue("150");

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "[0,65535,]", "[0,65535]||", "||[0,65535]",
        "[0,65535]||invalid", "invalid||[0,65535]",
        "[0,65535]||[1]", "[1]||[0,65535]",
        "[0,65535]||[2,1]", "[0,65535]||[NaN,10]"
    })
    void validateMalformedRange(String range) {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setType("number");
        paramDefine.setField("port");
        paramDefine.setRange(range);
        MonitorParam param = new MonitorParam();
        param.setParamValue("8080");

        // Even an otherwise valid port must not bypass a broken range definition.
        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }

    @ParameterizedTest
    @ValueSource(strings = {"[1,1023]||[8000,9000]", "[8000,9000]||[1,1023]"})
    void validatePortInUnion(String range) {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setType("number");
        paramDefine.setRange(range);
        MonitorParam param = new MonitorParam();
        param.setParamValue("8080");

        validator.validate(paramDefine, param);
        assertEquals(CommonConstants.PARAM_TYPE_NUMBER, param.getType());
    }

    @ParameterizedTest
    @ValueSource(strings = {"[1,1023]||[8000,9000]", "[8000,9000]||[1,1023]"})
    void validatePortOutsideUnion(String range) {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setType("number");
        paramDefine.setField("port");
        paramDefine.setRange(range);
        MonitorParam param = new MonitorParam();
        param.setParamValue("7000");

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }
}
