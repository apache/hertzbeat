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

package org.apache.hertzbeat.manager.component.validator;

import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ParamValidatorManagerTest {

    private ParamValidatorManager paramValidatorManager;

    @Mock
    private ParamValidator paramValidator;

    @BeforeEach
    void setUp() {
        paramValidatorManager = new ParamValidatorManager(List.of(paramValidator));
    }

    @Test
    void validate_Success() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("text");
        Param param = new Param();

        when(paramValidator.support("text")).thenReturn(true);

        assertDoesNotThrow(() -> paramValidatorManager.validate(paramDefine, param));
        verify(paramValidator).validate(paramDefine, param);
    }

    @Test
    void validate_NoValidatorFound() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("unknown");
        Param param = new Param();

        when(paramValidator.support("unknown")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> paramValidatorManager.validate(paramDefine, param));
    }
}
