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

import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ArrayParamValidatorTest {
    
    private ArrayParamValidator validator;
    
    @BeforeEach
    void setUp() {
        validator = new ArrayParamValidator();
    }
    
    @Test
    void support() {
        assertTrue(validator.support("array"));
    }
    
    @Test
    void validate_ValidArray() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("array");
        Param param = new Param();
        param.setParamValue("val1,val2");
        
        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }
    
    @Test
    void validate_ValidArrayWithBrackets() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("array");
        Param param = new Param();
        param.setParamValue("[val1,val2]");
        
        validator.validate(paramDefine, param);
        assertEquals("val1,val2", param.getParamValue());
    }
    
    @Test
    void validate_EmptyArray() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("array");
        paramDefine.setField("tags");
        Param param = new Param();
        param.setParamValue("");
        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
        assertEquals("", param.getParamValue());
    }
}
