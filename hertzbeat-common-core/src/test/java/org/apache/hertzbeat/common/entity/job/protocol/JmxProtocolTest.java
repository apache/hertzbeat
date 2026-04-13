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

class JmxProtocolTest {

    @Test
    void isInvalidValidHostPortProtocol() {
        JmxProtocol protocol = JmxProtocol.builder()
                .host("192.168.1.1")
                .port("9999")
                .objectName("java.lang:type=Runtime")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidUrlProtocol() {
        JmxProtocol protocol = JmxProtocol.builder()
                .url("service:jmx:rmi:///jndi/rmi://127.0.0.1:9999/jmxrmi")
                .objectName("java.lang:type=Runtime")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankObjectName() {
        JmxProtocol protocol = JmxProtocol.builder()
                .host("192.168.1.1")
                .port("9999")
                .objectName("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        JmxProtocol protocol = JmxProtocol.builder()
                .host("")
                .port("9999")
                .objectName("java.lang:type=Runtime")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidZeroPort() {
        JmxProtocol protocol = JmxProtocol.builder()
                .host("192.168.1.1")
                .port("0")
                .objectName("java.lang:type=Runtime")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUnsupportedSsl() {
        JmxProtocol protocol = JmxProtocol.builder()
                .host("192.168.1.1")
                .port("9999")
                .objectName("java.lang:type=Runtime")
                .ssl("yes")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidOnlyUsername() {
        JmxProtocol protocol = JmxProtocol.builder()
                .host("192.168.1.1")
                .port("9999")
                .objectName("java.lang:type=Runtime")
                .username("admin")
                .password("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidOnlyPassword() {
        JmxProtocol protocol = JmxProtocol.builder()
                .host("192.168.1.1")
                .port("9999")
                .objectName("java.lang:type=Runtime")
                .username("")
                .password("password")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUrlProtocolMismatch() {
        JmxProtocol protocol = JmxProtocol.builder()
                .url("http://127.0.0.1:9999/jmxrmi")
                .objectName("java.lang:type=Runtime")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUrlContainsStub() {
        JmxProtocol protocol = JmxProtocol.builder()
                .url("service:jmx:rmi:///jndi/rmi://127.0.0.1:9999/stub/path")
                .objectName("java.lang:type=Runtime")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
