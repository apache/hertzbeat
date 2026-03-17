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

class NebulaGraphProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("192.168.1.1")
                .port("19669")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("nebula.example.com")
                .port("19669")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("localhost")
                .port("19669")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("")
                .port("19669")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host(null)
                .port("19669")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPort() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("192.168.1.1")
                .port("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPort() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("192.168.1.1")
                .port(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTimeout() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("192.168.1.1")
                .port("19669")
                .timeout("5000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimeout() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("192.168.1.1")
                .port("19669")
                .timeout("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullTimeout() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("192.168.1.1")
                .port("19669")
                .timeout(null)
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("192.168.1.1")
                .port("19669")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidTimePeriod() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("192.168.1.1")
                .port("19669")
                .timePeriod("60")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankTimePeriod() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("192.168.1.1")
                .port("19669")
                .timePeriod("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimePeriod() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("192.168.1.1")
                .port("19669")
                .timePeriod("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidWithUrl() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("192.168.1.1")
                .port("19669")
                .url("/stats")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidStoragePort() {
        NebulaGraphProtocol protocol = NebulaGraphProtocol.builder()
                .host("192.168.1.1")
                .port("19779")
                .url("/rocksdb_stats")
                .build();
        assertFalse(protocol.isInvalid());
    }
}