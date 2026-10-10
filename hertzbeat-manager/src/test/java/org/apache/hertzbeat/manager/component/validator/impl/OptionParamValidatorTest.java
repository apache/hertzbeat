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

import org.apache.hertzbeat.manager.pojo.dto.MonitorParam;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OptionParamValidatorTest {

    private OptionParamValidator validator;

    @BeforeEach
    void setUp() {
        validator = new OptionParamValidator();
    }

    @Test
    void support() {
        assertTrue(validator.support("radio"));
        assertTrue(validator.support("checkbox"));
    }

    @Test
    void validate_ValidOption() {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setType("radio");
        paramDefine.setOptions(List.of(new ParamDefineInfo.OptionInfo("opt1", "val1"), new ParamDefineInfo.OptionInfo("opt2", "val2")));
        MonitorParam param = new MonitorParam();
        param.setParamValue("val1");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_InvalidOption() {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setType("radio");
        paramDefine.setField("method");
        paramDefine.setOptions(List.of(new ParamDefineInfo.OptionInfo("opt1", "val1")));
        MonitorParam param = new MonitorParam();
        param.setParamValue("val2");

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_NullOptions() {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setType("radio");
        paramDefine.setField("method");
        MonitorParam param = new MonitorParam();
        param.setParamValue("val1");

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }

    @Test
    void radioRemainsSingleSelectAndNormalizesCanonicalValue() {
        ParamDefineInfo definition = definition("radio");
        MonitorParam parameter = parameter("FAST");

        assertDoesNotThrow(() -> validator.validate(definition, parameter));
        assertEquals("fast", parameter.getParamValue());

        IllegalArgumentException failure = assertThrows(IllegalArgumentException.class,
                () -> validator.validate(definition, parameter("fast,safe")));
        assertFalse(failure.getMessage().contains("fast,safe"));
    }

    @Test
    void checkboxNormalizesCanonicalValuesAndPreservesSelectionOrder() {
        ParamDefineInfo definition = definition("checkbox");
        MonitorParam parameter = parameter("SAFE, fast");

        assertDoesNotThrow(() -> validator.validate(definition, parameter));

        assertEquals("safe,fast", parameter.getParamValue());
    }

    @Test
    void checkboxRejectsEmptyDuplicateAndUnknownItemsWithoutEcho() {
        ParamDefineInfo definition = definition("checkbox");

        assertInvalidWithoutValueEcho(definition, "");
        assertInvalidWithoutValueEcho(definition, "fast,,safe");
        assertInvalidWithoutValueEcho(definition, "fast,FAST");
        assertInvalidWithoutValueEcho(definition, "fast,caller-secret");
    }

    private void assertInvalidWithoutValueEcho(ParamDefineInfo definition, String value) {
        IllegalArgumentException failure = assertThrows(IllegalArgumentException.class,
                () -> validator.validate(definition, parameter(value)));
        if (!value.isEmpty()) {
            assertFalse(failure.getMessage().contains(value));
        }
    }

    private static ParamDefineInfo definition(String type) {
        ParamDefineInfo definition = new ParamDefineInfo();
        definition.setType(type);
        definition.setOptions(List.of(
                new ParamDefineInfo.OptionInfo("Fast", "fast"),
                new ParamDefineInfo.OptionInfo("Safe", "safe")));
        return definition;
    }

    private static MonitorParam parameter(String value) {
        MonitorParam parameter = new MonitorParam();
        parameter.setParamValue(value);
        return parameter;
    }
}
