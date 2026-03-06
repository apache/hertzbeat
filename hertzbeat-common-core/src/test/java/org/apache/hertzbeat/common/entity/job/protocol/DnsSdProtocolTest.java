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

class DnsSdProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        DnsSdProtocol protocol = DnsSdProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .recordType("A")
                .recordName("example.com")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithIpv6() {
        DnsSdProtocol protocol = DnsSdProtocol.builder()
                .host("::1")
                .port("53")
                .recordType("AAAA")
                .recordName("example.com")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        DnsSdProtocol protocol = DnsSdProtocol.builder()
                .host("localhost")
                .port("53")
                .recordType("CNAME")
                .recordName("www.example.com")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        DnsSdProtocol protocol = DnsSdProtocol.builder()
                .host("")
                .port("53")
                .recordType("A")
                .recordName("example.com")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        DnsSdProtocol protocol = DnsSdProtocol.builder()
                .host("192.168.1.1")
                .port("99999")
                .recordType("A")
                .recordName("example.com")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankRecordType() {
        DnsSdProtocol protocol = DnsSdProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .recordType("")
                .recordName("example.com")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankRecordName() {
        DnsSdProtocol protocol = DnsSdProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .recordType("A")
                .recordName("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidRecordType() {
        DnsSdProtocol protocol = DnsSdProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .recordType("INVALID")
                .recordName("example.com")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidRecordTypes() {
        String[] validTypes = {"A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "PTR", "SOA", "CAA"};
        for (String type : validTypes) {
            DnsSdProtocol protocol = DnsSdProtocol.builder()
                    .host("192.168.1.1")
                    .port("53")
                    .recordType(type)
                    .recordName("example.com")
                    .build();
            assertFalse(protocol.isInvalid(), "Record type " + type + " should be valid");
        }
    }

    @Test
    void isInvalidValidRecordTypesCaseInsensitive() {
        DnsSdProtocol protocol = DnsSdProtocol.builder()
                .host("192.168.1.1")
                .port("53")
                .recordType("a")
                .recordName("example.com")
                .build();
        assertFalse(protocol.isInvalid());
    }
}