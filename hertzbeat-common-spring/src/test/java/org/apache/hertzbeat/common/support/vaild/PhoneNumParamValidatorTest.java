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

package org.apache.hertzbeat.common.support.vaild;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import jakarta.validation.ConstraintValidatorContext;
import org.apache.hertzbeat.common.support.valid.PhoneNumParamValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * Test case for {@link PhoneNumParamValidator}
 */

class PhoneNumParamValidatorTest {

    @InjectMocks
    private PhoneNumParamValidator phoneNumParamValidator;

    @Mock
    private ConstraintValidatorContext context;

    @Mock
    private ConstraintValidatorContext.ConstraintViolationBuilder constraintViolationBuilder;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        when(context.buildConstraintViolationWithTemplate(any())).thenReturn(constraintViolationBuilder);
    }

    @Test
    public void testIsValid() {
        boolean result = phoneNumParamValidator.isValid(null, context);
        assertFalse(result);

        result = phoneNumParamValidator.isValid("", context);
        assertFalse(result);

        result = phoneNumParamValidator.isValid("123456", context);
        assertFalse(result);

        result = phoneNumParamValidator.isValid("abc123", context);
        assertFalse(result);

        result = phoneNumParamValidator.isValid("13900001234", context);
        assertTrue(result);

        result = phoneNumParamValidator.isValid("1234567890123456789", context);
        assertFalse(result);
    }
}

