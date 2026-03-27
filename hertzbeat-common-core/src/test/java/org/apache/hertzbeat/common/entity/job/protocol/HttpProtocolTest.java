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

class HttpProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("8080")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("example.com")
                .port("8080")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("localhost")
                .port("8080")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithIpv6() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("::1")
                .port("8080")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("")
                .port("8080")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host(null)
                .port("8080")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPort() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPort() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTimeout() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("8080")
                .timeout("5000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimeout() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("8080")
                .timeout("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullTimeout() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("8080")
                .timeout(null)
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("8080")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidSsl() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("8080")
                .ssl("true")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidSslFalse() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("8080")
                .ssl("false")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidSsl() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("8080")
                .ssl("invalid")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankSsl() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("8080")
                .ssl("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidMethod() {
        String[] validMethods = {"get", "GET", "post", "POST", "put", "PUT", "delete", "DELETE", "patch", "PATCH", "head", "HEAD", "options", "OPTIONS"};
        for (String method : validMethods) {
            HttpProtocol protocol = HttpProtocol.builder()
                    .host("192.168.1.1")
                    .port("8080")
                    .method(method)
                    .build();
            assertFalse(protocol.isInvalid(), "Method " + method + " should be valid");
        }
    }

    @Test
    void isInvalidInvalidMethod() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("8080")
                .method("invalid")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankMethod() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("8080")
                .method("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidEnableUrlEncoding() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("8080")
                .enableUrlEncoding("true")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidEnableUrlEncoding() {
        HttpProtocol protocol = HttpProtocol.builder()
                .host("192.168.1.1")
                .port("8080")
                .enableUrlEncoding("invalid")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
