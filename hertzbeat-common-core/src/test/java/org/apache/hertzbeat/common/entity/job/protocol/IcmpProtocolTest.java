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

class IcmpProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        IcmpProtocol protocol = IcmpProtocol.builder()
                .host("192.168.1.1")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        IcmpProtocol protocol = IcmpProtocol.builder()
                .host("example.com")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        IcmpProtocol protocol = IcmpProtocol.builder()
                .host("localhost")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithIpv6() {
        IcmpProtocol protocol = IcmpProtocol.builder()
                .host("::1")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        IcmpProtocol protocol = IcmpProtocol.builder()
                .host("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        IcmpProtocol protocol = IcmpProtocol.builder()
                .host(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidDomain() {
        IcmpProtocol protocol = IcmpProtocol.builder()
                .host("invalid..domain")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTimeout() {
        IcmpProtocol protocol = IcmpProtocol.builder()
                .host("192.168.1.1")
                .timeout("5000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimeout() {
        IcmpProtocol protocol = IcmpProtocol.builder()
                .host("192.168.1.1")
                .timeout("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullTimeout() {
        IcmpProtocol protocol = IcmpProtocol.builder()
                .host("192.168.1.1")
                .timeout(null)
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        IcmpProtocol protocol = IcmpProtocol.builder()
                .host("192.168.1.1")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }
}