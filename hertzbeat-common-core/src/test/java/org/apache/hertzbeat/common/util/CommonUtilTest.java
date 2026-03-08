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

package org.apache.hertzbeat.common.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link CommonUtil}
 */
class CommonUtilTest {

    @Test
    void testParseStrInteger() {
        assertEquals(10, CommonUtil.parseStrInteger("10"));
        assertEquals(-10, CommonUtil.parseStrInteger("-10"));
        assertEquals(+10, CommonUtil.parseStrInteger("+10"));
        assertNotEquals(10_000, CommonUtil.parseStrInteger("10_000"));
        assertNotEquals(16, CommonUtil.parseStrInteger("0x10"));
    }

    @Test
    void testParseStrDouble() {
        assertEquals(10.125, CommonUtil.parseStrDouble("10.125"));
        assertEquals(-10.125, CommonUtil.parseStrDouble("-10.125"));
        assertEquals(100, CommonUtil.parseStrDouble("100d"));
        assertEquals(100000, CommonUtil.parseStrDouble("100E3"));
        assertEquals(0.1, CommonUtil.parseStrDouble("100E-3"));
        assertNotEquals(10_000.125, CommonUtil.parseStrDouble("10_000.125"));
    }

    @Test
    void testParseIsNumeric() {
        assertTrue(CommonUtil.isNumeric("1234"));
        assertTrue(CommonUtil.isNumeric("6.954"));
        assertFalse(CommonUtil.isNumeric("296.347%"));
        assertFalse(CommonUtil.isNumeric("445_126"));
    }

    @Test
    void testParseTimeStrToSecond() {
        assertEquals(36000, CommonUtil.parseTimeStrToSecond("10:00"));
        assertEquals(43800, CommonUtil.parseTimeStrToSecond("12:10:00"));
        assertNotEquals(43800, CommonUtil.parseTimeStrToSecond("2024-07-23 12:10:00"));
    }

    @Test
    void testParseDoubleStr() {
        assertEquals("9.3454", CommonUtil.parseDoubleStr("9.345435345", null));
        assertEquals("9.3454", CommonUtil.parseDoubleStr("9.345435345%", "%"));
        assertEquals("10", CommonUtil.parseDoubleStr("10%", "%"));
        assertEquals("588", CommonUtil.parseDoubleStr("588Mb", "Mb"));
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

    @Test
    void testGetMessageFromThrowable() {
        assertEquals("throwable is null, unknown error.", CommonUtil.getMessageFromThrowable(null));
        assertEquals("throwable cause message", CommonUtil.getMessageFromThrowable(new Throwable(new Throwable("throwable cause message"))));
        assertEquals("throwable message", CommonUtil.getMessageFromThrowable(new Throwable("throwable message")));
        assertEquals("throwable localizedMessage", CommonUtil.getMessageFromThrowable(new Throwable() {
            @Override
            public String getLocalizedMessage() {
                return "throwable localizedMessage";
            }
        }));
        assertEquals("throwable toString", CommonUtil.getMessageFromThrowable(new Throwable() {
            @Override
            public String getMessage() {
                return null;
            }

            @Override
            public String toString() {
                return "throwable toString";
            }
        }));
        assertEquals("unknown error.", CommonUtil.getMessageFromThrowable(new Throwable() {
            @Override
            public String getMessage() {
                return null;
            }

            @Override
            public String toString() {
                return null;
            }
        }));
    }

    @Test
    void testRemoveBlankLine() {
        assertEquals("line1\nline2\nline3", CommonUtil.removeBlankLine("line1\nline2\nline3"));
        assertEquals("line1\nline3\nline4\nline6", CommonUtil.removeBlankLine("line1\n\nline3\nline4\n\n\nline6"));
        assertEquals("", CommonUtil.removeBlankLine(""));
        assertEquals("", CommonUtil.removeBlankLine("\n\n\n\n"));
    }

    @Test
    void testGetLangMappingValueFromI18nMap() {
        Map<String, String> i18nMap = new HashMap<>();
        i18nMap.put("zh-CN", "中文");
        i18nMap.put("ja", null);
        i18nMap.put("en-US", "English");
        assertEquals("中文", CommonUtil.getLangMappingValueFromI18nMap("zh-CN", i18nMap));
        assertEquals("English", CommonUtil.getLangMappingValueFromI18nMap("en-US", i18nMap));
        assertNull(CommonUtil.getLangMappingValueFromI18nMap("zh", new HashMap<>()));
        assertNotNull(CommonUtil.getLangMappingValueFromI18nMap("ja", i18nMap));
        assertNotNull(CommonUtil.getLangMappingValueFromI18nMap("zh-TW", i18nMap));
    }

}
