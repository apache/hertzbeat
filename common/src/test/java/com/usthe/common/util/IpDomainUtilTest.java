package com.usthe.common.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * @author tom
 * @date 2022/2/19 20:32
 */
class IpDomainUtilTest {

    @Test
    void validateIpDomain() {
        assertTrue(IpDomainUtil.validateIpDomain("127.7.5.3"));
        assertTrue(IpDomainUtil.validateIpDomain("255.255.4.3"));
        assertTrue(IpDomainUtil.validateIpDomain("255.255.255.255"));
        assertTrue(IpDomainUtil.validateIpDomain("tancloud.cn"));
        assertTrue(IpDomainUtil.validateIpDomain("tancloud.com.cn"));
        assertTrue(IpDomainUtil.validateIpDomain("student.dev.com.cn"));
        assertTrue(IpDomainUtil.validateIpDomain("www.student.dev.com.cn"));
        assertTrue(IpDomainUtil.validateIpDomain("www.baidu.com"));
        assertTrue(IpDomainUtil.validateIpDomain("good.didi"));
        assertFalse(IpDomainUtil.validateIpDomain("tmp"));
        assertFalse(IpDomainUtil.validateIpDomain("good"));
        assertFalse(IpDomainUtil.validateIpDomain("www.baidu.com."));
        assertFalse(IpDomainUtil.validateIpDomain("good."));
        assertFalse(IpDomainUtil.validateIpDomain(".good."));
    }

    @Test
    void isHasSchema() {
        assertTrue(IpDomainUtil.isHasSchema("http://www.baidu.com"));
        assertTrue(IpDomainUtil.isHasSchema("https://www.baidu.com"));
        assertFalse(IpDomainUtil.isHasSchema("www.baidu.com"));
        assertFalse(IpDomainUtil.isHasSchema("https_www.baidu.com"));
    }
}