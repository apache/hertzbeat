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

class MongodbProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host("192.168.1.1")
                .port("27017")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host("mongodb.example.com")
                .port("27017")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host("localhost")
                .port("27017")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithIpv6() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host("::1")
                .port("27017")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host("")
                .port("27017")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host(null)
                .port("27017")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPort() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host("192.168.1.1")
                .port("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPort() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host("192.168.1.1")
                .port(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTimeout() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host("192.168.1.1")
                .port("27017")
                .timeout("5000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimeout() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host("192.168.1.1")
                .port("27017")
                .timeout("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullTimeout() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host("192.168.1.1")
                .port("27017")
                .timeout(null)
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host("192.168.1.1")
                .port("27017")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithUsername() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host("192.168.1.1")
                .port("27017")
                .username("admin")
                .password("password")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDatabase() {
        MongodbProtocol protocol = MongodbProtocol.builder()
                .host("192.168.1.1")
                .port("27017")
                .database("testdb")
                .build();
        assertFalse(protocol.isInvalid());
    }
}
