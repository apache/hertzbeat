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

class HostParamValidatorAdapterTest {

    private HostParamValidatorAdapter validator;

    @BeforeEach
    void setUp() {
        validator = new HostParamValidatorAdapter();
    }

    @Test
    void support() {
        assertTrue(validator.support("host"));
    }

    @Test
    void validate_ValidHost() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("host");
        Param param = new Param();
        param.setParamValue("127.0.0.1");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_ValidDomain() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("host");
        Param param = new Param();
        param.setParamValue("localhost");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_HttpPrefix() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("host");
        Param param = new Param();
        param.setParamValue("http://127.0.0.1");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_InvalidHost() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("host");
        paramDefine.setField("host");
        Param param = new Param();
        param.setParamValue("invalid host");

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_HostWithPort() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("host");
        Param param = new Param();
        param.setParamValue("127.0.0.1:8080");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }
}
