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

class NginxProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("192.168.1.1")
                .port("80")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("nginx.example.com")
                .port("80")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("localhost")
                .port("80")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("")
                .port("80")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host(null)
                .port("80")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPort() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("192.168.1.1")
                .port("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPort() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("192.168.1.1")
                .port(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTimeout() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("192.168.1.1")
                .port("80")
                .timeout("5000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimeout() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("192.168.1.1")
                .port("80")
                .timeout("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullTimeout() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("192.168.1.1")
                .port("80")
                .timeout(null)
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("192.168.1.1")
                .port("80")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidSslTrue() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("192.168.1.1")
                .port("443")
                .ssl("true")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidSslFalse() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("192.168.1.1")
                .port("80")
                .ssl("false")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidSsl() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("192.168.1.1")
                .port("80")
                .ssl("invalid")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankSsl() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("192.168.1.1")
                .port("80")
                .ssl("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidWithUrl() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("192.168.1.1")
                .port("80")
                .url("/nginx_status")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidIpv6() {
        NginxProtocol protocol = NginxProtocol.builder()
                .host("::1")
                .port("80")
                .build();
        assertFalse(protocol.isInvalid());
    }
}