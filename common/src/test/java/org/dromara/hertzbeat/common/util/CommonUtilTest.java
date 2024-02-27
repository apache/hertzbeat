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

package org.dromara.hertzbeat.common.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test case for {@link CommonUtil}
 */
class CommonUtilTest {

    @Test
    void testParseDoubleStr() {
        assertEquals("9.3454",CommonUtil.parseDoubleStr("9.345435345", null));
        assertEquals("9.3454",CommonUtil.parseDoubleStr("9.345435345%", "%"));
        assertEquals("10",CommonUtil.parseDoubleStr("10%", "%"));
        assertEquals("588",CommonUtil.parseDoubleStr("588Mb", "Mb"));
    }

    @Test
    void validateEmail() {
        assertTrue(CommonUtil.validateEmail("tom@usthe.com"));
        assertTrue(CommonUtil.validateEmail("demo@qq.com"));
        assertFalse(CommonUtil.validateEmail("tom.usthe.com"));
    }

    @Test
    void validatePhoneNum() {
        assertTrue(CommonUtil.validatePhoneNum("19234554432"));
        assertTrue(CommonUtil.validatePhoneNum("13234554432"));
        assertTrue(CommonUtil.validatePhoneNum("14234554432"));
        assertTrue(CommonUtil.validatePhoneNum("16234554432"));
        assertFalse(CommonUtil.validatePhoneNum("12234554432"));
        assertFalse(CommonUtil.validatePhoneNum("11234554432"));
        assertFalse(CommonUtil.validatePhoneNum("35234554432"));
        assertFalse(CommonUtil.validatePhoneNum("46234554432"));
    }

}