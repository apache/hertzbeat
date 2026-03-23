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

class SshProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("22")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        SshProtocol protocol = SshProtocol.builder()
                .host("ssh.example.com")
                .port("22")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        SshProtocol protocol = SshProtocol.builder()
                .host("localhost")
                .port("22")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithIpv6() {
        SshProtocol protocol = SshProtocol.builder()
                .host("::1")
                .port("22")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        SshProtocol protocol = SshProtocol.builder()
                .host("")
                .port("22")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        SshProtocol protocol = SshProtocol.builder()
                .host(null)
                .port("22")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPort() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPort() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTimeout() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("22")
                .timeout("5000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimeout() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("22")
                .timeout("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullTimeout() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("22")
                .timeout(null)
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("22")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidReuseConnection() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("22")
                .reuseConnection("true")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidReuseConnectionFalse() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("22")
                .reuseConnection("false")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidReuseConnection() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("22")
                .reuseConnection("invalid")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidUseProxyFalse() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("22")
                .useProxy("false")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidUseProxyTrue() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("22")
                .useProxy("true")
                .proxyHost("proxy.example.com")
                .proxyPort("1080")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidUseProxyValue() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("22")
                .useProxy("invalid")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUseProxyTrueWithoutProxyHost() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("22")
                .useProxy("true")
                .proxyPort("1080")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUseProxyTrueWithoutProxyPort() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("22")
                .useProxy("true")
                .proxyHost("proxy.example.com")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUseProxyTrueWithInvalidProxyPort() {
        SshProtocol protocol = SshProtocol.builder()
                .host("192.168.1.1")
                .port("22")
                .useProxy("true")
                .proxyHost("proxy.example.com")
                .proxyPort("99999")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
