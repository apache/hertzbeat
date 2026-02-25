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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.Collections;
import java.util.Enumeration;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

/**
 * Test case for {@link IpDomainUtil}
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
        assertTrue(IpDomainUtil.validateIpDomain("spider_rds.sogou"));
        assertTrue(IpDomainUtil.validateIpDomain("_redis.hn.sogou"));
        assertTrue(IpDomainUtil.validateIpDomain("host"));
        assertTrue(IpDomainUtil.validateIpDomain("host-1"));
        assertFalse(IpDomainUtil.validateIpDomain("www.baidu.com."));
        assertFalse(IpDomainUtil.validateIpDomain("good."));
        assertFalse(IpDomainUtil.validateIpDomain(".good."));
        assertFalse(IpDomainUtil.validateIpDomain("www.baidu..com"));
        assertFalse(IpDomainUtil.validateIpDomain("www.baidu*com"));
        assertFalse(IpDomainUtil.validateIpDomain("host$-1"));
    }

    @Test
    void isHasSchema() {
        assertTrue(IpDomainUtil.isHasSchema("http://www.baidu.com"));
        assertTrue(IpDomainUtil.isHasSchema("https://www.baidu.com"));
        assertFalse(IpDomainUtil.isHasSchema("www.baidu.com"));
        assertFalse(IpDomainUtil.isHasSchema("https_www.baidu.com"));
    }

    @Test
    void testGetLocalhostIp() throws SocketException {

        // Success
        InetAddress mockedInetAddress = mock(Inet4Address.class);
        when(mockedInetAddress.getHostAddress()).thenReturn("192.168.1.100");

        NetworkInterface mockedNetworkInterface = mock(NetworkInterface.class);
        when(mockedNetworkInterface.isLoopback()).thenReturn(false);
        when(mockedNetworkInterface.isVirtual()).thenReturn(false);
        when(mockedNetworkInterface.isUp()).thenReturn(true);

        Enumeration<InetAddress> inetAddresses = Collections.enumeration(Collections.singletonList(mockedInetAddress));
        when(mockedNetworkInterface.getInetAddresses()).thenReturn(inetAddresses);

        Enumeration<NetworkInterface> successNetworkInterfaces = Collections.enumeration(Collections.singletonList(mockedNetworkInterface));

        try (MockedStatic<NetworkInterface> mockedStaticNetworkInterface = Mockito.mockStatic(NetworkInterface.class)) {
            mockedStaticNetworkInterface.when(NetworkInterface::getNetworkInterfaces).thenReturn(successNetworkInterfaces);
            String localhostIp = IpDomainUtil.getLocalhostIp();

            assertEquals("192.168.1.100", localhostIp);
        }

        // no network interface
        Enumeration<NetworkInterface> noNetworkNetworkInterfaces = Collections.enumeration(Collections.emptyList());

        try (MockedStatic<NetworkInterface> mockedStaticNetworkInterface = Mockito.mockStatic(NetworkInterface.class)) {
            mockedStaticNetworkInterface.when(NetworkInterface::getNetworkInterfaces).thenReturn(noNetworkNetworkInterfaces);
            String localhostIp = IpDomainUtil.getLocalhostIp();

            assertNull(localhostIp);
        }

        // throw exception
        try (MockedStatic<NetworkInterface> mockedStaticNetworkInterface = Mockito.mockStatic(NetworkInterface.class)) {
            mockedStaticNetworkInterface.when(NetworkInterface::getNetworkInterfaces).thenThrow(new RuntimeException("Test exception"));
            String localhostIp = IpDomainUtil.getLocalhostIp();

            assertNull(localhostIp);
        }

    }

    @Test
    void testCheckIpAddressType() {

        assertEquals(NetworkConstants.IPV4, IpDomainUtil.checkIpAddressType("192.168.1.1"));
        assertEquals(NetworkConstants.IPV4, IpDomainUtil.checkIpAddressType("127.0.0.1"));

        assertEquals(NetworkConstants.IPV6, IpDomainUtil.checkIpAddressType("2001:0db8:85a3:0000:0000:8a2e:0370:7334"));
        assertEquals(NetworkConstants.IPV6, IpDomainUtil.checkIpAddressType("::1"));

        assertEquals(NetworkConstants.IPV4, IpDomainUtil.checkIpAddressType(""));
        assertEquals(NetworkConstants.IPV4, IpDomainUtil.checkIpAddressType(null));
        assertEquals(NetworkConstants.IPV4, IpDomainUtil.checkIpAddressType("invalid-ip"));

    }
}
