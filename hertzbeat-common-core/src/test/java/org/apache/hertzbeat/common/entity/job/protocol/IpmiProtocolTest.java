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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class IpmiProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        IpmiProtocol protocol = IpmiProtocol.builder()
                .host("192.168.1.1")
                .port("623")
                .username("admin")
                .password("password")
                .type("Chassis")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidRawProtocol() {
        IpmiProtocol protocol = IpmiProtocol.builder()
                .host("192.168.1.1")
                .port("623")
                .username("admin")
                .password("password")
                .type("Raw")
                .field(new IpmiProtocol.Field())
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        IpmiProtocol protocol = IpmiProtocol.builder()
                .host("")
                .port("623")
                .username("admin")
                .password("password")
                .type("Chassis")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        IpmiProtocol protocol = IpmiProtocol.builder()
                .host("192.168.1.1")
                .port("70000")
                .username("admin")
                .password("password")
                .type("Chassis")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankUsername() {
        IpmiProtocol protocol = IpmiProtocol.builder()
                .host("192.168.1.1")
                .port("623")
                .username("")
                .password("password")
                .type("Chassis")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPassword() {
        IpmiProtocol protocol = IpmiProtocol.builder()
                .host("192.168.1.1")
                .port("623")
                .username("admin")
                .password("")
                .type("Chassis")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankType() {
        IpmiProtocol protocol = IpmiProtocol.builder()
                .host("192.168.1.1")
                .port("623")
                .username("admin")
                .password("password")
                .type("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUnsupportedType() {
        IpmiProtocol protocol = IpmiProtocol.builder()
                .host("192.168.1.1")
                .port("623")
                .username("admin")
                .password("password")
                .type("Unknown")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidRawWithoutField() {
        IpmiProtocol protocol = IpmiProtocol.builder()
                .host("192.168.1.1")
                .port("623")
                .username("admin")
                .password("password")
                .type("Raw")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
