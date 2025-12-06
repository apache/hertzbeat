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

import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JsonParamValidatorTest {

    private JsonParamValidator validator;

    @BeforeEach
    void setUp() {
        validator = new JsonParamValidator();
    }

    @Test
    void support() {
        assertTrue(validator.support("metrics-field"));
        assertTrue(validator.support("key-value"));
    }

    @Test
    void validate_ValidJson() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("key-value");
        Param param = new Param();
        param.setParamValue("{\"key\":\"value\"}");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_InvalidJson() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("key-value");
        paramDefine.setField("headers");
        Param param = new Param();
        param.setParamValue("{key:value}"); // Invalid JSON

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }
}
