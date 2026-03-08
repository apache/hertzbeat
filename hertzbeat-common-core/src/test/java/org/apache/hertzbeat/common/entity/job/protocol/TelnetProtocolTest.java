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

class TelnetProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("192.168.1.1")
                .port("23")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("telnet.example.com")
                .port("23")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("localhost")
                .port("23")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithIpv6() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("::1")
                .port("23")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("")
                .port("23")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host(null)
                .port("23")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPort() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("192.168.1.1")
                .port("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPort() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("192.168.1.1")
                .port(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTimeout() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("192.168.1.1")
                .port("23")
                .timeout("5000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimeout() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("192.168.1.1")
                .port("23")
                .timeout("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullTimeout() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("192.168.1.1")
                .port("23")
                .timeout(null)
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("192.168.1.1")
                .port("23")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidCmd() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("192.168.1.1")
                .port("23")
                .cmd("ls -la")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankCmd() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("192.168.1.1")
                .port("23")
                .cmd("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullCmd() {
        TelnetProtocol protocol = TelnetProtocol.builder()
                .host("192.168.1.1")
                .port("23")
                .cmd(null)
                .build();
        assertFalse(protocol.isInvalid());
    }
}