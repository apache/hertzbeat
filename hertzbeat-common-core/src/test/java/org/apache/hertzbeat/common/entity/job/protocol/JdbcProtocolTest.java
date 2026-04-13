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

class JdbcProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("192.168.1.1")
                .port("3306")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("db.example.com")
                .port("3306")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("localhost")
                .port("3306")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithIpv6() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("::1")
                .port("3306")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithUrl() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .url("jdbc:mysql://localhost:3306/test")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("")
                .port("3306")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host(null)
                .port("3306")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPort() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("192.168.1.1")
                .port("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPort() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("192.168.1.1")
                .port(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTimeout() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("192.168.1.1")
                .port("3306")
                .timeout("5000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimeout() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("192.168.1.1")
                .port("3306")
                .timeout("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullTimeout() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("192.168.1.1")
                .port("3306")
                .timeout(null)
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("192.168.1.1")
                .port("3306")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidReuseConnection() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("192.168.1.1")
                .port("3306")
                .reuseConnection("true")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidReuseConnectionFalse() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("192.168.1.1")
                .port("3306")
                .reuseConnection("false")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidReuseConnection() {
        JdbcProtocol protocol = JdbcProtocol.builder()
                .host("192.168.1.1")
                .port("3306")
                .reuseConnection("invalid")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
