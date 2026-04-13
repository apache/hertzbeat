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

class RedisProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port("6379")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("redis.example.com")
                .port("6379")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("localhost")
                .port("6379")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithIpv6() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("::1")
                .port("6379")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("")
                .port("6379")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host(null)
                .port("6379")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPort() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPort() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTimeout() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port("6379")
                .timeout("5000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimeout() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port("6379")
                .timeout("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullTimeout() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port("6379")
                .timeout(null)
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port("6379")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidPatternSingle() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port("6379")
                .pattern("1")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidPatternSentinel() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port("6379")
                .pattern("2")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidPatternCluster() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port("6379")
                .pattern("3")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPattern() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port("6379")
                .pattern("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPattern() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port("6379")
                .pattern(null)
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPattern() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port("6379")
                .pattern("4")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPatternNonNumeric() {
        RedisProtocol protocol = RedisProtocol.builder()
                .host("192.168.1.1")
                .port("6379")
                .pattern("invalid")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
