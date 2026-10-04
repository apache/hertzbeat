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

class RegistryProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host("192.168.1.1")
                .port("8848")
                .discoveryClientTypeName("Nacos")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host("nacos.example.com")
                .port("8848")
                .discoveryClientTypeName("Nacos")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host("localhost")
                .port("8848")
                .discoveryClientTypeName("Consul")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithIpv6() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host("::1")
                .port("8848")
                .discoveryClientTypeName("Consul")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host(null)
                .port("8848")
                .discoveryClientTypeName("Nacos")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankHost() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host("  ")
                .port("8848")
                .discoveryClientTypeName("Nacos")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidMalformedHost() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host("???")
                .port("8848")
                .discoveryClientTypeName("Nacos")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidHostWithTrailingDot() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host("www.baidu.com.")
                .port("8080")
                .discoveryClientTypeName("Nacos")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPort() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host("192.168.1.1")
                .port(null)
                .discoveryClientTypeName("Nacos")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPort() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host("192.168.1.1")
                .port("")
                .discoveryClientTypeName("Nacos")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidOutOfRangePort() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .discoveryClientTypeName("Nacos")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNonNumericPort() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host("192.168.1.1")
                .port("abc")
                .discoveryClientTypeName("Nacos")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidOutOfRangePortWithDomainLikeHost() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host("10.45.56.344")
                .port("80800")
                .discoveryClientTypeName("Nacos")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullDiscoveryClientTypeName() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host("192.168.1.1")
                .port("8848")
                .discoveryClientTypeName(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankDiscoveryClientTypeName() {
        RegistryProtocol protocol = RegistryProtocol.builder()
                .host("192.168.1.1")
                .port("8848")
                .discoveryClientTypeName("  ")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
