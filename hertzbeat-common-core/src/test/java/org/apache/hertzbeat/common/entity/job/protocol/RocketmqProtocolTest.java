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

class RocketmqProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        RocketmqProtocol protocol = RocketmqProtocol.builder()
                .namesrvHost("192.168.1.1")
                .namesrvPort("9876")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithDomain() {
        RocketmqProtocol protocol = RocketmqProtocol.builder()
                .namesrvHost("rocketmq.example.com")
                .namesrvPort("9876")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithLocalhost() {
        RocketmqProtocol protocol = RocketmqProtocol.builder()
                .namesrvHost("localhost")
                .namesrvPort("9876")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        RocketmqProtocol protocol = RocketmqProtocol.builder()
                .namesrvHost("")
                .namesrvPort("9876")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullHost() {
        RocketmqProtocol protocol = RocketmqProtocol.builder()
                .namesrvHost(null)
                .namesrvPort("9876")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        RocketmqProtocol protocol = RocketmqProtocol.builder()
                .namesrvHost("192.168.1.1")
                .namesrvPort("99999")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankPort() {
        RocketmqProtocol protocol = RocketmqProtocol.builder()
                .namesrvHost("192.168.1.1")
                .namesrvPort("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullPort() {
        RocketmqProtocol protocol = RocketmqProtocol.builder()
                .namesrvHost("192.168.1.1")
                .namesrvPort(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidValidWithAccessKey() {
        RocketmqProtocol protocol = RocketmqProtocol.builder()
                .namesrvHost("192.168.1.1")
                .namesrvPort("9876")
                .accessKey("testAccessKey")
                .secretKey("testSecretKey")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidWithParseScript() {
        RocketmqProtocol protocol = RocketmqProtocol.builder()
                .namesrvHost("192.168.1.1")
                .namesrvPort("9876")
                .parseScript("$.data")
                .build();
        assertFalse(protocol.isInvalid());
    }
}