package com.usthe.common.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * @author tom
 * @date 2022/4/7 17:18
 */
class CommonUtilTest {

    @Test
    void testParseDoubleStr() {
        assertEquals("9.3454",CommonUtil.parseDoubleStr("9.345435345", null));
        assertEquals("9.3454",CommonUtil.parseDoubleStr("9.345435345%", "%"));
        assertEquals("10.0",CommonUtil.parseDoubleStr("10%", "%"));
        assertEquals("588.0",CommonUtil.parseDoubleStr("588Mb", "Mb"));
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