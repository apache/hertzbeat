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

package com.usthe.common.util;

import com.usthe.common.queue.CommonDataQueue;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

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