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

class PrometheusProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port("9090")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("prometheus.example.com")
                .port("9090")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("localhost")
                .port("9090")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithIpv6() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("::1")
                .port("9090")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("")
                .port("9090")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host(null)
                .port("9090")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPort() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPort() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTimeout() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port("9090")
                .timeout("5000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimeout() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port("9090")
                .timeout("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullTimeout() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port("9090")
                .timeout(null)
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port("9090")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidSsl() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port("9090")
                .ssl("true")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidSslFalse() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port("9090")
                .ssl("false")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidSsl() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port("9090")
                .ssl("invalid")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankSsl() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port("9090")
                .ssl("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidMethod() {
        String[] validMethods = {"get", "GET", "post", "POST", "put", "PUT", "delete", "DELETE", "patch", "PATCH", "head", "HEAD", "options", "OPTIONS"};
        for (String method : validMethods) {
            PrometheusProtocol protocol = PrometheusProtocol.builder()
                    .host("192.168.1.1")
                    .port("9090")
                    .method(method)
                    .build();
            assertFalse(protocol.isInvalid(), "Method " + method + " should be valid");
        }
    }

    @Test
    void isInvalidInvalidMethod() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port("9090")
                .method("invalid")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankMethod() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port("9090")
                .method("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidPath() {
        PrometheusProtocol protocol = PrometheusProtocol.builder()
                .host("192.168.1.1")
                .port("9090")
                .path("/metrics")
                .build();
        assertFalse(protocol.isInvalid());
    }
}