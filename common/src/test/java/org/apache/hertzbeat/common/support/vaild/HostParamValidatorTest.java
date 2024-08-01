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

import jakarta.validation.ConstraintValidatorContext;
import org.apache.hertzbeat.common.support.valid.HostParamValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link HostParamValidator}
 */

class HostParamValidatorTest {

	@InjectMocks
	private HostParamValidator hostParamValidator;

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
		boolean result = hostParamValidator.isValid(null, context);
		assertFalse(result);

		result = hostParamValidator.isValid("", context);
		assertFalse(result);

		result = hostParamValidator.isValid("   ", context);
		assertFalse(result);

		result = hostParamValidator.isValid("192.168.1.1", context);
		assertTrue(result);

		result = hostParamValidator.isValid("2001:0db8:85a3:0000:0000:8a2e:0370:7334", context);
		assertTrue(result);

		result = hostParamValidator.isValid("www.example.com", context);
		assertTrue(result);

		result = hostParamValidator.isValid("http://www.example.com", context);
		assertTrue(result);

		result = hostParamValidator.isValid("https://www.baidu.com", context);
		assertTrue(result);

		result = hostParamValidator.isValid("ht!tp://www.example.com", context);
		assertFalse(result);
	}
}

