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

package org.apache.hertzbeat.common.entity.job.protocol;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UdpProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("dns.example.com")
                .port("53")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("localhost")
                .port("53")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithIpv6() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("::1")
                .port("53")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("")
                .port("53")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host(null)
                .port("53")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPort() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("192.168.1.1")
                .port("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPort() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("192.168.1.1")
                .port(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTimeout() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .timeout("5000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimeout() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .timeout("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullTimeout() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .timeout(null)
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidContent() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .content("48454C4C4F")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidContentLowercase() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .content("48454c4c4f")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankContent() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .content("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullContent() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .content(null)
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidContent() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .content("GGGG")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidContentWithSpecialChar() {
        UdpProtocol protocol = UdpProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .content("48454C4C4F!")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
